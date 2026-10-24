export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  defaultKey: string; // e.g. "k", "/", "Enter", "s", "a", "d", "l"
  modifiers: {
    ctrlOrMeta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
}

export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  {
    id: 'new_chat',
    name: 'New Chat',
    description: 'Start a fresh conversation session',
    defaultKey: 'k',
    modifiers: { ctrlOrMeta: true },
  },
  {
    id: 'toggle_sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide the chat history sidebar',
    defaultKey: 's',
    modifiers: { ctrlOrMeta: true, shift: true },
  },
  {
    id: 'toggle_artifacts',
    name: 'Toggle Artifacts',
    description: 'Show or hide the interactive code & preview panel',
    defaultKey: 'a',
    modifiers: { ctrlOrMeta: true, shift: true },
  },
  {
    id: 'toggle_theme',
    name: 'Toggle Dark Mode',
    description: 'Switch between Claude Warm Light and Obsidian Dark',
    defaultKey: 'd',
    modifiers: { ctrlOrMeta: true, shift: true },
  },
  {
    id: 'open_shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'View and customize keyboard shortcuts',
    defaultKey: '/',
    modifiers: { ctrlOrMeta: true },
  },
  {
    id: 'toggle_voice',
    name: 'Live Voice Conversation',
    description: 'Launch real-time Gemini Live audio dialogue',
    defaultKey: 'l',
    modifiers: { ctrlOrMeta: true },
  },
];

export type UserCustomShortcuts = Record<string, { key: string; ctrlOrMeta?: boolean; shift?: boolean; alt?: boolean }>;

const STORAGE_KEY = 'claude_custom_shortcuts_v1';

export function loadCustomShortcuts(): UserCustomShortcuts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomShortcuts(custom: UserCustomShortcuts): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Failed to save custom shortcuts', e);
  }
}

export function matchesShortcut(
  e: { key: string; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean },
  action: ShortcutAction,
  customShortcuts: UserCustomShortcuts = {}
): boolean {
  const custom = customShortcuts[action.id];
  const targetKey = custom ? custom.key.toLowerCase() : action.defaultKey.toLowerCase();
  const needCtrlOrMeta = custom ? !!custom.ctrlOrMeta : !!action.modifiers.ctrlOrMeta;
  const needShift = custom ? !!custom.shift : !!action.modifiers.shift;
  const needAlt = custom ? !!custom.alt : !!action.modifiers.alt;

  const hasCtrlOrMeta = !!(e.metaKey || e.ctrlKey);
  const hasShift = !!e.shiftKey;
  const hasAlt = !!e.altKey;

  if (needCtrlOrMeta !== hasCtrlOrMeta) return false;
  if (needShift !== hasShift) return false;
  if (needAlt !== hasAlt) return false;

  return e.key.toLowerCase() === targetKey;
}

export function formatShortcut(action: ShortcutAction, customShortcuts: UserCustomShortcuts = {}): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const custom = customShortcuts[action.id];
  const key = (custom ? custom.key : action.defaultKey).toUpperCase();
  const needCtrlOrMeta = custom ? !!custom.ctrlOrMeta : !!action.modifiers.ctrlOrMeta;
  const needShift = custom ? !!custom.shift : !!action.modifiers.shift;
  const needAlt = custom ? !!custom.alt : !!action.modifiers.alt;

  const parts: string[] = [];
  if (needCtrlOrMeta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (needShift) parts.push(isMac ? '⇧' : 'Shift');
  if (needAlt) parts.push(isMac ? '⌥' : 'Alt');
  parts.push(key);

  return isMac ? parts.join('') : parts.join('+');
}
