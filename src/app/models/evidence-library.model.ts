export interface EvidenceSource {
  id: string;
  organization: string; // 'NICE' | 'WHO'
  documentName: string;
  title: string;
  type: string;
  sourceUrl?: string;
  sections: EvidenceSection[];
  indexedStatus: string;
}

export interface EvidenceSection {
  id: string;
  title: string;
  pageNumber: number;
  indexed: boolean;
  chunkCount?: number;
  excerpt?: string;
}
