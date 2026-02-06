# Quick Start Guide

## 1. Start the Chat Server

```bash
cd packages/local-chat-server
pnpm run dev
```

You should see:
```
🚀 Local chat server running on ws://localhost:4100
   Connect with: ws://localhost:4100?roomId=<your-room-id>
```

## 2. Test the Chat UI

In a separate terminal:

```bash
cd packages/testing
pnpm run dev
```

Navigate to the page that includes the chat component and provide a `spaceID` prop.

## 3. Manual Testing Checklist

- [ ] Chat connects automatically when user logged in
- [ ] Can send messages via Enter key
- [ ] Can send messages via Send button
- [ ] Messages appear in correct order
- [ ] Own messages appear on right (chat-end)
- [ ] Other messages appear on left (chat-start)
- [ ] Timestamp displays correctly
- [ ] Nickname shows in header
- [ ] Auto-scrolls to latest message
- [ ] Shows "No messages yet" when empty
- [ ] Input disabled when disconnected
- [ ] Shows "Please log in" when not authenticated

## 4. Multi-User Testing

Open two browser windows with different users:
- [ ] Messages from user A appear in user B's chat
- [ ] Messages from user B appear in user A's chat
- [ ] Each user sees their own messages on right
- [ ] Timestamps are consistent

## 5. Room Isolation

Test with different spaceIDs:
- [ ] Messages in room A don't appear in room B
- [ ] Each room maintains separate history
- [ ] Users can be in multiple rooms simultaneously

## 6. Connection Handling

- [ ] Refresh page - should reconnect and show history
- [ ] Stop server - UI shows disconnected state
- [ ] Restart server - UI reconnects automatically

## Troubleshooting

### Server won't start
- Check port 4100 is available: `lsof -i :4100`
- Kill existing process: `kill -9 <PID>`

### Client won't connect
- Verify server is running
- Check browser console for errors
- Confirm WebSocket URL in chat-service.ts

### No messages appear
- Check browser console for errors
- Verify user is logged in (UserContext)
- Check server logs for message broadcasts

## Development Tips

### Watch server logs
Server logs all connections, messages, and room activity.

### Inspect WebSocket
Chrome DevTools → Network → WS → Select connection → Messages tab

### Clear history
Restart server (in-memory storage resets).
