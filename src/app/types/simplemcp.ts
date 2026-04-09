// SimpleMCP V2 Type Definitions

export interface Kit {
  kit_name: string;
  kit_description: string;
  filename: string;
  enabled: boolean;
}

export interface ToolParameter {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter;
}

export interface KitWithTools extends Kit {
  tools: Tool[];
}

export interface ToolResult {
  result?: any;
  error?: string;
}

export interface MessageAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // base64 data URL for images, for thumbnail display
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  attachments?: MessageAttachment[];
  toolCall?: {
    tool: string;
    arguments: Record<string, any>;
  };
  toolResult?: ToolResult;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string | null; // null = pending (not yet shown in sidebar)
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppLLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}