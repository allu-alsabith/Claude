import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Download, Plus, Check } from 'lucide-react';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onInsertImageToChat: (imageUrl: string, prompt: string) => void;
}

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
const IMAGE_SIZES = ['1K', '2K', '4K'];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onInsertImageToChat,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio, imageSize }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        setError(data.error || 'Failed to generate image');
      }
    } catch (err: any) {
      setError(err.message || 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `claude-image-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-[#faf8f4] border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm">Image Studio</h3>
              <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                Studio-Quality Images (Nano Banana 2.1)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 font-serif">Image Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A detailed description of the artwork or photo you want to create..."
              rows={3}
              className="w-full rounded-xl p-3 text-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Aspect Ratio Affordance */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 font-serif">Aspect Ratio</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`py-1.5 text-center text-xs font-mono font-medium rounded-lg border transition-all ${
                    aspectRatio === ar
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:border-stone-400'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Image Size Resolution Affordance */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 font-serif">Resolution (Size)</label>
            <div className="flex gap-2">
              {IMAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setImageSize(size)}
                  className={`flex-1 py-1.5 text-center text-xs font-mono font-medium rounded-lg border transition-all ${
                    imageSize === size
                      ? 'bg-[#CC785C] text-white border-[#CC785C]'
                      : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:border-stone-400'
                  }`}
                >
                  {size} Resolution
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedImage && (
            <div className="mt-4 rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-700 bg-black/10 flex flex-col items-center">
              <img src={generatedImage} alt={prompt} className="max-h-72 object-contain w-full" />
              <div className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border-t border-stone-200 dark:border-zinc-700 text-xs">
                <span className="font-mono text-[11px] text-stone-500">
                  {aspectRatio} · {imageSize}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md border border-stone-300 dark:border-zinc-600 hover:bg-stone-100 dark:hover:bg-zinc-700 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => {
                      onInsertImageToChat(generatedImage, prompt);
                      onClose();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#CC785C] text-white hover:bg-[#b8664c] text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Chat</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-stone-200 dark:border-zinc-800 bg-stone-100/60 dark:bg-zinc-950">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#CC785C] hover:bg-[#b8664c] text-white shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Generate Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
