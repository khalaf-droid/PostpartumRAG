"""
سكريبت تشخيصي بسيط: بيدور جوا الـ chunks بتاعتك (قبل ما توصل لأي embedding
أو model) عن أي جزء بيوصف "أعراض" الاكتئاب فعليًا، عشان نعرف هل المشكلة
في الاسترجاع (الجزء موجود بس مش بيطلع في top-5) ولا في الـ chunking نفسه
(الجزء أصلاً ضاع أو اتقطع بشكل غريب وقت التقسيم).

شغّليه من جوا فولدر المشروع، وحطي اسم الملف الصح تحت (جربي الاتنين لو مش
متأكدة أنهي واحد عندك):
  - knowledge_sections_ready.json   (قبل الـ embedding)
  - knowledge_sections_embedded.json (بعد الـ embedding، أكبر حجم)
"""

import json

CANDIDATE_FILES = [
    "knowledge_sections_ready.json",
    "knowledge_sections_embedded.json",
    "knowledge_sections.json",
]

# كلمات بتوصف أعراض اكتئاب ما بعد الولادة فعليًا (مش أدوات قياس، مش تعريفات)
SYMPTOM_KEYWORDS = [
    "low mood", "loss of interest", "anhedonia", "sleep disturbance",
    "poor concentration", "feelings of guilt", "worthlessness",
    "tearful", "irritab", "appetite", "fatigue", "hopeless",
    "signs and symptoms", "clinical features", "symptoms of depression",
    "symptoms of postnatal depression", "symptoms include",
]


def main():
    import os
    path = None
    for candidate in CANDIDATE_FILES:
        if os.path.exists(candidate):
            path = candidate
            break

    if not path:
        print("مالقتش ولا واحد من الملفات دي في الفولدر ده:")
        for c in CANDIDATE_FILES:
            print(f"  - {c}")
        print("شغّلي السكريبت من جوا فولدر المشروع، أو انسخيه لجنب الملف.")
        return

    print(f"بندور جوا: {path}\n")
    with open(path, encoding="utf-8") as f:
        sections = json.load(f)

    nice_sections = [s for s in sections if s.get("source") == "NICE_CG192"]
    who_sections = [s for s in sections if s.get("source") == "WHO_ThinkingHealthy"]
    print(f"إجمالي chunks من NICE_CG192: {len(nice_sections)}")
    print(f"إجمالي chunks من WHO_ThinkingHealthy: {len(who_sections)}\n")

    print("=" * 60)
    print("chunks فيها كلمة من كلمات الأعراض دي:")
    print("=" * 60)

    found_any = False
    for s in sections:
        text_lower = s["text"].lower()
        matched = [kw for kw in SYMPTOM_KEYWORDS if kw in text_lower]
        if matched:
            found_any = True
            print(f"\n[{s['source']}] page {s.get('page')} — id: {s['id']}")
            print(f"  matched keywords: {matched}")
            print(f"  text preview: {s['text'][:300]}...")

    if not found_any:
        print("\n⚠️  مفيش ولا chunk واحد فيه أي كلمة من كلمات الأعراض دي.")
        print("ده معناه المشكلة على الأرجح في مرحلة الـ chunking نفسها")
        print("(build_sections.py) -- الجزء اللي بيوصف الأعراض ممكن يكون")
        print("اتقطع أو اتفلتر بره أصلاً قبل حتى الاسترجاع.")


if __name__ == "__main__":
    main()