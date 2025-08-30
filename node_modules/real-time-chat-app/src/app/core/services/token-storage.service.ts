import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly key = 'token';

  get(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(this.key) : null;
  }

  set(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.key, token);
    }
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.key);
    }
  }
}
