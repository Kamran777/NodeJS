export interface User {
  id: string;
  username: string;
  online: boolean;
}

export interface DM {
  type: 'dm';
  from: string;
  to: string;
  text: string;
  ts: number;
}
