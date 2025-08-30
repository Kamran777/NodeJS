import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export default class AuthComponent {
  private auth = inject(AuthService);

  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  errorMessage = signal<string | null>(null); // new signal

  toggle() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.errorMessage.set(null); // clear error on toggle
  }

  async submit() {
    this.errorMessage.set(null);
    try {
      if (this.mode === 'login') {
        await this.auth.login(this.username, this.password);
      } else {
        await this.auth.register(this.username, this.password);
      }
      location.href = '/'; // navigate to chat
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Something went wrong');
    }
  }
}
