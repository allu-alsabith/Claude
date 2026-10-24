import React, { useState } from 'react';
import { Artifact, buildPreviewSrcDoc } from '../utils/artifacts';
import { Code, Eye, Copy, Download, Maximize2, Minimize2, X, Check, ExternalLink } from 'lucide-react';

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ artifact, onClose, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!artifact) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    let extension = 'txt';
    if (artifact.language === 'html') extension = 'html';
    else if (artifact.language === 'svg') extension = 'svg';
    else if (['jsx', 'tsx', 'javascript', 'typescript'].includes(artifact.language)) extension = 'tsx';
    else if (artifact.language === 'python') extension = 'py';
    else if (artifact.language === 'css') extension = 'css';

    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'artifact'}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewSrcDoc = buildPreviewSrcDoc(artifact);

  return (
    <div
      className={`flex flex-col border-l transition-all duration-300 z-30 ${
        isFullscreen
          ? 'fixed inset-0 w-full h-full z-50 bg-white dark:bg-zinc-950'
          : 'w-full md:w-[480px] lg:w-[580px] h-full shrink-0'
      } ${
        isDarkMode
          ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
          : 'bg-[#faf9f5] border-stone-200 text-stone-900'
      }`}
    >
      {/* Top Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/90' : 'border-stone-200 bg-[#f4f1ea]'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-600/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Code className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate leading-tight">{artifact.title}</h3>
            <span className="text-[11px] uppercase tracking-wider font-mono text-stone-500 dark:text-zinc-400">
              {artifact.language}
            </span>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div
            className={`flex items-center p-0.5 rounded-lg border ${
              isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-stone-200/70 border-stone-300'
            }`}
          >
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'preview'
                  ? isDarkMode
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'code'
                  ? isDarkMode
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            title="Download Artifact"
            className="p-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            title="Close Panel"
            className="p-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="w-full h-full bg-white dark:bg-zinc-950 flex flex-col">
            <iframe
              title={artifact.title}
              srcDoc={previewSrcDoc}
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed bg-zinc-950 text-zinc-200">
            <pre className="overflow-x-auto whitespace-pre-wrap select-text">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div
        className={`px-4 py-2 border-t text-[11px] flex items-center justify-between font-mono ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-400' : 'border-stone-200 bg-[#f4f1ea] text-stone-500'
        }`}
      >
        <span>Claude Artifact Runtime</span>
        <span>{artifact.content.length.toLocaleString()} characters</span>
      </div>
    </div>
  );
};
