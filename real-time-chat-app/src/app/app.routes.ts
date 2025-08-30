import { Routes } from '@angular/router';
// import { LoginComponent } from './features/login/login.component';
// import { ChatComponent } from './features/chat-widget/chat-widget.component';
import ChatComponent from './features/chat-widget/chat-widget.component';
import AuthComponent from './features/auth/auth.component';

export const routes: Routes = [
  // { path: '', component: LoginComponent },
  // { path: 'chat', component: ChatComponent },
  // { path: '**', redirectTo: '' }
  { path: '', component: ChatComponent },
  { path: 'auth', component: AuthComponent },
  { path: '**', redirectTo: '' },
];
