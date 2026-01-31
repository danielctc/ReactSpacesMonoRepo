# MCP Unity Setup Guide

Connect Claude Code (or other MCP-compatible AI assistants) to Unity Editor via the MCP Unity bridge.

## Prerequisites

- Unity Editor with MCP Unity package installed
- Node.js 18+
- Claude Code or compatible MCP client

## Architecture

```
Claude Code (MCP Client) <--stdio--> Node.js Bridge <--WebSocket--> Unity Editor (port 8090)
```

The MCP Unity package installs into Unity's PackageCache and includes:

- Unity Editor window (Tools > MCP Unity > Server Window)
- Node.js bridge server (`Server~/build/index.js`)

## Setup Steps

### 1. Install MCP Unity in Unity

Open Unity Package Manager:

- Window > Package Manager
- Click "+" > "Add package from git URL"
- Enter: `https://github.com/CoderGamester/mcp-unity.git`

### 2. Start Unity MCP Server

In Unity:

- Tools > MCP Unity > Server Window
- Click "Start Server"
- Verify status shows "Server Online" on port 8090

### 3. Locate the Node.js Bridge

The bridge is in Unity's PackageCache:

```
{PROJECT_PATH}/Library/PackageCache/com.gamelovers.mcp-unity@{VERSION}/Server~/build/index.js
```

Example:

```
/Volumes/Daniel Crucial/Unity work/SpacesSDK_Lenovo/Library/PackageCache/com.gamelovers.mcp-unity@4d59d9f5d3ad/Server~/build/index.js
```

### 4. Configure Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "mcp-unity": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Server~/build/index.js"],
      "cwd": "/ABSOLUTE/PATH/TO/Server~"
    }
  }
}
```

**Important:** If your path contains spaces, create a symlink:

```bash
ln -sf "/path/with spaces/Server~" /tmp/mcp-unity-server
```

Then use the symlink in config:

```json
{
  "mcpServers": {
    "mcp-unity": {
      "command": "node",
      "args": ["/tmp/mcp-unity-server/build/index.js"],
      "cwd": "/tmp/mcp-unity-server"
    }
  }
}
```

### 5. Restart Claude Code

Restart for the MCP server to connect.

## Verification

### Test Node.js Bridge Manually

```bash
cd /path/to/Server~
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node build/index.js
```

Expected response:

```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {}, "resources": {}, "prompts": {} },
    "serverInfo": { "name": "MCP Unity Server", "version": "1.0.0" }
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

### Test Unity WebSocket Server

```bash
curl -v http://localhost:8090
```

Should return `HTTP/1.1 501 Not Implemented` with `Server: websocket-sharp/1.0` (confirms WebSocket server is running).

### In Claude Code

Search for Unity MCP tools - should find tools like:

- createScene
- selectGameObject
- getSceneInfo
- updateComponent
- etc.

## Unity Settings

Located at `{PROJECT_PATH}/ProjectSettings/McpUnitySettings.json`:

```json
{
  "Port": 8090,
  "RequestTimeoutSeconds": 10,
  "AutoStartServer": true,
  "EnableInfoLogs": true,
  "NpmExecutablePath": "",
  "AllowRemoteConnections": false
}
```

## Troubleshooting

### "No clients connected" in Unity

- Verify Node.js bridge is running (check Claude Code logs)
- Check path in `~/.claude.json` is correct
- Ensure `cwd` points to the `Server~` directory (needed for settings file resolution)

### MCP tools not appearing in Claude Code

1. Check `~/.claude.json` syntax is valid JSON
2. Verify Node.js 18+ is installed: `node --version`
3. Test bridge manually (see Verification section)
4. Check for spaces in path - use symlink if needed

### Connection refused

- Ensure Unity MCP server is started (green "Server Online" status)
- Check port 8090 is not blocked
- Verify `AllowRemoteConnections` in Unity settings if connecting remotely

## Available MCP Tools

Once connected, these tools become available:

| Tool             | Description                   |
| ---------------- | ----------------------------- |
| createScene      | Create new Unity scene        |
| deleteScene      | Delete a scene                |
| loadScene        | Load scene into editor        |
| saveScene        | Save current scene            |
| getSceneInfo     | Get scene hierarchy info      |
| selectGameObject | Select object in hierarchy    |
| updateGameObject | Modify GameObject properties  |
| updateComponent  | Modify component values       |
| createPrefab     | Create prefab from GameObject |
| addAssetToScene  | Add asset to current scene    |
| menuItem         | Execute Unity menu commands   |
| addPackage       | Add UPM package               |
| runTests         | Run Unity tests               |
| getConsoleLogs   | Fetch Unity console output    |
| recompileScripts | Trigger script recompilation  |

## Resources

- [CoderGamester/mcp-unity](https://github.com/CoderGamester/mcp-unity)
- [CoplayDev/unity-mcp Wiki](https://github.com/CoplayDev/unity-mcp/wiki/2.-Fix-Unity-MCP-and-Claude-Code)
- [MCP Protocol Spec](https://modelcontextprotocol.io)

## Quick Reference for LLMs

When setting up MCP Unity for a user:

1. Find the `Server~/build/index.js` in Unity's PackageCache
2. Add to `~/.claude.json` with correct `command`, `args`, and `cwd`
3. Handle spaces in paths with symlinks
4. Restart Claude Code
5. Verify with `ToolSearch` for "unity" tools
