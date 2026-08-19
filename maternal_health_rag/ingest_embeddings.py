import json
import os
from dotenv import load_dotenv

load_dotenv()

import time
import numpy as np
from google import genai
from google.genai import types

INPUT_PATH = "knowledge_sections_ready.json"
OUTPUT_PATH = "knowledge_sections_embedded.json"

MODEL = "gemini-embedding-001"
BATCH_SIZE = 20          # عدد الـ chunks في كل نداء API
# الحد المجاني: 100 نص في الدقيقة. كل باتش فيه 20 نص، يبقى محتاجين
# 12 ثانية على الأقل بين الباتشات (5 باتش × 20 = 100 في الدقيقة).
# خليناها 15 ثانية عشان نفضل تحت الحد بأمان.
SLEEP_BETWEEN_BATCHES = 15.0


def get_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("محتاجة تحطي GEMINI_API_KEY كـ environment variable الأول")
    return genai.Client(api_key=api_key)


def embed_batch(client, texts, task_type, max_retries=5):
    """
    task_type بيفرق:
      - RETRIEVAL_DOCUMENT: للنصوص اللي بنخزنها (الـ chunks بتاعتنا)
      - RETRIEVAL_QUERY: لسؤال المستخدم وقت البحث
    استخدام النوع الصح بيرفع دقة الاسترجاع.

    لو حصل 429 (تجاوزنا الحد)، بننتظر ونعيد المحاولة تلقائيًا بدل ما نوقف.
    """
    for attempt in range(max_retries):
        try:
            result = client.models.embed_content(
                model=MODEL,
                contents=texts,
                config=types.EmbedContentConfig(task_type=task_type),
            )
            return [e.values for e in result.embeddings]
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = 60  # ننتظر دقيقة كاملة عشان الحد يترفع تاني
                print(f"    وصلنا لحد الـ API، مستنيين {wait} ثانية... (محاولة {attempt + 1}/{max_retries})")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError("فشلت المحاولات المتكررة بعد تجاوز الحد عدة مرات")


def embed_sections(sections, client):
    # لو فيه ملف ناتج من محاولة قبل كده، بنكمل من مكان ما وقفنا بدل ما نبدأ من الأول
    done_ids = set()
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            previous = json.load(f)
        done_ids = {s["id"] for s in previous if "embedding" in s}
        by_id = {s["id"]: s for s in previous}
        for s in sections:
            if s["id"] in by_id and "embedding" in by_id[s["id"]]:
                s["embedding"] = by_id[s["id"]]["embedding"]
        if done_ids:
            print(f"  لاقينا {len(done_ids)} chunk اتعملهم embedding قبل كده، هنكمل من بعدهم")

    remaining = [s for s in sections if s["id"] not in done_ids]

    for i in range(0, len(remaining), BATCH_SIZE):
        batch = remaining[i : i + BATCH_SIZE]
        texts = [s["text"] for s in batch]
        vectors = embed_batch(client, texts, task_type="RETRIEVAL_DOCUMENT")
        for s, v in zip(batch, vectors):
            s["embedding"] = v
        done_so_far = len(sections) - len(remaining) + min(i + BATCH_SIZE, len(remaining))
        print(f"  {done_so_far}/{len(sections)}")

        # نحفظ تقدمنا بعد كل باتش عشان لو حصل قطع في النت أو أي مشكلة منخسرش الشغل
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(sections, f, ensure_ascii=False)

        time.sleep(SLEEP_BETWEEN_BATCHES)
    return sections


def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def search(query, sections, client, top_k=5):
    q_vec = embed_batch(client, [query], task_type="RETRIEVAL_QUERY")[0]
    scored = [(cosine_sim(q_vec, s["embedding"]), s) for s in sections]
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]


if __name__ == "__main__":
    with open(INPUT_PATH, encoding="utf-8") as f:
        sections = json.load(f)

    client = get_client()

    print(f"عمل embedding لـ {len(sections)} chunk ...")
    sections = embed_sections(sections, client)
    print(f"خلص واتحفظ في {OUTPUT_PATH}")

    # تجربة سريعة
    results = search("أعراض اكتئاب ما بعد الولادة", sections, client, top_k=3)
    print("\nأقرب 3 نتائج لسؤال تجريبي:")
    for score, s in results:
        print(f"  [{score:.3f}] {s['id']} ({s['source']}) — {s['text'][:100]}...")
