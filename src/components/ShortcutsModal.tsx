import React, { useState } from 'react';
import { X, Keyboard, RotateCcw, Check } from 'lucide-react';
import {
  DEFAULT_SHORTCUTS,
  ShortcutAction,
  UserCustomShortcuts,
  formatShortcut,
  saveCustomShortcuts,
} from '../utils/shortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  customShortcuts: UserCustomShortcuts;
  onUpdateShortcuts: (newShortcuts: UserCustomShortcuts) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  customShortcuts,
  onUpdateShortcuts,
}) => {
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    saveCustomShortcuts({});
    onUpdateShortcuts({});
  };

  const handleKeyDown = (action: ShortcutAction, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setEditingActionId(null);
      return;
    }

    const key = e.key.toLowerCase();
    // Ignore pure modifier presses
    if (['control', 'meta', 'shift', 'alt'].includes(key)) return;

    const hasCtrlOrMeta = e.ctrlKey || e.metaKey;
    const updated: UserCustomShortcuts = {
      ...customShortcuts,
      [action.id]: {
        key,
        ctrlOrMeta: hasCtrlOrMeta,
        shift: e.shiftKey,
        alt: e.altKey,
      },
    };

    saveCustomShortcuts(updated);
    onUpdateShortcuts(updated);
    setEditingActionId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-[#faf8f4] border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm">Keyboard Shortcuts</h3>
              <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                Click any shortcut to customize keybinding
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {DEFAULT_SHORTCUTS.map((action) => {
            const isEditing = editingActionId === action.id;
            const keyDisplay = formatShortcut(action, customShortcuts);

            return (
              <div
                key={action.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  isEditing
                    ? 'border-amber-500 bg-amber-500/10'
                    : isDarkMode
                    ? 'bg-zinc-800/60 border-zinc-700/80'
                    : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <div>
                  <h4 className="text-xs font-semibold">{action.name}</h4>
                  <p className="text-[11px] text-stone-500 dark:text-zinc-400">{action.description}</p>
                </div>

                {isEditing ? (
                  <div
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(action, e)}
                    className="px-3 py-1.5 rounded-lg border border-amber-500 bg-amber-600/10 text-amber-700 dark:text-amber-300 text-xs font-mono animate-pulse outline-hidden cursor-pointer"
                  >
                    Press key combination...
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingActionId(action.id)}
                    title="Click to customize"
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 font-mono text-xs font-semibold border border-stone-200 dark:border-zinc-600 hover:border-amber-500 transition-colors"
                  >
                    {keyDisplay}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 dark:border-zinc-800 bg-stone-100/60 dark:bg-zinc-950">
          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#CC785C] text-white hover:bg-[#b8664c] shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
