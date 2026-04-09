import { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Chat } from '../types/simplemcp';

interface KitSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
}

// ── Relative timestamp ────────────────────────────────────────────────────────
function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) {
    // Same day — show time e.g. "2:15 PM"
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffWeek === 1) return '1 week ago';
  if (diffWeek < 5) return `${diffWeek} weeks ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Delete chat?</h3>
        <p className="text-sm text-zinc-400 mb-6">
          This will permanently delete{' '}
          <span className="font-medium text-zinc-200">{title}</span>.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────
function ContextMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-40 overflow-hidden py-1"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRename(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5" />
        Rename
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
}

// ── Chat item ─────────────────────────────────────────────────────────────────
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <>
      {showDeleteModal && (
        <DeleteModal
          title={chat.title || 'this chat'}
          onConfirm={() => { setShowDeleteModal(false); onDelete(); }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div
        className={`group relative px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
          isActive
            ? 'bg-zinc-800 text-zinc-100'
            : 'hover:bg-zinc-800/50 text-zinc-300'
        }`}
        onClick={() => { if (!editing) onSelect(); }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Title / edit input */}
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
              <h3 className="text-sm truncate">{chat.title}</h3>
            )}
            {!editing && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {relativeTime(new Date(chat.updatedAt))}
              </p>
            )}
          </div>

          {/* Editing controls */}
          {editing ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={(e) => { e.stopPropagation(); commitRename(); }} className="p-1 hover:bg-zinc-700 rounded" title="Save">
                <Check className="w-3 h-3 text-green-400" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); cancelRename(); }} className="p-1 hover:bg-zinc-700 rounded" title="Cancel">
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          ) : (
            /* Three-dot menu button — visible on hover or when menu open */
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className={`p-1 rounded transition-all hover:bg-zinc-700 ${
                  menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </button>

              {menuOpen && (
                <ContextMenu
                  onRename={() => setEditing(true)}
                  onDelete={() => setShowDeleteModal(true)}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function KitSidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: KitSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800">
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
          <div className="p-2 space-y-0.5">
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