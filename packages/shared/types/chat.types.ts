/**
 * Chat type definitions.
 * Shared interface for chat service — local WS server for POC,
 * Cloudflare Workers later.
 */

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  timestamp: number;
  roomId: string;
}

export interface ChatService {
  connect: (roomId: string, userId: string, nickname: string) => void;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  onMessage: (callback: (message: ChatMessage) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
}

export interface ChatContextValue {
  messages: ChatMessage[];
  isConnected: boolean;
  sendMessage: (text: string) => void;
}
