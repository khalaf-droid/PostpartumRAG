
import json
import re

INPUT_PATH = "/mnt/user-data/uploads/knowledge_sections.json"
OUTPUT_PATH = "/mnt/user-data/outputs/knowledge_sections_ready.json"

MAX_CHARS = 2000       
TARGET_CHARS = 1200      
MIN_TAIL_CHARS = 150     


def split_sentences(text):
    """تقسيم بسيط على حدود الجمل (نقطة/علامة استفهام/تعجب متبوعة بمسافة، أو سطر جديد)."""
    parts = re.split(r"(?<=[.!؟?])\s+|\n{2,}", text)
    return [p.strip() for p in parts if p.strip()]


def split_long_section(section, max_chars=MAX_CHARS, target_chars=TARGET_CHARS):
    text = section["text"]
    if len(text) <= max_chars:
        return [section]

    sentences = split_sentences(text)
    sub_chunks = []
    current = []
    current_len = 0

    for sent in sentences:
        if current_len + len(sent) > target_chars and current:
            sub_chunks.append(" ".join(current))
            current = []
            current_len = 0
        current.append(sent)
        current_len += len(sent) + 1

    if current:
        sub_chunks.append(" ".join(current))

    # لو آخر جزء صغير جدًا، نلحقه باللي قبله بدل ما يفضل chunk ضعيف
    if len(sub_chunks) > 1 and len(sub_chunks[-1]) < MIN_TAIL_CHARS:
        sub_chunks[-2] = sub_chunks[-2] + " " + sub_chunks[-1]
        sub_chunks.pop()

    # fallback: لو جزء لسه أطول من الحد (نص من غير علامات ترقيم كافية، زي الجداول)
    # نقسمه بالقوة على حدود الكلمات
    final_chunks = []
    for chunk_text in sub_chunks:
        if len(chunk_text) <= max_chars:
            final_chunks.append(chunk_text)
            continue
        words = chunk_text.split(" ")
        buf = []
        buf_len = 0
        for w in words:
            if buf_len + len(w) + 1 > target_chars and buf:
                final_chunks.append(" ".join(buf))
                buf = []
                buf_len = 0
            buf.append(w)
            buf_len += len(w) + 1
        if buf:
            final_chunks.append(" ".join(buf))
    sub_chunks = final_chunks

    results = []
    for i, chunk_text in enumerate(sub_chunks):
        suffix = chr(ord("a") + i) if i < 26 else str(i)
        results.append({
            "id": f"{section['id']}_{suffix}",
            "parent_id": section["id"],
            "source": section["source"],
            "doc_type": section["doc_type"],
            "page": section["page"],
            "text": chunk_text,
            "char_count": len(chunk_text),
            "split_from_long_section": True,
        })
    return results


def main():
    with open(INPUT_PATH, encoding="utf-8") as f:
        sections = json.load(f)

    ready = []
    split_count = 0
    for s in sections:
        pieces = split_long_section(s)
        if len(pieces) > 1:
            split_count += 1
        ready.extend(pieces)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(ready, f, ensure_ascii=False, indent=2)

    print(f"الأصلي: {len(sections)} section")
    print(f"اتقسّم منهم: {split_count} section كانوا أطول من {MAX_CHARS} حرف")
    print(f"النهائي بعد التقسيم: {len(ready)} chunk جاهز للـ embedding")
    max_len = max(c["char_count"] for c in ready)
    print(f"أطول chunk دلوقتي: {max_len} حرف")


if __name__ == "__main__":
    main()
