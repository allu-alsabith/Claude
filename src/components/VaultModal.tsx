import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Unlock, Key, Download, Upload, AlertCircle, Check } from 'lucide-react';
import { hashPassphrase } from '../utils/crypto';
import { VaultSettings } from '../services/storageService';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  isLocked: boolean;
  onUnlockVault: (passphrase: string) => Promise<boolean>;
  onLockVault: () => void;
  onSetPassphrase: (passphrase: string) => Promise<void>;
  hasPassphrase: boolean;
  onExportVault: () => void;
  onImportVault: (file: File) => Promise<void>;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  isLocked,
  onUnlockVault,
  onLockVault,
  onSetPassphrase,
  hasPassphrase,
  onExportVault,
  onImportVault,
}) => {
  const [passphraseInput, setPassphraseInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = async () => {
    if (!passphraseInput) return;
    setIsProcessing(true);
    setError(null);
    try {
      const ok = await onUnlockVault(passphraseInput);
      if (ok) {
        setSuccess('Vault unlocked successfully.');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 800);
      } else {
        setError('Incorrect passphrase. Could not decrypt vault.');
      }
    } catch (e: any) {
      setError(e.message || 'Unlock failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateOrUpdatePassphrase = async () => {
    if (passphraseInput.length < 6) {
      setError('Passphrase must be at least 6 characters long.');
      return;
    }
    if (passphraseInput !== confirmInput) {
      setError('Passphrases do not match.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await onSetPassphrase(passphraseInput);
      setSuccess('Vault passphrase saved and encryption activated!');
      setTimeout(() => {
        setSuccess(null);
        setPassphraseInput('');
        setConfirmInput('');
        onClose();
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to update passphrase');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportVault(file);
      setSuccess('Vault backup imported successfully.');
    } catch (err: any) {
      setError('Import failed: ' + err.message);
    }
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm">End-to-End Encryption Vault</h3>
              <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                AES-256-GCM · PBKDF2 100k · Client-Side Only
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isLocked
                ? 'bg-rose-500/10 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              <div>
                <span className="font-semibold">{isLocked ? 'Vault is Locked' : 'Vault is Unlocked & Active'}</span>
                <p className="text-[11px] opacity-80">
                  {isLocked
                    ? 'Chat history is strongly encrypted with your AES-256 master key.'
                    : 'Conversations and artifacts are cryptographically protected at rest.'}
                </p>
              </div>
            </div>
            {!isLocked && hasPassphrase && (
              <button
                onClick={onLockVault}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white dark:bg-zinc-700 text-xs font-semibold hover:bg-black"
              >
                Lock Now
              </button>
            )}
          </div>

          {/* Unlock Section (if locked) */}
          {isLocked && (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-3">
              <label className="block text-xs font-semibold font-serif">Enter Passphrase to Unlock</label>
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter your master vault passphrase..."
                className="w-full rounded-xl p-2.5 text-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={handleUnlock}
                disabled={!passphraseInput || isProcessing}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                {isProcessing ? 'Decrypting...' : 'Unlock Vault'}
              </button>
            </div>
          )}

          {/* Set / Change Passphrase (if unlocked or new) */}
          {!isLocked && (
            <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-3">
              <div className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <label className="text-xs font-semibold font-serif">
                  {hasPassphrase ? 'Change Master Passphrase' : 'Create Master Passphrase'}
                </label>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                Your passphrase derives a 256-bit encryption key locally in your browser. Neither our servers nor any cloud provider ever sees your plain passphrase or unencrypted chat history.
              </p>
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="New passphrase (min 6 chars)..."
                className="w-full rounded-xl p-2.5 text-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 focus:outline-hidden focus:border-emerald-500"
              />
              <input
                type="password"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Confirm passphrase..."
                className="w-full rounded-xl p-2.5 text-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={handleCreateOrUpdatePassphrase}
                disabled={!passphraseInput || isProcessing}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-[#CC785C] hover:bg-[#b8664c] text-white transition-colors"
              >
                {isProcessing ? 'Deriving Key...' : 'Save & Encrypt Vault'}
              </button>
            </div>
          )}

          {/* Backup & Restore */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
            <h4 className="text-xs font-semibold font-serif">Encrypted Backup &amp; Migration</h4>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400">
              Export your encrypted chat vault to move to another browser or device securely.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={onExportVault}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Vault</span>
              </button>
              <label className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Vault</span>
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-1.5">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-stone-200 dark:border-zinc-800 bg-stone-100/60 dark:bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-stone-200 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
