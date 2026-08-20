import React, { useState } from 'react';
import { FileText, Table, Presentation, Download, Eye, UploadCloud, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { exportDocx, exportExcel, exportPptx } from '../utils/exportUtils'; // We'll create this or import if they exist
import { DocumentItem } from '../types';

interface DocumentCardProps {
  type: string;
  title: string;
  content: string;
  onSaveToVault?: (doc: DocumentItem) => void;
  onOpenEditor?: (doc: { type: string; title: string; content: string }) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ type, title, content, onSaveToVault, onOpenEditor }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getIcon = () => {
    switch(type) {
      case 'xlsx': return <Table className="w-8 h-8 text-emerald-400" />;
      case 'pptx': return <Presentation className="w-8 h-8 text-rose-400" />;
      default: return <FileText className="w-8 h-8 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch(type) {
      case 'xlsx': return 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/30';
      case 'pptx': return 'from-rose-500/20 to-rose-900/20 border-rose-500/30';
      default: return 'from-blue-500/20 to-blue-900/20 border-blue-500/30';
    }
  };

  const handleDownload = async () => {
    try {
      // Check if content is MasterDocumentJSON
      const parsed = JSON.parse(content);
      if (parsed.metadata && parsed.metadata.type) {
        // Native Compilation via Backend
        const res = await fetch("/api/documents/compile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: content
        });

        if (!res.ok) throw new Error("Error en compilación");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${parsed.metadata.title || "documento"}.${parsed.metadata.type}`;
        document.body.appendChild(a);
        a.click();
        
        // Timeout para que Chrome/Edge procesen el atributo download antes de borrar la URL
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          a.remove();
        }, 200);
        return;
      }
    } catch(e) {
      // Fallback to legacy markdown export
      if (type === 'xlsx') {
        exportExcel([{ role: 'model', content }], title); 
      } else if (type === 'pptx') {
        exportPptx([{ role: 'model', content }], title);
      } else {
        exportDocx([{ role: 'model', content }], title);
      }
    }
  };

  const handleSave = () => {
    if (onSaveToVault) {
      onSaveToVault({
        id: `doc_${Date.now()}`,
        name: title,
        type: type as any,
        date: new Date().toLocaleDateString(),
        size: `${(content.length / 1024).toFixed(1)} KB`,
        content: content,
        category: 'Generado por IA'
      });
    }
  };

  return (
    <>
      <div className={`my-4 flex items-center justify-between p-4 rounded-3xl border bg-gradient-to-br shadow-lg ${getBgColor()}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black/30 rounded-2xl">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-[#e5e2e1] font-bold text-lg">{title}.{type}</h4>
            <p className="text-[#c6c5d5] text-xs">Documento Generado por IA • {(content.length / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPreviewOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/20 text-[#e5e2e1] transition-all tooltip-trigger relative group"
          >
            <Eye className="w-5 h-5" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">Previsualizar</span>
          </button>

          {onOpenEditor && (
            <button 
              onClick={() => onOpenEditor({ type, title, content })}
              className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition-all tooltip-trigger relative group"
            >
              <FileText className="w-5 h-5" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Modo Editor</span>
            </button>
          )}
          
          <button 
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/20 text-[#e5e2e1] transition-all relative group"
          >
            <Download className="w-5 h-5" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">Descargar</span>
          </button>

          {onSaveToVault && (
            <button 
              onClick={handleSave}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/20 text-[#e5e2e1] transition-all relative group"
            >
              <UploadCloud className="w-5 h-5" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Guardar en Bóveda</span>
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121216] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1c1b1b] rounded-t-3xl">
              <div className="flex items-center gap-3">
                {getIcon()}
                <h2 className="text-xl font-bold text-[#e5e2e1]">{title}.{type}</h2>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all text-[#e5e2e1]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none bg-white text-black rounded-b-3xl">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
