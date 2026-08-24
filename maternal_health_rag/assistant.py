"""
Full RAG pipeline:

question
    -> scope check
    -> retrieve nearest chunks from Supabase
    -> confidence check
    -> grounded Gemini answer
    -> cited answer in the same language as the question

Enforces:
- Domain scope check before retrieval
- No LLM call for clearly outside-scope questions
- Recommendation / Excerpt / Citation structure
- ONE Recommendation section
- ONE Excerpt section
- ONE Citation section
- Separate excerpts for separate sources/sections
- Exact citation format:
  [Document Name, Section X.Y, Page N]
- Confidence threshold before LLM generation
- No raw source display when the answer is refused
- Raw sources are displayed for successful answers
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


# ============================================================
# CONFIG
# ============================================================

EMBED_MODEL = "gemini-embedding-001"
CHAT_MODEL = "gemini-2.5-flash"

LOG_PATH = Path(__file__).parent / "logs" / "interaction_log.jsonl"

# Minimum similarity required before calling the LLM
CONFIDENCE_THRESHOLD = 0.55

# Confidence labels
HIGH_CONFIDENCE_THRESHOLD = 0.70
MEDIUM_CONFIDENCE_THRESHOLD = 0.60

# Section pattern examples:
# 1.4
# 1.4.9
# 12.5
SECTION_PATTERN = re.compile(
    r"\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b"
)


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """You are a specialized information assistant for maternal mental health during
pregnancy and the postnatal period, grounded strictly in the specific medical sources provided to you.

LANGUAGE RULE — VERY IMPORTANT:

You MUST answer in the same language as the user's question.

If the user's question is Arabic:

- The Recommendation must be written entirely in Arabic.
- All explanatory text must be written entirely in Arabic.
- Use simple, natural Egyptian Arabic.
- The Recommendation should sound like a normal, friendly chatbot
  response directly addressing the user.
- Do NOT translate the English medical source into the Excerpt.
- The Excerpt must remain exactly as it appears in the retrieved source.
- Do NOT let the English language of the retrieved sources affect
  the language of the Recommendation.

If the user's question is English:

- The Recommendation and all explanatory text must be in English.
- Use a warm, clear, direct tone.

The only English labels allowed in a substantive answer are:

Recommendation:
Excerpt:
Citation:

------------------------------------------------------------
1. DOMAIN SCOPE
------------------------------------------------------------

You are ONLY allowed to answer questions related to maternal mental
health during pregnancy and the postnatal period.

If the question is clearly unrelated to this domain, such as:

- sports
- football
- programming
- cooking
- entertainment
- unrelated technology
- unrelated general knowledge
- or any other unrelated topic

DO NOT answer the question.

For an outside-scope question:

- Give ONLY a short refusal.
- Use the SAME LANGUAGE as the user's question.
- Do NOT use Recommendation.
- Do NOT use Excerpt.
- Do NOT use Citation.
- Do NOT use information from the retrieved sources.

The refusal should clearly explain that you are an information assistant
specialized in maternal mental health during pregnancy and the
postnatal period.

------------------------------------------------------------
2. PERSONAL OPINION
------------------------------------------------------------

If the question asks for your personal opinion
(e.g. "what do you think about...", "what's better in your view..."):

Clarify that you are an information assistant and do not give
personal opinions.

Instead, provide objective information from the available sources
if relevant.

------------------------------------------------------------
3. SUBSTANTIVE ANSWER STRUCTURE
------------------------------------------------------------

Every substantive answer MUST contain exactly THREE sections.

There must be ONLY ONE Recommendation section.

There must be ONLY ONE Excerpt section.

There must be ONLY ONE Citation section.

The structure MUST be:

Recommendation:
[one coherent answer]

Excerpt:
[exact excerpt from source 1]

[exact excerpt from source 2, if needed]

Citation:
[citation for source 1]
[citation for source 2, if needed]

------------------------------------------------------------
4. RECOMMENDATION
------------------------------------------------------------

The Recommendation must be ONE coherent paragraph.

Do NOT create multiple Recommendation sections.

If multiple sources support the answer, naturally combine their
information into the SAME Recommendation paragraph.

The Recommendation must:

- directly answer the user's question
- be concise
- be natural
- be easy to understand
- use simple Egyptian Arabic when the question is Arabic
- contain only information supported by the retrieved sources

Do NOT make the Recommendation sound like a translation of the
English source.

------------------------------------------------------------
5. EXCERPTS
------------------------------------------------------------

There must be ONLY ONE Excerpt section.

If multiple sources or sections support the answer, place their
excerpts separately inside the same Excerpt section.

IMPORTANT:

- Each excerpt must come from EXACTLY ONE retrieved source chunk.
- Never merge text from two different sources.
- Never merge text from two different guideline sections.
- Never combine two excerpts into one continuous quotation.
- Each excerpt must be copied VERBATIM from the retrieved source.
- Do NOT translate the excerpt.
- Do NOT summarize the excerpt.
- Do NOT rewrite the excerpt.
- Do NOT add words to the excerpt.
- Do NOT remove words from the excerpt unless necessary to avoid
  irrelevant surrounding text.
- Do NOT invent punctuation or wording.

Keep separate excerpts visually separated.

------------------------------------------------------------
6. CITATIONS
------------------------------------------------------------

There must be ONLY ONE Citation section.

List the citations in the SAME ORDER as the excerpts.

Every citation MUST use exactly this format:

[Document Name, Section X.Y, Page N]

Example:

[NICE_CG192, Section 1.5.4, Page 19]

If the section number is not available:

[Document Name, Section: N/A, Page N]

Never provide a bare page number.

Never invent:

- document names
- section numbers
- page numbers
- citations

------------------------------------------------------------
7. MULTIPLE SOURCES
------------------------------------------------------------

When multiple sources support the answer:

DO NOT create:

Recommendation:
...

Excerpt:
...

Citation:
...

Recommendation:
...

Excerpt:
...

Citation:
...

Instead, create:

Recommendation:
[ONE coherent combined answer]

Excerpt:
[Exact excerpt from source 1]

[Exact excerpt from source 2]

Citation:
[Citation for source 1]

[Citation for source 2]

------------------------------------------------------------
8. INSUFFICIENT INFORMATION
------------------------------------------------------------

Only refuse due to insufficient information if the provided sources
are genuinely unrelated to the topic of the question.

If the sources are on-topic and related, even if they are not a
perfect or complete match, provide the best grounded answer possible.

Do NOT refuse simply because:

- the wording is different
- the match is not perfect
- the source covers a related angle
- the source discusses screening or monitoring
- the exact wording of the user's question does not appear

For example, screening and monitoring tools can be relevant to
maternal mental-health symptoms.

Only use a refusal when nothing in the provided sources meaningfully
relates to the user's question.

------------------------------------------------------------
9. GROUNDED ANSWERS ONLY
------------------------------------------------------------

Rely ONLY on the information in the provided sources.

Never add facts from your general knowledge.

Do not invent:

- medical advice
- statistics
- diagnoses
- recommendations
- citations
- section numbers
- page numbers
- source names
- symptoms not supported by the retrieved sources

------------------------------------------------------------
10. SYMPTOMS / DIAGNOSIS SAFETY
------------------------------------------------------------

If the answer involves symptoms or diagnosis, end the answer with
a short safety statement.

The statement must clarify that the information is not a substitute
for consulting a doctor or mental health professional.

Also clarify that if there are thoughts of self-harm or harming the
baby, the person must contact a doctor or specialized helpline
immediately.
"""


# ============================================================
# REFUSAL MESSAGES
# ============================================================

NO_MATCH_MESSAGE_AR = (
    "معنديش معلومات كافية في المصادر المتاحة عشان أجاوب على السؤال ده بثقة. "
    "جربي تسألي بطريقة تانية أو استشيري متخصص مباشرة."
)

NO_MATCH_MESSAGE_EN = (
    "I don't have enough information in the available sources to answer "
    "this confidently. Try rephrasing your question, or consult a "
    "specialist directly."
)

OUTSIDE_SCOPE_MESSAGE_AR = (
    "السؤال ده خارج نطاقي. أنا مساعد معلومات متخصص في الصحة النفسية "
    "للأمهات أثناء الحمل وفترة ما بعد الولادة."
)

OUTSIDE_SCOPE_MESSAGE_EN = (
    "This question is outside my scope. I am an information assistant "
    "specializing in maternal mental health during pregnancy and the "
    "postnatal period."
)


# ============================================================
# CLIENTS
# ============================================================

def get_gemini_client():
    return genai.Client(
        api_key=os.environ["GEMINI_API_KEY"]
    )


def get_supabase_client():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"]
    )


# ============================================================
# EMBEDDING
# ============================================================

def embed_query(text, client):

    result = client.models.embed_content(
        model=EMBED_MODEL,
        contents=[text],
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY"
        ),
    )

    return result.embeddings[0].values


# ============================================================
# RETRIEVAL
# ============================================================

def retrieve(
    query,
    gemini_client,
    supabase_client,
    top_k=8
):

    q_vector = embed_query(
        query,
        gemini_client
    )

    response = supabase_client.rpc(
        "match_sections",
        {
            "query_embedding": q_vector,
            "match_count": top_k,
        },
    ).execute()

    return response.data


# ============================================================
# SECTION EXTRACTION
# ============================================================

def extract_section(text):
    """
    Best-effort extraction of a guideline section number.

    Examples:
        1.4
        1.4.9
        12.5
    """

    match = SECTION_PATTERN.search(text)

    if match:
        return match.group()

    return None


# ============================================================
# SPLIT RETRIEVED TEXT INTO SECTIONS
# ============================================================

def split_into_sections(text):
    """
    Split a retrieved chunk into separate guideline sections.

    Example:

        1.5.3
        text...

        1.5.4
        text...

    becomes:

        ("1.5.3", "text...")
        ("1.5.4", "text...")
    """

    matches = list(
        SECTION_PATTERN.finditer(text)
    )

    if not matches:
        return [
            ("N/A", text.strip())
        ]

    sections = []

    for i, match in enumerate(matches):

        section_number = match.group()

        start = match.end()

        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(text)

        section_text = text[
            start:end
        ].strip()

        if section_text:

            sections.append(
                (
                    section_number,
                    section_text
                )
            )

    return sections


# ============================================================
# CONTEXT
# ============================================================

def build_context(chunks):

    parts = []

    for c in chunks:

        section = (
            extract_section(
                c["text"]
            )
            or "N/A"
        )

        parts.append(
            f"[Document: {c['source']}, "
            f"Section: {section}, "
            f"Page: {c['page']}]\n"
            f"{c['text']}"
        )

    return "\n\n---\n\n".join(parts)


# ============================================================
# LANGUAGE
# ============================================================

def is_arabic(text):

    return bool(
        re.search(
            r"[\u0600-\u06FF]",
            text
        )
    )


def get_language_instruction(query):

    if is_arabic(query):

        return """
IMPORTANT LANGUAGE INSTRUCTION:

The user's question is in Arabic.

The Recommendation MUST be entirely in Arabic.

Use simple, natural Egyptian Arabic.

The Recommendation should sound like a normal,
friendly chatbot response directly answering the user.

Do NOT answer the Recommendation in English.

The Excerpt MUST remain exactly as it appears
in the retrieved source.

Do NOT translate the Excerpt.

The Citation format must remain exactly as specified.

The only English labels allowed are:

Recommendation:
Excerpt:
Citation:
"""

    return """
IMPORTANT LANGUAGE INSTRUCTION:

The user's question is in English.

The Recommendation must be entirely in English.

The Excerpt must remain exactly as it appears
in the retrieved source.

The only required labels are:

Recommendation:
Excerpt:
Citation:
"""


# ============================================================
# DOMAIN SCOPE CHECK
# ============================================================

def is_outside_scope(query):
    """
    Local rule-based scope check.

    This runs BEFORE retrieval.

    It prevents clearly unrelated questions from reaching
    the RAG pipeline or Gemini.
    """

    query_lower = query.lower().strip()

    outside_scope_keywords = [

        # ----------------------------------------------------
        # Sports
        # ----------------------------------------------------

        "football",
        "soccer",
        "basketball",
        "tennis",
        "baseball",
        "volleyball",
        "cricket",

        "لاعب كرة",
        "كرة القدم",
        "كرة السلة",
        "كرة الطائرة",
        "مباراة",
        "فريق",
        "الدوري",
        "كأس العالم",

        # ----------------------------------------------------
        # Programming / Technology
        # ----------------------------------------------------

        "python",
        "javascript",
        "typescript",
        "flutter",
        "dart",
        "java",
        "c++",
        "programming",
        "coding",
        "code",
        "api",
        "database",
        "supabase",
        "github",
        "machine learning",
        "deep learning",
        "artificial intelligence",

        "برمجة",
        "كود",
        "بايثون",
        "فلاتر",
        "جافا",
        "ذكاء اصطناعي",

        # ----------------------------------------------------
        # Cooking / Food
        # ----------------------------------------------------

        "recipe",
        "recipes",
        "cooking",
        "cook",
        "food",

        "وصفة",
        "طبخ",
        "أكلة",
        "اكل",
        "أكل",

        # ----------------------------------------------------
        # Entertainment
        # ----------------------------------------------------

        "movie",
        "film",
        "song",
        "music",
        "game",
        "gaming",
        "series",

        "فيلم",
        "مسلسل",
        "أغنية",
        "موسيقى",
        "لعبة",
        "العاب",

        # ----------------------------------------------------
        # Other clearly unrelated domains
        # ----------------------------------------------------

        "weather",
        "stock market",
        "cryptocurrency",
        "bitcoin",

        "الطقس",
        "الأسهم",
        "بيتكوين",
        "عملات رقمية",
    ]

    return any(
        keyword in query_lower
        for keyword in outside_scope_keywords
    )


# ============================================================
# CONFIDENCE
# ============================================================

def confidence_label(top_score):

    if top_score >= HIGH_CONFIDENCE_THRESHOLD:
        return "High"

    if top_score >= MEDIUM_CONFIDENCE_THRESHOLD:
        return "Medium"

    return "Low"


# ============================================================
# LOGGING
# ============================================================

def log_interaction(
    query,
    reply,
    chunks,
    refused,
    confidence
):

    LOG_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    entry = {

        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),

        "question": query,

        "answer": reply,

        "refused": refused,

        "confidence": confidence,

        "top_similarity": (
            chunks[0]["similarity"]
            if chunks
            else None
        ),

        "sources": [

            {
                "source": c["source"],

                "section": (
                    extract_section(
                        c["text"]
                    )
                ),

                "page": c["page"],

                "similarity": (
                    c["similarity"]
                ),
            }

            for c in chunks
        ],
    }

    with open(
        LOG_PATH,
        "a",
        encoding="utf-8"
    ) as f:

        f.write(
            json.dumps(
                entry,
                ensure_ascii=False
            )
            + "\n"
        )


# ============================================================
# ANSWER
# ============================================================

def answer(
    query,
    gemini_client,
    supabase_client,
    top_k=8
):

    # ========================================================
    # STEP 1 — DOMAIN SCOPE CHECK
    # ========================================================

    if is_outside_scope(query):

        message = (
            OUTSIDE_SCOPE_MESSAGE_AR
            if is_arabic(query)
            else OUTSIDE_SCOPE_MESSAGE_EN
        )

        return (
            message,
            [],
            True,
            "Low"
        )

    # ========================================================
    # STEP 2 — RETRIEVE
    # ========================================================

    chunks = retrieve(
        query,
        gemini_client,
        supabase_client,
        top_k
    )

    # ========================================================
    # STEP 3 — CONFIDENCE
    # ========================================================

    top_score = (
        chunks[0]["similarity"]
        if chunks
        else 0.0
    )

    confidence = confidence_label(
        top_score
    )

    # ========================================================
    # STEP 4 — LOW CONFIDENCE REFUSAL
    # ========================================================

    if (
        not chunks
        or top_score < CONFIDENCE_THRESHOLD
    ):

        message = (
            NO_MATCH_MESSAGE_AR
            if is_arabic(query)
            else NO_MATCH_MESSAGE_EN
        )

        return (
            message,
            [],
            True,
            confidence
        )

    # ========================================================
    # STEP 5 — BUILD CONTEXT
    # ========================================================

    context = build_context(
        chunks
    )

    # ========================================================
    # STEP 6 — LANGUAGE INSTRUCTION
    # ========================================================

    language_instruction = (
        get_language_instruction(
            query
        )
    )

    # ========================================================
    # STEP 7 — PROMPT
    # ========================================================

    prompt = f"""
{language_instruction}

Sources:
{context}

User question:
{query}
"""

    # ========================================================
    # STEP 8 — GENERATE ANSWER
    # ========================================================

    try:

        response = (
            gemini_client.models.generate_content(
                model=CHAT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.3,
                ),
            )
        )

    except Exception as e:

        print(
            f"\nGemini generation error: {e}\n"
        )

        return (
            NO_MATCH_MESSAGE_AR
            if is_arabic(query)
            else NO_MATCH_MESSAGE_EN,
            [],
            True,
            "Low"
        )

    reply_text = (
        response.text.strip()
        if response.text
        else ""
    )

    # ========================================================
    # STEP 9 — DETECT LLM REFUSAL
    # ========================================================

    llm_refused = (
        "Citation:" not in reply_text
    )

    if llm_refused:

        # IMPORTANT:
        # Do NOT expose raw sources when the LLM refused.

        return (
            reply_text,
            [],
            True,
            "Low"
        )

    # ========================================================
    # STEP 10 — SUCCESSFUL ANSWER
    # ========================================================

    return (
        reply_text,
        chunks,
        False,
        confidence
    )


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":

    gemini_client = (
        get_gemini_client()
    )

    supabase_client = (
        get_supabase_client()
    )

    print(
        "Type your question, or type 'exit' to quit.\n"
    )

    while True:

        query = input(
            "Question: "
        )

        if query.strip().lower() in [
            "exit",
            "quit"
        ]:
            break

        # ====================================================
        # RUN RAG
        # ====================================================

        reply, sources, refused, confidence = answer(
            query,
            gemini_client,
            supabase_client,
            top_k=8
        )

        # ====================================================
        # LOG
        # ====================================================

        log_interaction(
            query,
            reply,
            sources,
            refused,
            confidence
        )

        # ====================================================
        # ANSWER
        # ====================================================

        print(
            f"\nConfidence: {confidence}"
        )

        print(
            "\nAnswer:\n"
        )

        print(reply)

        # ====================================================
        # RAW SOURCES
        #
        # Show ONLY for successful in-scope answers.
        # Do NOT show them for refusals.
        # ====================================================

        if sources and not refused:

            print(
                "\n---\n"
                "Raw source chunks the model relied on "
                "(to verify it's not hallucinating):\n"
            )

            for c in sources:

                section = (
                    extract_section(
                        c["text"]
                    )
                    or "N/A"
                )

                print(
                    f"[{c['similarity']:.3f}] "
                    f"{c['source']} "
                    f"(Section {section}, "
                    f"Page {c['page']})"
                )

                print(
                    c["text"]
                )

                print()

            avg_similarity = (
                sum(
                    c["similarity"]
                    for c in sources
                )
                / len(sources)
            )

            print(
                f"Average similarity score "
                f"for top {len(sources)} results: "
                f"{avg_similarity:.3f}"
            )

        # ====================================================
        # SEPARATOR
        # ====================================================

        print(
            "\n" + "=" * 50 + "\n"
        )