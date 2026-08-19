import { Injectable, signal, computed } from '@angular/core';
import { EvidenceSource } from '../models/evidence-library.model';

@Injectable({ providedIn: 'root' })
export class EvidenceLibraryService {
  readonly sources = signal<EvidenceSource[]>([
    {
      id: 'who-mhgap',
      organization: 'WHO',
      documentName: 'WHO mhGAP',
      title: 'mhGAP Intervention Guide – Version 2.0',
      type: 'Clinical Guideline',
      indexedStatus: 'Indexed',
      sourceUrl: 'https://www.who.int/publications/i/item/9789241549790',
      sections: [
        {
          id: 'sec-mhgap-1',
          title: 'Depression Assessment and Management',
          pageNumber: 173,
          indexed: true,
          chunkCount: 173,
          excerpt: 'Evidence-based clinical guidance for the assessment and management of priority mental health conditions, including depression, in non-specialized healthcare settings.'
        }
      ]
    },
    {
      id: 'who-thinking-healthy',
      organization: 'WHO',
      documentName: 'WHO Thinking Healthy',
      title: 'Thinking Healthy: Psychosocial Management of Perinatal Depression',
      type: 'Clinical Guideline',
      indexedStatus: 'Indexed',
      sourceUrl: 'https://iris.who.int/bitstream/handle/10665/152936/WHO_MSD_MER_15.1_eng.pdf',
      sections: [
        {
          id: 'sec-th-1',
          title: 'Cognitive-behavioural techniques for mothers',
          pageNumber: 180,
          indexed: true,
          chunkCount: 180,
          excerpt: 'An evidence-based psychosocial intervention manual designed to help community health workers support mothers experiencing perinatal depression using cognitive-behavioural techniques.'
        }
      ]
    },
    {
      id: 'nice-cg192',
      organization: 'NICE',
      documentName: 'NICE CG192',
      title: 'Antenatal and postnatal mental health (CG192)',
      type: 'Clinical Guideline',
      indexedStatus: 'Indexed',
      sourceUrl: 'https://www.nice.org.uk/guidance/cg192',
      sections: [
        {
          id: 'sec-nice-1',
          title: 'Clinical management and service guidance',
          pageNumber: 215,
          indexed: true,
          chunkCount: 215,
          excerpt: 'Clinical guidance for recognising, assessing and treating mental health problems during pregnancy and the postnatal period, with specific recommendations for depression and psychological interventions.'
        }
      ]
    }
  ]);

  readonly searchQuery = signal<string>('');
  readonly selectedFilter = signal<'All' | 'NICE' | 'WHO'>('All');

  readonly filteredSources = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();
    
    return this.sources().filter(source => {
      if (filter !== 'All' && source.organization !== filter) {
        return false;
      }
      
      if (query) {
        const matchTitle = source.title.toLowerCase().includes(query);
        const matchDocName = source.documentName.toLowerCase().includes(query);
        const matchOrg = source.organization.toLowerCase().includes(query);
        const matchSection = source.sections.some(sec => sec.title.toLowerCase().includes(query));
        return matchTitle || matchDocName || matchOrg || matchSection;
      }
      
      return true;
    });
  });

  getSourceById(id: string): EvidenceSource | undefined {
    return this.sources().find(s => s.id === id);
  }
}
