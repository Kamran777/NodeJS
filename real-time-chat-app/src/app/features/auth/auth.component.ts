import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AuthCredentials } from '../../core/models/auth-credentials.model';
import { AuthMode } from '../../core/enums/auth-mode.enum';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export default class AuthComponent {
  mode = signal<AuthMode>(AuthMode.Login);
  username = signal<string>('');
  password = signal<string>('');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(private readonly auth: AuthService, private chat: ChatService) {}

  toggle(): void {
    this.mode.set(this.mode() === AuthMode.Login ? AuthMode.Register : AuthMode.Login);
    this.resetForm();
  }

  private resetForm(): void {
    this.username.set('');
    this.password.set('');
    this.errorMessage.set(null);
  }

  get formTitle(): string {
    return this.mode() === AuthMode.Login ? 'Login Form' : 'Register Form';
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    const credentials: AuthCredentials = {
      username: this.username(),
      password: this.password(),
    };

    try {
      if (this.mode() === AuthMode.Login) {
        await this.auth.login(credentials);
      } else {
        await this.auth.register(credentials);
        await this.chat.loadContacts();
        this.mode.set(AuthMode.Login);
        this.username.set('');
        this.password.set('');
        this.successMessage.set('✅ Registration successful! Please log in.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Something went wrong');
    }
  }
}
