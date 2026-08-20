import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Loader2, Sparkles, ArrowLeft } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
}

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const colors = [
    "bg-indigo-500/20", "bg-rose-500/20", "bg-emerald-500/20", "bg-amber-500/20", "bg-cyan-500/20"
  ];

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSave = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(activeNote)
      });
      await fetchNotes();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (activeNote?.id === id) {
        setActiveNote(null);
        setShowEditor(false);
      }
      await fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const createNote = () => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: "Nueva Nota",
      content: "",
      color: colors[Math.floor(Math.random() * colors.length)],
      updatedAt: new Date().toISOString()
    };
    setActiveNote(newNote);
    setShowEditor(true);
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setShowEditor(true);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex pt-20 md:pt-24 px-3 md:px-6 pb-20 gap-3 md:gap-6">
      {/* Sidebar List */}
      <div className={`${showEditor ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 bg-[#1c1b1b] rounded-2xl md:rounded-3xl border border-white/5 p-3 md:p-4 flex-col`}>
        <div className="flex items-center justify-between mb-4 md:mb-6 px-1 md:px-2">
          <h2 className="font-bold text-lg md:text-xl text-[#e5e2e1] flex items-center gap-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-[#818cf8]" />
            Mis Notas
          </h2>
          <button onClick={createNote} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full hover:bg-indigo-500/20 transition-colors active:scale-90">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 custom-scrollbar pr-1 md:pr-2">
          {notes.map(n => (
            <div 
              key={n.id} 
              onClick={() => selectNote(n)}
              className={`p-3 md:p-4 rounded-xl md:rounded-2xl border cursor-pointer transition-all ${activeNote?.id === n.id && showEditor ? 'border-indigo-500/50 shadow-md' : 'border-white/5 hover:border-white/20'} ${n.color} active:scale-[0.98]`}
            >
              <div className="flex justify-between items-start mb-1 md:mb-2">
                <h3 className="font-bold text-xs md:text-sm text-white truncate pr-3">{n.title}</h3>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="text-white/40 hover:text-rose-400 transition-colors p-1">
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
              <p className="text-[10px] md:text-xs text-white/60 line-clamp-2">{n.content || "Sin contenido..."}</p>
              <div className="mt-2 text-[9px] md:text-[10px] text-white/40 font-mono">
                {new Date(n.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {notes.length === 0 && <p className="text-center text-white/30 text-xs mt-10">No tienes notas.</p>}
        </div>
      </div>

      {/* Editor */}
      <div className={`${showEditor ? 'flex' : 'hidden md:flex'} flex-1 bg-[#1c1b1b] rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-6 flex-col`}>
        {activeNote ? (
          <>
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Back button - mobile only */}
                <button 
                  onClick={() => setShowEditor(false)}
                  className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors md:hidden flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={activeNote.title}
                  onChange={(e) => setActiveNote({...activeNote, title: e.target.value})}
                  className="bg-transparent text-lg md:text-2xl font-bold text-white outline-none border-b border-transparent focus:border-white/10 px-1 md:px-2 py-1 flex-1 min-w-0 transition-colors"
                  placeholder="Título"
                />
              </div>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-500/30 transition-colors text-xs md:text-sm font-semibold flex-shrink-0 active:scale-95"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                <span className="hidden sm:inline">Guardar</span>
              </button>
            </div>
            <textarea 
              value={activeNote.content}
              onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
              className="flex-1 bg-transparent text-white/80 resize-none outline-none leading-relaxed custom-scrollbar p-1 md:p-2 text-sm md:text-base"
              placeholder="Escribe tus ideas aquí..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <Sparkles className="w-10 h-10 md:w-12 md:h-12 mb-3 md:mb-4 opacity-20" />
            <p className="text-sm md:text-base text-center">Selecciona o crea una nota</p>
          </div>
        )}
      </div>
    </div>
  );
};
