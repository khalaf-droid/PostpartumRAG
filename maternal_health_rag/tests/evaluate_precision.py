"""
حساب Precision@k فعلي، بالاعتماد على ملف benchmark (tests/test_dataset.json)
بدل الحكم اليدوي في كل مرة.

طريقة الحكم على "الصلة" (relevance) هنا: بسيطة ومباشرة —
النتيجة تُعتبر "مرتبطة" لو مصدرها (source) موجود في قائمة expected_sources
بتاعة السؤال في ملف الـ benchmark. ده مش دقيق 100% (ممكن يبقى المصدر
صح لكن الـ chunk نفسه مش دقيق كفاية)، لكنه مقياس موضوعي وقابل للتكرار،
أحسن بكتير من مجرد متوسط الـ similarity.

المتطلبات: نفس مكتبات باقي المشروع (google-genai, supabase).
"""

import json
import os
from dotenv import load_dotenv

load_dotenv()

import time
from pathlib import Path

from google import genai
from google.genai import types
from supabase import create_client

EMBED_MODEL = "gemini-embedding-001"
TOP_K = 5
DATASET_PATH = Path(__file__).parent / "test_dataset.json"


def get_gemini_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def get_supabase_client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def embed_query(text, client, max_retries=5):
    for attempt in range(max_retries):
        try:
            result = client.models.embed_content(
                model=EMBED_MODEL,
                contents=[text],
                config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
            )
            return result.embeddings[0].values
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"    Hit API rate limit, waiting 60 seconds... (attempt {attempt + 1}/{max_retries})")
                time.sleep(60)
            else:
                raise
    raise RuntimeError("Retries failed after repeatedly hitting the rate limit")


def retrieve(query, gemini_client, supabase_client, top_k=TOP_K):
    q_vector = embed_query(query, gemini_client)
    response = supabase_client.rpc(
        "match_sections",
        {"query_embedding": q_vector, "match_count": top_k},
    ).execute()
    return response.data


def precision_at_k(results, expected_sources):
    if not results:
        return 0.0
    relevant = sum(1 for r in results if r["source"] in expected_sources)
    return relevant / len(results)


def run_benchmark():
    with open(DATASET_PATH, encoding="utf-8") as f:
        dataset = json.load(f)

    gemini_client = get_gemini_client()
    supabase_client = get_supabase_client()

    all_precisions = []
    report_rows = []

    for item in dataset:
        results = retrieve(item["question"], gemini_client, supabase_client)
        p = precision_at_k(results, item["expected_sources"])
        all_precisions.append(p)
        report_rows.append({"id": item["id"], "question": item["question"], "precision": p})

        print(f"[{item['id']}] {item['question']}")
        print(f"  Precision@{TOP_K}: {p:.2f}")
        print(f"  Sources returned: {[r['source'] for r in results]}")
        print(f"  Expected: {item['expected_sources']}\n")

        time.sleep(5)  # small gap between questions to avoid hitting the API rate limit

    overall = sum(all_precisions) / len(all_precisions) if all_precisions else 0
    print("=" * 55)
    print(f"Average Precision@{TOP_K} over {len(dataset)} questions: {overall:.3f}")
    print("=" * 55)
    return report_rows, overall


if __name__ == "__main__":
    run_benchmark()
