/**
 * RAG Service Adapter (Stub for Phase 2)
 * 
 * This service acts as the integration point for the Python RAG Pipeline.
 * Currently, it returns a stubbed response. The Data Science / RAG team will
 * replace the logic inside `processQuery` to call the Python microservice.
 */

import http from 'http';
import https from 'https';

class ChatService {
  async processQuery(question, previousMessages = [], options = {}) {
    const startTime = Date.now();
    
    // استخدم رابط الـ RAG من المتغيرات البيئية أو استخدم اللوكال هوست كبديل
    const ragApiUrl = process.env.RAG_API_URL || 'http://127.0.0.1:8000/ask';
    
    try {
      const response = await fetch(ragApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          top_k: 8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RAG API responded with status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      
      const evidence = (data.sources || []).map(source => ({
        title: source.source,
        section: source.section || 'N/A',
        documentId: source.source,
        page: source.page,
        excerpt: source.excerpt || '', 
        relevanceScore: source.similarity
      }));

      return {
        answer: data.answer,
        evidence: evidence,
        metadata: {
          confidence: data.confidence,
          latencyMs,
          source: "python-rag-api"
        }
      };
    } catch (err) {
      console.error("Error communicating with RAG pipeline:", err);
      throw err;
    }
  }
}

export const chatService = new ChatService();
