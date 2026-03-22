import { Package, RefreshCw, Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import type { Chat } from '../types/simplemcp';

interface KitSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
}

export function KitSidebar({ 
  chats, 
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat
}: KitSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">No chats yet</div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative p-3 rounded-lg transition-colors cursor-pointer ${
                  activeChat?.id === chat.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-300'
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-400" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{chat.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const title = prompt('Enter new chat title:', chat.title);
                        if (title && title.trim()) {
                          onRenameChat(chat.id, title.trim());
                        }
                      }}
                      className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3 text-zinc-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this chat?')) {
                          onDeleteChat(chat.id);
                        }
                      }}
                      className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}