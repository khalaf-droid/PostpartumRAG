"""
Section-aware chunking باستخدام Unstructured.io
بدل التقسيم العشوائي بعدد كلمات ثابت، ده بيقسم المستند حسب بنيته الفعلية:
كل chunk = قسم كامل تحت عنوانه، مش نص مقطوع في نص الجملة.
"""

import json
import re
import pdfplumber
from unstructured.partition.pdf import partition_pdf
from unstructured.chunking.title import chunk_by_title

# كلمات مفتاحية لفلترة الأقسام المرتبطة بالاكتئاب حوالين الحمل فقط
KEYWORDS = [
    "depress", "pregnan", "postnatal", "postpartum", "perinatal", "breastfeed",
    "antenatal", "mother", "baby", "anxiety", "antidepressant", "ssri", "psychosis",
    "mania", "bipolar", "epds", "phq", "gad-", "thinking healthy",
]


def build_sections(pdf_path, source_name, doc_type, max_characters=1200):
    """يفكك المستند لعناصر ثم يجمعها لأقسام متماسكة حسب العناوين."""
    elements = partition_pdf(pdf_path, strategy="fast")

    # chunk_by_title: كل chunk بيبقى قسم كامل (عنوان + محتواه) بحد أقصى للحجم
    chunks = chunk_by_title(
        elements,
        max_characters=max_characters,
        combine_text_under_n_chars=200,   # لضم العناوين القصيرة جدًا بمحتواها
        new_after_n_chars=max_characters,
    )

    sections = []
    for i, chunk in enumerate(chunks):
        text = str(chunk).strip()
        if len(text) < 40:
            continue
        page_number = getattr(chunk.metadata, "page_number", None)
        sections.append({
            "id": f"{source_name}_{i:04d}",
            "source": source_name,
            "doc_type": doc_type,
            "page": page_number,
            "text": text,
            "char_count": len(text),
        })
    return sections


def build_sections_per_page(pdf_path, source_name, doc_type):
    """
    Fallback لملفات فيها تصميم بصري معقد (boxes/columns) بيبوّظ استخراج unstructured.
    كل صفحة هنا بتُعامل كـ section متكاملة (مناسب لـ mhGAP لأن كل صفحة = بروتوكول قائم بذاته).
    """
    sections = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) < 40:
                continue
            sections.append({
                "id": f"{source_name}_{i:04d}",
                "source": source_name,
                "doc_type": doc_type,
                "page": i + 1,
                "text": text,
                "char_count": len(text),
            })
    return sections


def filter_relevant(sections):
    return [
        s for s in sections
        if any(k in s["text"].lower() for k in KEYWORDS)
    ]


if __name__ == "__main__":
    documents = [
        (
            "/mnt/user-data/uploads/antenatal-and-postnatal-mental-health-clinical-management-and-service-guidance-pdf-35109869806789.pdf",
            "NICE_CG192",
            "clinical_guideline_uk",
        ),
        (
            "/mnt/user-data/uploads/9789241549790-eng.pdf",
            "WHO_mhGAP_v2",
            "who_intervention_guide",
        ),
        (
            "/mnt/user-data/uploads/WHO_MSD_MER_15_1_eng.pdf",
            "WHO_ThinkingHealthy",
            "who_psychosocial_manual",
        ),
    ]

    all_sections = []
    for path, name, doc_type in documents:
        print(f"معالجة {name} ...")
        sections = build_sections(path, name, doc_type)
        if len(sections) == 0:
            print(f"  unstructured فشلت، رجعنا لـ pdfplumber (صفحة = section)")
            sections = build_sections_per_page(path, name, doc_type)
        relevant = filter_relevant(sections)
        print(f"  إجمالي الأقسام: {len(sections)} | المرتبط بالموضوع: {len(relevant)}")
        all_sections.extend(relevant)

    with open("/home/claude/knowledge_sections.json", "w", encoding="utf-8") as f:
        json.dump(all_sections, f, ensure_ascii=False, indent=2)

    print(f"\nالإجمالي النهائي: {len(all_sections)} section-aware chunk")
