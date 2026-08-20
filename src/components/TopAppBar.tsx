import React, { useState } from "react";
import { Bell, User, Check, X, Sparkles, Mic, Menu } from "lucide-react";
import { AppMode, UserProfile } from "../types";
import { ConnectionStatus } from "./ConnectionStatus";

interface TopAppBarProps {
  appMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  user: UserProfile | null;
  onOpenLogin: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  appMode,
  onSelectMode,
  user,
  onOpenLogin,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Indexación Completa",
      message: "Proyecciones Financieras del Q3 indexadas con éxito en la Bóveda de Documentos.",
      time: "hace 2 min",
      unread: true,
    },
    {
      id: "2",
      title: "Actualización de Modelo",
      message: "El modelo Gemini 3.1 Pro preview está listo para tareas avanzadas de razonamiento.",
      time: "hace 1h",
      unread: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className={`fixed top-0 right-0 w-full transition-all duration-300 ${isSidebarOpen ? 'md:w-[calc(100%-18rem)]' : 'md:w-full'} flex justify-between items-center px-6 h-20 z-40 bg-[#131313]/40 backdrop-blur-xl border-b border-white/5`}>
      {/* Left: Mode Toggle & Menu */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-[#c6c5d5] hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title={isSidebarOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex bg-[#2a2a2a] rounded-full p-1 border border-white/5 shadow-inner">
          <button
            onClick={() => onSelectMode("standard")}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
              appMode === "standard"
                ? "bg-[#131313] text-[var(--primary)] shadow-md border border-white/10"
                : "text-[#c6c5d5] hover:text-[#e5e2e1]"
            }`}
          >
            Estándar
          </button>
          <button
            onClick={() => onSelectMode("meeting")}
            className={`px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-all duration-300 ${
              appMode === "meeting"
                ? "bg-[var(--primary)] text-[var(--primary-dark)] shadow-md font-semibold"
                : "text-[#c6c5d5] hover:text-[#e5e2e1]"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Modo Reunión</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 relative">
        {/* Connection Status */}
        <ConnectionStatus />
        
        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full bg-[#201f1f] border border-white/5 flex items-center justify-center text-[#c6c5d5] hover:text-[var(--primary)] transition-colors relative shadow-sm active:scale-95"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[var(--primary)] rounded-full ring-2 ring-[#131313] animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#1c1b1b] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                  <span className="font-semibold text-sm text-[#e5e2e1]">A.R.I.A. Insights</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-[var(--primary)] hover:underline"
                  >
                    Marcar como leídas
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 my-3 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#c6c5d5]/60 text-center py-4">No hay notificaciones nuevas</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        n.unread
                          ? "bg-[#201f1f] border-[var(--primary)]/30 text-[#e5e2e1]"
                          : "bg-[#131313]/50 border-white/5 text-[#c6c5d5]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-[var(--primary)]">{n.title}</span>
                        <span className="text-[10px] text-[#c6c5d5]/50">{n.time}</span>
                      </div>
                      <p className="leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowNotifications(false)}
                className="w-full text-center text-xs text-[#c6c5d5] hover:text-[#e5e2e1] py-1 border-t border-white/5"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* User Profile Button */}
        <button
          onClick={onOpenLogin}
          className="w-10 h-10 rounded-full bg-[#201f1f] border border-white/5 flex items-center justify-center text-[#c6c5d5] hover:text-[var(--primary)] transition-colors shadow-sm active:scale-95"
          title={user ? user.name : "Iniciar Sesión"}
        >
          {user ? (
            <span className="text-xs font-bold text-[var(--primary)]">{user.name.charAt(0)}</span>
          ) : (
            <User className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
};
