/**
 * persistence.ts — localStorage-backed store for client config and chat history.
 *
 * Keys:
 *   simplemcp:llm_config   — { baseUrl, apiKey, model }
 *   simplemcp:server_url   — string
 *   simplemcp:chats        — Chat[]
 */

import type { Chat } from '../types/simplemcp';
import type { LLMConfig } from './llm';

const KEYS = {
  llmConfig: 'simplemcp:llm_config',
  serverUrl: 'simplemcp:server_url',
  chats: 'simplemcp:chats',
  selectedModel: 'simplemcp:selected_model',
} as const;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ── LLM Config ────────────────────────────────────────────────────────────────

export function loadLLMConfig(): Partial<LLMConfig> {
  return load<Partial<LLMConfig>>(KEYS.llmConfig) ?? {};
}

export function saveLLMConfig(config: LLMConfig) {
  save(KEYS.llmConfig, config);
}

// ── Server URL ────────────────────────────────────────────────────────────────

export function loadServerUrl(): string | null {
  return load<string>(KEYS.serverUrl);
}

export function saveServerUrl(url: string) {
  save(KEYS.serverUrl, url);
}

// ── Selected Model ────────────────────────────────────────────────────────────

export function loadSelectedModel(): string | null {
  return load<string>(KEYS.selectedModel);
}

export function saveSelectedModel(model: string) {
  save(KEYS.selectedModel, model);
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export function loadChats(): Chat[] {
  const raw = load<Chat[]>(KEYS.chats);
  if (!raw) return [];
  // Rehydrate Date objects (JSON.parse returns strings)
  return raw.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    messages: c.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
  }));
}

export function saveChats(chats: Chat[]) {
  save(KEYS.chats, chats);
}
