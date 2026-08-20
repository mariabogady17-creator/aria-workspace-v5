import React, { useState } from 'react';
import { X, Save, FileText, Download } from 'lucide-react';
import { exportDocx, exportExcel, exportPptx } from '../utils/exportUtils';
import { DocumentItem } from '../types';

interface DocumentEditorProps {
  doc: { type: string; title: string; content: string };
  onClose: () => void;
  onSaveToVault: (doc: DocumentItem) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ doc, onClose, onSaveToVault }) => {
  const [content, setContent] = useState(doc.content);

  const handleDownload = () => {
    if (doc.type === 'xlsx') exportExcel([{ role: 'model', content }], doc.title);
    else if (doc.type === 'pptx') exportPptx([{ role: 'model', content }], doc.title);
    else exportDocx([{ role: 'model', content }], doc.title);
  };

  const handleSave = () => {
    onSaveToVault({
      id: `doc_edited_${Date.now()}`,
      name: doc.title,
      type: doc.type as any,
      date: new Date().toLocaleDateString(),
      size: `${(content.length / 1024).toFixed(1)} KB`,
      content: content,
      category: 'Generado por IA'
    });
    onClose();
  };

  return (
    <div className="w-full md:w-1/2 h-full bg-white text-black flex flex-col border-l border-white/10 shadow-2xl z-40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-[#f3f4f6]">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-lg text-gray-800">{doc.title}.{doc.type}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="p-2 hover:bg-gray-200 rounded text-gray-600 transition-colors" title="Descargar">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded hover:bg-indigo-700 transition-colors">
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Guardar</span>
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded text-red-500 transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full resize-none border-none focus:ring-0 focus:outline-none text-gray-800 leading-relaxed"
          placeholder="Escribe o edita el contenido aquí..."
        />
      </div>
    </div>
  );
};
