import React, { useState } from 'react';
import { Message } from '../types/chat';
import { Artifact } from '../utils/artifacts';
import { marked } from 'marked';
import { Copy, Check, Volume2, Square, Sparkles, ChevronDown, ChevronRight, Code, Eye } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isDarkMode: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
  onTtsPlay?: (messageId: string, text: string) => void;
  isPlayingTts?: boolean;
  onTtsStop?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isDarkMode,
  onOpenArtifact,
  onTtsPlay,
  isPlayingTts = false,
  onTtsStop,
}) => {
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const isAssistant = message.role === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Convert markdown to HTML safely
  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content, { breaks: true, gfm: true }) as string };
    } catch {
      return { __html: content };
    }
  };

  return (
    <div
      className={`py-6 px-4 md:px-8 border-b transition-colors ${
        isAssistant
          ? isDarkMode
            ? 'bg-zinc-900/40 border-zinc-800/80'
            : 'bg-[#faf8f4] border-stone-200/80'
          : isDarkMode
          ? 'bg-zinc-950/20 border-zinc-900/60'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4 md:gap-5">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="w-8 h-8 rounded-lg bg-[#CC785C] text-white flex items-center justify-center font-serif font-bold text-sm shadow-xs select-none">
              <Sparkles className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-stone-700 dark:bg-zinc-700 text-white flex items-center justify-center font-medium text-xs select-none">
              U
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm font-serif">
                {isAssistant ? (message.model?.replace(/-/g, ' ').toUpperCase() || 'CLAUDE FABLE 5.1') : 'You'}
              </span>
              <span className="text-xs text-stone-600 dark:text-zinc-300">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Actions for Assistant */}
            <div className="flex items-center space-x-1 opacity-80 hover:opacity-100 transition-opacity">
              {isAssistant && onTtsPlay && (
                <button
                  onClick={() => {
                    if (isPlayingTts && onTtsStop) {
                      onTtsStop();
                    } else {
                      onTtsPlay(message.id, message.content);
                    }
                  }}
                  title={isPlayingTts ? 'Stop reading' : 'Read aloud with Gemini TTS'}
                  className={`p-1.5 rounded-md text-xs flex items-center space-x-1 transition-colors ${
                    isPlayingTts
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isPlayingTts ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">{isPlayingTts ? 'Stop' : 'TTS'}</span>
                </button>
              )}

              <button
                onClick={handleCopy}
                title="Copy message"
                className="p-1.5 rounded-md text-stone-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Thinking process accordion if available */}
          {message.thinkingTrace && (
            <div
              className={`rounded-lg border overflow-hidden my-2 text-xs ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-stone-100/70 border-stone-200'
              }`}
            >
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full flex items-center justify-between px-3.5 py-2 font-medium text-stone-600 dark:text-zinc-400 hover:bg-stone-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Thinking process</span>
                </div>
                {showThinking ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {showThinking && (
                <div
                  className={`px-3.5 py-2.5 font-mono text-xs border-t leading-relaxed whitespace-pre-wrap select-text ${
                    isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  {message.thinkingTrace}
                </div>
              )}
            </div>
          )}

          {/* Media Attachments Preview */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2.5 my-2">
              {message.attachments.map((att) => (
                <div key={att.id} className="relative rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-800 max-w-xs">
                  {att.mimeType.startsWith('image/') ? (
                    <img
                      src={att.previewUrl || `data:${att.mimeType};base64,${att.data}`}
                      alt={att.name}
                      className="max-h-48 object-cover rounded-md"
                    />
                  ) : att.mimeType.startsWith('video/') ? (
                    <video
                      controls
                      src={att.previewUrl || `data:${att.mimeType};base64,${att.data}`}
                      className="max-h-48 rounded-md"
                    />
                  ) : (
                    <div className="p-3 text-xs font-mono bg-stone-100 dark:bg-zinc-800">
                      📄 {att.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Text / Markdown */}
          <div
            className={`prose max-w-none text-sm leading-relaxed ${
              isDarkMode
                ? 'prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800'
                : 'prose-stone prose-p:leading-relaxed prose-pre:bg-stone-900 prose-pre:text-stone-100'
            }`}
            dangerouslySetInnerHTML={renderMarkdown(message.content)}
          />

          {/* Detected Artifacts Badges */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {message.artifacts.map((art) => (
                <button
                  key={art.id}
                  onClick={() => onOpenArtifact && onOpenArtifact(art)}
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all shadow-xs ${
                    isDarkMode
                      ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-[#faf9f5] hover:bg-white border-stone-300 text-stone-800'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold">{art.title}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {art.language}
                  </span>
                  <Eye className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
