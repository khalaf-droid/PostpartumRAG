import json
import os
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

INPUT_PATH = "knowledge_sections_embedded.json"
BATCH_SIZE = 50  # عدد الصفوف في كل نداء upload


def get_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("محتاجة تحطي SUPABASE_URL و SUPABASE_KEY كـ environment variables الأول")
    return create_client(url, key)


def upload_sections(sections, client):
    rows = []
    for s in sections:
        rows.append({
            "id": s["id"],
            "parent_id": s.get("parent_id"),
            "source": s["source"],
            "doc_type": s["doc_type"],
            "page": s.get("page"),
            "text": s["text"],
            "char_count": s["char_count"],
            "embedding": s["embedding"],
        })

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        client.table("sections").upsert(batch).execute()
        print(f"  {min(i + BATCH_SIZE, len(rows))}/{len(rows)}")


if __name__ == "__main__":
    with open(INPUT_PATH, encoding="utf-8") as f:
        sections = json.load(f)

    client = get_client()

    print(f"رفع {len(sections)} صف على Supabase ...")
    upload_sections(sections, client)
    print("خلص الرفع بنجاح")
