import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Language, Direction } from '../models/language.model';
import { EN_TRANSLATIONS } from '../translations/en';
import { AR_TRANSLATIONS } from '../translations/ar';

const STORAGE_KEY = 'postpartum-rag-language';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly currentLang = signal<Language>('en');
  readonly direction = computed<Direction>(() => (this.currentLang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isRtl = computed<boolean>(() => this.currentLang() === 'ar');

  private translations = {
    en: EN_TRANSLATIONS,
    ar: AR_TRANSLATIONS,
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initLanguage();
  }

  initLanguage() {
    if (!isPlatformBrowser(this.platformId)) return;

    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved && (saved === 'en' || saved === 'ar')) {
      this.setLanguage(saved, false);
      return;
    }

    const browserLang = navigator.language || (navigator as any).userLanguage || '';
    if (browserLang.toLowerCase().startsWith('ar')) {
      this.setLanguage('ar', false);
    } else {
      this.setLanguage('en', false);
    }
  }

  setLanguage(lang: Language, save = true) {
    this.currentLang.set(lang);

    if (save && isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, lang);
    }

    if (isPlatformBrowser(this.platformId)) {
      const html = document.documentElement;
      html.setAttribute('lang', lang);
      html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
  }

  toggleLanguage() {
    const next = this.currentLang() === 'en' ? 'ar' : 'en';
    this.setLanguage(next);
  }

  translate(key: string): string {
    const lang = this.currentLang();
    const dict = this.translations[lang] || this.translations.en;
    return this.getNestedValue(dict, key) || this.getNestedValue(this.translations.en, key) || key;
  }

  private getNestedValue(obj: any, key: string): string | null {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return typeof current === 'string' ? current : null;
  }
}
