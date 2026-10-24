import React, { useState, useRef, useEffect } from 'react';
import { ModelOption } from '../types/chat';
import {
  Menu,
  ChevronDown,
  Sparkles,
  Lock,
  Mic,
  Moon,
  Sun,
  Keyboard,
  Check,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react';
import { auth, loginWithGoogle, logoutUser } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentModelId: string;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenVault: () => void;
  onOpenShortcuts: () => void;
  onOpenVoice: () => void;
  chatTitle: string;
  isVaultLocked: boolean;
  currentUser: FirebaseUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentModelId,
  onSelectModel,
  availableModels,
  isSidebarOpen,
  onToggleSidebar,
  isDarkMode,
  onToggleDarkMode,
  onOpenVault,
  onOpenShortcuts,
  onOpenVoice,
  chatTitle,
  isVaultLocked,
  currentUser,
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentModel = availableModels.find((m) => m.id === currentModelId) || availableModels[0] || {
    id: 'claude-fable-5.1',
    name: 'Claude Fable 5.1',
    badge: 'Flagship',
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`h-14 border-b flex items-center justify-between px-3 md:px-5 shrink-0 z-20 select-none transition-colors ${
        isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-[#faf8f4]/90 border-stone-200'
      }`}
    >
      {/* Left: Mobile burger / Chat Title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Close sidebar (⌘⇧S)' : 'Open sidebar (⌘⇧S)'}
          className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDarkMode
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
                : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-900 shadow-xs'
            }`}
          >
            <div className="w-4 h-4 rounded-md bg-[#CC785C] text-white flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
            <span className="font-serif tracking-tight truncate max-w-[140px] sm:max-w-[180px]">
              {currentModel.name}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold hidden sm:inline">
              {currentModel.badge || 'PRO'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isModelDropdownOpen && (
            <div
              className={`absolute left-0 mt-2 w-72 rounded-2xl border shadow-xl py-1.5 z-50 overflow-hidden ${
                isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-900'
              }`}
            >
              <div className="px-3.5 py-2 border-b border-stone-200 dark:border-zinc-800 text-[11px] font-mono text-stone-600 dark:text-zinc-300 uppercase tracking-wider">
                Select Model
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between text-xs hover:bg-stone-100 dark:hover:bg-zinc-800/80 transition-colors ${
                      model.id === currentModelId ? 'bg-amber-500/10 dark:bg-amber-500/15' : ''
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold font-serif truncate">{model.name}</span>
                        {model.badge && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-zinc-300 line-clamp-1">{model.description}</p>
                    </div>
                    {model.id === currentModelId && (
                      <Check className="w-4 h-4 text-[#CC785C] shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {/* End-to-End Encryption Badge & Modal Trigger */}
        <button
          onClick={onOpenVault}
          title={isVaultLocked ? 'Vault is Locked - Click to unlock' : 'End-to-End Encrypted Vault Active'}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isVaultLocked
              ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-700'
              : 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80'
          }`}
        >
          {isVaultLocked ? <Lock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline font-mono text-[11px]">
            {isVaultLocked ? 'Locked' : 'E2EE AES-256'}
          </span>
        </button>

        {/* Live Voice Mode Button */}
        <button
          onClick={onOpenVoice}
          title="Live Voice Conversation (⌘L)"
          className="p-2 rounded-lg text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Warm Light (⌘⇧D)' : 'Switch to Obsidian Dark (⌘⇧D)'}
          className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (⌘/)"
          className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors hidden sm:block"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Google Authentication */}
        <div className="relative" ref={userMenuRef}>
          {currentUser ? (
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-1.5 p-1 rounded-full border border-stone-200 dark:border-zinc-700 hover:opacity-85 transition-opacity"
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-stone-700 text-white flex items-center justify-center text-xs font-semibold">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#CC785C] hover:bg-[#b8664c] text-white transition-colors shadow-xs"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {isUserMenuOpen && currentUser && (
            <div
              className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl py-2 z-50 ${
                isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-stone-200 text-stone-900'
              }`}
            >
              <div className="px-3.5 py-2 border-b border-stone-200 dark:border-zinc-800">
                <p className="text-xs font-semibold truncate">{currentUser.displayName || 'User'}</p>
                <p className="text-[11px] text-stone-600 dark:text-zinc-300 truncate">{currentUser.email}</p>
              </div>
              <button
                onClick={() => {
                  logoutUser();
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs flex items-center space-x-2 text-rose-600 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
