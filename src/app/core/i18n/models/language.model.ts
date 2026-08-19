export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface LanguageOption {
  code: Language;
  label: string;
  dir: Direction;
}
