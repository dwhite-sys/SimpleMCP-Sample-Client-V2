import { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TopBar } from './components/TopBar';
import { KitSidebar } from './components/KitSidebar';
import { ChatInterface } from './components/ChatInterface';
import { mcpClient } from './services/simplemcp';
import { llmClient, type LLMConfig } from './services/llm';
import {
  loadLLMConfig, saveLLMConfig,
  loadServerUrl, saveServerUrl,
  loadSelectedModel, saveSelectedModel,
  loadChats, saveChats,
  loadDisabledKits, saveDisabledKits,
} from './services/persistence';
import type { Kit, KitWithTools, Message, Chat, Tool } from './types/simplemcp';
import { toast, Toaster } from 'sonner';

export default function App() {
  const [serverUrl, setServerUrl] = useState(() => loadServerUrl() ?? 'http://localhost:8467');
  const [connected, setConnected] = useState(false);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitsWithTools, setKitsWithTools] = useState<KitWithTools[]>([]);

  // Chats — pendingChat is created but not shown in sidebar until named
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [pendingChat, setPendingChat] = useState<Chat | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [llmConfig, setLLMConfig] = useState<LLMConfig>(() => {
    const saved = loadLLMConfig();
    const config = { baseUrl: '', apiKey: '', model: '', ...saved };
    llmClient.setConfig(config);
    return config;
  });
  const [selectedModel, setSelectedModel] = useState(() => loadSelectedModel() ?? '');

  // Disabled tools — stored as "kit_name::tool_name" strings, persisted per server URL
  const [disabledTools, setDisabledTools] = useState<Set<string>>(() => {
    const url = loadServerUrl() ?? 'http://localhost:8467';
    return loadDisabledKits(url);
  });

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // AbortController for cancelling in-flight inference
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const toggleDisabledTool = (toolKey: string) => {
    setDisabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) next.delete(toolKey);
      else next.add(toolKey);
      saveDisabledKits(serverUrl, next);
      return next;
    });
  };

  const enableAllToolsInKit = (kitName: string) => {
    setDisabledTools((prev) => {
      const next = new Set(prev);
      kitsWithTools
        .find((k) => k.kit_name === kitName)
        ?.tools.forEach((t) => next.delete(`${kitName}::${t.name}`));
      saveDisabledKits(serverUrl, next);
      return next;
    });
  };

  // ── LLM config ────────────────────────────────────────────────────────────

  const handleLLMConfigChange = (partial: Partial<LLMConfig>) => {
    setLLMConfig((prev) => {
      const next = { ...prev, ...partial };
      llmClient.setConfig(next);
      saveLLMConfig(next);
      return next;
    });
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    handleLLMConfigChange({ model: modelId });
    saveSelectedModel(modelId);
  };

  // ── SimpleMCP connection ───────────────────────────────────────────────────

  const testConnection = useCallback(async () => {
    try {
      const success = await mcpClient.testConnection();
      setConnected(success);
      return success;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  const loadKits = useCallback(async () => {
    setLoading(true);
    try {
      const kitNames = await mcpClient.listKits();
      const kitDetails = await Promise.all(kitNames.map((name) => mcpClient.inspectKit(name)));
      setKits(kitDetails);
      setConnected(true);
      toast.success(`Loaded ${kitDetails.length} kits`);
      return kitDetails;
    } catch {
      toast.error('Failed to load kits');
      setConnected(false);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTools = useCallback(async (allKits: Kit[]) => {
    const enabledKits = allKits.filter((k) => k.enabled);
    try {
      const kitsWithToolsData = await Promise.all(
        enabledKits.map(async (kit) => {
          const { tools } = await mcpClient.listToolsInKit(kit.kit_name);
          return { ...kit, tools };
        })
      );
      setKitsWithTools(kitsWithToolsData);
    } catch {
      toast.error('Failed to load tools');
    }
  }, []);

  useEffect(() => {
    mcpClient.setBaseUrl(serverUrl);
    const init = async () => {
      const success = await testConnection();
      if (success) {
        const loadedKits = await loadKits();
        await loadTools(loadedKits);
      }
    };
    init();
  }, [serverUrl, testConnection, loadKits, loadTools]);

  // Persist chats to localStorage whenever they change
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  // ── Chat management ────────────────────────────────────────────────────────

  // Create a new pending chat (not in sidebar yet)
  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPendingChat(newChat);
    setActiveChat(newChat);
  };

  // Always start on a fresh new chat screen on launch
  useEffect(() => {
    handleNewChat();
  }, []);

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      setPendingChat(null);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== chatId);
      if (activeChat?.id === chatId) {
        const next = filtered[0] || null;
        setActiveChat(next);
        if (!next) handleNewChat();
      }
      return filtered;
    });
    toast.success('Chat deleted');
  };

  const handleRenameChat = (chatId: string, title: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title, updatedAt: new Date() } : c))
    );
    if (activeChat?.id === chatId) {
      setActiveChat((prev) => (prev ? { ...prev, title } : null));
    }
    toast.success('Chat renamed');
  };

  const handleServerUrlChange = (url: string) => {
    setServerUrl(url);
    saveServerUrl(url);
    mcpClient.setBaseUrl(url);
    // Load disabled kits for the new endpoint
    setDisabledTools(loadDisabledKits(url));
    loadKits().then(loadTools);
  };

  const handleToggleKit = async (kitName: string, enabled: boolean) => {
    // Flip enabled state locally — no server round-trip needed
    const updatedKits = kits.map((k) =>
      k.kit_name === kitName ? { ...k, enabled } : k
    );
    setKits(updatedKits);

    if (enabled) {
      // Load this kit's tools and add them
      try {
        const { tools } = await mcpClient.listToolsInKit(kitName);
        const kit = updatedKits.find((k) => k.kit_name === kitName)!;
        setKitsWithTools((prev) => [...prev.filter((k) => k.kit_name !== kitName), { ...kit, tools }]);
        toast.success(`${kitName} enabled`);
      } catch {
        toast.error(`Failed to load tools for ${kitName}`);
      }
    } else {
      // Drop this kit's tools from the active set
      setKitsWithTools((prev) => prev.filter((k) => k.kit_name !== kitName));
      toast.success(`${kitName} disabled`);
    }
  };

  const handleRefresh = async () => {
    const loadedKits = await loadKits();
    await loadTools(loadedKits);
  };

  // ── Message helpers ────────────────────────────────────────────────────────

  const updateChatMessages = (chatId: string, messages: Message[], chat?: Chat) => {
    const source = chat || activeChat;
    if (!source) return;
    const updated = { ...source, messages, updatedAt: new Date() };

    if (pendingChat?.id === chatId) {
      setPendingChat(updated);
    } else {
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
    }
    if (activeChat?.id === chatId) {
      setActiveChat(updated);
    }
  };

  // Commit pending chat to sidebar immediately with a placeholder title,
  // then update it in the background once the LLM generates a real one.
  const commitPendingChat = async (chat: Chat, firstUserMessage: string) => {
    const placeholder = firstUserMessage.trim().split(/\s+/).slice(0, 5).join(' ');
    const titled = { ...chat, title: placeholder };
    setChats((prev) => [titled, ...prev]);
    setPendingChat(null);
    setActiveChat(titled);

    // Fire-and-forget: replace title once LLM responds
    llmClient.generateTitle(firstUserMessage).then((llmTitle) => {
      setChats((prev) => prev.map((c) => c.id === titled.id ? { ...c, title: llmTitle } : c));
      setActiveChat((prev) => prev?.id === titled.id ? { ...prev, title: llmTitle } : prev);
    });

    return titled;
  };

  // Collect all tools from enabled kits, excluding disabled ones
  const getAllTools = (): Tool[] =>
    kitsWithTools.flatMap((k) =>
      k.tools.filter((t) => !disabledTools.has(`${k.kit_name}::${t.name}`))
    );

  // ── Send message + inference loop ─────────────────────────────────────────

  const runInference = async (
    currentChat: Chat,
    isPending: boolean,
    messagesAfterUser: Message[],
    userContent: string,
  ) => {
    // Create a fresh AbortController for this inference run
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    let runningMessages = [...messagesAfterUser];
    let committedChat: Chat | null = null;

    try {
      const tools = getAllTools();

      // Build OpenAI message history
      type OAIContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
      type OAIMessage = { role: string; content: string | OAIContentPart[] | null; tool_call_id?: string; name?: string; tool_calls?: any[] };

      // Helper: build the content for a user message, attaching image blocks if present.
      const buildUserContent = (text: string, msg: Message): string | OAIContentPart[] => {
        const images = (msg.attachments ?? []).filter((a) => a.dataUrl);
        if (images.length === 0) return text;
        const parts: OAIContentPart[] = [];
        if (text) parts.push({ type: 'text', text });
        for (const img of images) {
          parts.push({ type: 'image_url', image_url: { url: img.dataUrl! } });
        }
        return parts;
      };

      let oaiMessages: OAIMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant with access to tools provided by SimpleMCP. Use tools when they would help answer the user's question. Available kits: ${kitsWithTools.map((k) => k.kit_name).join(', ')}.`,
        },
        ...currentChat.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => {
            // Strip <think>...</think> blocks before sending history back to the model
            const raw = m.content || '';
            const cleaned = raw
              .replace(/<think>[\s\S]*?<\/think>/g, '')
              .trim();
            return { role: m.role, content: m.role === 'user' ? buildUserContent(cleaned, m) : cleaned };
          }),
        { role: 'user', content: buildUserContent(userContent, messagesAfterUser[messagesAfterUser.length - 1]) },
      ];

      // Agentic loop — keep going until no more tool calls
      for (let turn = 0; turn < 10; turn++) {
        if (signal.aborted) break;

        // Streaming assistant message
        const streamingMsg: Message = {
          id: (Date.now() + turn * 10 + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        runningMessages = [...runningMessages, streamingMsg];
        updateChatMessages(currentChat.id, runningMessages, currentChat);

        const { content: assistantContent, toolCalls } = await llmClient.chat(
          oaiMessages,
          tools,
          (chunk) => {
            // llm.ts now sends '\x00REPLACE\x00<full>' to replace entire content
            const newContent = chunk.startsWith('\x00REPLACE\x00')
              ? chunk.slice('\x00REPLACE\x00'.length)
              : chunk; // fallback for any non-replace chunk
            const updated = runningMessages.map((m) =>
              m.id === streamingMsg.id ? { ...m, content: newContent } : m
            );
            runningMessages = updated;
            updateChatMessages(currentChat.id, updated, currentChat);
          },
          signal,
        );

        // Finalize streaming message
        const finalAssistant = { ...streamingMsg, content: assistantContent || '' };
        runningMessages = runningMessages.map((m) =>
          m.id === streamingMsg.id ? finalAssistant : m
        );

        // Commit pending chat after first assistant response
        if (isPending && !committedChat) {
          const chatSnapshot = { ...currentChat, messages: runningMessages };
          committedChat = await commitPendingChat(chatSnapshot, userContent);
        } else {
          updateChatMessages(currentChat.id, runningMessages, committedChat || currentChat);
        }

        // Stopped mid-generation or no tool calls — done
        if (signal.aborted || !toolCalls || toolCalls.length === 0) break;

        // Add assistant turn with tool_calls to OAI history
        oaiMessages.push({ role: 'assistant', content: assistantContent || null, tool_calls: toolCalls });

        // Execute each tool call
        for (const tc of toolCalls) {
          if (signal.aborted) break;
          const toolName = tc.function.name;
          let args: Record<string, any> = {};
          try { args = JSON.parse(tc.function.arguments); } catch { /* empty args */ }

          const toolCallMsg: Message = {
            id: (Date.now() + turn * 10 + 2).toString(),
            role: 'tool',
            content: `Calling ${toolName}...`,
            toolCall: { tool: toolName, arguments: args },
            timestamp: new Date(),
          };
          runningMessages = [...runningMessages, toolCallMsg];
          updateChatMessages(currentChat.id, runningMessages, committedChat || currentChat);

          let toolResult: any;
          try {
            toolResult = await mcpClient.runTool(toolName, args);
          } catch (e) {
            toolResult = { error: String(e) };
          }

          // Update tool message with result
          const toolResultMsg: Message = {
            ...toolCallMsg,
            content: `Executed ${toolName}`,
            toolResult,
          };
          runningMessages = runningMessages.map((m) =>
            m.id === toolCallMsg.id ? toolResultMsg : m
          );
          updateChatMessages(currentChat.id, runningMessages, committedChat || currentChat);

          // Add tool result to OAI history
          oaiMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: JSON.stringify(toolResult),
          });
        }
      }
    } catch (error: any) {
      // AbortError = user pressed stop — not an error worth toasting
      if (error?.name === 'AbortError') return;
      const errMsg: Message = {
        id: (Date.now() + 99).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      const messagesWithError = [...runningMessages, errMsg];
      if (isPending && !committedChat) {
        await commitPendingChat({ ...currentChat, messages: messagesWithError }, userContent);
      } else {
        updateChatMessages(currentChat.id, messagesWithError, committedChat || currentChat);
      }
      toast.error('Inference failed');
    } finally {
      setProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!activeChat) return;

    const currentChat = activeChat;
    const isPending = pendingChat?.id === currentChat.id;

    const fullContent = content;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      attachments: await Promise.all(
        (attachments ?? []).map(async (f) => {
          let dataUrl: string | undefined;
          if (f.type.startsWith('image/')) {
            dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(f);
            });
          }
          return { name: f.name, size: f.size, type: f.type, dataUrl };
        })
      ),
      timestamp: new Date(),
    };

    const messagesAfterUser = [...currentChat.messages, userMessage];
    updateChatMessages(currentChat.id, messagesAfterUser, currentChat);

    setProcessing(true);

    // If LLM not configured, fall back to manual tool invocation echo
    if (!llmClient.isConfigured()) {
      const echo: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'LLM not configured. Go to Settings → LLM to add an endpoint and API key.',
        timestamp: new Date(),
      };
      updateChatMessages(currentChat.id, [...messagesAfterUser, echo], currentChat);
      setProcessing(false);

      // Still commit pending chat
      if (isPending) {
        await commitPendingChat({ ...currentChat, messages: [...messagesAfterUser, echo] }, content);
      }
      return;
    }

    runInference(currentChat, isPending, messagesAfterUser, fullContent);
  };

  // ── Edit + retry ────────────────────────────────────────────────────────────

  const handleEditMessage = async (messageId: string, newContent: string, attachments?: File[]) => {
    if (!activeChat || processing) return;
    const idx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const original = activeChat.messages[idx];

    // Rebuild attachments: keep original ones, merge with any new files added during edit
    const keptAttachments = original.attachments ?? [];
    const newAttachments = await Promise.all(
      (attachments ?? []).map(async (f) => {
        let dataUrl: string | undefined;
        if (f.type.startsWith('image/')) {
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(f);
          });
        }
        return { name: f.name, size: f.size, type: f.type, dataUrl };
      })
    );
    const mergedAttachments = [...keptAttachments, ...newAttachments];

    const editedMessage: Message = {
      ...original,
      content: newContent,
      attachments: mergedAttachments.length > 0 ? mergedAttachments : undefined,
    };
    // Truncate everything from this message onward, replacing with the edited one
    const truncated = [...activeChat.messages.slice(0, idx), editedMessage];
    const updatedChat = { ...activeChat, messages: truncated, updatedAt: new Date() };

    const isPending = pendingChat?.id === activeChat.id;
    if (isPending) {
      setPendingChat(updatedChat);
    } else {
      setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
    }
    setActiveChat(updatedChat);

    setProcessing(true);
    runInference(updatedChat, isPending, truncated, newContent);
  };

  // Retry: truncate everything after the user message and re-run from there
  const handleRetry = (userMessageId: string) => {
    if (!activeChat || processing) return;
    const idx = activeChat.messages.findIndex((m) => m.id === userMessageId);
    if (idx === -1) return;

    const userMsg = activeChat.messages[idx];
    const truncated = activeChat.messages.slice(0, idx + 1); // keep user message, drop everything after
    const updatedChat = { ...activeChat, messages: truncated, updatedAt: new Date() };

    const isPending = pendingChat?.id === activeChat.id;
    if (isPending) {
      setPendingChat(updatedChat);
    } else {
      setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
    }
    setActiveChat(updatedChat);

    setProcessing(true);
    runInference(updatedChat, isPending, truncated, userMsg.content || '');
  };

  // ── Tool browser select ────────────────────────────────────────────────────

  const handleToolSelect = (toolName: string, kitName: string) => {
    if (!activeChat) return;
    const kit = kitsWithTools.find((k) => k.kit_name === kitName);
    const tool = kit?.tools.find((t) => t.name === toolName);
    if (!tool) return;

    const allParams = Object.keys(tool.parameters.properties || {});
    const template: Record<string, any> = {};
    allParams.forEach((param) => {
      const s = tool.parameters.properties?.[param];
      if (s?.type === 'string') template[param] = '';
      else if (s?.type === 'integer' || s?.type === 'number') template[param] = 0;
      else if (s?.type === 'boolean') template[param] = false;
      else template[param] = null;
    });

    const infoMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `Tool: **${toolName}**\n\nRequired: ${tool.parameters.required?.join(', ') || 'none'}\n\nTemplate:\n\`\`\`json\n${JSON.stringify(template, null, 2)}\n\`\`\``,
      timestamp: new Date(),
    };
    const newMessages = [...activeChat.messages, infoMessage];
    updateChatMessages(activeChat.id, newMessages);
    toast.info(`Added template for ${toolName}`);
  };

  // The active chat to render — could be pending or committed
  const displayChat = activeChat;
  // Only show committed chats in sidebar
  const sidebarChats = chats;

  return (
    <div className="dark h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Toaster position="top-right" theme="dark" />
      <TopBar
        connected={connected}
        serverUrl={serverUrl}
        kits={kits}
        kitsWithTools={kitsWithTools}
        llmConfig={llmConfig}
        selectedModel={selectedModel}
        disabledTools={disabledTools}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onServerUrlChange={handleServerUrlChange}
        onLLMConfigChange={handleLLMConfigChange}
        onSelectModel={handleSelectModel}
        onTestConnection={testConnection}
        onRefresh={handleRefresh}
        onToggleDisabledTool={toggleDisabledTool}
        onEnableAllToolsInKit={enableAllToolsInKit}
        onToggleKit={handleToggleKit}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {!sidebarCollapsed && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={30}>
                <KitSidebar
                  chats={sidebarChats}
                  activeChat={displayChat}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onDeleteChat={handleDeleteChat}
                  onRenameChat={handleRenameChat}
                />
              </Panel>
              <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-blue-600 transition-colors" />
            </>
          )}

          <Panel defaultSize={sidebarCollapsed ? 100 : 80} minSize={30}>
            <ChatInterface
              chatTitle={displayChat?.title || 'New Chat'}
              messages={displayChat?.messages || []}
              kits={kits}
              onSendMessage={handleSendMessage}
              onToggleKit={handleToggleKit}
              onStop={handleStop}
              onEditMessage={handleEditMessage}
              onRetry={handleRetry}
              isProcessing={processing}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
