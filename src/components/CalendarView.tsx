import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  type: string;
}

export const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<CalendarEvent>>({ type: "meeting" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkUpcomingEvents = () => {
      if ("Notification" in window && Notification.permission === "granted") {
        const now = new Date().getTime();
        events.forEach(ev => {
          const evTime = new Date(ev.date).getTime();
          const diffMinutes = (evTime - now) / (1000 * 60);
          const notifiedKey = `notified_${ev.id}`;
          if (diffMinutes > 0 && diffMinutes <= 5 && !localStorage.getItem(notifiedKey)) {
            new Notification(`A.R.I.A. Recordatorio: ${ev.title}`, {
              body: ev.description || "El evento comenzará pronto.",
              icon: "/favicon.ico"
            });
            localStorage.setItem(notifiedKey, "true");
          }
        });
      }
    };

    const interval = setInterval(checkUpcomingEvents, 60000);
    checkUpcomingEvents();
    return () => clearInterval(interval);
  }, [events]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      await fetchEvents();
      setIsModalOpen(false);
      setForm({ type: "meeting" });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await fetch(`/api/calendar/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      await fetchEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'task': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'reminder': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting': return 'Reunión';
      case 'task': return 'Tarea';
      case 'reminder': return 'Recordatorio';
      default: return type;
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-20 md:pt-24 px-3 md:px-6 pb-20">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
          <div>
            <h2 className="font-bold text-2xl md:text-4xl text-[#818cf8] flex items-center gap-2 md:gap-3">
              <CalendarIcon className="w-6 h-6 md:w-8 md:h-8" />
              Calendario
            </h2>
            <p className="text-xs md:text-sm text-[#c6c5d5] mt-1">Programa eventos, recordatorios y reuniones.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-indigo-500 text-white rounded-full font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>

        {/* Timeline View */}
        <div className="bg-[#1c1b1b] rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-6 md:left-12 bottom-0 w-px bg-white/10" />
          
          <div className="space-y-4 md:space-y-8 relative z-10">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-12 md:py-20 text-white/30">
                <Sparkles className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-20" />
                <p className="text-sm md:text-base">No tienes eventos programados.</p>
              </div>
            ) : (
              sortedEvents.map(ev => {
                const evDate = new Date(ev.date);
                const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
                
                return (
                  <div key={ev.id} className="flex items-start gap-3 md:gap-6 group">
                    {/* Date column - hidden on mobile, shown on sm+ */}
                    <div className="hidden sm:block w-24 text-right pt-2 flex-shrink-0">
                      <div className="text-sm font-bold text-white">{evDate.toLocaleDateString()}</div>
                      <div className="text-xs font-mono text-white/40">{evDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    
                    {/* Event card */}
                    <div className={`flex-1 p-3 md:p-5 rounded-xl md:rounded-2xl border ${getTypeColor(ev.type)} transition-all hover:scale-[1.01]`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Mobile: show date inline */}
                          <div className="flex items-center gap-2 mb-1 sm:hidden">
                            <span className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                              {evDate.toLocaleDateString()} {evDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getTypeColor(ev.type)}`}>
                              {getTypeLabel(ev.type)}
                            </span>
                          </div>
                          {/* Desktop: show type badge */}
                          <div className="hidden sm:block mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${getTypeColor(ev.type)}`}>
                              {getTypeLabel(ev.type)}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm md:text-lg mb-1 truncate">{ev.title}</h3>
                          <p className="text-xs md:text-sm opacity-80 line-clamp-2">{ev.description}</p>
                        </div>
                        {/* Delete button - always visible on mobile, hover on desktop */}
                        <button 
                          onClick={() => handleDelete(ev.id)}
                          className="p-2 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/20 rounded-lg transition-all flex-shrink-0 active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:px-4">
          <div className="bg-[#1c1b1b] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border border-white/10 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-5 sm:mb-6">Programar Evento</h3>
            <form onSubmit={handleSave} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-1.5 sm:mb-2">Título</label>
                <input required type="text" value={form.title || ""} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-1.5 sm:mb-2">Fecha y Hora</label>
                <input required type="datetime-local" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50" style={{colorScheme: 'dark'}} />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-1.5 sm:mb-2">Tipo</label>
                <select value={form.type || "meeting"} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50">
                  <option value="meeting">Reunión</option>
                  <option value="task">Tarea</option>
                  <option value="reminder">Recordatorio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-1.5 sm:mb-2">Descripción</label>
                <textarea rows={3} value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 resize-none" />
              </div>
              <div className="flex gap-3 pt-3 sm:pt-4 pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors font-medium text-sm">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium text-sm flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
