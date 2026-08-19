/**
 * RAG Service Adapter (Stub for Phase 2)
 * 
 * This service acts as the integration point for the Python RAG Pipeline.
 * Currently, it returns a stubbed response. The Data Science / RAG team will
 * replace the logic inside `processQuery` to call the Python microservice.
 */

import http from 'http';

class ChatService {
  async processQuery(question, previousMessages = [], options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const postData = JSON.stringify({
        question: question,
        top_k: 8
      });

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/ask',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`RAG API responded with status: ${res.statusCode} - ${body}`));
            }
            try {
              const data = JSON.parse(body);
              const latencyMs = Date.now() - startTime;
              
              const evidence = (data.sources || []).map(source => ({
                title: source.source,
                section: source.section || 'N/A',
                documentId: source.source,
                page: source.page,
                excerpt: source.excerpt || '', 
                relevanceScore: source.similarity
              }));

              resolve({
                answer: data.answer,
                evidence: evidence,
                metadata: {
                  confidence: data.confidence,
                  latencyMs,
                  source: "python-rag-api"
                }
              });
            } catch (err) {
              reject(err);
            }
          });
        }
      );

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }
}

export const chatService = new ChatService();
