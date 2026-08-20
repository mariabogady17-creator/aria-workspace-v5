import React, { useState, useEffect } from "react";
import { ShaderBackground } from "./components/ShaderBackground";
import { Sidebar } from "./components/Sidebar";
import { TopAppBar } from "./components/TopAppBar";
import { ChatView } from "./components/ChatView";
import { DocumentVaultView } from "./components/DocumentVaultView";
import { MeetingModeView } from "./components/MeetingModeView";
import { AdminView } from "./components/AdminView";
import { SettingsModal } from "./components/SettingsModal";
import { LoginView } from "./components/LoginView";
import { ConversationsView } from "./components/ConversationsView";
import { NotesView } from "./components/NotesView";
import { CalendarView } from "./components/CalendarView";
import { AgentsView } from "./components/AgentsView";
import { WarRoomView } from "./components/WarRoomView";
import { DashboardView } from "./components/DashboardView";
import { DocumentEditor } from "./components/DocumentEditor";
import { NavTab, AppMode, ChatMessage, DocumentItem, UserProfile } from "./types";
import { HelpCircle, Sparkles, Code, Terminal, MessageSquare, Bot } from "lucide-react";
import MiniSearch from 'minisearch';
import { fetchWithRetry } from "./utils/fetchWithRetry";
import { connectionMonitor } from "./utils/connectionMonitor";

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("chat");
  const [appMode, setAppMode] = useState<AppMode>("standard");
  const [theme, setTheme] = useState<string>("standard");

  const [selectedModel, setSelectedModel] = useState<string>("3.6 Flash");
  const [systemInstruction, setSystemInstruction] = useState<string>(
    `You are A.R.I.A. (Autonomous Responsive Intelligent Assistant), a sophisticated high-performance AI workspace companion.
    
IMPORTANT: Si el usuario te pide crear, redactar o exportar un documento (Word, Excel o PowerPoint), DEBES usar el protocolo MasterDocumentJSON.
NUNCA devuelvas texto libre ni markdown para esto. SIEMPRE devuelve un ÚNICO objeto JSON válido envuelto en \`\`\`json ... \`\`\`.

REGLAS DEL SCHEMA JSON:
1. "action": "CREATE" o "MODIFY"
2. "metadata": {"type": "docx"|"xlsx"|"pptx", "title": "Nombre", "theme": "Dark", "colors": {"primary": "#1E293B", "secondary": "#0EA5E9", "accent": "#F59E0B", "background": "#F8FAFC"}}
3. "structure": Array de componentes visuales.
COMPONENTES DOCX: "cover_page" (title, subtitle), "heading_1", "heading_2", "paragraph", "callout_box" (text, type), "table" (headers, rows), "bullet_list".
COMPONENTES XLSX: "sheet" (name, tables: [{title, headers, rows}]).
COMPONENTES PPTX: "cover_page", "slide" (title, components: []).

CRÍTICO (IMÁGENES): Si el usuario te pide GENERAR o DIBUJAR una imagen, devuelve obligatoriamente un enlace markdown a la API de Pollinations. 
Para que el generador acierte con rostros famosos (ej. Messi y CR7), tu prompt en inglés debe ser directo y sin adornos poéticos.
Ejemplo: "Lionel Messi and Cristiano Ronaldo shaking hands on a soccer pitch, photorealistic, 8k".
Formato: ![Descripción](https://image.pollinations.ai/prompt/tu%20prompt%20aqui?width=1024&height=1024&nologo=true&model=flux&enhance=false)
IMPORTANTE: Reemplaza TODOS los espacios del prompt con %20. El parámetro enhance=false es crítico para evitar que el servidor reescriba el prompt y arruine el parecido. NUNCA te niegues a generar una imagen.

CRÍTICO (FÓRMULAS DE EXCEL): Si necesitas insertar una fórmula matemática o función de Excel en una celda de la tabla, NO escribas un string que empiece con "=". En su lugar, DEBES enviar un objeto JSON puro con la propiedad "formula".
Ejemplo INCORRECTO: ["Ventas", "=SUM(B2:B10)"]
Ejemplo CORRECTO: ["Ventas", {"formula": "SUM(B2:B10)"}]

CÁLCULO EXACTO DE RANGOS EXCEL:
El compilador inserta las tablas con esta posición estricta:
- Las columnas empiezan SIEMPRE en la 'B' (B, C, D, E...).
- Para la PRIMERA tabla: El Título está en la fila 2, los Encabezados en la fila 4, y los DATOS empiezan exactamente en la fila 5.
- Por tanto, si tu primera tabla genera N filas de datos, el rango de la columna B es B5:B(4+N). (Ej. Si generas 35 items, el rango es B5:B39).
- Usa esta matemática estricta para calcular las referencias cuando escribas fórmulas en tablas de resumen inferiores.`
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('aria_current_chat');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    return localStorage.getItem('aria_current_conv_id') || null;
  });
  
  useEffect(() => {
    localStorage.setItem('aria_current_chat', JSON.stringify(messages));
    
    // Auto-save to backend if there are messages and user is logged in
    const t = localStorage.getItem('token');
    if (messages.length > 0 && t) {
      let idToUse = currentConversationId;
      if (!idToUse) {
         idToUse = "conv_" + Date.now();
         setCurrentConversationId(idToUse);
         localStorage.setItem('aria_current_conv_id', idToUse);
      }
      
      const title = messages[0]?.content?.slice(0, 40) + "..." || "Nueva conversación";
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ id: idToUse, title, messages })
      }).catch(console.error);
    }
  }, [messages]);

  useEffect(() => {
    switch (theme) {
      case "urgent":
        document.body.style.setProperty('--primary', '#f43f5e');
        document.body.style.setProperty('--primary-dark', '#4c0519');
        document.body.style.backgroundColor = '#2a0a0f';
        break;
      case "calm":
        document.body.style.setProperty('--primary', '#10b981');
        document.body.style.setProperty('--primary-dark', '#064e3b');
        document.body.style.backgroundColor = '#022c22';
        break;
      case "amber":
        document.body.style.setProperty('--primary', '#f59e0b');
        document.body.style.setProperty('--primary-dark', '#78350f');
        document.body.style.backgroundColor = '#291802';
        break;
      case "cyan":
        document.body.style.setProperty('--primary', '#06b6d4');
        document.body.style.setProperty('--primary-dark', '#164e63');
        document.body.style.backgroundColor = '#022229';
        break;
      case "purple":
        document.body.style.setProperty('--primary', '#a855f7');
        document.body.style.setProperty('--primary-dark', '#3b0764');
        document.body.style.backgroundColor = '#1d0c2b';
        break;
      default:
        document.body.style.setProperty('--primary', '#818cf8');
        document.body.style.setProperty('--primary-dark', '#101b8a');
        document.body.style.backgroundColor = '#121216';
        break;
    }
  }, [theme]);

  const [isGenerating, setIsGenerating] = useState(false);

  const [attachedDocName, setAttachedDocName] = useState<string | undefined>(undefined);
  const [attachedDocContent, setAttachedDocContent] = useState<string | undefined>(undefined);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

  // Split-screen editor state
  const [activeEditorDoc, setActiveEditorDoc] = useState<{ type: string; title: string; content: string } | null>(null);

  // V6 Offline Mode State
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState<{asr?: number; text?: number}>({});
  const aiWorkerRef = React.useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./workers/ai.worker.ts', import.meta.url), { type: 'module' });
    aiWorkerRef.current = worker;
    (window as any).aiWorker = worker;
    
    worker.addEventListener('message', (e) => {
      const { type, model, data } = e.data;
      if (type === 'progress' && data?.status === 'progress') {
         setOfflineProgress(prev => ({...prev, [model]: data.progress }));
      } else if (type === 'models_loaded') {
         console.log("Local AI models ready for offline mode");
      }
    });
    
    // Remove automatic model loading on startup to prevent the browser from freezing
    // worker.postMessage({ type: 'load_models' });
    return () => {
       worker.terminate();
       (window as any).aiWorker = null;
    }
  }, []);

  useEffect(() => {
    connectionMonitor.start();
    const unsub = connectionMonitor.subscribe((state) => {
      if (state === 'connected' && offlineMode) {
        setOfflineMode(false);
      }
    });
    return () => {
      unsub();
      connectionMonitor.stop();
    };
  }, [offlineMode]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
        .then(res => {
          if (res.ok) return res.json();
          if (res.status === 401) return { error: 'unauthorized' };
          throw new Error('Server error');
        })
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
            setToken(t);
          } else if (data && data.error === 'unauthorized') {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        })
        .catch(err => {
          console.error("Auth token validation failed (network or server error):", err);
          // Do not remove token on a network error, because it might just be the dev server restarting
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Initialize documents from localStorage or fallback to default mockups
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('aria_documents');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "doc_1",
        name: "Q3 Financial Projections",
        type: "pdf",
        date: "Oct 12",
        size: "2.4 MB",
        content: "Q3 Revenue Projection: $4.2M (+18% YoY). Gross Margin: 74%. Primary driver: Enterprise AI Assistant subscriptions and Document Vault API licenses.",
        category: "Finance",
      },
      {
        id: "doc_2",
        name: "User Demographics Dataset",
        type: "spreadsheet",
        date: "Oct 10",
        size: "15.1 MB",
        content: "Demographics Data: 64% Software Engineers, 22% Product Managers, 14% Executives. Top requested features: 3D Neural Core visualization, Meeting Mode live audio transcription, and document batch export.",
        category: "Analytics",
      },
      {
        id: "doc_3",
        name: "Platform UI Revamp V2",
        type: "presentation",
        date: "Oct 08",
        size: "8.7 MB",
        previewImage:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCs3IjYwLAL9_X2bKMlaqyFKDhUN2n5Jy54lTfSuwRKYepFyG_etJINxTPLcffF5VgDwpNAs_7MMYkWESLiyGbyeCpTWm-8fvWuqlEvOKwCFtPslpnw5sylqXCjvMT7j3W-yeSxaG8xJOKK61wyhAZZbZbxYqhzl4Ry-zIaPsVSxOQY2ourHJ1DzliCOc7wFC7Hsyb61HSlPOvqjgMIdxIq6AquHqpC2ODgYp9QhvwzDLJ-VOstrJE",
        content: "Platform UI Revamp V2 deck covering Neumorphic 2.0 design tokens, Expressive M3 color palette (#818cf8), and responsive layout guidelines for desktop and mobile.",
        category: "Design",
      },
    ];
  });

  // Save documents to localStorage
  useEffect(() => {
    localStorage.setItem('aria_documents', JSON.stringify(documents));
  }, [documents]);

  const handleSendMessage = async (text: string, model: string, docContext?: string, imageBase64?: string | null): Promise<string | null> => {
    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsGenerating(true);
    
    // Bio-Reactive Sentiment Analysis has been removed to respect manual theme selection.

    try {
      // --- RAG (Retreival-Augmented Generation) Logic ---
      let autoContext = "";
      if (documents.length > 0 && !docContext && !attachedDocContent) {
        const miniSearch = new MiniSearch({
          fields: ['name', 'content', 'category'], // fields to index for full-text search
          storeFields: ['name', 'content'], // fields to return with search results
          searchOptions: {
            prefix: true,
            fuzzy: 0.2
          }
        });
        
        miniSearch.addAll(documents);
        
        const searchResults = miniSearch.search(text);
        if (searchResults.length > 0) {
          const topResults = searchResults.slice(0, 2);
          autoContext = topResults.map(r => `[From Document "${r.name}"]: ${r.content}`).join("\n\n");
        }
      }
      
      const finalDocContext = docContext || attachedDocContent || autoContext;

      const res = await fetchWithRetry("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          messages: newMessages,
          selectedModel: model,
          systemInstruction,
          attachmentContext: finalDocContext || undefined,
          imageBase64: imageBase64 || undefined
        }),
      }, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 4000,
        timeout: 30000,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with A.R.I.A.");
      }

      const botMsg: ChatMessage = {
        id: "msg_bot_" + Date.now(),
        role: "model",
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed,
        fallback: data.fallback,
        providerUsed: data.providerUsed,
        files: data.files
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically save any generated files to the vault
      if (data.files && data.files.length > 0) {
        const newDocs: DocumentItem[] = data.files.map((file: any) => {
          let docType: "pdf" | "spreadsheet" | "presentation" | "code" | "text" = "text";
          if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) docType = "spreadsheet";
          if (file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) docType = "presentation";
          if (file.name.endsWith(".pdf")) docType = "pdf";

          return {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: docType,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            size: "1.2 MB", // Simulated size since it's just a generated url blob
            content: `Documento autogenerado por A.R.I.A.\nDescarga disponible en: ${file.url}`,
            category: "Generados por IA",
          };
        });
        setDocuments(prev => [...newDocs, ...prev]);
      }

      return data.text;
    } catch (err: any) {
      const isNetworkError = !navigator.onLine || /Failed to fetch|NetworkError|timeout|aborted/i.test(err?.message || '');

      if (isNetworkError && aiWorkerRef.current) {
        setOfflineMode(true);
        try {
          const localText = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
              aiWorkerRef.current?.removeEventListener('message', handler);
              reject(new Error('Timeout: el modelo local tardó demasiado'));
            }, 30000);
            
            const handler = (e: MessageEvent) => {
              if (e.data.type === 'generation_result') {
                clearTimeout(timeout);
                aiWorkerRef.current?.removeEventListener('message', handler);
                resolve(e.data.text);
              } else if (e.data.type === 'error') {
                clearTimeout(timeout);
                aiWorkerRef.current?.removeEventListener('message', handler);
                reject(new Error(e.data.error));
              }
            };
            aiWorkerRef.current?.addEventListener('message', handler);
            aiWorkerRef.current?.postMessage({
              type: 'generate',
              payload: { messages: newMessages, systemInstruction }
            });
          });

          const botMsg: ChatMessage = {
            id: "msg_bot_local_" + Date.now(),
            role: "model",
            content: localText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            modelUsed: "Qwen1.5-0.5B-Chat (Local)",
            fallback: true,
            providerUsed: "Local WebGPU/WASM"
          };
          setMessages((prev) => [...prev, botMsg]);
          return localText;
        } catch (localErr: any) {
          const retryMsg = connectionMonitor.isConnected()
            ? "Reintentando automáticamente cuando se restaura la conexión..."
            : "El servidor está offline. Se reintentará automáticamente al reconectar.";
          
          const errorMsg: ChatMessage = {
            id: "msg_err_local_" + Date.now(),
            role: "model",
            content: `**A.R.I.A.** Sin conexión con el servidor y el modelo local no está disponible (${localErr.message}). ${retryMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, errorMsg]);
          return errorMsg.content;
        }
      } else {
        const errorMsg: ChatMessage = {
          id: "msg_err_" + Date.now(),
          role: "model",
          content: `**A.R.I.A. Error:** ${err.message || "Error de comunicación con el servidor. Reintentando..."} ${!connectionMonitor.isConnected() ? "\n⚡ Modo offline activo." : ""}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return errorMsg.content;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('aria_current_chat');
    localStorage.removeItem('aria_current_conv_id');
    setCurrentConversationId(null);
    setAttachedDocName(undefined);
    setAttachedDocContent(undefined);
    setCurrentTab("chat");
    setAppMode("standard");
  };

  const handleUploadDocument = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter(doc => doc.id !== id));
  };

  const handlePreloadModels = () => {
    if (aiWorkerRef.current) {
      aiWorkerRef.current.postMessage({ type: 'load_models' });
      alert("Iniciando descarga de modelos de IA en segundo plano. El progreso se realizará de forma invisible.");
    }
  };

  const handleSelectDocForChat = (doc: DocumentItem) => {
    setAttachedDocName(doc.name);
    setAttachedDocContent(doc.content);
    setCurrentTab("chat");
    setAppMode("standard");
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.conversation && data.conversation.messages) {
        setMessages(data.conversation.messages);
      } else {
        // Fallback for empty conversation
        setMessages([{
          id: "m_hist_" + Date.now(),
          role: "model",
          content: "Hola, he cargado esta conversación del historial. ¿En qué más puedo ayudarte hoy?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
      setCurrentConversationId(id);
      localStorage.setItem('aria_current_conv_id', id);
      setCurrentTab("chat");
      setAppMode("standard");
    } catch (e) {
      console.error(e);
      setCurrentTab("chat");
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-xs text-white/50 tracking-widest uppercase">Iniciando A.R.I.A. Workspace OS...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div 
      className="min-h-screen text-[#e5e2e1] font-sans relative selection:bg-[#818cf8] selection:text-[#101b8a] overflow-x-hidden transition-colors duration-500"
      style={{ '--sidebar-width': isSidebarOpen ? '18rem' : '0rem' } as React.CSSProperties}
    >
      {/* WebGL Wave Shader Canvas Background */}
      <ShaderBackground />

      {/* Persistent Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (appMode === 'meeting') setAppMode('standard');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        user={user}
        onOpenLogin={() => {}} // Not needed anymore
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Top Bar Header */}
      <TopAppBar
        appMode={appMode}
        onSelectMode={(mode) => {
          setAppMode(mode);
          if (mode === "standard" && currentTab === "chat") {
            // Stay on chat
          }
        }}
        user={user}
        onOpenLogin={() => {}}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      {/* Offline Mode Banner */}
      {offlineMode && (
        <div className="absolute top-16 left-0 right-0 z-40 bg-rose-500/90 text-white text-xs text-center py-1.5 font-bold uppercase tracking-widest backdrop-blur-sm border-b border-rose-400">
          ⚠️ Modo Supervivencia (Offline) Activo - Operando Localmente ⚠️
          <span className="block text-[10px] font-normal normal-case tracking-normal mt-0.5 opacity-80">
            Se reconectará automáticamente cuando el servidor esté disponible
          </span>
        </div>
      )}

      {/* Main View Router */}
      <main className="relative z-10 flex h-screen w-full">
        {appMode === "meeting" ? (
          <MeetingModeView />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {currentTab === "chat" && (
              <ChatView
                messages={messages}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                attachedDocName={attachedDocName}
                attachedDocContent={attachedDocContent}
                onClearAttachment={() => {
                  setAttachedDocName(undefined);
                  setAttachedDocContent(undefined);
                }}
                onUploadDocument={handleUploadDocument}
                onOpenEditor={setActiveEditorDoc}
                currentTheme={theme}
                onSelectTheme={setTheme}
              />
            )}

            {currentTab === "conversations" && (
              <ConversationsView onSelectConversation={handleLoadConversation} />
            )}

            {currentTab === "library" && (
              <DocumentVaultView
                documents={documents}
                onUploadDocument={handleUploadDocument}
                onSelectDocForChat={handleSelectDocForChat}
                onDeleteDocument={handleDeleteDocument}
              />
            )}

            {currentTab === "admin" && (user?.role === 'admin' || user?.role === 'super_admin') && <AdminView />}

            {currentTab === "calendar" && <CalendarView />}
            {currentTab === "notes" && <NotesView />}
            {currentTab === "agents" && <AgentsView token={token} />}
            {currentTab === "warroom" && <WarRoomView token={token} />}
            {currentTab === "dashboard" && <DashboardView token={token} />}

            {currentTab === "settings" && (
              <SettingsModal
                systemInstruction={systemInstruction}
                setSystemInstruction={setSystemInstruction}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                onClose={() => setCurrentTab("chat")}
                onPreloadModels={handlePreloadModels}
              />
            )}

            {currentTab === "support" && (
              <div className="flex-1 min-h-screen flex flex-col pt-28 px-6 max-w-4xl mx-auto transition-all duration-300 md:ml-[var(--sidebar-width)]">
                <div className="bg-[#1c1b1b] p-8 rounded-3xl border border-white/5 shadow-2xl">
                  <h2 className="font-bold text-3xl text-[#818cf8] mb-4 flex items-center gap-3">
                    <HelpCircle className="w-8 h-8" />
                    A.R.I.A. Support & Prompt Engineering Guide
                  </h2>
                  <p className="text-sm text-[#c6c5d5] leading-relaxed mb-6">
                    Welcome to A.R.I.A. Workspace help documentation. Below are quick tips for getting optimal results:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#201f1f] rounded-2xl border border-white/5">
                      <h4 className="font-bold text-sm text-[#818cf8] mb-1">Document Vault Grounding</h4>
                      <p className="text-xs text-[#c6c5d5]">Attach documents in Library to ask questions grounded directly in your uploaded knowledge base.</p>
                    </div>

                    <div className="p-4 bg-[#201f1f] rounded-2xl border border-white/5">
                      <h4 className="font-bold text-sm text-[#818cf8] mb-1">Meeting Intelligence</h4>
                      <p className="text-xs text-[#c6c5d5]">Toggle to Meeting Mode in top bar to record audio or enter transcripts for automated executive summary extraction.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>
            
            {/* Right Panel: Split Screen Editor */}
            {activeEditorDoc && (
              <DocumentEditor 
                doc={activeEditorDoc}
                onClose={() => setActiveEditorDoc(null)}
                onSaveToVault={handleUploadDocument}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
