import React, { useState, useRef, useEffect, Suspense } from "react";
import {
  Send,
  Paperclip,
  Plus,
  FileText,
  Palette,
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  FileDown,
  X,
  Code,
  Mail,
  Lightbulb,
  MessageSquareText,
  Eye,
  Image as ImageIcon,
  Wrench,
  Headphones,
  Presentation,
  Table
} from "lucide-react";
import ReactMarkdown from "react-markdown";
const ThreeNeuralCore = React.lazy(() => import("./ThreeNeuralCore").then(m => ({ default: m.ThreeNeuralCore })));
import { HandsFreeMode } from "./HandsFreeMode";
import { DocumentCard } from "./DocumentCard";
import { CodeBlockViewer } from "./CodeBlockViewer";
import { ChatMessage, DocumentItem } from "../types";

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, model: string, attachedDocContext?: string, imageBase64?: string | null) => Promise<string | null> | Promise<void> | any;
  isGenerating: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  attachedDocName?: string;
  attachedDocContent?: string;
  onClearAttachment?: () => void;
  onUploadDocument?: (doc: DocumentItem) => void;
  onOpenEditor?: (doc: { type: string; title: string; content: string }) => void;
  currentTheme?: string;
  onSelectTheme?: (theme: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  selectedModel,
  setSelectedModel,
  attachedDocName,
  attachedDocContent,
  onClearAttachment,
  onUploadDocument,
  onOpenEditor,
  currentTheme,
  onSelectTheme,
}) => {
  const [inputText, setInputText] = useState("");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showHandsFree, setShowHandsFree] = useState(false);
  const [accentColor, setAccentColor] = useState<string>("default");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<ChatMessage | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const [models, setModels] = useState<{id: string, label: string, desc: string, provider: string, supportsTools?: boolean, supportsVision?: boolean, supportsImageGeneration?: boolean}[]>([]);

  useEffect(() => {
    fetch('/api/models', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setModels(data.models);
          // Set selected model if current is not in list
          if (data.models.length > 0 && !data.models.find((m: any) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if ((!textToSend.trim() && !attachedImage) || isGenerating) return;

    setInputText("");
    const currentImg = attachedImage;
    setAttachedImage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await onSendMessage(textToSend, selectedModel, attachedDocContent, currentImg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            setAttachedImage(evt.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleChipClick = (prompt: string) => {
    setInputText(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const speakText = (id: string, text: string) => {
    if ("speechSynthesis" in window) {
      if (isSpeaking === id) {
        window.speechSynthesis.cancel();
        setIsSpeaking(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(null);
      utterance.onerror = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(id);
    }
  };

  const renderMessageContent = (content: string) => {
    const markdownComponents = {
      code({node, inline, className, children, ...props}: any) {
        const match = /language-(\w+)/.exec(className || '')
        if (!inline && match) {
          return (
            <CodeBlockViewer 
              code={String(children).replace(/\n$/, '')} 
              language={match[1]}
              onMagicAction={handleSend}
            />
          )
        }
        return <code className={className} {...props}>{children}</code>
      }
    };

    const parts = [];
    let lastIndex = 0;
    
    // Regex para JSON Master Document y Legacy ARIA_DOCUMENT
    const docRegex = /(?:```json\s*(\{[\s\S]*?"metadata"[\s\S]*?\})\s*```)|(?:\[ARIA_DOCUMENT\s+type="([^"]+)"\s+title="([^"]+)"\]([\s\S]*?)\[\/ARIA_DOCUMENT\])/g;
    let match;

    while ((match = docRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<ReactMarkdown key={lastIndex} components={markdownComponents as any}>{content.substring(lastIndex, match.index)}</ReactMarkdown>);
      }
      
      let type = "";
      let title = "";
      let docContent = "";

      if (match[1]) {
        // Es un JSON Master Document
        docContent = match[1];
        try {
          const parsed = JSON.parse(docContent);
          type = parsed.metadata?.type || "docx";
          title = parsed.metadata?.title || "Documento_ARIA";
        } catch (e) {
          type = "docx";
          title = "Documento";
        }
      } else {
        // Es Legacy ARIA_DOCUMENT
        type = match[2];
        title = match[3];
        docContent = match[4];
      }

      parts.push(
        <DocumentCard 
          key={match.index} 
          type={type} 
          title={title} 
          content={docContent} 
          onSaveToVault={onUploadDocument} 
          onOpenEditor={onOpenEditor}
        />
      );
      lastIndex = docRegex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(<ReactMarkdown key={lastIndex} components={markdownComponents as any}>{content.substring(lastIndex)}</ReactMarkdown>);
    }
    return parts.length > 0 ? parts : <ReactMarkdown components={markdownComponents as any}>{content}</ReactMarkdown>;
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInputText((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
          }
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      } else {
        // Fallback to Worker Dictation
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          setIsRecording(true);
          const mediaRecorder = new MediaRecorder(stream);
          let audioChunks: Blob[] = [];
          mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
          mediaRecorder.onstop = async () => {
             const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
             if (audioBlob.size === 0) return;
             const arrayBuffer = await audioBlob.arrayBuffer();
             const ctx = new window.AudioContext({ sampleRate: 16000 });
             const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
             const offlineAudio = audioBuffer.getChannelData(0);

             if ((window as any).aiWorker) {
                const worker = (window as any).aiWorker;
                const handler = (e: MessageEvent) => {
                   if (e.data.type === 'transcription_result') {
                      worker.removeEventListener('message', handler);
                      const final = e.data.text.trim();
                      if (final) {
                         setInputText(prev => prev ? prev + " " + final : final);
                      }
                   }
                };
                worker.addEventListener('message', handler);
                worker.postMessage({ type: 'transcribe', payload: { audioData: offlineAudio }});
             }
          };
          mediaRecorder.start();
          
          // Auto stop after 5 seconds of dictation for V6 fallback
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
               mediaRecorder.stop();
               setIsRecording(false);
            }
          }, 5000);
        }).catch(() => {
           alert("No se pudo acceder al micrófono.");
        });
      }
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  // V5 Jarvis: Auto-send on silence
  useEffect(() => {
    let timer: any;
    if (isRecording && inputText.trim().length > 0) {
      timer = setTimeout(() => {
        setIsRecording(false);
        if (inputText.trim() && !isGenerating) {
            handleSend(inputText.trim());
            setInputText("");
        }
      }, 2500); 
    }
    return () => clearTimeout(timer);
  }, [inputText, isRecording]);

  const downloadMessage = async (msg: ChatMessage, format: "txt" | "md" | "json" | "png") => {
    let content = msg.content;
    let filename = `aria_response_${msg.id}.${format}`;
    let mime = "text/plain";

    if (format === "png") {
      const imgMatch = msg.content.match(/!\[.*?\]\((https:\/\/image\.pollinations\.ai\/.*?)\)/);
      if (imgMatch && imgMatch[1]) {
        try {
          const res = await fetch(imgMatch[1]);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `aria_image_${msg.id}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Error downloading image", e);
        }
      }
      setShowExportModal(null);
      return;
    }

    if (format === "json") {
      content = JSON.stringify(msg, null, 2);
      mime = "application/json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen md:ml-[var(--sidebar-width)] transition-all duration-300 pt-20 relative overflow-hidden">
      {/* Scrollable Main Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
        {messages.length === 0 ? (
          /* Landing View with 3D Core & Initial Stage */
          <div className="min-h-[75vh] flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto text-center">
            {/* 3D AI Neural Core */}
            <Suspense fallback={null}>
              <ThreeNeuralCore isGenerating={isGenerating} />
            </Suspense>

            {/* Title */}
            <h2 className="font-bold text-2xl md:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-[#e5e2e1] via-[var(--primary)] to-[#e5e2e1] mb-8 tracking-tight">
              ¿Cómo puede ayudarte A.R.I.A hoy?
            </h2>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap justify-center gap-4 mb-10 z-20">
              <button
                onClick={() => handleChipClick("Redacta un correo profesional para pedir el estatus del proyecto")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c1b1b]/80 border border-white/10 text-[#e5e2e1] hover:bg-[#353534] hover:border-[var(--primary)]/50 transition-all shadow-md btn-particle-effect"
              >
                <Mail className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-sm font-medium">Redactar un correo</span>
              </button>

              <button
                onClick={() => handleChipClick("Revisa este código en busca de vulnerabilidades y optimiza el rendimiento")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c1b1b]/80 border border-white/10 text-[#e5e2e1] hover:bg-[#353534] hover:border-[var(--primary)]/50 transition-all shadow-md btn-particle-effect"
              >
                <Code className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-sm font-medium">Revisar código</span>
              </button>

              <button
                onClick={() => handleChipClick("Genera 5 ideas innovadoras para una app de inteligencia artificial")}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c1b1b]/80 border border-white/10 text-[#e5e2e1] hover:bg-[#353534] hover:border-[var(--primary)]/50 transition-all shadow-md btn-particle-effect"
              >
                <Lightbulb className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-sm font-medium">Lluvia de ideas</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Message Thread */
          <div className="w-full max-w-4xl mx-auto pb-32 flex flex-col gap-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } gap-2 group animate-fadeIn`}
              >
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="text-[11px] font-mono text-[#c6c5d5]/60">
                    {msg.role === "user" ? "Tú" : "A.R.I.A."} • {msg.timestamp}
                  </span>
                  {msg.modelUsed && (
                    <span className="text-[10px] bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded-full font-mono border border-[var(--primary)]/30 flex items-center gap-1">
                      {msg.modelUsed}
                    </span>
                  )}
                  {msg.providerUsed && msg.providerUsed !== "gemini" && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30 flex items-center gap-1">
                      {msg.providerUsed}
                    </span>
                  )}
                  {msg.fallback && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono border border-amber-500/30 flex items-center gap-1" title="Se utilizó un proveedor alternativo debido a un fallo en el principal">
                      ⚠️ Fallback Activo
                    </span>
                  )}
                </div>

                <div
                  className={`p-5 rounded-3xl max-w-[88%] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#3a456a] text-[#e5e2e1] rounded-tr-none shadow-lg border border-white/10"
                      : "bg-[#1e1e24] text-[#e5e2e1] rounded-tl-none border border-white/10 shadow-2xl relative"
                  }`}
                >
                  {msg.imageBase64 && (
                    <div className="mb-4">
                      <img src={msg.imageBase64} alt="Attached" className="max-w-[300px] max-h-[300px] rounded-xl object-contain border border-white/10" />
                    </div>
                  )}
                  
                  <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed overflow-x-auto">
                    {renderMessageContent(msg.content)}
                  </div>

                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="text-[11px] uppercase tracking-widest text-white/40 font-mono">Archivos Generados:</div>
                      {msg.files.map((f, i) => (
                        <a
                          key={i}
                          href={f.url}
                          download
                          className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-all w-fit"
                        >
                          <FileDown className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-medium text-white">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Assistant response action bar */}
                  {msg.role === "model" && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 text-[#c6c5d5]">
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Copiar texto"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => speakText(msg.id, msg.content)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Leer en voz alta"
                      >
                        {isSpeaking === msg.id ? (
                          <VolumeX className="w-4 h-4 text-[var(--primary)]" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => setShowExportModal(msg)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Exportar"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSend("Regenera la respuesta con más detalles técnicos")}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto"
                        title="Regenerar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-3 p-4 bg-[#1e1e24] rounded-2xl border border-[var(--primary)]/30 w-fit animate-pulse">
                <Sparkles className="w-5 h-5 text-[var(--primary)] animate-spin" />
                <span className="text-xs font-mono text-[var(--primary)]">A.R.I.A. está pensando...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Interaction Box (Prompt Bar) */}
      <div className="p-4 md:p-6 w-full max-w-3xl mx-auto z-30 sticky bottom-0 bg-transparent">
        {/* Tip Indicator above bar */}
        <div className="text-center mb-2 text-[#c6c5d5]/70 text-xs font-mono tracking-wide">
          Sugerencia: Descubre el nuevo Panel de Exportación para más opciones
        </div>

        {/* Image preview pill if attached */}
        {attachedImage && (
          <div className="mb-2 flex items-center gap-2 bg-[var(--primary)]/20 text-[var(--primary)] px-4 py-1.5 rounded-full text-xs font-mono border border-[var(--primary)]/40 w-fit mx-auto relative group">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Imagen Adjunta</span>
            <button onClick={() => setAttachedImage(null)} className="hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <img src={attachedImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-white/10 shadow-2xl" />
            </div>
          </div>
        )}

        {/* Attachment preview pill if document attached */}
        {attachedDocName && (
          <div className="mb-2 flex items-center gap-2 bg-[var(--primary)]/20 text-[var(--primary)] px-4 py-1.5 rounded-full text-xs font-mono border border-[var(--primary)]/40 w-fit mx-auto">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Adjunto: {attachedDocName}</span>
            <button onClick={onClearAttachment} className="hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="w-full bg-[#1e1e24]/90 backdrop-blur-2xl rounded-3xl p-1.5 flex flex-col gap-1 border border-white/10 shadow-[-4px_-4px_12px_rgba(255,255,255,0.03),6px_6px_16px_rgba(0,0,0,0.5)] focus-within:border-[var(--primary)]/60 transition-all">
          {/* Input Area */}
          <div className="bg-[#1c1b1b] rounded-2xl border border-white/5 mx-2 mb-2 relative overflow-hidden transition-all duration-300 shadow-lg group-hover:border-white/10 hover:shadow-[0_0_20px_rgba(129,140,248,0.1)] focus-within:border-[var(--primary)]/50 focus-within:shadow-[0_0_25px_rgba(129,140,248,0.15)] flex flex-col justify-end min-h-[3rem]">
            
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder="Escribe un mensaje a A.R.I.A..."
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-[#e5e2e1] text-sm md:text-base placeholder:text-[#c6c5d5]/50 px-4 py-3 leading-relaxed"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 pb-2 relative">
            <div className="flex items-center gap-1">
              {/* Plus Quick Actions */}
              <div className="relative quick-menu-container">
                <button
                  onClick={() => setShowQuickMenu(!showQuickMenu)}
                  className="p-2 text-[#c6c5d5] hover:text-[var(--primary)] transition-colors rounded-full hover:bg-white/5"
                  title="Acciones Rápidas"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {showQuickMenu && (
                  <div className="absolute left-0 bottom-12 w-56 bg-[#1c1b1b] border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
                    <button
                      onClick={() => {
                        setInputText("Redacta un resumen ejecutivo para este tema:");
                        setShowQuickMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e2e1] hover:bg-[#353534] rounded-xl flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Resumen Ejecutivo</span>
                    </button>
                    <button
                      onClick={() => {
                        setInputText("Genera el mismo contenido usando el protocolo [ARIA_DOCUMENT] TRES VECES: una con type='docx', otra con type='xlsx' y otra con type='pptx'. Contenido:");
                        setShowQuickMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e2e1] hover:bg-[#353534] rounded-xl flex items-center gap-2"
                    >
                      <Presentation className="w-3.5 h-3.5 text-rose-400" />
                      <span>Generación Multi-Formato</span>
                    </button>
                    <button
                      onClick={() => {
                        setInputText("Extrae todos los datos de esta imagen y devuélvelos obligatoriamente en formato de tabla usando [ARIA_DOCUMENT type='xlsx' title='Datos Extraídos'].");
                        setShowQuickMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e2e1] hover:bg-[#353534] rounded-xl flex items-center gap-2"
                    >
                      <Table className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Extraer a Excel (OCR)</span>
                    </button>
                    <button
                      onClick={() => {
                        setInputText("Realiza una revisión de código exhaustiva en:");
                        setShowQuickMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e2e1] hover:bg-[#353534] rounded-xl flex items-center gap-2"
                    >
                      <Code className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Revisión de Código</span>
                    </button>
                    <button
                      onClick={() => {
                        setInputText("Genera 3 opciones creativas de solución para:");
                        setShowQuickMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e2e1] hover:bg-[#353534] rounded-xl flex items-center gap-2"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Lluvia de Ideas</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Attach File */}
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        setInputText(
                          (prev) => `${prev}\n\n[Attached File Content (${file.name})]:\n${content.slice(0, 3000)}`
                        );
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                className="p-2 text-[#c6c5d5] hover:text-[var(--primary)] transition-colors rounded-full hover:bg-white/5"
                title="Adjuntar Documento"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputText((prev) => prev + " ```\n\n```")}
                className="p-2 text-[#c6c5d5] hover:text-[var(--primary)] transition-colors"
                title="Insertar Bloque de Código"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 md:gap-3 mr-2">
              <div className="relative theme-selector">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowThemeMenu(!showThemeMenu); }}
                  className="p-2 transition-colors rounded-full text-[#c6c5d5] hover:text-emerald-400 focus:outline-none"
                  title="Cambiar Tema Visual"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showThemeMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#1c1b1b] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="p-2 space-y-1">
                      <div className="text-xs font-semibold text-[#c6c5d5]/50 uppercase tracking-widest px-3 py-1 mb-1">
                        Temas Visuales
                      </div>
                      {[
                        { id: 'standard', name: 'Estándar (Indigo)', color: 'bg-[var(--primary)]' },
                        { id: 'urgent', name: 'Emergencia (Rose)', color: 'bg-[#f43f5e]' },
                        { id: 'calm', name: 'Calma (Emerald)', color: 'bg-[#10b981]' },
                        { id: 'amber', name: 'Alerta (Amber)', color: 'bg-[#f59e0b]' },
                        { id: 'cyan', name: 'Futurista (Cyan)', color: 'bg-[#06b6d4]' },
                        { id: 'purple', name: 'Místico (Lila)', color: 'bg-[#a855f7]' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (onSelectTheme) onSelectTheme(t.id);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center gap-3 ${
                            currentTheme === t.id 
                              ? 'bg-[#353534] text-white' 
                              : 'text-[#c6c5d5] hover:bg-[#2a2a2a] hover:text-white'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Model Selector Pill */}
              <div className="relative model-selector">
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="flex items-center gap-1.5 bg-[#353534]/50 hover:bg-[#353534] px-3.5 py-1.5 rounded-full transition-colors text-[#e5e2e1] text-xs font-semibold border border-white/5"
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showModelMenu && (
                  <div className="absolute right-0 bottom-12 w-64 bg-[#1c1b1b] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-[#353534] scrollbar-track-transparent">
                    <p className="text-[10px] font-mono text-[#c6c5d5]/60 px-3 py-1 uppercase sticky top-0 bg-[#1c1b1b] z-10">
                      Seleccionar Modelo de IA
                    </p>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-1 transition-colors ${
                          selectedModel === m.id
                            ? "bg-[#818cf8]/20 text-[#818cf8] font-bold"
                            : "text-[#e5e2e1] hover:bg-[#353534]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{m.label}</span>
                          <div className="flex items-center gap-1">
                            {m.supportsTools && <Wrench className="w-3 h-3 text-[#c6c5d5]" title="Soporta Tools" />}
                            {m.supportsVision && <Eye className="w-3 h-3 text-[#c6c5d5]" title="Soporta Visión" />}
                            {m.supportsImageGeneration && <ImageIcon className="w-3 h-3 text-[#c6c5d5]" title="Soporta Imágenes" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#c6c5d5]/60 font-mono">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mic Speech Button */}
              <button
                onClick={toggleRecording}
                className={`p-2 transition-colors rounded-full ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 animate-ping"
                    : "text-[#c6c5d5] hover:text-[#818cf8]"
                }`}
                title={isRecording ? "Escuchando..." : "Dictado por Voz"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Hands Free Mode Button */}
              <button
                onClick={() => setShowHandsFree(true)}
                className="p-2 transition-colors rounded-full text-[#c6c5d5] hover:text-emerald-400"
                title="Modo Manos Libres"
              >
                <Headphones className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isGenerating}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(129,140,248,0.4)] ml-1 ${
                  inputText.trim() && !isGenerating
                    ? "bg-[var(--primary)] text-[var(--primary-dark)] hover:brightness-110 cursor-pointer btn-particle-effect"
                    : "bg-[#353534] text-[#c6c5d5]/40 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="text-center mt-3 text-[#c6c5d5]/50 font-mono text-[10px]">
          A.R.I.A. puede cometer errores. Considera verificar la información importante.
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1b1b] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h3 className="font-bold text-base text-[#e5e2e1]">Panel de Exportación</h3>
              <button onClick={() => setShowExportModal(null)} className="text-[#c6c5d5] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#c6c5d5] mb-6">
              Selecciona el formato deseado para descargar la respuesta generada por A.R.I.A.:
            </p>

            <div className={`grid ${showExportModal.content.includes('image.pollinations.ai') ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'} gap-3`}>
              <button
                onClick={() => downloadMessage(showExportModal, "txt")}
                className="p-4 bg-[#201f1f] hover:bg-[#353534] rounded-2xl border border-white/5 text-center transition-all flex flex-col items-center gap-2"
              >
                <FileText className="w-6 h-6 text-[var(--primary)]" />
                <span className="text-xs font-semibold text-[#e5e2e1]">Texto (.txt)</span>
              </button>

              <button
                onClick={() => downloadMessage(showExportModal, "md")}
                className="p-4 bg-[#201f1f] hover:bg-[#353534] rounded-2xl border border-white/5 text-center transition-all flex flex-col items-center gap-2"
              >
                <Code className="w-6 h-6 text-[var(--primary)]" />
                <span className="text-xs font-semibold text-[#e5e2e1]">Markdown</span>
              </button>

              <button
                onClick={() => downloadMessage(showExportModal, "json")}
                className="p-4 bg-[#201f1f] hover:bg-[#353534] rounded-2xl border border-white/5 text-center transition-all flex flex-col items-center gap-2"
              >
                <Sparkles className="w-6 h-6 text-[var(--primary)]" />
                <span className="text-xs font-semibold text-[#e5e2e1]">Datos JSON</span>
              </button>

              {showExportModal.content.includes('image.pollinations.ai') && (
                <button
                  onClick={() => downloadMessage(showExportModal, "png")}
                  className="p-4 bg-[#201f1f] hover:bg-[#353534] rounded-2xl border border-white/5 text-center transition-all flex flex-col items-center gap-2"
                >
                  <ImageIcon className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-semibold text-[#e5e2e1]">Imagen (.jpg)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showHandsFree && (
        <HandsFreeMode 
          onClose={() => setShowHandsFree(false)}
          onSendMessage={(text) => onSendMessage(text, selectedModel, attachedDocContent)}
        />
      )}
    </div>
  );
};
