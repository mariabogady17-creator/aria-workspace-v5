import React, { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

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
  
  // Calendar Grid State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
            // Use Service Worker if available for robust mobile notifications
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`A.R.I.A. Recordatorio: ${ev.title}`, {
                  body: ev.description || "El evento comenzará pronto.",
                  icon: "/favicon.ico",
                  badge: "/favicon.ico"
                });
              });
            } else {
              // Fallback to standard notification
              new Notification(`A.R.I.A. Recordatorio: ${ev.title}`, {
                body: ev.description || "El evento comenzará pronto.",
                icon: "/favicon.ico"
              });
            }
            localStorage.setItem(notifiedKey, "true");
          }
        });
      }
    };

    const interval = setInterval(checkUpcomingEvents, 30000); // Check every 30s
    checkUpcomingEvents();
    return () => clearInterval(interval);
  }, [events]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent past dates
    const evDate = new Date(form.date as string);
    if (evDate.getTime() < new Date().getTime()) {
      if (!confirm("Estás programando un evento en el pasado. ¿Estás seguro?")) {
        return;
      }
    }

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

  // Calendar Grid Logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    return days;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  // Group Events by Date String
  const groupedEvents = useMemo(() => {
    let filtered = events;
    if (selectedDate) {
      filtered = events.filter(ev => {
        const evDate = new Date(ev.date);
        return evDate.getDate() === selectedDate.getDate() &&
               evDate.getMonth() === selectedDate.getMonth() &&
               evDate.getFullYear() === selectedDate.getFullYear();
      });
    }

    const groups: Record<string, CalendarEvent[]> = {};
    filtered.forEach(ev => {
      const d = new Date(ev.date);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    });

    // Sort dates
    return Object.keys(groups).sort((a, b) => new Date(groups[a][0].date).getTime() - new Date(groups[b][0].date).getTime())
      .map(dateStr => ({
        dateStr,
        items: groups[dateStr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));
  }, [events, selectedDate]);

  const hasEventOnDate = (date: Date) => {
    return events.some(ev => {
      const evDate = new Date(ev.date);
      return evDate.getDate() === date.getDate() &&
             evDate.getMonth() === date.getMonth() &&
             evDate.getFullYear() === date.getFullYear();
    });
  };

  if (loading) return <div className="flex-1 flex items-center justify-center min-h-screen ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-20 md:pt-24 px-4 md:px-8 pb-20">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-bold text-3xl md:text-4xl text-[#818cf8] flex items-center gap-3">
              <CalendarIcon className="w-8 h-8" />
              Calendario
            </h2>
            <p className="text-sm text-[#c6c5d5] mt-1">Programa y visualiza tus eventos.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-full font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:brightness-110 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar Grid (Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-[#1c1b1b] rounded-3xl border border-white/5 p-6 shadow-xl sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-white/70" /></button>
                <h3 className="font-bold text-lg text-white capitalize">
                  {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-white/70" /></button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                  <div key={i} className="text-xs font-bold text-white/40 py-2">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center">
                {generateCalendarDays().map((date, i) => {
                  if (!date) return <div key={i} className="p-2"></div>;
                  
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const hasEvent = hasEventOnDate(date);
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(isSelected ? null : date)} // toggle
                      className={`relative p-2 w-full aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${isSelected ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-white/10 text-white/80'}
                        ${isToday && !isSelected ? 'text-indigo-400 font-bold bg-indigo-500/10' : ''}
                      `}
                    >
                      {date.getDate()}
                      {hasEvent && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <button onClick={() => setSelectedDate(null)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Mostrar todos los eventos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="bg-[#1c1b1b] rounded-3xl border border-white/5 p-6 md:p-8 min-h-[500px]">
              {groupedEvents.length === 0 ? (
                <div className="text-center py-20 text-white/30 h-full flex flex-col items-center justify-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-base">{selectedDate ? 'No hay eventos en esta fecha.' : 'No tienes eventos programados.'}</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {groupedEvents.map((group, groupIdx) => (
                    <div key={groupIdx}>
                      <h4 className="text-sm font-bold text-white/50 mb-4 flex items-center gap-2 capitalize">
                        <CalendarIcon className="w-4 h-4" />
                        {group.dateStr}
                      </h4>
                      <div className="space-y-4">
                        {group.items.map(ev => {
                          const evDate = new Date(ev.date);
                          return (
                            <div key={ev.id} className={`flex items-start gap-4 p-4 md:p-5 rounded-2xl border ${getTypeColor(ev.type)} transition-all hover:scale-[1.01] group`}>
                              <div className="w-16 text-right pt-0.5 flex-shrink-0 border-r border-current pr-4 opacity-70">
                                <div className="text-sm font-bold">{evDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getTypeColor(ev.type)} bg-black/20`}>
                                    {getTypeLabel(ev.type)}
                                  </span>
                                  <button 
                                    onClick={() => handleDelete(ev.id)}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/20 rounded-md transition-all flex-shrink-0 text-white/50 hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <h3 className="font-bold text-base md:text-lg mb-1 leading-tight">{ev.title}</h3>
                                {ev.description && (
                                  <p className="text-sm opacity-80 leading-relaxed">{ev.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#1c1b1b] w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Programar Evento</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-2">Título</label>
                <input required type="text" value={form.title || ""} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-2">Fecha y Hora</label>
                <input required type="datetime-local" value={form.date || ""} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50" style={{colorScheme: 'dark'}} />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-2">Tipo</label>
                <select value={form.type || "meeting"} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50">
                  <option value="meeting">Reunión</option>
                  <option value="task">Tarea</option>
                  <option value="reminder">Recordatorio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-white/40 uppercase mb-2">Descripción (Opcional)</label>
                <textarea rows={3} value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
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
