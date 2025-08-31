import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  EffectRef,
  effect,
} from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { DM, User } from '../../core/models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [NgClass, FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export default class ChatComponent implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  readonly isMobile: boolean = window.innerWidth <= 768;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  private autoScroll = true;

  draft = signal('');
  activeId = signal<string | null>(null);

  contacts = computed(() => this.chat.contacts().filter((u) => u.id !== this.meId));

  thread = computed<DM[]>(() =>
    this.activeId() ? this.chat.messages()[this.activeId()!] || [] : []
  );

  currentUser = computed(() => this.auth.user()?.username || 'Me');

  activeUsername = computed(() => {
    const id = this.activeId();
    const user = this.contacts().find((c) => c.id === id);
    return user ? user.username : '';
  });

  readonly meId = this.chat.meId;

  private readonly loadHistoryEffect: EffectRef = effect(() => {
    if (this.activeId()) {
      this.chat.loadHistory(this.activeId()!);
    }
  });

  private readonly autoScrollEffect: EffectRef = effect(() => {
    this.thread();
    if (this.autoScroll) {
      queueMicrotask(() => this.scrollToBottom());
    }
  });

  ngOnInit(): void {
    this.chat.connect();
    this.chat.loadContacts();
  }

  ngOnDestroy(): void {
    this.chat.disconnect();
    this.loadHistoryEffect.destroy();
    this.autoScrollEffect.destroy();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  onScroll(): void {
    const el = this.messagesContainer.nativeElement;
    const threshold = 50;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this.autoScroll = atBottom;
  }

  select(u: User): void {
    this.activeId.set(u.id);
    this.chat.setActive(u.id);
    this.draft.set('');
  }

  get unread() {
    return this.chat.unread();
  }

  send(): void {
    if (!this.activeId() || !this.draft().trim()) return;
    this.chat.sendDM(this.activeId()!, this.draft());
    this.draft.set('');
  }

  logout(): void {
    this.chat.disconnect();
    this.auth.logout();
  }

  activeUser(): User | undefined {
    return this.contacts().find((u) => u.id === this.activeId());
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByContact = (_: number, u: User) => u.id;
  trackByMessage = (_: number, m: DM) => `${m.from}-${m.to}-${m.ts}`;
}
