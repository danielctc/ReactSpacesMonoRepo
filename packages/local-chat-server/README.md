# Local Chat Server

WebSocket chat server for POC development. Provides real-time chat functionality for the ReactSpaces monorepo.

## Usage

```bash
# Development (auto-restart on changes)
pnpm run dev

# Production
pnpm run start
```

Server runs on `ws://localhost:4100`

## Protocol

### Connection
Connect with roomId as query parameter:
```
ws://localhost:4100?roomId=your-room-id
```

### Messages

**Join room:**
```json
{
  "type": "join",
  "userId": "user-123",
  "nickname": "Daniel"
}
```

**Send message:**
```json
{
  "type": "message",
  "text": "Hello world"
}
```

**Receive message:**
```json
{
  "id": "uuid",
  "userId": "user-123",
  "nickname": "Daniel",
  "text": "Hello world",
  "timestamp": 1234567890,
  "roomId": "your-room-id"
}
```

## Features

- Room-based chat (isolated message streams)
- Message history (last 100 messages per room)
- In-memory storage (resets on server restart)
- Auto-cleanup when rooms empty
- Connection logging

## Client

Use `@disruptive-spaces/shared/services/chat-service` for client-side integration.

## Future

This server will be replaced with Cloudflare Workers implementation using the same ChatService interface.
