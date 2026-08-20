import React, { useState, useEffect, useRef } from 'react';
import { Play, Code, Copy, Check, Download, Wand2, Smartphone, Moon, Zap } from 'lucide-react';

interface CodeBlockViewerProps {
  code: string;
  language: string;
  onMagicAction?: (actionPrompt: string) => void;
}

export const CodeBlockViewer: React.FC<CodeBlockViewerProps> = ({ code, language, onMagicAction }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>(language === 'html' ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
      // Create a blob URL to safely render HTML
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [code, viewMode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aria_generated_${Date.now()}.${language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPreviewable = language === 'html' || language === 'xml' || language === 'svg';

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0c] shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5 w-full max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          {isPreviewable && (
            <div className="flex bg-white/5 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                  viewMode === 'preview' ? 'bg-[#818cf8]/20 text-[#818cf8]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Play className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                  viewMode === 'code' ? 'bg-[#818cf8]/20 text-[#818cf8]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Code
              </button>
            </div>
          )}
          {!isPreviewable && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 ml-2 px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
              {language}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Copy Code">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download File">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[300px] max-h-[600px] flex flex-col bg-[#1e1e1e]">
        {viewMode === 'preview' ? (
          <div className="flex-1 bg-white relative min-h-[400px]">
            <iframe
              ref={iframeRef}
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin"
              className="absolute inset-0 w-full h-full border-none"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-[#1e1e1e] p-6 text-sm text-gray-300 font-mono">
            <pre className="whitespace-pre-wrap break-all m-0">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* AI Magic Footer */}
      {viewMode === 'preview' && onMagicAction && (
        <div className="px-4 py-3 bg-black/60 border-t border-white/5 backdrop-blur-md flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#818cf8] shrink-0">
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Magic Touch</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => onMagicAction("Haz que este código HTML/CSS sea completamente responsivo (adaptable a móviles).")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Responsive</span>
            </button>
            <button 
              onClick={() => onMagicAction("Añade un modo oscuro elegante a este código (Dark Mode).")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Dark Mode</span>
            </button>
            <button 
              onClick={() => onMagicAction("Añade micro-animaciones premium y transiciones suaves a los elementos interactivos de este código.")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Animaciones</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
