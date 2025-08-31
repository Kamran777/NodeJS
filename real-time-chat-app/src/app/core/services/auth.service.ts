import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthResponse } from '../models/auth-response.model';
import { AuthUser } from '../models/auth-user.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorageService);

  readonly token = signal<string | null>(this.storage.get());

  readonly user = computed<AuthUser | null>(() => {
    const t = this.token();
    if (!t) return null;
    try {
      return jwtDecode<AuthUser>(t);
    } catch {
      return null;
    }
  });

  isAuthenticated(): boolean {
    return !!this.user();
  }

  private saveToken(token: string): void {
    this.storage.set(token);
    this.token.set(token);
  }

  private clearToken(): void {
    this.storage.clear();
    this.token.set(null);
  }

  async login(credentials: AuthCredentials): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/login`, credentials)
      );
      this.saveToken(res.token);
      this.router.navigateByUrl('/chat');
    } catch (err: any) {
      if (err.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw new Error('Login failed. Please try again.');
    }
  }

  async register(credentials: AuthCredentials): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/register`, credentials)
      );
    } catch (err: any) {
      if (err.status === 409) {
        throw new Error('Username already exists');
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  logout(): void {
    this.clearToken();
    this.router.navigateByUrl('/auth');
  }
}
