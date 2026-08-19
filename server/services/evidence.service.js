/**
 * Guidelines & Evidence Static Catalog (In-Memory Reference Data)
 * 
 * Provides static metadata and official external links for clinical guidelines 
 * (NICE, WHO, BAP) without needing database overhead.
 */

const CLINICAL_GUIDELINES = [
  {
    documentId: 'WHO-MHGAP',
    title: 'mhGAP Intervention Guide – Version 2.0',
    publisher: 'World Health Organization (WHO)',
    publicationYear: 2016,
    version: '2.0',
    url: 'https://www.who.int/publications/i/item/9789241549790',
    totalChunks: 173,
    topics: ['Mental Health', 'Depression Assessment', 'MNS Disorders'],
    summary: 'Evidence-based clinical guidance for the assessment and management of priority mental health conditions, including depression, in non-specialized healthcare settings.',
    isActive: true,
  },
  {
    documentId: 'WHO-THINKING-HEALTHY',
    title: 'Thinking Healthy: A Manual for Psychosocial Management of Perinatal Depression',
    publisher: 'World Health Organization (WHO)',
    publicationYear: 2015,
    version: '1.0',
    url: 'https://iris.who.int/bitstream/handle/10665/152936/WHO_MSD_MER_15.1_eng.pdf',
    totalChunks: 180,
    topics: ['Perinatal Depression', 'Psychosocial Interventions', 'Cognitive Behavioural Techniques'],
    summary: 'An evidence-based psychosocial intervention manual designed to help community health workers support mothers experiencing perinatal depression using cognitive-behavioural techniques.',
    isActive: true,
  },
  {
    documentId: 'NICE-CG192',
    title: 'Antenatal and postnatal mental health: clinical management and service guidance (CG192)',
    publisher: 'National Institute for Health and Care Excellence (NICE)',
    publicationYear: 2014,
    version: 'Updated 2020',
    url: 'https://www.nice.org.uk/guidance/cg192',
    totalChunks: 215,
    topics: ['Depression', 'Anxiety', 'Early Detection', 'Psychological Interventions'],
    summary: 'Clinical guidance for recognising, assessing and treating mental health problems during pregnancy and the postnatal period, with specific recommendations for depression and psychological interventions.',
    isActive: true,
  },
];

class EvidenceService {
  /**
   * Get all supported clinical guidelines with direct external URLs
   */
  async getGuidelines() {
    return CLINICAL_GUIDELINES;
  }

  /**
   * Get specific guideline by ID
   */
  async getGuidelineById(documentId) {
    const id = documentId.toUpperCase();
    return CLINICAL_GUIDELINES.find(g => g.documentId.toUpperCase() === id) || null;
  }

  /**
   * Search evidence snippets by query term
   */
  async searchEvidence(query, options = {}) {
    const { publisher, limit = 5 } = options;

    let results = [
      {
        id: 'ev-01',
        title: 'NICE CG192 Guidelines',
        section: '1.5.9–1.5.12 Recognising postpartum psychosis',
        documentId: 'NICE-CG192',
        page: 18,
        excerpt: 'Warning signs of postpartum psychosis include rapid mood changes, acute confusion, severe agitation, and delusional beliefs often centering around the newborn. Immediate specialist perinatal assessment is required.',
        sourceUrl: 'https://www.nice.org.uk/guidance/cg192',
        relevanceScore: 0.96
      },
      {
        id: 'ev-02',
        title: 'WHO mhGAP Intervention Guide',
        section: 'Section 3: Perinatal Mental Health Emergencies',
        documentId: 'WHO-MHGAP',
        page: 72,
        excerpt: 'Emergency management: Assess immediately for safety. Do not leave the patient unattended if hallucinations or delusions are present. Urgent referral to specialist services is mandatory.',
        sourceUrl: 'https://www.who.int/publications/i/item/9789241549790',
        relevanceScore: 0.91
      },
      {
        id: 'ev-03',
        title: 'BAP Perinatal Guidelines',
        section: '1.8.5 Psychotropic medication during breastfeeding',
        documentId: 'BAP-PERINATAL',
        page: 104,
        excerpt: 'When prescribing antidepressants during breastfeeding, select medications with low relative infant dose profiles (such as sertraline or paroxetine). Monitor infant for feeding or sedation changes.',
        sourceUrl: 'https://www.bap.org.uk',
        relevanceScore: 0.87
      }
    ];

    if (publisher) {
      results = results.filter(r => r.title.toLowerCase().includes(publisher.toLowerCase()));
    }

    if (query) {
      const q = query.toLowerCase();
      const filtered = results.filter(item => 
        item.excerpt.toLowerCase().includes(q) || 
        item.section.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
      if (filtered.length > 0) results = filtered;
    }

    return results.slice(0, limit);
  }
}

export const evidenceService = new EvidenceService();
