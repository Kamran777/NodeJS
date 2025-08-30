import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private safeLocalStorage(key: string): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  token = signal<string | null>(this.safeLocalStorage('token'));

  user = computed(() => {
    const t = this.token();
    if (!t) return null;
    try {
      return jwtDecode<{ sub: string; username: string }>(t);
    } catch {
      return null;
    }
  });

  private saveToken(token: string) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
    }
    this.token.set(token);
  }

  async register(username: string, password: string) {
    try {
      const res = await this.http
        .post<any>(`${environment.apiUrl}/register`, { username, password })
        .toPromise();
      this.saveToken(res!.token);
    } catch (err: any) {
      // You can check status code or server message
      if (err.status === 409) {
        throw new Error('Username already exists');
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  async login(username: string, password: string) {
    try {
      const res = await this.http
        .post<any>(`${environment.apiUrl}/login`, { username, password })
        .toPromise();
      this.saveToken(res!.token);
    } catch (err: any) {
      if (err.status === 401) {
        throw new Error('Username or password is incorrect');
      }
      throw new Error('Login failed. Please try again.');
    }
  }

  logout() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.token.set(null);
    this.router.navigateByUrl('/auth');
  }
}
