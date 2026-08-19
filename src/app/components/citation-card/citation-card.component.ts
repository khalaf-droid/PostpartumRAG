import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenceSource } from '../../models/rag.model';
import { TranslatePipe } from '../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/services/translation.service';

@Component({
  selector: 'app-citation-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="citation-card"
      [class.highlighted]="isHighlighted()"
      [attr.id]="'src-' + index()"
    >
      <div class="card-header">
        <div class="badge-index">[{{ index() }}]</div>
        <div class="doc-info">
          <span class="doc-name">{{ source().documentName || source().document_name }}</span>
          <span class="section">{{ source().sectionTitle || source().section_title }}</span>
        </div>
      </div>
      <div class="card-footer">
        <span class="page">{{ 'workspace.drawer_page' | translate }} {{ source().pageNumber || source().page_number }}</span>
        <button type="button" class="btn-view-source" (click)="onViewSource($event)">
          <span>{{ 'evidence.view_source' | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styleUrl: './citation-card.component.scss',
})
export class CitationCardComponent {
  source = input.required<EvidenceSource>();
  index = input<number>(1);
  isHighlighted = input<boolean>(false);

  viewSource = output<EvidenceSource>();

  constructor(public i18n: TranslationService) {}

  onViewSource(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.viewSource.emit(this.source());
  }
}
