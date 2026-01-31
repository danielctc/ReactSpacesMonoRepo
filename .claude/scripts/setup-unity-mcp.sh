#!/bin/bash
# Setup Unity MCP for Claude Code
# Run this script to configure Unity MCP connection

set -e

echo "🔧 Unity MCP Setup"
echo "=================="

# Find Unity MCP Server in PackageCache
UNITY_PROJECT="/Volumes/Daniel Crucial/Unity work/SpacesSDK_Lenovo"
MCP_PACKAGE=$(find "$UNITY_PROJECT/Library/PackageCache" -name "com.gamelovers.mcp-unity*" -type d 2>/dev/null | head -1)

if [ -z "$MCP_PACKAGE" ]; then
    echo "❌ MCP Unity package not found in Unity project"
    echo "   Expected location: $UNITY_PROJECT/Library/PackageCache/com.gamelovers.mcp-unity@*"
    echo ""
    echo "   Install it in Unity:"
    echo "   1. Window > Package Manager"
    echo "   2. Click '+' > Add package from git URL"
    echo "   3. Enter: https://github.com/CoderGamester/mcp-unity.git"
    exit 1
fi

SERVER_PATH="$MCP_PACKAGE/Server~"
echo "✓ Found MCP Unity at: $MCP_PACKAGE"

# Create symlink (spaces in path workaround)
SYMLINK_PATH="/tmp/mcp-unity-server"
if [ -L "$SYMLINK_PATH" ]; then
    rm "$SYMLINK_PATH"
fi
ln -sf "$SERVER_PATH" "$SYMLINK_PATH"
echo "✓ Created symlink: $SYMLINK_PATH -> $SERVER_PATH"

# Test Node.js bridge
echo ""
echo "Testing Node.js bridge..."
INIT_MSG='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
RESPONSE=$(cd "$SYMLINK_PATH" && echo "$INIT_MSG" | node build/index.js 2>&1 | head -1)

if echo "$RESPONSE" | grep -q "MCP Unity Server"; then
    echo "✓ Node.js bridge responds correctly"
else
    echo "❌ Bridge failed to respond. Output:"
    echo "$RESPONSE"
    exit 1
fi

# Test Unity WebSocket server
echo ""
echo "Testing Unity WebSocket server (port 8090)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090 2>&1 || echo "000")

if [ "$HTTP_CODE" = "501" ]; then
    echo "✓ Unity WebSocket server is running"
else
    echo "⚠ Unity server not responding (HTTP $HTTP_CODE)"
    echo "  Start it in Unity: Tools > MCP Unity > Server Window > Start Server"
fi

# Update project .mcp.json
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MCP_CONFIG="$PROJECT_ROOT/.claude/.mcp.json"

cat > "$MCP_CONFIG" << 'EOF'
{
  "mcpServers": {
    "mcp-unity": {
      "command": "node",
      "args": ["/tmp/mcp-unity-server/build/index.js"],
      "cwd": "/tmp/mcp-unity-server"
    }
  }
}
EOF
echo "✓ Updated $MCP_CONFIG"

# Update global Claude config
CLAUDE_CONFIG="$HOME/.claude.json"
if [ -f "$CLAUDE_CONFIG" ]; then
    # Use jq if available, otherwise just inform user
    if command -v jq &> /dev/null; then
        jq '.mcpServers["mcp-unity"] = {"command": "node", "args": ["/tmp/mcp-unity-server/build/index.js"], "cwd": "/tmp/mcp-unity-server"}' "$CLAUDE_CONFIG" > /tmp/claude_new.json && mv /tmp/claude_new.json "$CLAUDE_CONFIG"
        echo "✓ Updated ~/.claude.json"
    else
        echo "⚠ Install jq to auto-update ~/.claude.json, or add manually"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use Unity MCP tools from this project:"
echo "  npx tsx .claude/skills/mcp-management/scripts/cli.ts list-tools"
echo "  npx tsx .claude/skills/mcp-management/scripts/cli.ts call-tool mcp-unity get_scene_info '{}'"
echo ""
echo "NOTE: Restart Claude Code to pick up the new MCP config"
