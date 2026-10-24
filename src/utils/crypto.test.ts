import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptData, decryptData, hashPassphrase } from './crypto';

test('encryptData and decryptData roundtrip correctly', async () => {
  const secretText = 'Hello Claude Fable 5.1 and End-to-End Encryption!';
  const passphrase = 'SuperSecretUserPassword123!@#';

  const encrypted = await encryptData(secretText, passphrase);
  assert.ok(encrypted.ciphertext, 'Ciphertext should not be empty');
  assert.ok(encrypted.iv, 'IV should not be empty');
  assert.ok(encrypted.salt, 'Salt should not be empty');
  assert.notEqual(encrypted.ciphertext, secretText, 'Ciphertext must differ from plaintext');

  const decrypted = await decryptData(encrypted, passphrase);
  assert.equal(decrypted, secretText, 'Decrypted text must match original secret');
});

test('decryptData rejects wrong password', async () => {
  const secretText = 'Confidential chat history data';
  const encrypted = await encryptData(secretText, 'correct-password-42');

  await assert.rejects(
    async () => {
      await decryptData(encrypted, 'wrong-password-99');
    },
    /Failed to decrypt/,
    'Decryption with wrong password must throw error'
  );
});

test('hashPassphrase produces reproducible hash with same salt', async () => {
  const passphrase = 'ClaudeFableVaultKey';
  const { hash: hash1, salt } = await hashPassphrase(passphrase);
  const { hash: hash2 } = await hashPassphrase(passphrase, salt);

  assert.equal(hash1, hash2, 'Hashes generated with same salt must match');
});
