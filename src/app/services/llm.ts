// LLM inference service — OpenAI-compatible API

import type { Tool } from '../types/simplemcp';

export interface LLMConfig {
  baseUrl: string;   // e.g. https://openrouter.ai/api/v1
  apiKey: string;
  model: string;
}

export interface ModelInfo {
  id: string;
  name?: string;
  owned_by?: string;
}

export class LLMClient {
  private config: LLMConfig = {
    baseUrl: '',
    apiKey: '',
    model: '',
  };

  setConfig(config: Partial<LLMConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiKey && this.config.model);
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.config.baseUrl || !this.config.apiKey) return [];
    const res = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/models`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  }

  // Convert SimpleMCP tool schemas to OpenAI function call format
  private formatTools(tools: Tool[]) {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  async chat(
    messages: { role: string; content: string | null; tool_call_id?: string; name?: string }[],
    tools: Tool[] = [],
    onChunk?: (text: string) => void
  ): Promise<{ content: string; toolCalls?: any[] }> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body: any = {
      model: this.config.model,
      messages,
      stream: !!onChunk,
    };

    if (tools.length > 0) {
      body.tools = this.formatTools(tools);
      body.tool_choice = 'auto';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LLM error ${res.status}: ${err}`);
    }

    // Streaming response
    if (onChunk && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let toolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              onChunk(delta.content);
            }
            if (delta?.tool_calls) {
              // Accumulate tool call chunks
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                }
                if (tc.id) toolCalls[tc.index].id = tc.id;
                if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      return { content: fullContent, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
    }

    // Non-streaming
    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls,
    };
  }

  async generateTitle(userMessage: string): Promise<string> {
    if (!this.isConfigured()) return userMessage.slice(0, 40);
    try {
      const { content } = await this.chat([
        {
          role: 'system',
          content: 'Generate a short 3-6 word title for a chat that starts with this message. Return ONLY the title, no quotes, no punctuation at the end.',
        },
        { role: 'user', content: userMessage },
      ]);
      return content.trim().slice(0, 60) || userMessage.slice(0, 40);
    } catch {
      return userMessage.slice(0, 40);
    }
  }
}

export const llmClient = new LLMClient();
