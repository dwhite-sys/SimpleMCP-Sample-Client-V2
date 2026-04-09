# SimpleMCP Sample Client V2

This is the reference client for the SimpleMCP V2 protocol. It's meant to show
how a client should talk to a SimpleMCP V2 server and to be a usable starting
point for anyone building their own.

## What SimpleMCP V2 is

SimpleMCP V2 is a tool server framework built around the concept of kits. A kit
is a Python file that exposes a set of tools. The server runs all your kits in a
single Docker container and makes them available over both the SimpleMCP protocol
and standard MCP simultaneously, so one server works with any client that speaks
either.

The SimpleMCP protocol specifically adds kit-level discovery and toggling on top
of MCP. Instead of spinning up a separate server per tool category and editing
config files to toggle things, you connect once and browse what's available. This
client makes that visible and interactive.

## How it connects

The client talks to two things:

- A SimpleMCP V2 server (default: `http://localhost:8467`) for kit and tool
  management
- Any OpenAI-compatible LLM endpoint for inference

The server handles tool execution. The LLM endpoint handles reasoning and decides
when to call tools. The client wires them together and runs the agentic loop.

## Getting started
```bash
npm install
npm run dev
```

Point the client at your SimpleMCP V2 server URL and any OpenAI-compatible
endpoint in Settings. The API key field is optional if your endpoint doesn't
require one (Ollama, for example).

## Building
```bash
npm run build          # web
npm run electron:build # desktop (Linux, Windows, macOS)
```
## Related

SimpleMCP V2 server coming soon.
