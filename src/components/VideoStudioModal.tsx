import React, { useState, useRef } from 'react';
import { X, Video, Upload, Sparkles, Download, Plus, Film } from 'lucide-react';

interface VideoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onInsertVideoToChat: (videoUrl: string, prompt: string) => void;
}

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onInsertVideoToChat,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [startingImage, setStartingImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setStartingImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !startingImage) return;
    setIsGenerating(true);
    setError(null);

    try {
      const imageBase64 = startingImage ? startingImage.split(',')[1] : undefined;
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          imageBase64,
        }),
      });
      const data = await res.json();
      if (data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
      } else {
        setError(data.error || 'Video generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating video');
    } finally {
      setIsGenerating(false);
    }
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
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm">Video Studio</h3>
              <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                Gemini Omni 1.1 Flash (Text &amp; Photo Animation)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode description */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed">
            Create high-definition videos from text prompts or upload a photo to animate it with realistic cinematic motion in 16:9 or 9:16 aspect ratios.
          </div>

          {/* Photo upload for animation (optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1 font-serif">
              Starting Photo (Optional - for Image-to-Video Animation)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {startingImage ? (
              <div className="relative inline-block rounded-xl overflow-hidden border border-stone-300 dark:border-zinc-700">
                <img src={startingImage} alt="Starting frame" className="h-28 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setStartingImage(null)}
                  className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-dashed border-stone-300 dark:border-zinc-700 text-xs text-stone-600 dark:text-zinc-400 hover:border-indigo-500 transition-colors w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                <span>Upload a photo to animate into video</span>
              </button>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 font-serif">Motion / Video Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the action, camera movement, scene lighting, or animation..."
              rows={3}
              className="w-full rounded-xl p-3 text-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Aspect ratio affordance: 16:9 (landscape) or 9:16 (portrait) */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 font-serif">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 text-center text-xs font-medium rounded-xl border transition-all ${
                  aspectRatio === '16:9'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300'
                }`}
              >
                <span className="font-bold">16:9 Landscape</span>
                <span className="block text-[10px] opacity-80">Cinematic Wide</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 text-center text-xs font-medium rounded-xl border transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300'
                }`}
              >
                <span className="font-bold">9:16 Portrait</span>
                <span className="block text-[10px] opacity-80">Vertical Mobile</span>
              </button>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Generated Video Player */}
          {generatedVideoUrl && (
            <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-700 bg-black flex flex-col items-center">
              <video
                controls
                autoPlay
                loop
                src={generatedVideoUrl}
                className={`w-full ${aspectRatio === '9:16' ? 'max-h-80 object-contain' : 'aspect-video'}`}
              />
              <div className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border-t border-stone-200 dark:border-zinc-700 text-xs">
                <span className="font-mono text-[11px] text-stone-500">{aspectRatio} Omni Video</span>
                <button
                  onClick={() => {
                    onInsertVideoToChat(generatedVideoUrl, prompt || 'Generated Video');
                    onClose();
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert in Chat</span>
                </button>
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
            disabled={(!prompt.trim() && !startingImage) || isGenerating}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing Video...' : 'Generate Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
