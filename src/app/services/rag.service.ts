import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RagQueryResponse, EvidenceSource, RagConfidence } from '../models/rag.model';

@Injectable({ providedIn: 'root' })
export class RagService {
  private apiUrl = 'http://localhost:3000/api/chat/query';
  readonly isLoading = signal(false);

  constructor(private http: HttpClient) {}

  async query(question: string, sessionId?: string): Promise<RagQueryResponse> {
    this.isLoading.set(true);
    try {
      const apiResponse = await firstValueFrom(
        this.http.post<any>(this.apiUrl, { question, sessionId }, { withCredentials: true })
      );

      const assistantMsg = apiResponse?.data?.assistantMessage;
      const sources: EvidenceSource[] = (assistantMsg?.evidence || []).map((e: any, idx: number) => ({
        id: e.documentId || `src-${idx + 1}`,
        documentName: e.title || 'Guideline Document',
        sectionTitle: e.section || 'General Section',
        pageNumber: e.page || 1,
        chunkId: `chunk-${idx}`,
        excerpt: e.excerpt || '',
        sourceUrl: '#'
      }));

      return {
        answer: assistantMsg?.content || '',
        sources,
        confidence: this.deriveConfidence(sources),
        sessionId: apiResponse?.data?.session?._id
      };
    } catch (err) {
      console.error('Backend API failed:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  private deriveConfidence(sources: EvidenceSource[]): RagConfidence {
    if (!sources || sources.length === 0) return 'refused';
    if (sources.length >= 2) return 'high';
    return 'medium';
  }

  // Session History API Integrations
  async getSessions(): Promise<any[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<any>('http://localhost:3000/api/chat/sessions', { withCredentials: true })
      );
      return res?.data?.sessions || [];
    } catch (err) {
      console.warn('Failed to fetch chat sessions:', err);
      return [];
    }
  }

  async getSessionMessages(sessionId: string): Promise<any[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/chat/sessions/${sessionId}`, { withCredentials: true })
      );
      return res?.data?.messages || [];
    } catch (err) {
      console.warn('Failed to fetch session messages:', err);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.delete<any>(`http://localhost:3000/api/chat/sessions/${sessionId}`, { withCredentials: true })
      );
      return true;
    } catch (err) {
      console.warn('Failed to delete session:', err);
      return false;
    }
  }
}
