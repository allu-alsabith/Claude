import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, PhoneOff } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  modelName: string;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  modelName,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [transcript, setTranscript] = useState('Listening to your voice... Speak anytime.');
  const [audioLevel, setAudioLevel] = useState(0.2);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Simulate animated waveform and audio reactivity
    let phase = 0;
    const renderWave = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 32;
      const barWidth = width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const amplitude =
          Math.sin(phase + i * 0.3) * 0.5 + 0.5;
        const barHeight = Math.max(6, amplitude * (height * 0.7) * (isMuted ? 0.05 : 1));
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#CC785C');
        gradient.addColorStop(1, '#D97706');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      phase += 0.08;
      animationFrameRef.current = requestAnimationFrame(renderWave);
    };

    animationFrameRef.current = requestAnimationFrame(renderWave);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, isMuted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col items-center text-center p-8 transition-colors ${
          isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-[#faf8f4] border-stone-200 text-stone-900'
        }`}
      >
        {/* Top Status */}
        <div className="w-full flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-mono tracking-wider uppercase text-stone-500 dark:text-zinc-400">
              Live Session · {modelName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pulsing Avatar / Wave circle */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-[#CC785C]/15 border-2 border-[#CC785C]/30 flex items-center justify-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-[#CC785C] text-white flex items-center justify-center shadow-lg">
              <Sparkles className="w-9 h-9" />
            </div>
          </div>
        </div>

        {/* Live Audio Visualizer Canvas */}
        <div className="w-full h-16 mb-6 flex items-center justify-center">
          <canvas ref={canvasRef} width={300} height={60} className="w-full max-w-[280px]" />
        </div>

        {/* Live Transcript / Status */}
        <div className="min-h-[50px] mb-8">
          <p className="text-sm font-serif font-medium leading-relaxed italic text-stone-700 dark:text-zinc-300">
            "{transcript}"
          </p>
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition-colors ${
              isMuted
                ? 'bg-rose-500 text-white'
                : 'bg-stone-200 dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 hover:bg-stone-300'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-3.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
            title="End voice conversation"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
