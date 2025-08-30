// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { ChatService } from '../../core/services/chat.service';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-login',
//   imports: [FormsModule, CommonModule],
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.scss'],
// })
// export class LoginComponent {
//   username = '';
//   loginError = '';

//   constructor(private chatService: ChatService, private router: Router) {
//     // Subscribe to login errors
//     this.chatService.loginError$.subscribe((err) => (this.loginError = err));

//     // Subscribe to login success and navigate
//     this.chatService.loginSuccess$.subscribe((username) => {
//       if (username) {
//         this.router.navigate(['/chat']);
//       }
//     });
//   }

//   login() {
//     if (!this.username.trim()) return;

//     // Reset previous error before attempting login
//     this.loginError = '';
//     localStorage.setItem('username', this.username); // <-- store username
//     this.chatService.connect(this.username);
//   }
// }
