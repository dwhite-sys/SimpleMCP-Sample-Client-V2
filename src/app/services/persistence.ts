/**
 * persistence.ts — localStorage-backed store for client config and chat history.
 *
 * Keys:
 *   simplemcp:llm_config    — { baseUrl, apiKey, model }
 *   simplemcp:server_url    — string
 *   simplemcp:chats         — Chat[]
 *   simplemcp:pending_chat  — Chat | null  (in-progress chat not yet committed)
 *   simplemcp:selected_model — string
 */

import type { Chat } from '../types/simplemcp';
import type { LLMConfig } from './llm';

const KEYS = {
  llmConfig: 'simplemcp:llm_config',
  serverUrl: 'simplemcp:server_url',
  chats: 'simplemcp:chats',
  pendingChat: 'simplemcp:pending_chat',
  selectedModel: 'simplemcp:selected_model',
} as const;

// ── Disabled Kits (per server URL) ────────────────────────────────────────────

function disabledKitsKey(serverUrl: string): string {
  // Normalize URL so trailing slashes don't create separate keys
  return `simplemcp:disabled_kits:${serverUrl.replace(/\/$/, '')}`;
}

export function loadDisabledKits(serverUrl: string): Set<string> {
  const raw = load<string[]>(disabledKitsKey(serverUrl));
  return raw ? new Set(raw) : new Set();
}

export function saveDisabledKits(serverUrl: string, disabled: Set<string>) {
  save(disabledKitsKey(serverUrl), Array.from(disabled));
}

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
  return raw.map(rehydrateChat);
}

export function saveChats(chats: Chat[]) {
  save(KEYS.chats, chats);
}

// ── Pending Chat ──────────────────────────────────────────────────────────────

function rehydrateChat(c: Chat): Chat {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    messages: c.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
  };
}

export function loadPendingChat(): Chat | null {
  const raw = load<Chat>(KEYS.pendingChat);
  return raw ? rehydrateChat(raw) : null;
}

export function savePendingChat(chat: Chat | null) {
  if (chat) {
    save(KEYS.pendingChat, chat);
  } else {
    try { localStorage.removeItem(KEYS.pendingChat); } catch { /* ignore */ }
  }
}
