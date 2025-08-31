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

type MediaKind = 'audio' | 'video';

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
  @ViewChild('localVideo') localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef<HTMLVideoElement>;

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

  // --- Call state (signals)
  inCall = signal(false);
  callMedia = signal<MediaKind>('audio'); // current call media
  muted = signal(false);
  cameraOff = signal(false);

  // Incoming call
  incomingCall = signal(false);
  incomingFromId = signal<string | null>(null);
  incomingOffer?: RTCSessionDescriptionInit;
  incomingMedia = signal<MediaKind>('audio');

  private pc?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private pendingCandidates: RTCIceCandidateInit[] = [];

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

    // Subscribe to signaling messages
    this.chat.signal$.subscribe(async (msg) => {
      if (msg.to !== this.meId) return;

      if (msg.kind === 'offer') {
        // Show prompt
        this.incomingOffer = msg.sdp!;
        this.incomingFromId.set(msg.from);
        this.incomingMedia.set(msg.media ?? 'audio');
        this.incomingCall.set(true);
      } else if (msg.kind === 'answer') {
        await this.pc?.setRemoteDescription(msg.sdp!);
      } else if (msg.kind === 'ice') {
        if (this.pc) {
          try { await this.pc.addIceCandidate(msg.candidate!); } catch {}
        } else {
          this.pendingCandidates.push(msg.candidate!);
        }
      } else if (msg.kind === 'end') {
        this.teardownPeer();
      } else if (msg.kind === 'reject') {
        // remote declined
        this.teardownPeer(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.chat.disconnect();
    this.loadHistoryEffect.destroy();
    this.autoScrollEffect.destroy();
    this.teardownPeer(false);
  }

  // ---------- Chat basics ----------
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

  // ---------- WebRTC ----------
  async startCall(kind: MediaKind) {
    const peerId = this.activeId();
    if (!peerId || this.inCall()) return;

    await this.setupPeer(kind);

    // Create and send offer
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.chat.sendSignal(peerId, { kind: 'offer', sdp: offer, media: kind });
  }

  async acceptCall() {
    const from = this.incomingFromId();
    if (!from || !this.incomingOffer) return;

    await this.setupPeer(this.incomingMedia());

    await this.pc!.setRemoteDescription(this.incomingOffer);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    this.chat.sendSignal(from, { kind: 'answer', sdp: answer, media: this.callMedia() });

    // drain buffered candidates
    for (const c of this.pendingCandidates) {
      try { await this.pc!.addIceCandidate(c); } catch {}
    }
    this.pendingCandidates = [];

    this.incomingCall.set(false);
    this.incomingFromId.set(null);
    this.incomingOffer = undefined;
  }

  declineCall() {
    const from = this.incomingFromId();
    if (from) this.chat.sendSignal(from, { kind: 'reject' });
    this.incomingCall.set(false);
    this.incomingFromId.set(null);
    this.incomingOffer = undefined;
  }

  endCall() {
    const peer = this.peerIdForActiveCall();
    if (peer) this.chat.sendSignal(peer, { kind: 'end' });
    this.teardownPeer();
  }

  toggleMute() {
    this.muted.update(v => !v);
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = !this.muted()));
  }

  toggleCamera() {
    if (this.callMedia() !== 'video') return;
    this.cameraOff.update(v => !v);
    this.localStream?.getVideoTracks().forEach(t => (t.enabled = !this.cameraOff()));
  }

  private peerIdForActiveCall(): string | null {
    // Prefer the active chat; fall back to the caller on incoming
    return this.activeId() ?? this.incomingFromId();
  }

  private async setupPeer(kind: MediaKind) {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
      ],
    };

    this.pc?.close();
    this.pc = new RTCPeerConnection(config);

    this.callMedia.set(kind);
    this.inCall.set(true);
    this.muted.set(false);
    this.cameraOff.set(false);

    // Local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video',
    });
    this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));
    if (kind === 'video' && this.localVideo) {
      this.localVideo.nativeElement.srcObject = this.localStream;
    }

    // Remote media
    this.remoteStream = new MediaStream();
    if (this.remoteVideo && kind === 'video') {
      this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    }
    this.pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => this.remoteStream!.addTrack(t));
    };

    // ICE
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        const to = this.peerIdForActiveCall();
        if (to) this.chat.sendSignal(to, { kind: 'ice', candidate: e.candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc?.connectionState;
      if (s === 'failed' || s === 'disconnected' || s === 'closed') {
        this.teardownPeer(false);
      }
    };
  }

  private teardownPeer(notify = true) {
    this.inCall.set(false);

    try { this.pc?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { this.localStream?.getTracks().forEach(t => t.stop()); } catch {}
    this.localStream = undefined;
    this.remoteStream = undefined;

    if (this.localVideo?.nativeElement) this.localVideo.nativeElement.srcObject = null;
    if (this.remoteVideo?.nativeElement) this.remoteVideo.nativeElement.srcObject = null;

    try { this.pc?.close(); } catch {}
    this.pc = undefined;

    if (notify) {
      const peer = this.peerIdForActiveCall();
      if (peer) this.chat.sendSignal(peer, { kind: 'end' });
    }
  }

  callerName = computed(() => {
    const id = this.incomingFromId();
    const u = this.contacts().find(c => c.id === id);
    return u?.username ?? 'Unknown';
  });
}
