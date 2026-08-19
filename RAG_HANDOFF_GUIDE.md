# PostpartumHeal — AI / RAG Pipeline Integration Handoff Guide

Welcome RAG & AI Engineering Team! 🚀

This document details the exact contract and steps needed to connect your **Python RAG Pipeline** (e.g. FastAPI / Flask / LangChain / LlamaIndex) with the **Node.js Express 5** backend.

---

## 📍 Integration Single Point of Contact

All RAG logic is isolated in a **single service file**:
`server/services/chat.service.js`

You do **NOT** need to edit MongoDB models, routes, or Angular components.

---

## 📥 Input Payload Provided to Your Pipeline

When a user submits a clinical question, `chat.service.js` calls `processQuery(question, previousMessages, options)`:

```javascript
/**
 * @param {string} question - The user's input query (e.g. "What are the warning signs of postpartum psychosis?")
 * @param {Array<Object>} previousMessages - Up to 10 previous conversation turns:
 *   [
 *     { role: "user", content: "..." },
 *     { role: "assistant", content: "..." }
 *   ]
 */
```

---

## 📤 Expected JSON Return Format

Your Python microservice endpoint should return a JSON matching this structure:

```json
{
  "answer": "Postpartum psychosis typically emerges within the first two weeks after birth...",
  "evidence": [
    {
      "title": "NICE CG192 Guidelines",
      "section": "1.5.9–1.5.12 Recognising postpartum psychosis",
      "documentId": "NICE-CG192",
      "page": 18,
      "excerpt": "Warning signs include rapid mood changes, acute onset of confusion...",
      "relevanceScore": 0.95
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "latencyMs": 1420,
    "tokens": { "prompt": 120, "completion": 85, "total": 205 }
  }
}
```

---

## 🛠️ Step-by-Step Integration Procedure

1. **Deploy Python Microservice**: Ensure your RAG service exposes a `POST /rag/query` endpoint.
2. **Update `server/services/chat.service.js`**:
   ```javascript
   import axios from 'axios';

   class ChatService {
     async processQuery(question, previousMessages = []) {
       const response = await axios.post('http://localhost:8000/rag/query', {
         question,
         history: previousMessages
       });

       return response.data;
     }
   }

   export const chatService = new ChatService();
   ```
3. **Run Full-Stack**: Node.js & Angular will automatically handle session persistence, JWT security, and UI rendering of citations!

---

*Backend Architecture designed by Senior Full Stack Engineering Team.*
