import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EvidenceLibraryService } from '../../../services/evidence-library.service';
import { EvidenceSource } from '../../../models/evidence-library.model';
import { TranslatePipe } from '../../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../../core/i18n/services/translation.service';

@Component({
  selector: 'app-evidence-source-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './evidence-source-detail.component.html',
  styleUrl: './evidence-source-detail.component.scss'
})
export class EvidenceSourceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private evidenceService = inject(EvidenceLibraryService);
  i18n = inject(TranslationService);

  source = signal<EvidenceSource | undefined>(undefined);
  expandedSections = signal<Set<string>>(new Set());

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('sourceId');
    if (id) {
      this.source.set(this.evidenceService.getSourceById(id));
    }
  }

  toggleSection(sectionId: string) {
    this.expandedSections.update(set => {
      const newSet = new Set(set);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }

  isExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }
}
