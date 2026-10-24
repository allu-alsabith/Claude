import React, { useState } from 'react';
import { ChatSession } from '../types/chat';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Download,
  ShieldCheck,
  Lock,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePinSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onOpenVault: () => void;
  isVaultLocked: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  isOpen,
  onClose,
  isDarkMode,
  onOpenVault,
  isVaultLocked,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleExport = (session: ChatSession, format: 'md' | 'json', e: React.MouseEvent) => {
    e.stopPropagation();
    let content = '';
    let mime = 'text/markdown';
    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
      mime = 'application/json';
    } else {
      content = `# ${session.title}\nModel: ${session.model}\nDate: ${new Date(
        session.createdAt
      ).toLocaleDateString()}\n\n---\n\n`;
      session.messages.forEach((m) => {
        content += `### ${m.role === 'user' ? 'You' : 'Claude'}\n${m.content}\n\n`;
      });
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered sessions
  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouping
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const pinned = filtered.filter((s) => s.pinned);
  const unpinned = filtered.filter((s) => !s.pinned);

  const today = unpinned.filter((s) => now - s.updatedAt < ONE_DAY);
  const yesterday = unpinned.filter((s) => now - s.updatedAt >= ONE_DAY && now - s.updatedAt < 2 * ONE_DAY);
  const last7Days = unpinned.filter((s) => now - s.updatedAt >= 2 * ONE_DAY && now - s.updatedAt < 7 * ONE_DAY);
  const older = unpinned.filter((s) => now - s.updatedAt >= 7 * ONE_DAY);

  const renderGroup = (title: string, items: ChatSession[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="px-3 mb-1 text-[11px] font-mono font-medium tracking-wider text-stone-600 dark:text-zinc-300 uppercase">
          {title}
        </h4>
        <div className="space-y-0.5">
          {items.map((session) => {
            const isSelected = session.id === currentSessionId;
            const isEditing = editingId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-stone-200/90 text-stone-900 font-semibold'
                    : isDarkMode
                    ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveRename(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(session.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white dark:bg-zinc-700 px-1 py-0.5 rounded text-xs border border-amber-500 outline-hidden"
                    />
                  ) : (
                    <span className="truncate">{session.title}</span>
                  )}
                </div>

                {/* Hover actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinSession(session.id);
                    }}
                    title={session.pinned ? 'Unpin' : 'Pin to top'}
                    className="p-1 rounded-md hover:bg-stone-300/60 dark:hover:bg-zinc-700"
                  >
                    <Pin className={`w-3 h-3 ${session.pinned ? 'fill-current text-amber-600' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => handleStartRename(session, e)}
                    title="Rename"
                    className="p-1 rounded-md hover:bg-stone-300/60 dark:hover:bg-zinc-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => handleExport(session, 'md', e)}
                    title="Export Markdown"
                    className="p-1 rounded-md hover:bg-stone-300/60 dark:hover:bg-zinc-700"
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete Chat"
                    className="p-1 rounded-md text-rose-500 hover:bg-stone-300/60 dark:hover:bg-zinc-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 md:w-68 flex flex-col border-r transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-[#f4f1ea] border-stone-200 text-stone-900'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#CC785C] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs select-none">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-serif leading-tight">Claude</h2>
              <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Fable 5.1 &amp; Vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700/80 text-xs font-semibold hover:border-amber-500/60 transition-all shadow-xs"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 text-[#CC785C]" />
              <span>New chat</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-500 border border-stone-200 dark:border-zinc-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Search input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-stone-200/50 dark:bg-zinc-900 pl-8 pr-3 py-1.5 rounded-lg text-xs border border-transparent focus:border-stone-400 dark:focus:border-zinc-700 outline-hidden placeholder-stone-400 dark:placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Chat List Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {renderGroup('Pinned', pinned)}
          {renderGroup('Today', today)}
          {renderGroup('Yesterday', yesterday)}
          {renderGroup('Previous 7 Days', last7Days)}
          {renderGroup('Older', older)}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-stone-400 dark:text-zinc-500">
              No conversations found.
            </div>
          )}
        </div>

        {/* Footer Vault Security Status */}
        <div className="p-3 border-t border-stone-200 dark:border-zinc-800">
          <button
            onClick={onOpenVault}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-colors ${
              isVaultLocked
                ? 'bg-rose-500/10 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {isVaultLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              <div className="text-left">
                <p className="font-semibold leading-tight">{isVaultLocked ? 'Vault Locked' : 'E2EE Vault'}</p>
                <p className="text-[10px] opacity-75 font-mono">AES-256-GCM Zero-Knowledge</p>
              </div>
            </div>
            <span className="text-[10px] underline font-mono">Manage</span>
          </button>
        </div>
      </aside>
    </>
  );
};
