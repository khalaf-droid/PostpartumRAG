"""
نفس فكرة check_symptoms_coverage.py، بس بندور جوا قاعدة بيانات Supabase
مباشرة بدل ملف محلي (لأن الملفات المحلية اتمسحت بعد الرفع، وده طبيعي).

بيسحب كل الصفوف من جدول sections، ويدور جوا النص عن كلمات بتوصف
أعراض اكتئاب ما بعد الولادة فعليًا.

شغّليه من جوا فولدر المشروع (عشان يلاقي ملف .env بتاعك).
"""

import os
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

SYMPTOM_KEYWORDS = [
    "low mood", "loss of interest", "anhedonia", "sleep disturbance",
    "poor concentration", "feelings of guilt", "worthlessness",
    "tearful", "irritab", "appetite", "fatigue", "hopeless",
    "signs and symptoms", "clinical features", "symptoms of depression",
    "symptoms of postnatal depression", "symptoms include",
]

PAGE_SIZE = 1000  # Supabase بترجع 1000 صف كحد أقصى في النداء الواحد افتراضيًا


def get_client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def fetch_all_sections(client):
    """يسحب كل الصفوف بالـ pagination عشان مايقفش عند أول 1000 صف لو العدد أكبر."""
    all_rows = []
    start = 0
    while True:
        response = (
            client.table("sections")
            .select("id,source,page,text")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        )
        rows = response.data
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return all_rows


def main():
    client = get_client()
    print("بنسحب كل الصفوف من جدول sections في Supabase...\n")
    sections = fetch_all_sections(client)

    nice_count = sum(1 for s in sections if s.get("source") == "NICE_CG192")
    who_count = sum(1 for s in sections if s.get("source") == "WHO_ThinkingHealthy")
    print(f"إجمالي الصفوف في الجدول: {len(sections)}")
    print(f"منها من NICE_CG192: {nice_count}")
    print(f"منها من WHO_ThinkingHealthy: {who_count}\n")

    print("=" * 60)
    print("chunks فيها كلمة من كلمات الأعراض دي:")
    print("=" * 60)

    found_any = False
    for s in sections:
        text_lower = (s.get("text") or "").lower()
        matched = [kw for kw in SYMPTOM_KEYWORDS if kw in text_lower]
        if matched:
            found_any = True
            print(f"\n[{s['source']}] page {s.get('page')} — id: {s['id']}")
            print(f"  matched keywords: {matched}")
            print(f"  text preview: {s['text'][:300]}...")

    if not found_any:
        print("\n⚠️  مفيش ولا chunk واحد فيه أي كلمة من كلمات الأعراض دي،")
        print("في كل الجدول بتاعك على Supabase -- مش بس في top-5.")
        print("ده معناه المشكلة في مرحلة الـ chunking/filtering قبل الرفع")
        print("أصلاً (build_sections.py)، مش في الاسترجاع وقت البحث.")


if __name__ == "__main__":
    main()
    