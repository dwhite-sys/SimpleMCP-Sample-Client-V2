import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Plus, Paperclip, Mic } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { KitToggleMenu } from './KitToggleMenu';
import type { Message, Kit } from '../types/simplemcp';

interface ChatInterfaceProps {
  chatTitle?: string;
  messages: Message[];
  kits: Kit[];
  onSendMessage: (content: string) => void;
  onToggleKit: (kitName: string, enabled: boolean) => void;
  isProcessing?: boolean;
}

export function ChatInterface({ 
  chatTitle = 'New Chat',
  messages, 
  kits,
  onSendMessage, 
  onToggleKit,
  isProcessing 
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-semibold text-zinc-300 mb-2">
                SimpleMCP Client
              </h2>
              <p className="text-zinc-500">
                Use the tool browser to explore available tools, or type a message to manually
                invoke tools with JSON arguments.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900">
        {/* Controls Bar — outside the form so Enter never triggers these buttons */}
        <div className="flex items-center gap-2 px-4 pt-4">
          <KitToggleMenu kits={kits} onToggleKit={onToggleKit} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 pt-2">
          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or tool invocation..."
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Example: run tool "web_search" {"{\"query\": \"SimpleMCP documentation\"}"}
          </div>
        </form>
      </div>
    </div>
  );
}