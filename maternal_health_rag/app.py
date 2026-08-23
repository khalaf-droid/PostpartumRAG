"""
FastAPI backend wrapping the RAG pipeline,
so a Flutter app (or anything else) can call it.

Local run:
    pip install -r requirements.txt
    uvicorn app:app --reload

Then:
    http://127.0.0.1:8000

Interactive docs:
    http://127.0.0.1:8000/docs
"""

import json
import logging
import os
import re
import secrets
from typing import Optional

from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, HTTPException, Request, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from google import genai
from google.genai import types

from supabase import create_client

# ── Structured Logging ─────────────────────────────────────
logger = logging.getLogger("rag_api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


# ============================================================
# CONFIG
# ============================================================

EMBED_MODEL = "gemini-embedding-001"
CHAT_MODEL = "gemini-1.5-flash"

LOG_PATH = (
    Path(__file__).parent
    / "logs"
    / "interaction_log.jsonl"
)

# Minimum similarity required before
# calling the LLM.
CONFIDENCE_THRESHOLD = 0.55

HIGH_CONFIDENCE_THRESHOLD = 0.70
MEDIUM_CONFIDENCE_THRESHOLD = 0.60

SECTION_PATTERN = re.compile(
    r"\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\b"
)


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """You are a specialized information assistant for maternal mental health during
pregnancy and the postnatal period, grounded strictly in the specific medical sources provided to you.

LANGUAGE RULE — VERY IMPORTANT:
You MUST answer entirely in the same language as the user's question.

- If the user's question is Arabic, EVERYTHING in your answer must be in Arabic.
- If the user's question is English, EVERYTHING in your answer must be in English.
- Do NOT switch languages because the retrieved sources are written in English.
- The language of the retrieved sources must NEVER determine the language of your answer.

If asked in Arabic, use simple Egyptian Arabic, with a warm, reassuring, direct tone.
If asked in English, use a warm, direct tone.

Strict rules you must follow exactly:

1. DOMAIN SCOPE

If the question falls entirely outside your domain
(maternal mental health during pregnancy and the postnatal period) —
general knowledge, programming, cooking, sports, or any unrelated topic —
state clearly that the question is outside your scope.

Do not attempt to answer an unrelated question.
Give ONLY a short refusal in the SAME LANGUAGE as the user's question.
Do NOT use information from the retrieved sources to answer it.

2. PERSONAL OPINION

If the question asks for your personal opinion,
clarify that you are an information assistant and do not give personal opinions.

3. SUBSTANTIVE ANSWER STRUCTURE

Write a natural, flowing response that directly answers the user's question based on the provided sources.
DO NOT use labels like "Recommendation:", "Excerpt:", or "Citation:". Just write the answer naturally.

4. CITATIONS

Every substantive factual claim must be supported by a retrieved source.
When you use information from a source, you MUST cite it by using the source's index number in brackets, like [1], [2], [3].
You can find the index number of each source implicitly based on the order they are provided to you (the first source is [1], the second is [2], etc.).
DO NOT output the document name, section, or page number in the text. Only use the bracketed numbers.

5. INSUFFICIENT INFORMATION

Only refuse due to insufficient information if the provided sources are genuinely unrelated.

If the sources are on-topic and related, synthesize the best possible answer from what is actually provided.

Do not refuse simply because the wording differs from the source.

6. GROUNDED ANSWERS ONLY

Rely ONLY on the information in the provided sources.

Never add facts from general knowledge.

Do not invent medical advice, statistics, diagnoses,
recommendations, citations, sections, pages, or source names.

7. CITATIONS

Every substantive factual claim must be supported by a retrieved source.

Every Citation MUST contain:
- Document Name
- Section number or Section: N/A
- Page number

8. SYMPTOMS / DIAGNOSIS SAFETY

End any answer involving symptoms or diagnosis with a short sentence
clarifying that this is not a substitute for consulting a doctor or mental health professional.

In case of thoughts of self-harm or harming the baby,
the person must contact a doctor or a specialized helpline immediately.
"""


# ============================================================
# REFUSAL MESSAGES
# ============================================================

NO_MATCH_MESSAGE_AR = (
    "معنديش معلومات كافية في المصادر المتاحة عشان أجاوب على السؤال ده بثقة. "
    "جربي تسألي بطريقة تانية أو استشيري متخصص مباشرة."
)

NO_MATCH_MESSAGE_EN = (
    "I don't have enough information in the available sources to answer this confidently. "
    "Try rephrasing your question, or consult a specialist directly."
)

OUTSIDE_SCOPE_MESSAGE_AR = (
    "السؤال ده خارج نطاقي. أنا مساعد معلومات متخصص في الصحة النفسية للأمهات "
    "أثناء الحمل وفترة ما بعد الولادة."
)

OUTSIDE_SCOPE_MESSAGE_EN = (
    "This question is outside my scope. I am an information assistant specializing "
    "in maternal mental health during pregnancy and the postnatal period."
)


# ============================================================
# FASTAPI
# ============================================================

# Disable interactive docs in production (information disclosure)
_is_prod = os.environ.get("ENV", "development").lower() == "production"

app = FastAPI(
    title="Maternal Mental Health RAG API",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)


# ============================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Remove server header
    if "server" in response.headers:
        del response.headers["server"]
    return response


# ============================================================
# CORS — RESTRICTED TO ALLOWED ORIGINS
# ============================================================

_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:4200,http://127.0.0.1:4200"
).split(",")

# Add production origins
_allowed_origins.extend([
    "https://postpartum-backend.onrender.com",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins if o.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,
)


# ============================================================
# CLIENT CACHE
# ============================================================

_gemini_client = None
_supabase_client = None


def get_gemini_client():

    global _gemini_client

    if _gemini_client is None:

        _gemini_client = genai.Client(
            api_key=os.environ[
                "GEMINI_API_KEY"
            ]
        )

    return _gemini_client


def get_supabase_client():

    global _supabase_client

    if _supabase_client is None:

        _supabase_client = create_client(
            os.environ[
                "SUPABASE_URL"
            ],
            os.environ[
                "SUPABASE_KEY"
            ],
        )

    return _supabase_client


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================

class AskRequest(BaseModel):
    model_config = {"extra": "forbid"}

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's question (1-2000 characters)",
    )

    top_k: int = Field(
        default=8,
        ge=1,
        le=15,
        description="Number of chunks to retrieve (1-15)",
    )

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty")
        return v


class SourceItem(BaseModel):

    source: str

    section: str

    page: int | None

    excerpt: str | None

    similarity: float


class AskResponse(BaseModel):

    answer: str

    confidence: str

    sources: list[SourceItem]


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
# SECTION
# ============================================================

def extract_section(text):

    match = SECTION_PATTERN.search(
        text
    )

    if match:
        return match.group()

    return "N/A"


# ============================================================
# CONTEXT
# ============================================================

def build_context(chunks):

    parts = []

    for i, c in enumerate(chunks, start=1):

        section = extract_section(
            c["text"]
        )

        parts.append(
            f"Source [{i}]:\n"
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
Your ENTIRE response must be in Arabic.
Do NOT answer in English even if all retrieved sources are in English.
Use simple Egyptian Arabic.
DO NOT use labels like Recommendation, Excerpt, or Citation.
"""

    return """
IMPORTANT LANGUAGE INSTRUCTION:
The user's question is in English.
Your ENTIRE response must be in English.
DO NOT use labels like Recommendation, Excerpt, or Citation.
"""


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
# SOURCE ITEMS
# ============================================================

def to_source_items(chunks):

    return [

        SourceItem(
            source=c["source"],

            section=extract_section(
                c["text"]
            ),

            page=c["page"],

            excerpt=c["text"],

            similarity=c["similarity"],
        )

        for c in chunks
    ]


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

        "timestamp":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "question":
            query,

        "answer":
            reply,

        "refused":
            refused,

        "confidence":
            confidence,

        "top_similarity":
            chunks[0]["similarity"]
            if chunks
            else None,

        "sources": [

            {
                "source":
                    c["source"],

                "section":
                    extract_section(
                        c["text"]
                    ),

                "page":
                    c["page"],

                "similarity":
                    c["similarity"],
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
# HEALTH CHECK
# ============================================================

@app.get("/")
def health_check():

    return {
        "status": "ok"
    }


# ============================================================
# INTERNAL AUTHENTICATION
# ============================================================

def verify_internal_api_key(request: Request):
    expected_api_key = os.environ.get("INTERNAL_API_KEY")
    
    if not expected_api_key:
        logger.error("INTERNAL_API_KEY environment variable is not set!")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error"
        )
        
    x_internal_api_key = request.headers.get("x-internal-api-key")
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, expected_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key"
        )

# ============================================================
# ASK
# ============================================================

@app.post(
    "/ask",
    response_model=AskResponse,
    dependencies=[Depends(verify_internal_api_key)]
)
def ask(request: AskRequest):

    # --------------------------------------------------------
    # Validate question
    # --------------------------------------------------------

    if not request.question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question is empty"
        )

    # --------------------------------------------------------
    # Deterministic Mock for Test Environments
    # --------------------------------------------------------
    if os.environ.get("TEST_MODE") == "true":
        return AskResponse(
            answer="This is a deterministic mock answer for security testing.",
            confidence="High",
            sources=[
                SourceItem(
                    source="Mock Security Document",
                    section="1.0",
                    page=1,
                    excerpt="This mock excerpt proves the authentication architecture works.",
                    similarity=0.99
                )
            ]
        )

    gemini_client = (
        get_gemini_client()
    )

    supabase_client = (
        get_supabase_client()
    )

    # --------------------------------------------------------
    # Retrieval
    # --------------------------------------------------------

    try:

        chunks = retrieve(
            request.question,
            gemini_client,
            supabase_client,
            request.top_k
        )

    except Exception as e:

        logger.error(f"Retrieval failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Evidence retrieval temporarily unavailable. Please try again."
        )

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    top_score = (

        chunks[0]["similarity"]
        if chunks
        else 0.0
    )

    confidence = confidence_label(
        top_score
    )

    # --------------------------------------------------------
    # Low confidence refusal
    #
    # IMPORTANT:
    # Return NO sources.
    # --------------------------------------------------------

    if (
        not chunks
        or top_score < CONFIDENCE_THRESHOLD
    ):

        message = (

            NO_MATCH_MESSAGE_AR
            if is_arabic(
                request.question
            )

            else

            NO_MATCH_MESSAGE_EN
        )

        log_interaction(
            request.question,
            message,
            [],
            True,
            confidence
        )

        return AskResponse(

            answer=message,

            confidence=confidence,

            sources=[]
        )

    # --------------------------------------------------------
    # Build context
    # --------------------------------------------------------

    context = build_context(
        chunks
    )

    language_instruction = (
        get_language_instruction(
            request.question
        )
    )

    prompt = f"""
{language_instruction}

Sources:
{context}

User question:
{request.question}
"""

    # --------------------------------------------------------
    # Generate
    # --------------------------------------------------------

    try:

        response = (
            gemini_client
            .models
            .generate_content(

                model=CHAT_MODEL,

                contents=prompt,

                config=types.GenerateContentConfig(

                    system_instruction=
                        SYSTEM_PROMPT,

                    temperature=0.3,
                ),
            )
        )

    except Exception as e:

        logger.error(f"Answer generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Answer generation temporarily unavailable. Please try again."
        )

    reply_text = response.text

    # --------------------------------------------------------
    # Detect LLM refusal
    #
    # If there is no [1] or similar citation,
    # treat it as refusal and DO NOT return sources.
    # --------------------------------------------------------

    llm_refused = (
        not bool(re.search(r'\[\d+\]', reply_text))
    )

    if llm_refused:

        final_confidence = "Low"

        log_interaction(
            request.question,
            reply_text,
            [],
            True,
            final_confidence
        )

        return AskResponse(

            answer=reply_text,

            confidence=final_confidence,

            sources=[]
        )

    # --------------------------------------------------------
    # Successful answer
    # --------------------------------------------------------

    log_interaction(
        request.question,
        reply_text,
        chunks,
        False,
        confidence
    )

    return AskResponse(

        answer=reply_text,

        confidence=confidence,

        sources=to_source_items(
            chunks
        )
    )