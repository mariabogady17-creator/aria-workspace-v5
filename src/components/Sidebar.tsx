import React from "react";
import {
  MessageSquare,
  PlusCircle,
  FolderKanban,
  ShieldAlert,
  Settings,
  HelpCircle,
  Sparkles,
  User,
  LogOut,
  Cpu,
  Calendar,
  FileText,
  Bot,
  Swords,
  LayoutDashboard,
  X
} from "lucide-react";
import { NavTab, UserProfile } from "../types";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onNewChat: () => void;
  user: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onNewChat,
  user,
  onOpenLogin,
  onLogout,
  isOpen = true,
  onCloseMobile,
}) => {
  return (
    <nav className={`fixed left-0 top-0 h-full flex flex-col p-6 bg-[#1c1b1b] w-72 z-50 border-r border-white/5 shadow-[-4px_-4px_12px_rgba(255,255,255,0.03),6px_6px_16px_rgba(0,0,0,0.4)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Brand Header */}
      <div className="mb-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#201f1f] flex items-center justify-center text-[var(--primary)] shadow-[-4px_-4px_12px_rgba(255,255,255,0.03),6px_6px_16px_rgba(0,0,0,0.4)] border border-white/5">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-[24px] leading-tight tracking-tighter text-[var(--primary)]">
              A.R.I.A.
            </h1>
            <p className="text-xs font-mono text-[#c6c5d5]">Asistente Inteligente</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-2 text-[#c6c5d5] hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 pb-4">
        {/* New Chat Action Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 bg-[var(--primary)] text-[var(--primary-dark)] rounded-full px-5 py-2.5 font-semibold shadow-[0_0_15px_rgba(129,140,248,0.3)] hover:brightness-110 active:scale-95 transition-all duration-200 mx-2"
        >
          <PlusCircle className="w-5 h-5 fill-current" />
          <span className="text-sm font-semibold">Nuevo Chat</span>
        </button>

        {/* Navigation Tabs */}
        <button
          onClick={() => onSelectTab("dashboard")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "dashboard"
              ? "bg-[var(--primary)]/20 text-[var(--primary)] font-semibold border border-white/10"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab("conversations")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "conversations"
              ? "bg-[#353534] text-[#e5e2e1] font-semibold border border-white/10"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Conversaciones</span>
        </button>

        <button
          onClick={() => onSelectTab("library")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "library"
              ? "bg-[var(--primary)] text-[var(--primary-dark)] font-semibold shadow-[0_0_12px_rgba(129,140,248,0.3)]"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span className="text-sm font-medium">Bóveda</span>
        </button>

        <button
          onClick={() => onSelectTab("calendar")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "calendar"
              ? "bg-[#353534] text-[#e5e2e1] font-semibold border border-white/10"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Calendario</span>
        </button>

        <button
          onClick={() => onSelectTab("notes")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "notes"
              ? "bg-[#353534] text-[#e5e2e1] font-semibold border border-white/10"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm">Notas</span>
        </button>

        <div className="my-2 border-t border-white/5 mx-6"></div>

        <button
          onClick={() => onSelectTab("agents")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "agents"
              ? "bg-[#353534] text-[#e5e2e1] font-semibold border border-white/10"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="text-sm">Agentes</span>
        </button>

        <button
          onClick={() => onSelectTab("warroom")}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
            currentTab === "warroom"
              ? "bg-[#353534] text-[#e5e2e1] font-semibold border border-white/10 text-rose-400"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/50 hover:text-rose-400"
          }`}
        >
          <Swords className="w-4 h-4" />
          <span className="text-sm font-medium">War Room</span>
        </button>

        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <>
            <div className="my-2 border-t border-white/5 mx-6"></div>

            <button
              onClick={() => onSelectTab("admin")}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 mx-2 ${
                currentTab === "admin"
                  ? "bg-[#353534] text-rose-400 font-semibold border border-rose-500/30"
                  : "text-[#c6c5d5] hover:text-rose-400 hover:bg-rose-500/10"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </button>
          </>
        )}
      </div>

      {/* Footer Settings & Upgrade CTA */}
      <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-white/5 shrink-0">
        <button
          onClick={() => onSelectTab("settings")}
          className={`flex items-center gap-4 px-6 py-2.5 rounded-full text-sm transition-all ${
            currentTab === "settings"
              ? "bg-[#353534] text-[#e5e2e1]"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/40"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Ajustes</span>
        </button>

        <button
          onClick={() => onSelectTab("support")}
          className={`flex items-center gap-4 px-6 py-2.5 rounded-full text-sm transition-all ${
            currentTab === "support"
              ? "bg-[#353534] text-[#e5e2e1]"
              : "text-[#c6c5d5] hover:text-[#e5e2e1] hover:bg-[#353534]/40"
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span>Soporte</span>
        </button>

        {/* Upgrade / Account pill */}
        <div className="mt-3 flex flex-col gap-2">
          {user ? (
            <div className="p-3 bg-[#201f1f] rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/50 flex items-center justify-center text-[var(--primary)] font-bold text-xs shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#e5e2e1] truncate">{user.name}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1.5 text-[#c6c5d5] hover:text-[#ffb4ab] transition-colors rounded-lg hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full bg-[#201f1f] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold py-2.5 rounded-full border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <User className="w-4 h-4 text-[var(--primary)]" />
              <span>Iniciar sesión</span>
            </button>
          )}

        </div>
      </div>
    </nav>
  );
};
