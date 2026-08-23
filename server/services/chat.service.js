/**
 * RAG Service Adapter — Security Hardened
 *
 * Security features applied (per Anthropic Cybersecurity Skills):
 * - NoSQL Injection defense: question sanitized to reject MongoDB operators (CWE-943)
 * - Input length cap before forwarding to RAG API (API schema validation)
 * - Request timeout to prevent hanging connections (DoS mitigation)
 * - Error masking: internal RAG API errors never leaked to client (CWE-209)
 * - Prompt injection defense: basic regex filter for common injection patterns
 * - Response sanitization: strip unexpected fields from RAG response
 */
import { ApiError } from '../utils/ApiError.js';

class ChatService {
  /**
   * Sanitize user question before sending to RAG API.
   * Defends against:
   * - NoSQL operator injection ($ne, $gt, $regex, $where, $exists)
   * - Prompt injection patterns (instruction override attempts)
   * - Excessive length (DoS via context window flooding)
   */
  static sanitizeQuestion(question) {
    if (typeof question !== 'string') {
      throw new ApiError(400, 'Invalid question format');
    }

    // Strip MongoDB/NoSQL operators that could be injected
    // Ref: exploiting-nosql-injection-vulnerabilities skill
    const nosqlPattern = /\$(?:ne|gt|gte|lt|lte|in|nin|regex|where|exists|or|and|not|nor|elemMatch|size|type|mod|text|search|all|expr)/gi;
    if (nosqlPattern.test(question)) {
      throw new ApiError(400, 'Invalid characters in question');
    }

    // Basic prompt injection defense
    // Ref: detecting-indirect-prompt-injection & testing-prompt-injection-in-rag-pipelines skills
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /ignore\s+(all\s+)?prior\s+(context|instructions)/i,
      /disregard\s+(all\s+)?previous/i,
      /system\s*:\s*you\s+are/i,
      /\[system\]/i,
      /<<\s*SYS\s*>>/i,
      /\bNOTE\s+TO\s+ASSISTANT\b/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(question)) {
        console.warn(`[SECURITY] Prompt injection attempt detected: "${question.substring(0, 50)}..."`);
        throw new ApiError(400, 'Your question contains disallowed patterns. Please rephrase.');
      }
    }

    // Length enforcement (defense in depth — Zod validates at route level too)
    if (question.length > 2000) {
      throw new ApiError(400, 'Question exceeds maximum length');
    }

    return question.trim();
  }

  /**
   * Sanitize RAG API response to prevent data leakage.
   * Only pass through expected fields.
   */
  static sanitizeResponse(data) {
    return {
      answer: typeof data.answer === 'string' ? data.answer : '',
      sources: Array.isArray(data.sources) ? data.sources.map((s) => ({
        source: typeof s.source === 'string' ? s.source : '',
        section: typeof s.section === 'string' ? s.section : 'N/A',
        page: typeof s.page === 'number' ? s.page : null,
        excerpt: typeof s.excerpt === 'string' ? s.excerpt : '',
        similarity: typeof s.similarity === 'number' ? s.similarity : 0,
      })) : [],
      confidence: typeof data.confidence === 'string' ? data.confidence : 'unknown',
    };
  }

  async processQuery(question, previousMessages = [], options = {}) {
    const startTime = Date.now();

    // 1) Sanitize question input
    const sanitizedQuestion = ChatService.sanitizeQuestion(question);

    // 2) Resolve RAG API URL
    let ragApiUrl = process.env.RAG_API_URL;
    if (!ragApiUrl) {
      ragApiUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://postpartum-rag-api.onrender.com/ask'
          : 'http://127.0.0.1:8000/ask';
    }

    if (!ragApiUrl.endsWith('/ask')) {
      ragApiUrl = ragApiUrl.replace(/\/$/, '') + '/ask';
    }

    try {
      // 3) Forward to RAG API with timeout
      const response = await fetch(ragApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({
          question: sanitizedQuestion,
          top_k: Math.min(Math.max(options.topK || 8, 1), 15), // Clamp 1-15
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout (reduced from 60s)
      });

      if (!response.ok) {
        // Log the error server-side but don't expose RAG internals to client
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[RAG API Error] Status: ${response.status}, Body: ${errorText.substring(0, 200)}`);
        throw new ApiError(503, 'The evidence service is temporarily unavailable. Please try again.');
      }

      const rawData = await response.json();
      const latencyMs = Date.now() - startTime;

      // 4) Sanitize response — only pass through expected fields
      const data = ChatService.sanitizeResponse(rawData);

      const evidence = data.sources.map((source) => ({
        title: source.source,
        section: source.section,
        documentId: source.source,
        page: source.page,
        excerpt: source.excerpt,
        relevanceScore: source.similarity,
      }));

      return {
        answer: data.answer,
        evidence: evidence,
        metadata: {
          confidence: data.confidence,
          latencyMs,
          source: 'python-rag-api',
        },
      };
    } catch (err) {
      // Never expose internal errors to clients
      console.error('[RAG Service Error]', err.message);

      // Re-throw user-friendly errors, mask internal ones
      if (err.isOperational) {
        throw err;
      }

      throw new ApiError(500, 'Unable to process your question at this time. Please try again.');
    }
  }
}

export const chatService = new ChatService();
