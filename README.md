# SimpleMCP V2 Client

An OpenWebUI-style frontend for the SimpleMCP V2 protocol. This client provides a modern, chat-based interface for interacting with SimpleMCP tools and kits.

## Features

- **Kit Management** - Browse and manage SimpleMCP kits with toggle controls
- **Tool Browser** - Explore available tools with detailed parameter information
- **Chat Interface** - Execute tools via natural language-style commands
- **Connection Management** - Configure and test SimpleMCP server connections
- **Real-time Updates** - See tool results and errors in real-time
- **Resizable Panels** - Customize your workspace layout

## Getting Started

### Prerequisites

- A running SimpleMCP V2 server (default: `http://localhost:8000`)
- Node.js and npm/pnpm

### Running the Client

1. Make sure your SimpleMCP server is running
2. Open the application
3. Configure the server URL in Settings (top-right gear icon) if different from default
4. Browse available kits in the left sidebar
5. Explore tools in the right sidebar
6. Execute tools via the chat interface

## Using the Client

### Tool Invocation Format

To execute a tool, type in the chat:

```
run tool "tool_name" {"param1": "value1", "param2": "value2"}
```

**Example:**
```
run tool "web_search" {"query": "SimpleMCP documentation", "num_results": 5}
```

### Tool Browser

Click on any tool in the right sidebar to get a template with all parameters pre-filled. You can then modify the values and execute the tool.

### Kit Management

- Toggle kits on/off using the switches in the left sidebar
- Refresh kits using the refresh button
- Only enabled kits will have their tools loaded and available

## Architecture

### Components

- **TopBar** - Connection status and settings
- **KitSidebar** - Displays all available kits with enable/disable toggles
- **ChatInterface** - Main interaction area for executing tools
- **ToolBrowser** - Browse and explore available tools
- **ChatMessage** - Display messages, tool calls, and results

### Services

- **SimpleMCPClient** - HTTP client for SimpleMCP V2 API endpoints:
  - `GET /list_kits` - List all kits
  - `POST /inspect_kit` - Get kit metadata
  - `POST /list_tools_in_kit` - Get tools for a kit
  - `POST /inspect_tool` - Get tool schema
  - `POST /run_tool` - Execute a tool

### Type Definitions

Full TypeScript types for all SimpleMCP V2 entities including kits, tools, parameters, and messages.

## Protocol Compliance

This client fully implements the SimpleMCP V2 protocol as specified in the developer guide:

- ✅ Kit discovery and inspection
- ✅ Tool listing and inspection
- ✅ Tool execution with argument validation
- ✅ Error handling and display
- ✅ Connection management
- ✅ Enabled/disabled kit handling

## UI Inspiration

This client is inspired by OpenWebUI with a focus on:
- Clean, modern dark theme
- Resizable panel layout
- Clear tool execution feedback
- Accessible kit and tool management

## Technical Stack

- React 18 with TypeScript
- Tailwind CSS v4
- Radix UI components
- React Resizable Panels
- Sonner for notifications
