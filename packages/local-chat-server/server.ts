import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { randomUUID } from 'crypto';

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  timestamp: number;
  roomId: string;
}

interface ClientInfo {
  userId: string;
  nickname: string;
  roomId: string;
}

interface ClientMessage {
  type: 'join' | 'message';
  userId?: string;
  nickname?: string;
  text?: string;
}

const PORT = 4100;
const MAX_HISTORY = 100;

// Room management
const rooms = new Map<string, Set<WebSocket>>();
const messageHistory = new Map<string, ChatMessage[]>();
const clientInfo = new Map<WebSocket, ClientInfo>();

// Create HTTP server for WebSocket upgrade
const server = createServer();
const wss = new WebSocketServer({ server });

function addToRoom(roomId: string, client: WebSocket): void {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(client);
  console.log(`[${roomId}] Client joined. Room size: ${rooms.get(roomId)!.size}`);
}

function removeFromRoom(client: WebSocket): void {
  const info = clientInfo.get(client);
  if (!info) return;

  const room = rooms.get(info.roomId);
  if (room) {
    room.delete(client);
    console.log(`[${info.roomId}] Client left. Room size: ${room.size}`);
    if (room.size === 0) {
      rooms.delete(info.roomId);
      console.log(`[${info.roomId}] Room empty, removed`);
    }
  }
  clientInfo.delete(client);
}

function broadcastToRoom(roomId: string, message: ChatMessage): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  room.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function addToHistory(roomId: string, message: ChatMessage): void {
  if (!messageHistory.has(roomId)) {
    messageHistory.set(roomId, []);
  }
  const history = messageHistory.get(roomId)!;
  history.push(message);

  // Keep only last MAX_HISTORY messages
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

function sendHistory(client: WebSocket, roomId: string): void {
  const history = messageHistory.get(roomId);
  if (!history || history.length === 0) return;

  history.forEach(msg => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}

wss.on('connection', (ws: WebSocket, request) => {
  const { query } = parse(request.url || '', true);
  const roomId = query.roomId as string;

  if (!roomId) {
    console.log('[ERROR] Connection without roomId, closing');
    ws.close(1008, 'Missing roomId parameter');
    return;
  }

  console.log(`[${roomId}] New connection`);
  addToRoom(roomId, ws);

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientMessage;
      const info = clientInfo.get(ws);

      if (msg.type === 'join') {
        if (!msg.userId || !msg.nickname) {
          console.log('[ERROR] Join message missing userId or nickname');
          return;
        }
        clientInfo.set(ws, {
          userId: msg.userId,
          nickname: msg.nickname,
          roomId
        });
        console.log(`[${roomId}] User joined: ${msg.nickname} (${msg.userId})`);

        // Send message history to newly joined client
        sendHistory(ws, roomId);

      } else if (msg.type === 'message') {
        if (!info) {
          console.log('[ERROR] Message from client without join');
          return;
        }
        if (!msg.text) {
          console.log('[ERROR] Message without text');
          return;
        }

        const chatMessage: ChatMessage = {
          id: randomUUID(),
          userId: info.userId,
          nickname: info.nickname,
          text: msg.text,
          timestamp: Date.now(),
          roomId
        };

        addToHistory(roomId, chatMessage);
        broadcastToRoom(roomId, chatMessage);
        console.log(`[${roomId}] ${info.nickname}: ${msg.text}`);
      }
    } catch (err) {
      console.error('[ERROR] Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    const info = clientInfo.get(ws);
    console.log(`[${info?.roomId || 'unknown'}] Connection closed: ${info?.nickname || 'unknown'}`);
    removeFromRoom(ws);
  });

  ws.on('error', (err) => {
    console.error('[ERROR] WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local chat server running on ws://localhost:${PORT}`);
  console.log(`   Connect with: ws://localhost:${PORT}?roomId=<your-room-id>\n`);
});
