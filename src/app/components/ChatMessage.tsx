import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import type { Message } from '../types/simplemcp';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  const [open, setOpen] = useState(false);

  // Don't render an empty assistant bubble — it only appears mid-turn
  // before any content has streamed in, creating a phantom header.
  if (isAssistant && !message.content?.trim() && !message.toolCall) return null;

  return (
    <div
      className={`flex gap-3 p-4 ${
        isUser ? 'bg-zinc-900/50' : isTool ? 'bg-blue-950/20' : 'bg-zinc-900/80'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-blue-600'
            : isTool
            ? 'bg-purple-600'
            : isSystem
            ? 'bg-zinc-700'
            : 'bg-green-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isTool ? (
          <Wrench className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Role */}
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {message.role}
        </div>

        {/* Message Content */}
        {message.content && (
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
                // Explicit heading sizes — prose-sm shrinks h5/h6 to body size
                h1: ({ children, ...props }: any) => <h1 className="text-xl font-bold text-zinc-100 mt-3 mb-1" {...props}>{children}</h1>,
                h2: ({ children, ...props }: any) => <h2 className="text-lg font-semibold text-zinc-100 mt-3 mb-1" {...props}>{children}</h2>,
                h3: ({ children, ...props }: any) => <h3 className="text-base font-semibold text-zinc-100 mt-2 mb-1" {...props}>{children}</h3>,
                h4: ({ children, ...props }: any) => <h4 className="text-sm font-semibold text-zinc-200 mt-2 mb-0.5" {...props}>{children}</h4>,
                h5: ({ children, ...props }: any) => <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-300 mt-2 mb-0.5" {...props}>{children}</h5>,
                h6: ({ children, ...props }: any) => <h6 className="text-xs font-medium uppercase tracking-wider text-zinc-400 mt-2 mb-0.5" {...props}>{children}</h6>,
                // Syntax-highlighted fenced code blocks
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeStr = String(children).replace(/\n$/, '');
                  if (match) {
                    return (
                      <div className="relative group rounded-lg overflow-hidden my-2">
                        {/* Language label + copy button */}
                        <div className="flex items-center justify-between px-3 py-1 bg-zinc-700/60 text-xs text-zinc-400 font-mono">
                          <span>{match[1]}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(codeStr)}
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-200"
                          >
                            <Copy className="w-3 h-3" />
                            copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem' }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  // Inline code
                  return <code className={className} {...props}>{children}</code>;
                },
                // Deep nested lists
                ul: ({ children, ...props }: any) => (
                  <ul className="list-disc pl-5 my-1 [&_ul]:list-[circle] [&_ul_ul]:list-[square]" {...props}>{children}</ul>
                ),
                ol: ({ children, ...props }: any) => (
                  <ol className="list-decimal pl-5 my-1 [&_ol]:list-[lower-alpha]" {...props}>{children}</ol>
                ),
                // Links — blue, underline on hover, open in new tab
                a: ({ children, href, ...props }: any) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                    {...props}>{children}</a>
                ),
                // Blockquote — left border + indent
                blockquote: ({ children, ...props }: any) => (
                  <blockquote className="border-l-2 border-zinc-500 pl-3 my-2 text-zinc-400 italic" {...props}>{children}</blockquote>
                ),
                // Styled table with visible borders
                table: ({ children, ...props }: any) => (
                  <div className="overflow-x-auto my-2">
                    <table className="border-collapse border border-zinc-700 text-xs w-full" {...props}>{children}</table>
                  </div>
                ),
                th: ({ children, ...props }: any) => (
                  <th className="border border-zinc-600 px-3 py-1.5 bg-zinc-800 text-zinc-200 font-semibold text-left" {...props}>{children}</th>
                ),
                td: ({ children, ...props }: any) => (
                  <td className="border border-zinc-700 px-3 py-1.5 text-zinc-300" {...props}>{children}</td>
                ),
                // Task list checkboxes
                input: ({ ...props }) => (
                  <input {...props} className="mr-1.5 accent-blue-500" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool Call + Result — collapsible dropdown */}
        {message.toolCall && (
          <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
            {/* Header row — always visible, click to toggle */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-left"
            >
              {open
                ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
              <Wrench className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-sm font-mono text-purple-300 flex-1 truncate">
                {message.toolCall.tool}
              </span>
              {/* Status badge */}
              {message.toolResult && (
                message.toolResult.error ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                )
              )}
            </button>

            {/* Expanded body */}
            {open && (
              <div className="divide-y divide-zinc-700/40">
                {/* Arguments */}
                <div className="px-3 py-2 bg-zinc-900/40">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Arguments</div>
                  <pre className="text-xs text-zinc-300 overflow-x-auto">
                    {JSON.stringify(message.toolCall.arguments, null, 2)}
                  </pre>
                </div>

                {/* Result */}
                {message.toolResult && (
                  <div className={`px-3 py-2 ${message.toolResult.error ? 'bg-red-950/20' : 'bg-green-950/20'}`}>
                    <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${message.toolResult.error ? 'text-red-400' : 'text-green-400'}`}>
                      {message.toolResult.error ? 'Error' : 'Result'}
                    </div>
                    <pre className="text-xs text-zinc-300 overflow-x-auto max-h-96">
                      {message.toolResult.error
                        ? message.toolResult.error
                        : JSON.stringify(message.toolResult.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-zinc-600">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
