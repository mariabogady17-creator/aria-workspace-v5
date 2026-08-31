import React, { useState, Suspense } from "react";
import {
  Search,
  UploadCloud,
  FileText,
  Table,
  Presentation,
  MoreVertical,
  Sparkles,
  X,
  Calendar,
  Database,
  CheckCircle2,
  BrainCircuit,
  MessageSquare,
  Plus,
  Network,
  Trash2
} from "lucide-react";
import { DocumentItem } from "../types";
const GraphView = React.lazy(() => import("./GraphView").then(m => ({ default: m.GraphView })));

interface DocumentVaultViewProps {
  documents: DocumentItem[];
  onUploadDocument: (doc: DocumentItem) => void;
  onSelectDocForChat: (doc: DocumentItem) => void;
  onDeleteDocument?: (id: string) => void;
}

export const DocumentVaultView: React.FC<DocumentVaultViewProps> = ({
  documents,
  onUploadDocument,
  onSelectDocForChat,
  onDeleteDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocModal, setSelectedDocModal] = useState<DocumentItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // New Document form state
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<"pdf" | "spreadsheet" | "presentation" | "code" | "text">("pdf");
  const [newDocContent, setNewDocContent] = useState("");

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === "all") return matchesSearch;
    if (selectedFilter === "pdfs") return matchesSearch && doc.type === "pdf";
    if (selectedFilter === "spreadsheets") return matchesSearch && doc.type === "spreadsheet";
    return matchesSearch;
  });

  const handleCreateDocument = () => {
    if (!newDocName.trim()) return;

    const newDoc: DocumentItem = {
      id: "doc_" + Date.now(),
      name: newDocName,
      type: newDocType,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      size: `${(newDocContent.length / 1024).toFixed(1)} KB`,
      content: newDocContent || "Contenido de muestra para el documento " + newDocName,
      category: newDocType,
    };

    onUploadDocument(newDoc);
    setNewDocName("");
    setNewDocContent("");
    setShowUploadModal(false);
  };

  const handleAnalyzeDocument = async (doc: DocumentItem) => {
    setSelectedDocModal(doc);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analyze-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docText: doc.content,
          docName: doc.name,
        }),
      });

      const data = await res.json();
      setAnalysisResult(data.analysis || "Análisis finalizado.");
    } catch (err: any) {
      setAnalysisResult("Error al analizar el documento: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadDoc = (doc: DocumentItem) => {
    let type = 'text/plain';
    let ext = 'txt';
    if (doc.type === 'pdf') { type = 'application/pdf'; ext = 'pdf'; }
    else if (doc.type === 'spreadsheet') { type = 'text/csv'; ext = 'csv'; }
    else if (doc.type === 'presentation') { type = 'text/plain'; ext = 'txt'; }
    else if (doc.type === 'code') { type = 'text/plain'; ext = 'ts'; }

    const blob = new Blob([doc.content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 pb-20 relative">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 max-w-6xl mx-auto w-full">
        <div>
          <h2 className="font-bold text-3xl md:text-5xl text-[#818cf8] tracking-tight">
            Bóveda de Documentos
          </h2>
          <p className="text-sm md:text-base text-[#c6c5d5] mt-2">
            Gestiona, busca y analiza tu base de conocimientos integrada.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#c6c5d5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar información..."
              className="w-full bg-[#1c1b1b] text-[#e5e2e1] text-sm pl-11 pr-4 py-3 rounded-full border border-white/10 focus:outline-none focus:border-[#818cf8] focus:ring-1 focus:ring-[#818cf8] transition-all placeholder:text-[#c6c5d5]/50"
            />
          </div>
            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-white/5 pt-6 mt-6 md:border-t-0 md:pt-0 md:mt-0 md:border-l md:pl-6">
              <button
                onClick={() => setShowGraph(true)}
                className="flex items-center gap-2 bg-[#353534] text-[#c6c5d5] px-6 py-2.5 rounded-full hover:bg-white/10 hover:text-white transition-all shadow-md group"
              >
                <Network className="w-5 h-5 group-hover:text-[#818cf8]" />
                <span className="font-medium text-sm tracking-wide">Grafo Espacial</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#818cf8] to-[#6366f1] text-white px-6 py-2.5 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#818cf8]/20"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium text-sm tracking-wide">Nuevo Archivo</span>
              </button>
            </div>
          </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3 mb-10 max-w-6xl mx-auto w-full">
        <span className="text-xs font-mono text-[#c6c5d5] mr-2">Filtros:</span>
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
            selectedFilter === "all"
              ? "bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/50"
              : "bg-[#1c1b1b] text-[#e5e2e1] border border-white/5 hover:bg-[#353534]"
          }`}
        >
          Todos los Tipos
        </button>
        <button
          onClick={() => setSelectedFilter("pdfs")}
          className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
            selectedFilter === "pdfs"
              ? "bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/50"
              : "bg-[#1c1b1b] text-[#e5e2e1] border border-white/5 hover:bg-[#353534]"
          }`}
        >
          PDFs
        </button>
        <button
          onClick={() => setSelectedFilter("spreadsheets")}
          className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
            selectedFilter === "spreadsheets"
              ? "bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/50"
              : "bg-[#1c1b1b] text-[#e5e2e1] border border-white/5 hover:bg-[#353534]"
          }`}
        >
          Hojas de cálculo
        </button>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-[#1c1b1b] rounded-3xl p-6 border border-white/5 shadow-[-4px_-4px_12px_rgba(255,255,255,0.03),6px_6px_16px_rgba(0,0,0,0.4)] group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
          >
            {/* Top row icon & menu */}
            <div>
              {doc.previewImage && (
                <div className="h-32 -mx-6 -mt-6 mb-4 overflow-hidden relative border-b border-white/5">
                  <img
                    src={doc.previewImage}
                    alt={doc.name}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1b] to-transparent" />
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#201f1f] flex items-center justify-center border border-white/5 text-[#818cf8]">
                  {doc.type === "pdf" && <FileText className="w-6 h-6" />}
                  {doc.type === "spreadsheet" && <Table className="w-6 h-6" />}
                  {doc.type === "presentation" && <Presentation className="w-6 h-6" />}
                  {(doc.type === "code" || doc.type === "text") && <BrainCircuit className="w-6 h-6" />}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectDocForChat(doc)}
                    className="p-2 text-[#818cf8] hover:bg-[#818cf8]/20 rounded-xl transition-colors"
                    title="Preguntar a A.R.I.A. sobre este documento"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAnalyzeDocument(doc)}
                    className="p-2 text-[#c6c5d5] hover:text-[#818cf8] transition-colors"
                    title="Análisis de IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    className="p-2 text-emerald-400 hover:bg-emerald-400/20 rounded-xl transition-colors"
                    title="Descargar Documento"
                  >
                    <UploadCloud className="w-4 h-4 rotate-180" />
                  </button>
                  {onDeleteDocument && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-2 text-rose-400 hover:bg-rose-400/20 rounded-xl transition-colors"
                      title="Eliminar Documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-base text-[#e5e2e1] mb-2 group-hover:text-[#818cf8] transition-colors">
                {doc.name}
              </h3>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#c6c5d5]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {doc.date}
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                {doc.size}
              </span>
            </div>

            {/* Glowing Accent Line on Hover */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#818cf8] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        ))}
      </div>

      {/* Indexing Indicator Footer */}
      <div className="mt-16 max-w-6xl mx-auto w-full flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-3xl bg-[#131313]/50">
        <Sparkles className="w-8 h-8 text-[#818cf8] mb-3 animate-spin" />
        <p className="text-xs font-mono text-[#c6c5d5]">
          A.R.I.A. está indexando actualmente 3 fuentes de conocimiento en segundo plano...
        </p>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1b1b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h3 className="font-bold text-lg text-[#e5e2e1]">Subir Fuente de Datos</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-[#c6c5d5] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-mono text-[#c6c5d5] mb-1 block">Título del Documento</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Ej. Resumen de Estrategia Q4"
                  className="w-full bg-[#201f1f] border border-white/10 rounded-2xl px-4 py-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#818cf8]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#c6c5d5] mb-1 block">Tipo</label>
                <select
                  value={newDocType}
                  onChange={(e: any) => setNewDocType(e.target.value)}
                  className="w-full bg-[#201f1f] border border-white/10 rounded-2xl px-4 py-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#818cf8]"
                >
                  <option value="pdf">Documento PDF</option>
                  <option value="spreadsheet">Hoja de Cálculo</option>
                  <option value="presentation">Presentación</option>
                  <option value="code">Script de Código</option>
                  <option value="text">Texto Plano</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-[#c6c5d5] mb-1 block">Contenido / Notas</label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  rows={4}
                  placeholder="Pega el contenido o los datos de texto para incrustar..."
                  className="w-full bg-[#201f1f] border border-white/10 rounded-2xl p-4 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#818cf8]"
                />
              </div>

              <button
                onClick={handleCreateDocument}
                disabled={!newDocName.trim()}
                className="w-full bg-[#818cf8] text-[#101b8a] font-bold py-3.5 rounded-full shadow-lg hover:brightness-110 active:scale-95 transition-all mt-2"
              >
                Subir e Indexar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document AI Analysis Modal */}
      {selectedDocModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1b1b] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#818cf8]" />
                <h3 className="font-bold text-base text-[#e5e2e1]">Análisis de Información A.R.I.A.</h3>
              </div>
              <button onClick={() => setSelectedDocModal(null)} className="text-[#c6c5d5] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-[#818cf8] mb-4">Objetivo: {selectedDocModal.name}</p>

            <div className="bg-[#131313] p-4 rounded-2xl border border-white/5 text-sm text-[#e5e2e1] min-h-[160px] max-h-80 overflow-y-auto leading-relaxed">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-10 gap-3 text-xs font-mono text-[#818cf8]">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Extrayendo embeddings del documento y sintetizando análisis...</span>
                </div>
              ) : (
                analysisResult
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  onSelectDocForChat(selectedDocModal);
                  setSelectedDocModal(null);
                }}
                className="bg-[#818cf8] text-[#101b8a] text-xs font-bold px-6 py-2.5 rounded-full hover:brightness-110"
              >
                Hablar sobre el Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {showGraph && (
        <Suspense fallback={null}>
          <GraphView 
            documents={documents} 
            onClose={() => setShowGraph(false)} 
          />
        </Suspense>
      )}
    </div>
  );
};
