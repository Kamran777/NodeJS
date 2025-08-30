// chat-widget.component.ts
import { Component, inject, signal, computed, effect } from '@angular/core';
import { NgFor, NgIf, NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, User, DM } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [NgClass, FormsModule, CommonModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export default class ChatComponent {
  private chat = inject(ChatService);
  private auth = inject(AuthService);

  draft = signal('');
  activeId = signal<string | null>(null);

  contacts = computed(() =>
    this.chat.contacts().filter(u => u.id !== this.meId)
  );

  thread = computed<DM[]>(() =>
    this.activeId() ? (this.chat.messages()[this.activeId()!] || []) : []
  );

  activeUsername = computed(() => {
    const id = this.activeId();
    const user = this.contacts().find(c => c.id === id);
    return user ? user.username : '';
  });

  meId = this.chat.meId;

  constructor() {
    this.chat.connect();
    this.chat.loadContacts();

    effect(() => {
      if (this.activeId()) this.chat.loadHistory(this.activeId()!);
    });
  }

  select(u: User) {
    this.activeId.set(u.id);
    this.draft.set('');
  }

  send() {
    if (!this.activeId() || !this.draft().trim()) return;
    this.chat.sendDM(this.activeId()!, this.draft());
    this.draft.set('');
  }

  logout() {
    this.chat.disconnect(); // notify server I'm offline
    this.auth.logout();
  }

  activeUser() {
  return this.contacts().find(u => u.id === this.activeId());
}


  formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
