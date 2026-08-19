import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: TranslationService) {}

  transform(key: string): string {
    if (!key) return '';
    return this.i18n.translate(key);
  }
}
