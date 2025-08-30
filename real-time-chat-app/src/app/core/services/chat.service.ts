// chat.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface User { id: string; username: string; online: boolean; }
export interface DM { type: 'dm'; from: string; to: string; text: string; ts: number; }

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  socket?: WebSocket;

  contacts = signal<User[]>([]);
  messages = signal<Record<string, DM[]>>({}); // peerId -> array of messages

  connect() {
    if (this.socket) this.socket.close();

    const token = this.auth.token();
    if (!token) return;

    this.socket = new WebSocket(`${environment.wsUrl}?token=${token}`);

    this.socket.onopen = () => {
      // Tell server I'm online
      this.socket?.send(JSON.stringify({ type: 'presence', status: 'online' }));
    };

    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'presence') {
        // Server sends back updated list of users
        this.contacts.set(msg.users);
      }

      if (msg.type === 'dm') {
        const peerId = msg.from === this.meId ? msg.to : msg.from;
        const copy = { ...this.messages() };
        copy[peerId] = [...(copy[peerId] || []), msg];
        this.messages.set(copy);
      }
    };

    // When closing browser/tab → mark offline
    window.addEventListener('beforeunload', () => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'presence', status: 'offline' }));
        this.socket.close();
      }
    });
  }

  get meId() {
    return this.auth.user()?.sub!;
  }

  sendDM(to: string, text: string) {
    if (!this.socket) return;
    this.socket.send(JSON.stringify({ type: 'dm', to, text }));
  }

  async loadContacts() {
    const users = await this.http.get<User[]>(`${environment.apiUrl}/users`).toPromise();
    this.contacts.set(users || []);
  }

  async loadHistory(peerId: string) {
    const me = this.meId;
    const history = await this.http.get<DM[]>(`${environment.apiUrl}/history/${peerId}/${me}`).toPromise();
    const copy = { ...this.messages() };
    copy[peerId] = history || [];
    this.messages.set(copy);
  }

  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'presence', status: 'offline' }));
      this.socket.close();
    }
  }
}
