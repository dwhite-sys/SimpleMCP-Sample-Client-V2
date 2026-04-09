import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { RunStep } from './ChatMessage';
import { KitToggleMenu } from './KitToggleMenu';
import type { Message, Kit } from '../types/simplemcp';

// ── Group an entire agentic run into a single assistant bubble ────────────────
// An agentic run is: assistant? → [tool* → assistant]* → final assistant
// We merge all intermediate assistant messages (which carry thinking) and all
// tool messages into a single rendered group whose "message" is the last
// assistant turn (the one with actual content / no tool_calls pending).
// Steps are kept in the order they actually occurred (think → tool → think → tool…).
function groupMessages(messages: Message[]): { message: Message; steps: RunStep[] }[] {
  const groups: { message: Message; steps: RunStep[] }[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];

    // Non-assistant messages are standalone groups (user, system, tool orphans)
    if (msg.role !== 'assistant') {
      if (msg.role !== 'tool') {
        groups.push({ message: msg, steps: [] });
      }
      i++;
      continue;
    }

    // Start of an assistant run — consume everything until there are no more
    // tool messages following (i.e. we've reached the final assistant turn).
    const steps: RunStep[] = [];
    let lastAssistant = msg;

    while (i < messages.length) {
      const cur = messages[i];
      if (cur.role === 'assistant') {
        lastAssistant = cur;
        i++;
        // Collect any tool messages that follow this assistant turn
        const stepsForThisTurn: Message[] = [];
        while (i < messages.length && messages[i].role === 'tool') {
          stepsForThisTurn.push(messages[i]);
          i++;
        }
        const isIntermediateTurn = stepsForThisTurn.length > 0 || (i < messages.length && messages[i].role === 'assistant');
        // Only extract thinking from intermediate turns — the final turn's thinking
        // is appended by ChatMessage itself (via parseContent) so we skip it here.
        if (isIntermediateTurn) {
          const { thinking } = parseThinking(cur.content || '');
          if (thinking) steps.push({ kind: 'thinking', text: thinking });
        }
        // Tool steps follow the thinking that caused them — preserving order.
        for (const t of stepsForThisTurn) steps.push({ kind: 'tool', message: t });
        // If the next message is another assistant turn, keep looping (multi-turn)
        if (i < messages.length && messages[i].role === 'assistant') continue;
        // Otherwise we're done with this run
        break;
      } else {
        break;
      }
    }

    groups.push({ message: lastAssistant, steps });
  }
  return groups;
}

// Thin helper used by groupMessages (mirrors parseContent in ChatMessage)
function parseThinking(raw: string): { thinking: string } {
  const full = raw.match(/^<think>([\s\S]*?)<\/think>/);
  if (full) return { thinking: full[1].trim() };
  const streaming = raw.match(/^<think>([\s\S]*)$/);
  if (streaming) return { thinking: streaming[1] };
  return { thinking: '' };
}

interface ChatInterfaceProps {
  chatTitle?: string;
  messages: Message[];
  kits: Kit[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onToggleKit: (kitName: string, enabled: boolean) => void;
  onStop: () => void;
  onEditMessage: (messageId: string, newContent: string, attachments?: File[]) => void;
  onRetry: (userMessageId: string) => void;
  isProcessing?: boolean;
}

function InputBar({
  input,
  setInput,
  onSubmit,
  onStop,
  isProcessing,
  kits,
  onToggleKit,
  compact = false,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent, files: File[]) => void;
  onStop: () => void;
  isProcessing?: boolean;
  kits: Kit[];
  onToggleKit: (kitName: string, enabled: boolean) => void;
  compact?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e, files);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? '' : 'w-full'}>
      <div className={`flex flex-col bg-zinc-800 border border-zinc-700 rounded-xl focus-within:ring-2 focus-within:ring-blue-600 transition-all ${compact ? '' : 'shadow-lg'}`}>
        {/* File preview strip */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md">
                <Paperclip className="w-3 h-3" />
                {f.name}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="ml-1 text-zinc-400 hover:text-zinc-100">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Text input row */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isProcessing}
          className="flex-1 px-4 py-3 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 text-sm"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            {/* Attach file */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Kits menu — rendered outside the clipping context via portal-like wrapper */}
            <KitToggleMenu kits={kits} onToggleKit={onToggleKit} />
          </div>

          {/* Stop / Send button */}
          {isProcessing ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 bg-zinc-700 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={(!input.trim() && files.length === 0)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function ChatInterface({
  chatTitle = 'New Chat',
  messages,
  kits,
  onSendMessage,
  onToggleKit,
  onStop,
  onEditMessage,
  onRetry,
  isProcessing,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent, files: File[]) => {
    e.preventDefault();
    if ((input.trim() || files.length > 0) && !isProcessing) {
      onSendMessage(input.trim(), files.length > 0 ? files : undefined);
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* ── Welcome screen ── */
          <div className="h-full flex flex-col items-center justify-center p-8 gap-8">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-zinc-100 mb-1">
                Welcome back.
              </h2>
              <p className="text-zinc-500 text-sm">SimpleMCP Client — what would you like to do?</p>
            </div>

            {/* Centered input bar on welcome screen */}
            <div className="w-full max-w-2xl">
              <InputBar
                input={input}
                setInput={setInput}
                onSubmit={handleSubmit}
                onStop={onStop}
                isProcessing={isProcessing}
                kits={kits}
                onToggleKit={onToggleKit}
                compact
              />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {groupMessages(messages).map(({ message, steps }) => {
              // For assistant groups, find the closest preceding user message for retry
              let retryHandler: (() => void) | undefined;
              if (message.role === 'assistant') {
                // Walk backwards through the flat messages array to find the last user message
                const assistantIdx = messages.findIndex((m) => m.id === message.id);
                for (let i = assistantIdx - 1; i >= 0; i--) {
                  if (messages[i].role === 'user') {
                    const userMsg = messages[i];
                    retryHandler = () => onRetry(userMsg.id);
                    break;
                  }
                }
              }
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  steps={steps}
                  kits={kits}
                  onToggleKit={onToggleKit}
                  onEditMessage={onEditMessage}
                  onRetry={retryHandler}
                  isProcessing={isProcessing}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Persistent bottom input — only shown when there are messages */}
      {messages.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-900 p-4">
          <InputBar
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            onStop={onStop}
            isProcessing={isProcessing}
            kits={kits}
            onToggleKit={onToggleKit}
          />
        </div>
      )}
    </div>
  );
}
