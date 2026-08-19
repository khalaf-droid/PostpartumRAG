// Matches the contract agreed with the AI team's Python RAG API

export interface EvidenceSource {
  id: string;
  documentName: string;
  sectionTitle: string;
  pageNumber: number;
  chunkId: string;
  excerpt?: string;
  sourceUrl?: string;
  // Compatibility fields for legacy code if needed
  document_name?: string;
  section_title?: string;
  page_number?: number;
  chunk_id?: string;
  source_url?: string;
}

// Backward compatibility alias
export type RagSource = EvidenceSource;

export interface RagQueryRequest {
  question: string;
}

export type RagConfidence = 'high' | 'medium' | 'low' | 'refused';

export interface RagQueryResponse {
  answer: string;
  sources: EvidenceSource[];
  confidence?: RagConfidence;
  sessionId?: string;
}

// Conceptual API response match
export type RagResponse = RagQueryResponse;

export interface PreviousQuestion {
  id: string;
  question: string;
  timestamp: number;
  sourcesCount: number;
  response: RagQueryResponse;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: EvidenceSource[];
  confidence?: RagConfidence;
  isStreaming?: boolean;
  timestamp: number;
}
