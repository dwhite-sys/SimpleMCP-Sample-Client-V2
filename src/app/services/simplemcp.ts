// SimpleMCP V2 API Client Service

import type { Kit, Tool, ToolResult } from '../types/simplemcp';

export class SimpleMCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8467') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async listKits(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/list_kits`);
    if (!res.ok) throw new Error(`Failed to list kits: ${res.statusText}`);
    const data = await res.json();
    return data.kits || [];
  }

  async inspectKit(kitName: string): Promise<Kit> {
    const res = await fetch(`${this.baseUrl}/inspect_kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kit: kitName }),
    });
    if (!res.ok) throw new Error(`Failed to inspect kit: ${res.statusText}`);
    return res.json();
  }

  async listToolsInKit(kitName: string): Promise<{ kit: string; tools: Tool[] }> {
    const res = await fetch(`${this.baseUrl}/list_tools_in_kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kit: kitName }),
    });
    if (!res.ok) throw new Error(`Failed to list tools: ${res.statusText}`);
    return res.json();
  }

  async inspectTool(toolName: string): Promise<Tool & { kit: string }> {
    const res = await fetch(`${this.baseUrl}/inspect_tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName }),
    });
    if (!res.ok) throw new Error(`Failed to inspect tool: ${res.statusText}`);
    return res.json();
  }

  async runTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    const res = await fetch(`${this.baseUrl}/run_tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, arguments: args }),
    });
    if (!res.ok) throw new Error(`Failed to run tool: ${res.statusText}`);
    return res.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listKits();
      return true;
    } catch {
      return false;
    }
  }
}

export const mcpClient = new SimpleMCPClient();
