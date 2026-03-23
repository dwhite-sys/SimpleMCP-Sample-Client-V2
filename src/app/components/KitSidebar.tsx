import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Chat } from '../types/simplemcp';

interface KitSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
}

function ChatItem({
  chat,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep editValue in sync if title changes externally (e.g. LLM rename)
  useEffect(() => {
    if (!editing) setEditValue(chat.title ?? '');
  }, [chat.title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== chat.title) onRename(trimmed);
    setEditing(false);
  };

  const cancelRename = () => {
    setEditValue(chat.title ?? '');
    setEditing(false);
  };

  return (
    <div
      className={`group relative p-3 rounded-lg transition-colors cursor-pointer ${
        isActive
          ? 'bg-zinc-800 text-zinc-100'
          : 'bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-300'
      }`}
      onClick={() => { if (!editing) onSelect(); }}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-zinc-400" />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-medium bg-zinc-700 text-zinc-100 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <h3 className="text-sm font-medium truncate">{chat.title}</h3>
          )}
          <p className="text-xs text-zinc-500 mt-0.5">
            {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
          </p>
        </div>

        {editing ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); commitRename(); }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Save"
            >
              <Check className="w-3 h-3 text-green-400" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cancelRename(); }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        ) : confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 hover:bg-red-900/50 rounded transition-colors"
              title="Confirm delete"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Rename"
            >
              <Edit2 className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
          type="button"
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
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.id === chat.id}
                onSelect={() => onSelectChat(chat.id)}
                onDelete={() => onDeleteChat(chat.id)}
                onRename={(title) => onRenameChat(chat.id, title)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}