import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface GuidelineDocument {
  documentId: string;
  title: string;
  publisher: string;
  publicationYear: number;
  version: string;
  url: string;
  totalChunks: number;
  topics: string[];
  summary: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EvidenceApiService {
  private readonly apiUrl = 'http://localhost:3000/api/evidence';
  
  guidelines = signal<GuidelineDocument[]>([]);
  isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  async fetchGuidelines(): Promise<GuidelineDocument[]> {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ status: string; data: { guidelines: GuidelineDocument[] } }>(`${this.apiUrl}/guidelines`)
      );
      const list = res?.data?.guidelines || [];
      this.guidelines.set(list);
      return list;
    } catch (err) {
      console.warn('Failed to fetch guidelines from backend API, using fallback data', err);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  async getGuidelineById(id: string): Promise<GuidelineDocument | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ status: string; data: { guideline: GuidelineDocument } }>(`${this.apiUrl}/guidelines/${id}`)
      );
      return res?.data?.guideline || null;
    } catch (err) {
      return null;
    }
  }
}
