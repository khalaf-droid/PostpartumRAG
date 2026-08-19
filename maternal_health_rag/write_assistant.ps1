@'
"""
Full RAG pipeline: question -> retrieve nearest chunks from Supabase -> grounded,
cited answer in the same language as the question.

Enforces:
- Recommendation / Excerpt / Citation structure in every answer
- Citation format: [Document Name, Section X.Y, Page N]
- A confidence threshold that triggers refusal before generation
  (no relevant-enough chunks -> no call to the LLM at all)
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types
from supabase import create_client

EMBED_MODEL = "gemini-embedding-001"
CHAT_MODEL = "gemini-2.5-flash"

LOG_PATH = Path(__file__).parent / "logs" / "interaction_log.jsonl"

# Minimum top-1 similarity score required before we even ask the model to answer.
# Below this, we refuse locally instead of risking an improvised answer.
CONFIDENCE_THRESHOLD = 0.55

# Bands for labeling confidence once we DO answer, based on observed score ranges
# in this project (good matches typically land around 0.65-0.72).
HIGH_CONFIDENCE_THRESHOLD = 0.70
MEDIUM_CONFIDENCE_THRESHOLD = 0.60

SECTION_PATTERN = re.compile(r"\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b")

SYSTEM_PROMPT = """You are a specialized information assistant for maternal mental health during \
pregnancy and the postnatal period, grounded strictly in the specific medical sources provided to you.

Reply in exactly the same language as the user's question: if asked in Arabic, reply in simple \
Egyptian Arabic, in a warm, reassuring, direct tone. If asked in English, reply in English with the \
same warm, direct tone.

Strict rules you must follow exactly:

1. If the question falls entirely outside your domain (maternal mental health during pregnancy and \
the postnatal period) -- general knowledge, programming, cooking, sports, or any unrelated topic -- \
state clearly that the question is outside your scope. Do not attempt to answer it even if you know \
the answer.

2. If the question asks for your personal opinion (e.g. "what do you think about...", "what's better \
in your view..."), clarify that you are an information assistant and do not give personal opinions. \
Offer the objective information available in the sources instead, if any is relevant.

3. Structure every substantive answer as exactly three labeled parts, in this order. Always use \
these exact English labels -- "Recommendation:", "Excerpt:", "Citation:" -- even when the rest of \
your answer is in Arabic, so the structure stays machine-parseable:
   - Recommendation: a short, direct answer to the question in plain language
   - Excerpt: the exact retrieved text that supports the recommendation, quoted verbatim
   - Citation: in the exact format [Document Name, Section X.Y, Page N] -- always include all three \
     parts of the citation. If a section number was not provided for that source, write "Section: N/A" \
     instead of omitting it. Never give a bare page number alone.
   If more than one source supports the answer, repeat the three-part block for each source.

4. Only refuse due to insufficient information if the provided sources are genuinely unrelated to \
the topic of the question. If the sources are on-topic and related, even if not a perfect or complete \
match, synthesize the best possible Recommendation/Excerpt/Citation answer from what is actually \
there -- do not refuse just because the wording isn't a perfect match, or because the excerpt covers \
a related angle (for example, screening and monitoring tools ARE part of addressing symptoms, not a \
separate unrelated topic). Only use the plain refusal statement (no Recommendation/Excerpt/Citation \
block) when nothing in the sources meaningfully relates to what was asked.

Rely only on the information in the sources provided below. Never add facts from your general \
knowledge, even if you know them to be true.

End any answer involving symptoms or diagnosis with a short sentence clarifying that this is not a \
substitute for consulting a doctor or mental health professional, and that in case of thoughts of \
self-harm or harming the baby, the person must contact a doctor or a specialized helpline immediately."""

NO_MATCH_MESSAGE_AR = (
    "معنديش معلومات كافية في المصادر المتاحة عشان أجاوب على السؤال ده بثقة. "
    "جربي تسألي بطريقة تانية أو استشيري متخصص مباشرة."
)
NO_MATCH_MESSAGE_EN = (
    "I don't have enough information in the available sources to answer this confidently. "
    "Try rephrasing your question, or consult a specialist directly."
)


def get_gemini_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def get_supabase_client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def embed_query(text, client):
    result = client.models.embed_content(
        model=EMBED_MODEL,
        contents=[text],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return result.embeddings[0].values


def retrieve(query, gemini_client, supabase_client, top_k=5):
    q_vector = embed_query(query, gemini_client)
    response = supabase_client.rpc(
        "match_sections",
        {"query_embedding": q_vector, "match_count": top_k},
    ).execute()
    return response.data


def extract_section(text):
    """Best-effort extraction of a guideline section number (e.g. '1.4.9') from raw chunk text."""
    match = SECTION_PATTERN.search(text)
    return match.group() if match else None


def build_context(chunks):
    parts = []
    for c in chunks:
        section = extract_section(c["text"]) or "N/A"
        parts.append(
            f"[Document: {c['source']}, Section: {section}, Page: {c['page']}]\n{c['text']}"
        )
    return "\n\n---\n\n".join(parts)


def is_arabic(text):
    return bool(re.search(r"[\u0600-\u06FF]", text))


def confidence_label(top_score):
    """Classify how confident we are in an answer, based on the top retrieval similarity score."""
    if top_score >= HIGH_CONFIDENCE_THRESHOLD:
        return "High"
    if top_score >= MEDIUM_CONFIDENCE_THRESHOLD:
        return "Medium"
    return "Low"


def log_interaction(query, reply, chunks, refused, confidence):
    """Append this Q&A exchange to a JSON Lines log file for later review or Day 5 demo prep."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "question": query,
        "answer": reply,
        "refused": refused,
        "confidence": confidence,
        "top_similarity": chunks[0]["similarity"] if chunks else None,
        "sources": [
            {
                "source": c["source"],
                "section": extract_section(c["text"]),
                "page": c["page"],
                "similarity": c["similarity"],
            }
            for c in chunks
        ],
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def answer(query, gemini_client, supabase_client, top_k=8):
    chunks = retrieve(query, gemini_client, supabase_client, top_k)

    top_score = chunks[0]["similarity"] if chunks else 0.0
    confidence = confidence_label(top_score)

    if not chunks or top_score < CONFIDENCE_THRESHOLD:
        message = NO_MATCH_MESSAGE_AR if is_arabic(query) else NO_MATCH_MESSAGE_EN
        return message, chunks, True, confidence

    context = build_context(chunks)

    prompt = f"""Sources:
{context}

User question: {query}"""

    response = gemini_client.models.generate_content(
        model=CHAT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
        ),
    )

    # The LLM itself may still decide to refuse (Rule 4) even when our local similarity
    # threshold passed. We detect that by checking for the mandatory "Citation:" label --
    # if it's missing, treat this as a refusal and downgrade confidence to Low, so the
    # confidence label always matches what actually happened.
    reply_text = response.text
    llm_refused = "Citation:" not in reply_text
    final_confidence = "Low" if llm_refused else confidence

    return reply_text, chunks, llm_refused, final_confidence


if __name__ == "__main__":
    gemini_client = get_gemini_client()
    supabase_client = get_supabase_client()

    print("Type your question, or type 'exit' to quit.\n")
    while True:
        query = input("Question: ")
        if query.strip().lower() in ["exit", "quit"]:
            break

        reply, sources, refused, confidence = answer(query, gemini_client, supabase_client)
        log_interaction(query, reply, sources, refused, confidence)

        print(f"\nConfidence: {confidence}")
        print("\nAnswer:\n")
        print(reply)

        if sources:
            print("\n---\nRaw source chunks the model relied on (to verify it's not hallucinating):\n")
            for c in sources:
                section = extract_section(c["text"]) or "N/A"
                print(f"[{c['similarity']:.3f}] {c['source']} (Section {section}, Page {c['page']})")
                print(c["text"])
                print()

            avg_similarity = sum(c["similarity"] for c in sources) / len(sources)
            print(f"Average similarity score for top {len(sources)} results: {avg_similarity:.3f}")

        print("\n" + "=" * 50 + "\n")
'@ | Set-Content -Path assistant.py -Encoding UTF8
