"""
اختبار البحث: بناخد سؤال، نحوله لـ vector، ونجيب أقرب النتائج من Supabase.
ده اختبار للاسترجاع بس (من غير أي موديل يصيغ إجابة).
"""

import os
from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types
from supabase import create_client

EMBED_MODEL = "gemini-embedding-001"


def get_gemini_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def get_supabase_client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def embed_query(text, gemini_client):
    result = gemini_client.models.embed_content(
        model=EMBED_MODEL,
        contents=[text],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return result.embeddings[0].values


def search(query, gemini_client, supabase_client, top_k=5):
    q_vector = embed_query(query, gemini_client)
    response = supabase_client.rpc(
        "match_sections",
        {"query_embedding": q_vector, "match_count": top_k},
    ).execute()
    return response.data


if __name__ == "__main__":
    gemini_client = get_gemini_client()
    supabase_client = get_supabase_client()

    query = "أعراض اكتئاب ما بعد الولادة"
    print(f"Question: {query}\n")

    results = search(query, gemini_client, supabase_client, top_k=15)
    for r in results:
        print(f"[{r['similarity']:.3f}] {r['id']} ({r['source']}, page {r['page']})")
        print(f"  {r['text'][:150]}...")
        print()
