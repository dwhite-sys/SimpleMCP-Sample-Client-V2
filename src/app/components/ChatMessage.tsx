import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Copy, Brain, Paperclip, Pencil, X, Check, RotateCcw } from 'lucide-react';
import { KitToggleMenu } from './KitToggleMenu';
import type { Message, Kit } from '../types/simplemcp';

// ── Image lightbox ────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export interface MessageGroup {
  assistant: Message;
  toolSteps: Message[]; // role === 'tool' messages that follow this assistant turn
}

// A single entry in the interleaved reasoning trace shown under an assistant bubble.
export type RunStep =
  | { kind: 'thinking'; text: string }
  | { kind: 'tool'; message: Message };

interface ChatMessageProps {
  message: Message;
  /** Interleaved thinking + tool steps in the order they occurred. */
  steps?: RunStep[];
  kits?: Kit[];
  onToggleKit?: (kitName: string, enabled: boolean) => void;
  onEditMessage?: (messageId: string, newContent: string, attachments?: File[]) => void;
  onRetry?: () => void;
  isProcessing?: boolean;
}

// ── Strip thinking block from raw streamed content ────────────────────────────
function parseContent(raw: string): { thinking: string; content: string } {
  // Completed: <think>...</think>content
  const full = raw.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/);
  if (full) return { thinking: full[1].trim(), content: full[2].trim() };
  // Still streaming inside think block (no closing tag yet)
  const streaming = raw.match(/^<think>([\s\S]*)$/);
  if (streaming) return { thinking: streaming[1], content: '' };
  return { thinking: '', content: raw };
}

// ── Shared markdown renderer ──────────────────────────────────────────────────
function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-zinc-200 prose prose-invert prose-sm max-w-none
      prose-p:leading-relaxed prose-p:my-1
      prose-headings:text-zinc-100 prose-headings:font-semibold
      prose-strong:text-zinc-100
      prose-code:text-purple-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-lg
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-ul:my-1 prose-ul:pl-5 prose-ol:my-1 prose-ol:pl-5 prose-li:my-0
      prose-blockquote:border-zinc-600 prose-blockquote:text-zinc-400
      prose-hr:border-t prose-hr:border-zinc-700
      prose-table:text-xs prose-table:border-collapse
      prose-thead:border-b prose-thead:border-zinc-600
      prose-tr:border-b prose-tr:border-zinc-700/50
      prose-th:px-3 prose-th:py-1.5 prose-th:text-left
      prose-td:px-3 prose-td:py-1.5
    ">
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={{
          h1: ({ children, ...props }: any) => <h1 className="text-xl font-bold text-zinc-100 mt-3 mb-1" {...props}>{children}</h1>,
          h2: ({ children, ...props }: any) => <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-1" {...props}>{children}</h2>,
          h3: ({ children, ...props }: any) => <h3 className="text-base font-semibold text-zinc-100 mt-2 mb-1" {...props}>{children}</h3>,
          h4: ({ children, ...props }: any) => <h4 className="text-sm font-semibold text-zinc-200 mt-2 mb-0.5" {...props}>{children}</h4>,
          h5: ({ children, ...props }: any) => <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-300 mt-2 mb-0.5" {...props}>{children}</h5>,
          h6: ({ children, ...props }: any) => <h6 className="text-xs font-medium uppercase tracking-wider text-zinc-400 mt-2 mb-0.5" {...props}>{children}</h6>,
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (match) {
              return (
                <div className="relative group rounded-lg overflow-hidden my-2">
                  <div className="flex items-center justify-between px-3 py-1 bg-zinc-700/60 text-xs text-zinc-400 font-mono">
                    <span>{match[1]}</span>
                    <button onClick={() => navigator.clipboard.writeText(codeStr)} className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-200">
                      <Copy className="w-3 h-3" />copy
                    </button>
                  </div>
                  <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem' }}>
                    {codeStr}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
          ul: ({ children, ...props }: any) => <ul className="list-disc pl-5 my-1 [&_ul]:list-[circle] [&_ul_ul]:list-[square]" {...props}>{children}</ul>,
          ol: ({ children, ...props }: any) => <ol className="list-decimal pl-5 my-1 [&_ol]:list-[lower-alpha]" {...props}>{children}</ol>,
          a: ({ children, href, ...props }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors" {...props}>{children}</a>,
          blockquote: ({ children, ...props }: any) => <blockquote className="border-l-2 border-zinc-500 pl-3 my-2 text-zinc-400 italic" {...props}>{children}</blockquote>,
          table: ({ children, ...props }: any) => <div className="overflow-x-auto my-2"><table className="border-collapse border border-zinc-700 text-xs w-full" {...props}>{children}</table></div>,
          th: ({ children, ...props }: any) => <th className="border border-zinc-600 px-3 py-1.5 bg-zinc-800 text-zinc-200 font-semibold text-left" {...props}>{children}</th>,
          td: ({ children, ...props }: any) => <td className="border border-zinc-700 px-3 py-1.5 text-zinc-300" {...props}>{children}</td>,
          input: ({ ...props }) => <input {...props} className="mr-1.5 accent-blue-500" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Thinking collapsible ──────────────────────────────────────────────────────
function formatThinkDuration(ms: number): string {
  if (ms < 1000) return 'less than a second';
  const secs = Math.round(ms / 1000);
  return secs === 1 ? '1 second' : `${secs} seconds`;
}

function ThinkingStep({ thinking, streaming }: { thinking: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  // Start timer when streaming begins
  useEffect(() => {
    if (streaming && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
  }, [streaming]);

  // Freeze elapsed time when streaming ends
  useEffect(() => {
    if (!streaming && startedAtRef.current !== null && elapsed === null) {
      setElapsed(Date.now() - startedAtRef.current);
    }
  }, [streaming, elapsed]);

  if (!thinking && !streaming) return null;

  const durationLabel = elapsed !== null
    ? `Thought for ${formatThinkDuration(elapsed)}`
    : 'Thought for a moment';

  return (
    <div className="pl-4 -ml-px">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 py-1 rounded-md hover:bg-zinc-800/40 transition-colors w-full text-left group"
      >
        <Brain className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <span className={`text-xs flex-1 ${streaming ? 'shimmer' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}`}>
          {streaming ? 'Thinking…' : durationLabel}
        </span>
        {open
          ? <ChevronDown className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          : <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-1 mb-2 pr-1">
          <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-700/40">
            <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono">{thinking}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tool call collapsible ─────────────────────────────────────────────────────
function ToolStep({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  if (!message.toolCall) return null;
  const isError = !!message.toolResult?.error;
  const hasResult = !!message.toolResult;
  return (
    <div className="pl-4 -ml-px">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 py-1 rounded-md hover:bg-zinc-800/40 transition-colors w-full text-left group"
      >
        <Wrench className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className={`text-sm font-mono flex-1 truncate ${
          !hasResult ? 'shimmer' : 'text-zinc-300 group-hover:text-zinc-100 transition-colors'
        }`}>
          {message.toolCall.tool}
        </span>
        {hasResult && (
          isError
            ? <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            : <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        )}
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-1 mb-2 pr-1">
          <div className="rounded-lg border border-zinc-700/50 overflow-hidden text-left">
            <div className="px-3 py-2 bg-zinc-900/60">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Arguments</div>
              <pre className="text-xs text-zinc-300 overflow-x-auto">{JSON.stringify(message.toolCall.arguments, null, 2)}</pre>
            </div>
            {message.toolResult && (
              <div className={`px-3 py-2 border-t border-zinc-700/40 ${isError ? 'bg-red-950/20' : 'bg-green-950/10'}`}>
                <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                  {isError ? 'Error' : 'Result'}
                </div>
                <pre className="text-xs text-zinc-300 overflow-x-auto max-h-64">
                  {isError ? message.toolResult.error : JSON.stringify(message.toolResult.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main message component ────────────────────────────────────────────────────
export function ChatMessage({ message, steps = [], kits = [], onToggleKit, onEditMessage, onRetry, isProcessing }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const startEdit = () => {
    setEditValue(message.content || '');
    setEditFiles([]);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && onEditMessage) {
      onEditMessage(message.id, trimmed, editFiles.length > 0 ? editFiles : undefined);
    }
    setEditing(false);
  };

  // Skip standalone tool messages — they are rendered via toolSteps on the assistant bubble
  if (message.role === 'tool') return null;

  const { thinking: inlineThinking, content } = message.role === 'assistant'
    ? parseContent(message.content || '')
    : { thinking: '', content: message.content || '' };

  // Merge inline thinking (from the final assistant turn) into the steps array
  // so it appears after any intermediate tool steps that preceded it.
  const allSteps: RunStep[] = inlineThinking
    ? [...steps, { kind: 'thinking', text: inlineThinking }]
    : steps;

  // isStreamingThinking: true only while the model is actively streaming its think block
  // (thinking present but no final content yet) AND the parent says we're still processing.
  // Without the isProcessing guard, completed messages with thinking-only responses would
  // be stuck in the "Thinking…" shimmer state permanently.
  const isStreamingThinking = inlineThinking.length > 0 && content === '' && message.role === 'assistant' && !!isProcessing;

  if (message.role === 'assistant' && !content && allSteps.length === 0) return null;

  const hasStepsSection = !!(allSteps.length > 0 || isStreamingThinking);

  return (
    <div className={`group flex gap-3 p-4 ${isUser ? 'bg-zinc-900/50' : 'bg-zinc-900/80'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser ? 'bg-blue-600' : isSystem ? 'bg-zinc-700' : 'bg-green-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row with label + action buttons */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {isUser ? 'User' : isSystem ? 'System' : 'Assistant'}
          </span>
          {isUser && onEditMessage && !editing && !isProcessing && (
            <button
              onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              title="Edit message"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {!isUser && !isSystem && onRetry && !isProcessing && (
            <button
              onClick={onRetry}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              title="Retry"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Inline edit mode for user messages */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col bg-zinc-800 border border-zinc-600 focus-within:border-blue-500 rounded-xl focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              {/* Existing image thumbnails carried over from the original message */}
              {message.attachments && message.attachments.filter((a) => a.dataUrl).length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-3">
                  {message.attachments.filter((a) => a.dataUrl).map((a, i) => (
                    <img key={i} src={a.dataUrl} alt={a.name} className="w-12 h-12 rounded object-cover opacity-60" title={a.name} />
                  ))}
                </div>
              )}
              {/* New file chips */}
              {editFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pt-3">
                  {editFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md">
                      <Paperclip className="w-3 h-3" />
                      {f.name}
                      <button type="button" onClick={() => setEditFiles(editFiles.filter((_, j) => j !== i))} className="ml-1 text-zinc-400 hover:text-zinc-100">×</button>
                    </span>
                  ))}
                </div>
              )}
              <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                  if (e.key === 'Escape') cancelEdit();
                }}
                rows={Math.min(10, editValue.split('\n').length + 1)}
                className="w-full px-3 py-3 bg-transparent text-sm text-zinc-100 resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1">
                  <input ref={editFileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) setEditFiles((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
                  <button type="button" onClick={() => editFileInputRef.current?.click()} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-md transition-colors" title="Attach files">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  {kits.length > 0 && onToggleKit && (
                    <KitToggleMenu kits={kits} onToggleKit={onToggleKit} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitEdit}
                    disabled={!editValue.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded-md transition-colors"
                  >
                    <Check className="w-3 h-3" /> Save & Retry
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded-md transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Thinking + tool steps — interleaved in the order they occurred */}
            {hasStepsSection && (
              <div className="mb-3 border-l-2 border-zinc-700/50 ml-1 space-y-0.5">
                {allSteps.map((step, idx) =>
                  step.kind === 'thinking' ? (
                    <ThinkingStep
                      key={idx}
                      thinking={step.text}
                      streaming={isStreamingThinking && idx === allSteps.length - 1}
                    />
                  ) : (
                    <ToolStep key={step.message.id} message={step.message} />
                  )
                )}
                {isStreamingThinking && allSteps.length === 0 && (
                  <ThinkingStep thinking="" streaming={true} />
                )}
              </div>
            )}

            {/* Final response text */}
            {content && <Markdown content={content} />}

            {/* Attachments — images as thumbnails (click to enlarge), other files as chips */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((a, i) =>
                  a.dataUrl ? (
                    <button
                      key={i}
                      onClick={() => setLightbox({ src: a.dataUrl!, alt: a.name })}
                      className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 hover:opacity-90 transition-opacity"
                      title={`${a.name} — click to enlarge`}
                    >
                      <img
                        src={a.dataUrl}
                        alt={a.name}
                        className="object-cover"
                        style={{ width: '80px', height: '80px' }}
                      />
                    </button>
                  ) : (
                    <span key={i} className="flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded-md">
                      <Paperclip className="w-3 h-3 text-zinc-500" />
                      {a.name}
                      <span className="text-zinc-500 ml-1">{(a.size / 1024).toFixed(1)} KB</span>
                    </span>
                  )
                )}
              </div>
            )}

            {/* Lightbox */}
            {lightbox && (
              <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
            )}
          </>
        )}

        <div className="text-xs text-zinc-600 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
