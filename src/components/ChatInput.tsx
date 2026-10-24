import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types/chat';
import {
  ArrowUp,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video,
  Globe,
  Brain,
  X,
  Square,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  isDarkMode: boolean;
  enableThinking: boolean;
  onToggleThinking: () => void;
  enableSearch: boolean;
  onToggleSearch: () => void;
  onOpenImageStudio: () => void;
  onOpenVideoStudio: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  isDarkMode,
  enableThinking,
  onToggleThinking,
  enableSearch,
  onToggleSearch,
  onOpenImageStudio,
  onOpenVideoStudio,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;
        const base64Data = result.split(',')[1];
        const mimeType = file.type || 'application/octet-stream';
        let type: Attachment['type'] = 'file';
        if (mimeType.startsWith('image/')) type = 'image';
        else if (mimeType.startsWith('video/')) type = 'video';
        else if (mimeType.startsWith('audio/')) type = 'audio';

        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            mimeType,
            data: base64Data,
            previewUrl: result,
            type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Audio Recording & Transcription with Gemini 3.5 Transcribe
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' }),
            });
            const data = await res.json();
            if (data.text) {
              setText((prev) => (prev ? `${prev} ${data.text}` : data.text));
            }
            setIsTranscribing(false);
          };
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          console.error('Transcription error:', err);
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Attachments Carousel */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-xl bg-stone-100 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center space-x-2 pl-2 pr-1 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs shadow-xs"
            >
              {att.type === 'image' && att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="w-6 h-6 object-cover rounded" />
              ) : (
                <span className="text-stone-500">📎</span>
              )}
              <span className="max-w-[120px] truncate font-medium">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div
        className={`relative flex flex-col rounded-2xl border transition-all shadow-sm ${
          isDarkMode
            ? 'bg-zinc-900/90 border-zinc-700/80 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600'
            : 'bg-[#faf8f4] border-stone-300/80 focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400'
        }`}
      >
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,audio/*,.pdf,.txt,.py,.js,.ts,.html,.css"
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTranscribing ? 'Transcribing your audio with Gemini 3.5...' : 'Reply to Claude...'}
          rows={1}
          disabled={isTranscribing}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-hidden leading-relaxed"
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left tools */}
          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image or video for analysis"
              className="p-1.5 rounded-lg text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Audio Voice Transcribe Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Stop recording audio' : 'Speak to transcribe (Gemini 3.5)'}
              className={`p-1.5 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Image Studio generator button */}
            <button
              type="button"
              onClick={onOpenImageStudio}
              title="Generate High-Quality Image (Nano Banana 2.1 / Aspect ratios)"
              className="p-1.5 rounded-lg text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Video Studio generator button */}
            <button
              type="button"
              onClick={onOpenVideoStudio}
              title="Generate Video or Animate Photo (Gemini Omni Flash 16:9 / 9:16)"
              className="p-1.5 rounded-lg text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <Video className="w-4 h-4" />
            </button>

            {/* Google Search Grounding toggle */}
            <button
              type="button"
              onClick={onToggleSearch}
              title={enableSearch ? 'Google Search Grounding Active' : 'Enable Google Search Grounding'}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                enableSearch
                  ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                  : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Thinking Mode Toggle */}
            <button
              type="button"
              onClick={onToggleThinking}
              title={enableThinking ? 'High Thinking Level Active' : 'Enable High Thinking Mode'}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                enableThinking
                  ? 'bg-amber-600/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thinking</span>
            </button>
          </div>

          {/* Right send/stop button */}
          <div className="flex items-center space-x-1">
            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Stop generation"
                className="w-8 h-8 rounded-lg bg-stone-700 dark:bg-zinc-700 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                title="Send message (Enter)"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  text.trim() || attachments.length > 0
                    ? 'bg-[#CC785C] hover:bg-[#b8664c] text-white shadow-xs cursor-pointer'
                    : 'bg-stone-300/50 dark:bg-zinc-800 text-stone-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-[11px] text-stone-600 dark:text-zinc-400 font-mono">
          Claude Fable 5.1 with End-to-End Encryption · Press Shift + Enter for new line
        </span>
      </div>
    </div>
  );
};
