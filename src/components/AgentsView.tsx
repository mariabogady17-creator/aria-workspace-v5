import React, { useState, useEffect } from 'react';
import { Bot, Play, CheckCircle2, Clock, Loader2, AlertTriangle, FileText } from 'lucide-react';

interface AgentTask {
  id: string;
  goal: string;
  status: 'running' | 'done' | 'error';
  result: string;
  createdAt: string;
}

export const AgentsView: React.FC<{ token: string }> = ({ token }) => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const handleStartTask = async () => {
    if (!newGoal.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goal: newGoal })
      });
      setNewGoal("");
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 flex flex-col h-full bg-[#121216] p-8 overflow-y-auto custom-scrollbar text-[#e5e2e1]">
      <div className="flex items-center gap-3 mb-8">
        <Bot className="w-8 h-8 text-[#818cf8]" />
        <h1 className="text-3xl font-light tracking-wide">Agentes Autónomos</h1>
      </div>
      <p className="text-[#c6c5d5] mb-8 max-w-2xl">
        Delega tareas de investigación, resumen o redacción a agentes que operan en segundo plano. Los resultados se guardarán automáticamente en tus notas.
      </p>

      {/* Input Area */}
      <div className="bg-[#1c1b1b] rounded-3xl border border-white/5 p-4 mb-8 flex flex-col gap-4 shadow-lg">
        <textarea
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Ej: Investiga los precios actuales de las 3 principales IAs del mercado y haz una tabla comparativa..."
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-[#e5e2e1] h-20"
        />
        <div className="flex justify-end">
          <button
            onClick={handleStartTask}
            disabled={loading || !newGoal.trim()}
            className="flex items-center gap-2 bg-[#818cf8] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#6366f1] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Desplegar Agente
          </button>
        </div>
      </div>

      {/* Task List */}
      <h2 className="text-xl font-medium mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Tareas Activas y Recientes</h2>
      <div className="flex flex-col gap-4">
        {tasks.length === 0 && (
          <div className="text-center py-12 text-[#c6c5d5] bg-[#1c1b1b] rounded-3xl border border-white/5">
            No hay agentes corriendo.
          </div>
        )}
        
        {tasks.map(t => (
          <div key={t.id} className="bg-[#1c1b1b] rounded-3xl border border-white/5 p-6 shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {t.status === 'running' && <Loader2 className="w-6 h-6 text-[#818cf8] animate-spin" />}
                {t.status === 'done' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                {t.status === 'error' && <AlertTriangle className="w-6 h-6 text-rose-400" />}
                <div>
                  <h3 className="font-medium">{t.goal}</h3>
                  <p className="text-xs text-[#c6c5d5] mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold ${t.status === 'running' ? 'bg-[#818cf8]/20 text-[#818cf8]' : t.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {t.status}
              </span>
            </div>
            
            {t.status === 'done' && (
              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 text-sm">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="text-[#c6c5d5]">El resultado se ha guardado en tus <b className="text-white">Notas</b>.</span>
              </div>
            )}
            
            {t.status === 'error' && (
              <div className="mt-4 p-4 bg-rose-500/10 text-rose-300 rounded-2xl text-sm">
                {t.result}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
