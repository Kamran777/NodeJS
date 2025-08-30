import { PresenceUser } from "./presence-user.model";

export interface ChatMessage {
  id: string;
  from: PresenceUser;
  text: string;
  ts: number;
}