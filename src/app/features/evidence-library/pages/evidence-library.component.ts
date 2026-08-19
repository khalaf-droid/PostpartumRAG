import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EvidenceLibraryService } from '../../../services/evidence-library.service';
import { TranslatePipe } from '../../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../../core/i18n/services/translation.service';

@Component({
  selector: 'app-evidence-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './evidence-library.component.html',
  styleUrl: './evidence-library.component.scss'
})
export class EvidenceLibraryComponent {
  evidenceService = inject(EvidenceLibraryService);
  i18n = inject(TranslationService);

  setFilter(filter: 'All' | 'NICE' | 'WHO') {
    this.evidenceService.selectedFilter.set(filter);
  }
}
