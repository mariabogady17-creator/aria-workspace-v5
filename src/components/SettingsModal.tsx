import React, { useState, useEffect } from "react";
import { Settings, Sparkles, Check, Key, X, Sliders, ShieldCheck, Database } from "lucide-react";

interface SettingsModalProps {
  systemInstruction: string;
  setSystemInstruction: (val: string) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  onClose: () => void;
  onPreloadModels: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  systemInstruction,
  setSystemInstruction,
  selectedModel,
  setSelectedModel,
  onClose,
  onPreloadModels,
}) => {
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<{id: string, label: string, desc: string, provider: string}[]>([]);

  useEffect(() => {
    fetch('/api/models', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setModels(data.models);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen flex flex-col pt-24 px-6 pb-20 relative">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-bold text-3xl text-[#818cf8]">Preferencias de A.R.I.A.</h2>
            <p className="text-sm text-[#c6c5d5] mt-1">Configura el comportamiento de la IA, directivas y parámetros.</p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Default Model */}
          <div className="bg-[#1c1b1b] p-6 rounded-3xl border border-white/5">
            <h3 className="font-bold text-base text-[#e5e2e1] mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#818cf8]" />
              Modelo de Inteligencia Predeterminado
            </h3>
            <p className="text-xs text-[#c6c5d5] mb-4">Elige el modelo principal para los nuevos chats:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedModel === m.id
                      ? "bg-[#818cf8]/20 border-[#818cf8] text-[#e5e2e1]"
                      : "bg-[#201f1f] border-white/5 text-[#c6c5d5] hover:bg-[#353534]"
                  }`}
                >
                  <p className="font-semibold text-sm text-[#e5e2e1]">{m.label || (m as any).name}</p>
                  <p className="text-[11px] text-[#c6c5d5]/60 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* System Instructions */}
          <div className="bg-[#1c1b1b] p-6 rounded-3xl border border-white/5">
            <h3 className="font-bold text-base text-[#e5e2e1] mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#818cf8]" />
              Directiva Global / Personalidad
            </h3>
            <p className="text-xs text-[#c6c5d5] mb-4">
              Personaliza cómo A.R.I.A. formatea sus respuestas, su profundidad técnica y su tono.
            </p>

            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={4}
              className="w-full bg-[#201f1f] border border-white/10 rounded-2xl p-4 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#818cf8]"
            />
          </div>

          {/* Key & Security Info */}
          <div className="bg-[#1c1b1b] p-6 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e5e2e1]">Proxy de API Key Activo</p>
                <p className="text-xs text-[#c6c5d5]/60">Las credenciales se administran de forma segura desde el backend.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              CONFIGURADO
            </span>
          </div>

          {/* Local AI Models Preload */}
          <div className="bg-[#1c1b1b] p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-base text-[#e5e2e1] mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#818cf8]" />
                Precargar IA Local en Navegador (Modo Offline)
              </h3>
              <p className="text-xs text-[#c6c5d5]">
                Si tienes conexión a internet, puedes precargar los modelos de IA localmente en el caché de tu navegador. Esto evitará que dependas de los archivos locales del servidor y permitirá el funcionamiento sin conexión.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onPreloadModels}
                className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-500/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Descargar e Iniciar Modelos Locales
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="bg-[#818cf8] text-[#101b8a] font-bold px-8 py-3.5 rounded-full shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              {saved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{saved ? "¡Guardado!" : "Guardar Preferencias"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
