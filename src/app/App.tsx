import { useState, useEffect, useCallback } from 'react';
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

  // Start with the most recent saved chat, or a new blank one
  useEffect(() => {
    if (chats.length > 0) {
      setActiveChat(chats[0]);
    } else {
      handleNewChat();
    }
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

  // Collect all tools from enabled kits
  const getAllTools = (): Tool[] => kitsWithTools.flatMap((k) => k.tools);

  // ── Send message + inference loop ─────────────────────────────────────────

  const handleSendMessage = async (content: string) => {
    if (!activeChat) return;

    const currentChat = activeChat;
    const isPending = pendingChat?.id === currentChat.id;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
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

    try {
      const tools = getAllTools();

      // Build OpenAI message history
      type OAIMessage = { role: string; content: string | null; tool_call_id?: string; name?: string; tool_calls?: any[] };
      let oaiMessages: OAIMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant with access to tools provided by SimpleMCP. Use tools when they would help answer the user's question. Available kits: ${kitsWithTools.map((k) => k.kit_name).join(', ')}.`,
        },
        ...currentChat.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content },
      ];

      let runningMessages = [...messagesAfterUser];
      let committedChat: Chat | null = null;

      // Agentic loop — keep going until no more tool calls
      for (let turn = 0; turn < 10; turn++) {
        // Streaming assistant message
        let streamContent = '';
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
            streamContent += chunk;
            const updated = runningMessages.map((m) =>
              m.id === streamingMsg.id ? { ...m, content: streamContent } : m
            );
            runningMessages = updated;
            updateChatMessages(currentChat.id, updated, currentChat);
          }
        );

        // Finalize streaming message
        const finalAssistant = { ...streamingMsg, content: assistantContent || streamContent };
        runningMessages = runningMessages.map((m) =>
          m.id === streamingMsg.id ? finalAssistant : m
        );

        // Commit pending chat after first assistant response
        if (isPending && !committedChat) {
          const chatSnapshot = { ...currentChat, messages: runningMessages };
          committedChat = await commitPendingChat(chatSnapshot, content);
        } else {
          updateChatMessages(currentChat.id, runningMessages, committedChat || currentChat);
        }

        // No tool calls — done
        if (!toolCalls || toolCalls.length === 0) break;

        // Add assistant turn with tool_calls to OAI history
        oaiMessages.push({ role: 'assistant', content: assistantContent || null, tool_calls: toolCalls });

        // Execute each tool call
        for (const tc of toolCalls) {
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
    } catch (error) {
      const errMsg: Message = {
        id: (Date.now() + 99).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      updateChatMessages(currentChat.id, [...(activeChat?.messages || []), errMsg], currentChat);
      toast.error('Inference failed');
    } finally {
      setProcessing(false);
    }
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
        onServerUrlChange={handleServerUrlChange}
        onLLMConfigChange={handleLLMConfigChange}
        onSelectModel={handleSelectModel}
        onTestConnection={testConnection}
        onRefresh={handleRefresh}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
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

          <Panel defaultSize={80} minSize={30}>
            <ChatInterface
              chatTitle={displayChat?.title || 'New Chat'}
              messages={displayChat?.messages || []}
              kits={kits}
              onSendMessage={handleSendMessage}
              onToggleKit={handleToggleKit}
              isProcessing={processing}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
