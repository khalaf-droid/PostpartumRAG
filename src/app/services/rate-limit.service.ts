import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RateLimitService {
  private lastQueryTimestamp = 0;
  private minIntervalMs = 2500; // 2.5s cooldown between consecutive queries

  readonly cooldownRemainingSeconds = signal(0);
  readonly isRateLimited = computed(() => this.cooldownRemainingSeconds() > 0);

  private timerId: any = null;

  canSubmit(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastQueryTimestamp;

    if (elapsed < this.minIntervalMs) {
      const remainingMs = this.minIntervalMs - elapsed;
      this.startCooldownTimer(Math.ceil(remainingMs / 1000));
      return false;
    }
    return true;
  }

  recordQuery(): void {
    this.lastQueryTimestamp = Date.now();
    this.startCooldownTimer(Math.ceil(this.minIntervalMs / 1000));
  }

  private startCooldownTimer(seconds: number): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.cooldownRemainingSeconds.set(seconds);

    this.timerId = setInterval(() => {
      const next = this.cooldownRemainingSeconds() - 1;
      if (next <= 0) {
        this.cooldownRemainingSeconds.set(0);
        clearInterval(this.timerId);
        this.timerId = null;
      } else {
        this.cooldownRemainingSeconds.set(next);
      }
    }, 1000);
  }
}
