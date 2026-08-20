import React, { useEffect, useState } from "react";
import { MessageSquare, Clock, Trash2 } from "lucide-react";
import { ConversationThread } from "../types";

interface ConversationsViewProps {
  onSelectConversation?: (id: string) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/conversations', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.conversations) setConversations(data.conversations);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-8 h-8 text-[#818cf8]" />
        <h2 className="font-bold text-3xl text-white tracking-tight">Historial de Conversaciones</h2>
      </div>

      {loading ? (
        <div className="text-[#c6c5d5]/50 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-[#818cf8] border-t-transparent animate-spin"></div>
          Cargando historial...
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#1c1b1b] rounded-3xl border border-white/5">
          <MessageSquare className="w-12 h-12 text-[#c6c5d5]/20 mb-4" />
          <p className="text-[#c6c5d5]/60">No tienes conversaciones guardadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              onClick={() => onSelectConversation && onSelectConversation(conv.id)}
              className="bg-[#1c1b1b] hover:bg-[#201f1f] p-5 rounded-3xl border border-white/5 hover:border-[#818cf8]/30 transition-all flex flex-col gap-3 group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg text-white truncate pr-4">{conv.title}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                  className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/10 rounded-lg"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#c6c5d5]/70 line-clamp-2">{conv.preview}</p>
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5 text-xs text-[#c6c5d5]/40 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(conv.lastUpdated).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {conv.messageCount} msg
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
