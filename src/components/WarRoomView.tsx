import React, { useState, useRef, useEffect } from 'react';
import { Swords, User, Brain, Lightbulb, Code, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgentMessage {
  id: string;
  agent: 'user' | 'critic' | 'creative' | 'coder';
  content: string;
}

const AGENTS = {
  critic: { name: 'El Crítico', icon: Brain, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  creative: { name: 'El Creativo', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  coder: { name: 'El Arquitecto', icon: Code, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  user: { name: 'Tú', icon: User, color: 'text-[#818cf8]', bg: 'bg-[#818cf8]/10', border: 'border-[#818cf8]/20' }
};

export const WarRoomView: React.FC<{ token: string }> = ({ token }) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const runSimulation = async (problemText: string) => {
    const userMsg: AgentMessage = { id: Date.now().toString(), agent: 'user', content: problemText };
    setMessages(prev => [...prev, userMsg]);
    setIsSimulating(true);

    const history: { role: string; content: string }[] = [{ role: 'user', content: problemText }];

    const turn = async (agent: 'critic' | 'creative' | 'coder', prompt: string) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: history,
            selectedModel: "gemini-3.6-flash",
            systemInstruction: `Eres ${AGENTS[agent].name} en una sala de guerra (War Room) debatiendo un problema. ${prompt} Sé muy directo, sin saludos largos. Opina sobre el problema y las ideas anteriores. MÁXIMO 2 PÁRRAFOS.`
          })
        });
        const data = await res.json();
        const content = data.text || "Error en agente";
        setMessages(prev => [...prev, { id: Date.now().toString(), agent, content }]);
        history.push({ role: 'model', content: `${AGENTS[agent].name} dijo: ${content}` });
      } catch (e) {
        console.error(e);
      }
    };

    // Agent Turns
    await turn('creative', 'Eres creativo, buscas soluciones fuera de la caja, locas e innovadoras.');
    await turn('critic', 'Eres crítico, buscas fallas, riesgos y problemas en las ideas del creativo o del usuario. Eres escéptico.');
    await turn('coder', 'Eres el arquitecto de software/sistema. Tomas las ideas del creativo, evitas los riesgos del crítico y propones una arquitectura final sólida y pasos a seguir.');

    setIsSimulating(false);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 pb-20 relative bg-[#121216]">
      <div className="flex items-center gap-3 mb-8 max-w-4xl mx-auto w-full">
        <div className="p-3 bg-gradient-to-br from-rose-500/20 to-purple-500/20 rounded-2xl border border-white/10">
          <Swords className="w-8 h-8 text-rose-400" />
        </div>
        <div>
          <h1 className="text-3xl font-light tracking-wide text-[#e5e2e1]">War Room</h1>
          <p className="text-[#c6c5d5] text-sm mt-1">Sala de Guerra Multi-Agente. 3 Inteligencias discutiendo tu problema.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full mb-6 flex flex-col gap-6" ref={containerRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <Swords className="w-16 h-16 text-[#c6c5d5] mb-4" />
            <p className="text-[#c6c5d5] text-lg">Ingresa un problema complejo para iniciar el debate entre los agentes.</p>
          </div>
        ) : (
          messages.map(msg => {
            const agent = AGENTS[msg.agent];
            const Icon = agent.icon;
            return (
              <div key={msg.id} className={`flex gap-4 p-5 rounded-3xl border ${agent.border} ${agent.bg}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#1c1b1b] border ${agent.border} shrink-0`}>
                  <Icon className={`w-5 h-5 ${agent.color}`} />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${agent.color}`}>{agent.name}</h4>
                  <div className="text-[#e5e2e1] text-sm leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isSimulating && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-3 text-[#c6c5d5] bg-white/5 px-6 py-3 rounded-full border border-white/10">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium animate-pulse">Los agentes están debatiendo...</span>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto w-full bg-[#1c1b1b] rounded-full border border-white/10 p-2 flex items-center shadow-2xl relative z-20">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe el problema a debatir..."
          className="flex-1 bg-transparent border-none focus:outline-none text-[#e5e2e1] px-4"
          disabled={isSimulating}
          onKeyDown={e => e.key === 'Enter' && input.trim() && !isSimulating && (setInput(""), runSimulation(input))}
        />
        <button 
          onClick={() => {
            if (input.trim() && !isSimulating) {
              setInput("");
              runSimulation(input);
            }
          }}
          disabled={isSimulating || !input.trim()}
          className="bg-[#818cf8] text-white p-3 rounded-full hover:bg-[#6366f1] disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
