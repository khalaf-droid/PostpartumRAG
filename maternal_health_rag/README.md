# Maternal Mental Health RAG

نظام Retrieval-Augmented Generation بيجاوب على أسئلة عن صحة الأم النفسية أثناء الحمل
وبعد الولادة، بالاعتماد على مصادر طبية موثوقة (NICE Clinical Guideline 192، WHO Thinking
Healthy، WHO mhGAP).

## بنية المشروع

```
maternal_health_rag/
├── build_sections.py          # تفكيك ملفات PDF لأقسام متماسكة (section-aware chunking)
├── prepare_for_embedding.py   # تقسيم أي section كبير أوي لأجزاء أصغر قبل الـ embedding
├── ingest_embeddings.py       # عمل embedding للـ chunks بموديل Gemini
├── upload_to_supabase.py      # رفع الـ chunks + الـ embeddings على قاعدة بيانات Supabase
├── query_tester.py            # اختبار البحث الدلالي (retrieval) لوحده، من غير LLM
├── assistant.py                # الحلقة الكاملة: سؤال -> استرجاع -> إجابة بالعربي (RAG)
├── app.py                      # FastAPI backend يعرض assistant.py كـ API لتطبيق Flutter
├── requirements.txt
└── tests/
    ├── test_dataset.json       # بنك أسئلة + المصادر المتوقعة (benchmark)
    └── evaluate_precision.py   # حساب Precision@k الفعلي مقابل الـ benchmark
```

## الـ pipeline بالترتيب

1. `build_sections.py` — تفكيك PDFs لأقسام حسب العناوين
2. `prepare_for_embedding.py` — تقسيم أي section أطول من الحد المسموح
3. `ingest_embeddings.py` — embedding بموديل `gemini-embedding-001`
4. `upload_to_supabase.py` — تخزين في Supabase (pgvector)
5. `query_tester.py` أو `assistant.py` — الاستخدام الفعلي (بحث بس، أو بحث + إجابة)
6. `tests/evaluate_precision.py` — تقييم جودة الاسترجاع دوريًا

## المتغيرات البيئية المطلوبة (.env)

```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

انسخي `.env.example` لملف اسمه `.env` وحطي فيه القيم الحقيقية بتاعتك.
**متعمليش commit لملف `.env` نفسه على GitHub خالص** — ده فيه مفاتيحك السرية.

## تشغيل الـ API محليًا

```
pip install -r requirements.txt
uvicorn app:app --reload
```

## ملاحظة على مقياس الدقة (Precision)

الـ Precision@k في `tests/evaluate_precision.py` بيتحسب على مستوى **المصدر**
(هل النتيجة جاية من مصدر متوقع للسؤال ده ولا لأ)، مش على مستوى الجزء (chunk) نفسه
بدقة كاملة. ده مقياس عملي ومناسب لحجم المشروع ده، لكنه تقريبي وليس دقيقًا 100%.
