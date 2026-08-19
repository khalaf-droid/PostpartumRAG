import { Component, ElementRef, HostListener, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/services/translation.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit {
  isScrolled = false;

  constructor(
    private el: ElementRef, 
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
  ) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled = window.scrollY > 40;
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.15 });

      const reveals = this.el.nativeElement.querySelectorAll('.reveal');
      reveals.forEach((el: Element) => io.observe(el));

      const ioImage = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.3 });

      const imageReveals = this.el.nativeElement.querySelectorAll('.reveal-scroll');
      imageReveals.forEach((el: Element) => ioImage.observe(el));
    }
  }

  highlightSource(n: number, event?: Event) {
    if (event) event.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      const items = this.el.nativeElement.querySelectorAll('.evidence-item');
      items.forEach((el: HTMLElement) => el.style.opacity = '.45');
      const target = this.el.nativeElement.querySelector('#src-' + n);
      if (target) {
        target.style.opacity = '1';
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  scrollTo(id: string, event?: Event) {
    if (event) event.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}
