import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Trash2, Loader2, Code2, Download } from 'lucide-react';

interface Widget {
  id: string;
  name: string;
  html: string;
  createdAt: string;
}

export const DashboardView: React.FC<{ token: string }> = ({ token }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchWidgets = async () => {
    try {
      const res = await fetch("/api/widgets", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setWidgets(data.widgets || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, [token]);

  const generateWidget = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          selectedModel: "gemini-3.6-flash",
          systemInstruction: "You are an expert Frontend Developer. Generate ONLY RAW HTML code (which can include inline CSS <style> and inline JS <script>) for the requested widget. Do NOT include any markdown formatting like ```html. Output JUST the code. Make it beautiful, dark-themed, and responsive. It will run in an iframe."
        })
      });
      const data = await res.json();
      let code = data.text;
      
      // Clean up markdown just in case the model disobeyed
      code = code.replace(/```html/gi, '').replace(/```/gi, '').trim();

      await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: prompt.slice(0, 30) + '...', html: code })
      });
      
      setPrompt("");
      fetchWidgets();
    } catch (e) {
      console.error(e);
    }
    setIsGenerating(false);
  };

  const deleteWidget = async (id: string) => {
    try {
      await fetch(`/api/widgets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWidgets();
    } catch (e) {
      console.error(e);
    }
  };

  const downloadHtml = (widget: Widget) => {
    const blob = new Blob([widget.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${widget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 pb-20 bg-[#121216]">
      <div className="flex items-center gap-3 mb-8 max-w-6xl mx-auto w-full">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-2xl border border-white/10">
          <LayoutDashboard className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-light tracking-wide text-[#e5e2e1]">Dashboard & Widgets</h1>
          <p className="text-[#c6c5d5] text-sm mt-1">Genera mini-aplicaciones interactivas usando IA y guárdalas permanentemente.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full mb-8">
        <div className="bg-[#1c1b1b] rounded-3xl p-6 border border-white/10 shadow-lg flex gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ej: Crea una calculadora de propinas con diseño neón..."
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-[#e5e2e1] focus:border-[#818cf8] focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && !isGenerating && generateWidget()}
            />
          </div>
          <button 
            onClick={generateWidget}
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center gap-2 bg-[#818cf8] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#6366f1] disabled:opacity-50 transition-all"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Code2 className="w-5 h-5" />}
            {isGenerating ? "Generando..." : "Crear Widget"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {widgets.map(widget => (
          <div key={widget.id} className="bg-[#1c1b1b] rounded-3xl border border-white/10 flex flex-col overflow-hidden h-[400px]">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="text-[#e5e2e1] font-medium truncate pr-4">{widget.name}</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => downloadHtml(widget)} className="text-emerald-400 hover:text-emerald-300" title="Descargar Proyecto HTML">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => deleteWidget(widget.id)} className="text-rose-400 hover:text-rose-300" title="Eliminar Proyecto">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-white relative">
              <iframe 
                srcDoc={widget.html} 
                className="absolute inset-0 w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        ))}

        {widgets.length === 0 && !isGenerating && (
          <div className="col-span-full py-20 text-center text-[#c6c5d5]">
            <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No tienes widgets. ¡Usa el creador de arriba para generar tu primera Mini-App!</p>
          </div>
        )}
      </div>
    </div>
  );
};
