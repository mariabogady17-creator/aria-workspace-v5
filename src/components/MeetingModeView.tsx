import React, { useState } from "react";
import { Mic, MicOff, Sparkles, User, CheckCircle2, FileText, Play, Square, Trash2 } from "lucide-react";
import { MeetingTranscript } from "../types";

export const MeetingModeView: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([
    { id: "1", speaker: "Alex (Producto)", time: "10:02 AM", text: "Bienvenidos. Hoy revisaremos el roadmap de productos Q4 y la integración de inteligencia de A.R.I.A." },
    { id: "2", speaker: "Sarah (Ingeniería)", time: "10:03 AM", text: "Completamos la migración del servidor full-stack Express con soporte para Gemini 3.6 Flash y Pro preview." },
    { id: "3", speaker: "David (Diseño)", time: "10:04 AM", text: "Los componentes UI Neumorphic 2.0, el canvas WebGL y el core neuronal 3D están totalmente integrados." },
  ]);

  const [simulatedSpeaker, setSimulatedSpeaker] = useState("Alex");
  const [simulatedInput, setSimulatedInput] = useState("");
  const [meetingSummary, setMeetingSummary] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleAddSnippet = () => {
    if (!simulatedInput.trim()) return;

    const newSnippet: MeetingTranscript = {
      id: "t_" + Date.now(),
      speaker: simulatedSpeaker,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: simulatedInput,
    };

    setTranscripts((prev) => [...prev, newSnippet]);
    setSimulatedInput("");
  };

  const toggleRecording = () => {
    if (isLive) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      setIsLive(false);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      setIsLive(true);
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      let audioChunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
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
              const text = e.data.text.trim();
              if (text) {
                setTranscripts(prev => [
                  ...prev,
                  {
                    id: "t_" + Date.now(),
                    speaker: "Voz Identificada",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    text,
                  }
                ]);
              }
            }
          };
          worker.addEventListener('message', handler);
          worker.postMessage({ type: 'transcribe', payload: { audioData: offlineAudio }});
        }
      };

      recorder.start();

      // Transcribe in chunks for continuous meeting transcription
      const interval = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          recorder.start();
        } else {
          clearInterval(interval);
        }
      }, 10000); // chunk every 10 seconds

    }).catch(err => {
      alert("No se pudo acceder al micrófono.");
      console.error(err);
    });
  };

  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    const fullTranscriptText = transcripts.map((t) => `${t.speaker} (${t.time}): ${t.text}`).join("\n");

    try {
      const token = localStorage.getItem('token');
      const res = await fetch("/api/meeting-summary", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ transcript: fullTranscriptText }),
      });

      const data = await res.json();
      setMeetingSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearTranscript = () => {
    setTranscripts([]);
    setMeetingSummary(null);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 pb-20 relative">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <h2 className="font-bold text-3xl md:text-4xl text-[#818cf8]">A.R.I.A. Inteligencia de Reuniones</h2>
            </div>
            <p className="text-sm text-[#c6c5d5] mt-1">Identificación de hablante en tiempo real, registro de transcripción en vivo y generación automática de resumen ejecutivo.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs transition-all ${
                isLive
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-[#818cf8] text-[#101b8a] hover:brightness-110"
              }`}
            >
              {isLive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isLive ? "Finalizar Sesión" : "Iniciar Grabación en Vivo"}</span>
            </button>

            <button
              onClick={handleGenerateSummary}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-[#353534] text-[#e5e2e1] hover:bg-[#818cf8] hover:text-[#101b8a] px-6 py-2.5 rounded-full font-bold text-xs border border-white/10 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generar Resumen</span>
            </button>

            {meetingSummary && (
              <button
                onClick={async () => {
                  try {
                    const docText = `Transcript:\n${transcripts.map((t) => `${t.speaker} (${t.time}): ${t.text}`).join("\n")}\n\nSummary:\n${JSON.stringify(meetingSummary, null, 2)}`;
                    await fetch('/api/documents', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        id: `mtg_${Date.now()}`,
                        name: `Meeting Notes ${new Date().toLocaleDateString()}`,
                        type: 'text',
                        date: new Date().toISOString(),
                        size: `${(docText.length / 1024).toFixed(1)} KB`,
                        content: docText,
                        category: 'Meeting',
                      })
                    });
                    alert('Guardado exitosamente en Library Vault.');
                  } catch (e) {
                    alert('Error al guardar.');
                  }
                }}
                className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-6 py-2.5 rounded-full font-bold text-xs border border-emerald-500/40 transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Guardar en la Bóveda</span>
              </button>
            )}
            {transcripts.length > 0 && (
              <button
                onClick={handleClearTranscript}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-6 py-2.5 rounded-full font-bold text-xs border border-red-500/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Waves graphic */}
        <div className="p-6 bg-[#1c1b1b] rounded-3xl border border-white/5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#818cf8]/20 text-[#818cf8] flex items-center justify-center">
              <Mic className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#e5e2e1]">Estado del Audio: {isLive ? "ESCUCHA ACTIVA" : "EN ESPERA"}</p>
              <p className="text-[11px] text-[#c6c5d5]/60 font-mono">Tasa de muestreo: 24kHz • Canal: Mono 16-bit PCM</p>
            </div>
          </div>

          <div className="flex items-center gap-1 h-8">
            {[40, 70, 30, 90, 60, 100, 50, 80, 30, 60].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${isLive ? "bg-[#818cf8]" : "bg-[#353534]"}`}
                style={{ height: isLive ? `${h}%` : "20%" }}
              />
            ))}
          </div>
        </div>

        {/* Layout Split: Live Transcript vs AI Executive Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transcript Column */}
          <div className="bg-[#1c1b1b] rounded-3xl p-6 border border-white/5 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <span className="font-bold text-sm text-[#e5e2e1] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#818cf8]" />
                Transcripción en Vivo
              </span>
              <span className="text-xs font-mono text-[#c6c5d5]">{transcripts.length} entradas</span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
              {transcripts.map((t) => (
                <div key={t.id} className="p-3 bg-[#201f1f] rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#818cf8]">{t.speaker}</span>
                    <span className="text-[10px] font-mono text-[#c6c5d5]/50">{t.time}</span>
                  </div>
                  <p className="text-xs text-[#e5e2e1] leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>

            {/* Simulated Live Input Bar */}
            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={simulatedSpeaker}
                onChange={(e) => setSimulatedSpeaker(e.target.value)}
                placeholder="Hablante"
                className="w-24 bg-[#201f1f] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl border border-white/10"
              />
              <input
                type="text"
                value={simulatedInput}
                onChange={(e) => setSimulatedInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSnippet()}
                placeholder="Escribe una frase..."
                className="flex-1 bg-[#201f1f] text-xs text-[#e5e2e1] px-3 py-2 rounded-xl border border-white/10"
              />
              <button
                onClick={handleAddSnippet}
                className="bg-[#818cf8] text-[#101b8a] text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* AI Executive Summary Column */}
          <div className="bg-[#1c1b1b] rounded-3xl p-6 border border-white/5 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <span className="font-bold text-sm text-[#e5e2e1] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#818cf8]" />
                Resumen Automático y Tareas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-[#818cf8] gap-3">
                  <Sparkles className="w-6 h-6 animate-spin" />
                  <span>Sintetizando conclusiones de la reunión con Gemini...</span>
                </div>
              ) : meetingSummary ? (
                <div className="flex flex-col gap-6 text-xs text-[#e5e2e1]">
                  <div>
                    <h4 className="font-bold text-[#818cf8] mb-2 uppercase font-mono">Resumen Ejecutivo</h4>
                    <p className="bg-[#201f1f] p-4 rounded-2xl border border-white/5 leading-relaxed">
                      {meetingSummary.executiveSummary || "No hay resumen disponible."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#818cf8] mb-2 uppercase font-mono">Plan de Acción</h4>
                    <div className="flex flex-col gap-2">
                      {meetingSummary.actionItems?.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 bg-[#201f1f] p-3 rounded-xl border border-white/5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#818cf8] mb-2 uppercase font-mono">Temas Clave</h4>
                    <div className="flex flex-wrap gap-2">
                      {meetingSummary.keyTopics?.map((topic: string, idx: number) => (
                        <span key={idx} className="bg-[#818cf8]/20 text-[#818cf8] px-3 py-1 rounded-full text-[11px] font-mono border border-[#818cf8]/30">
                          #{topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#c6c5d5]/50 text-center px-6">
                  <Sparkles className="w-8 h-8 mb-3 text-[#353534]" />
                  <p>Haz clic en "Generar Resumen" para extraer ideas, tareas y etiquetas de los temas de la transcripción en vivo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
