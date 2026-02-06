/**
 * WebSocket chat service client.
 * Implements ChatService interface for local WS server (POC).
 * Will be swapped with Cloudflare Workers implementation later.
 */

import type { ChatService, ChatMessage } from '../types/chat.types';

const WS_URL = 'ws://localhost:4100';

export function createChatService(): ChatService {
  let ws: WebSocket | null = null;
  let connected = false;

  const messageCallbacks = new Set<(message: ChatMessage) => void>();
  const connectionCallbacks = new Set<(connected: boolean) => void>();

  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;
  let currentNickname: string | null = null;

  function notifyConnectionChange(isConnected: boolean): void {
    connected = isConnected;
    connectionCallbacks.forEach(callback => callback(isConnected));
  }

  function notifyMessage(message: ChatMessage): void {
    messageCallbacks.forEach(callback => callback(message));
  }

  const service: ChatService = {
    connect(roomId: string, userId: string, nickname: string): void {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.warn('[ChatService] Already connected, disconnecting first');
        service.disconnect();
      }

      currentRoomId = roomId;
      currentUserId = userId;
      currentNickname = nickname;

      const url = `${WS_URL}?roomId=${encodeURIComponent(roomId)}`;
      console.log(`[ChatService] Connecting to ${url}`);

      ws = new WebSocket(url);

      ws.addEventListener('open', () => {
        console.log('[ChatService] Connected');
        notifyConnectionChange(true);

        // Send join message
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'join',
            userId,
            nickname
          }));
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as ChatMessage;
          notifyMessage(message);
        } catch (err) {
          console.error('[ChatService] Failed to parse message:', err);
        }
      });

      ws.addEventListener('close', () => {
        console.log('[ChatService] Disconnected');
        notifyConnectionChange(false);
      });

      ws.addEventListener('error', (err) => {
        console.error('[ChatService] WebSocket error:', err);
        notifyConnectionChange(false);
      });
    },

    disconnect(): void {
      if (ws) {
        ws.close();
        ws = null;
      }
      currentRoomId = null;
      currentUserId = null;
      currentNickname = null;
      notifyConnectionChange(false);
    },

    sendMessage(text: string): void {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[ChatService] Cannot send message, not connected');
        return;
      }

      ws.send(JSON.stringify({
        type: 'message',
        text
      }));
    },

    onMessage(callback: (message: ChatMessage) => void): () => void {
      messageCallbacks.add(callback);
      return () => {
        messageCallbacks.delete(callback);
      };
    },

    onConnectionChange(callback: (connected: boolean) => void): () => void {
      connectionCallbacks.add(callback);
      // Immediately notify current state
      callback(connected);
      return () => {
        connectionCallbacks.delete(callback);
      };
    }
  };

  return service;
}
