import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHORTCUTS, matchesShortcut, formatShortcut } from './shortcuts';

test('matchesShortcut correctly identifies default new_chat shortcut', () => {
  const newChatAction = DEFAULT_SHORTCUTS.find((a) => a.id === 'new_chat')!;

  assert.ok(
    matchesShortcut({ key: 'k', metaKey: true }, newChatAction),
    'Should match Cmd+K on Mac'
  );
  assert.ok(
    matchesShortcut({ key: 'k', ctrlKey: true }, newChatAction),
    'Should match Ctrl+K on Windows'
  );
  assert.equal(
    matchesShortcut({ key: 'k' }, newChatAction),
    false,
    'Plain K should not match'
  );
  assert.equal(
    matchesShortcut({ key: 'k', metaKey: true, shiftKey: true }, newChatAction),
    false,
    'Cmd+Shift+K should not match Cmd+K'
  );
});

test('matchesShortcut respects custom overrides', () => {
  const newChatAction = DEFAULT_SHORTCUTS.find((a) => a.id === 'new_chat')!;
  const custom = {
    new_chat: { key: 'n', ctrlOrMeta: true },
  };

  assert.ok(matchesShortcut({ key: 'n', ctrlKey: true }, newChatAction, custom));
  assert.equal(matchesShortcut({ key: 'k', ctrlKey: true }, newChatAction, custom), false);
});
