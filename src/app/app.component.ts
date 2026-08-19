import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
  OnInit,
} from "@angular/core";
import {
  RouterOutlet,
  RouterLink,
  Router,
  NavigationEnd,
} from "@angular/router";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { filter } from "rxjs/operators";

import { TranslatePipe } from "./core/i18n/pipes/translate.pipe";
import { TranslationService } from "./core/i18n/services/translation.service";
import { AuthService } from "./features/auth/services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, TranslatePipe],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  title = "postpartum-heal";
  isScrolled = false;
  isAuthPage = false;
  isWorkspacePage = false;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService,
    public auth: AuthService,
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigate(["/"]);
  }

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateAuthPageState();
        this.checkScroll();
      });
  }

  updateAuthPageState() {
    const url = this.router.url;
    this.isAuthPage =
      url.startsWith("/login") ||
      url.startsWith("/register") ||
      url.startsWith("/forgot-password");
    this.isWorkspacePage = url.startsWith("/workspace");
  }

  @HostListener("window:scroll", [])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScroll();
    }
  }

  checkScroll() {
    if (isPlatformBrowser(this.platformId)) {
      // If we are on the landing page, it is transparent at the top.
      // Otherwise, it should always be dark (scrolled) so it's legible on light backgrounds.
      const isLanding =
        this.router.url === "/" || this.router.url.startsWith("/#");
      if (!isLanding) {
        this.isScrolled = true;
      } else {
        this.isScrolled = window.scrollY > 40;
      }
    }
  }

  scrollTo(id: string, event?: Event) {
    if (event) event.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      if (this.router.url !== "/") {
        this.router.navigate(["/"]).then(() => {
          setTimeout(() => {
            const target = document.getElementById(id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth" });
            }
          }, 150);
        });
      } else {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }
}
