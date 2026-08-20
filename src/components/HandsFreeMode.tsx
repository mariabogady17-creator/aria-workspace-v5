import React, { useState, useEffect, useRef } from "react";
import { Mic, X, Loader2 } from "lucide-react";
import { ThreeNeuralCore } from "./ThreeNeuralCore";

interface HandsFreeModeProps {
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string | null>;
}

export const HandsFreeMode: React.FC<HandsFreeModeProps> = ({ onClose, onSendMessage }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("Sistemas en línea. Mantén presionada la barra espaciadora para hablar.");

  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any = null;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }
        setTranscript(currentTranscript);

        if (isFinal) {
          const finalStr = currentTranscript.trim();
          if (finalStr.length > 0) {
            recognition.stop();
            handleProcessSpeech(finalStr);
          }
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => {
          if (!isThinking) {
            try { recognition.start(); } catch(e) {}
          }
        }, 500);
      };

      mediaRecorderRef.current = recognition; // Reuse ref for cleanup
    } else {
      setTranscript("Error: SpeechRecognition no está soportado en este navegador.");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    speak(lastResponse);
    if (recognition) {
      try { recognition.start(); } catch(e) {}
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (recognition) {
        recognition.onend = null; // Prevent restart loop on unmount
        recognition.stop();
      }
      synthesisRef.current.cancel();
    };
  }, []);

  const handleProcessSpeech = async (text: string) => {
    if (isThinking) return;
    setIsThinking(true);
    const aiResponse = await onSendMessage(text);
    setIsThinking(false);

    if (aiResponse) {
      const plainText = aiResponse.replace(/[*_#`]/g, '');
      setLastResponse(plainText);
      speak(plainText);
    }
  };

  const speak = (text: string) => {
    if (synthesisRef.current.speaking) synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.pitch = 1.0;
    utterance.rate = 1.05;

    const voices = synthesisRef.current.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setTimeout(() => {
        try { if (mediaRecorderRef.current) (mediaRecorderRef.current as any).start(); } catch(e) {}
      }, 500);
    };
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Neural Core */}
      <div className="absolute inset-0 z-0 opacity-40 scale-150 flex items-center justify-center pointer-events-none">
        <ThreeNeuralCore isThinking={isThinking} isSpeaking={isSpeaking} />
      </div>

      <button onClick={onClose} className="absolute top-8 right-8 z-50 p-4 text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/10">
        <X className="w-8 h-8" />
      </button>

      {/* Cinematic Teleprompter Subtitles */}
      <div className="z-10 absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-8 text-center pointer-events-none">
        {isThinking ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Loader2 className="w-12 h-12 text-[#818cf8] animate-spin" />
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter opacity-50">
              Procesando...
            </h1>
          </div>
        ) : (
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-700">
            {lastResponse}
          </h1>
        )}
      </div>

      {/* Transcript & Push-to-Talk Indicator */}
      <div className="z-10 absolute bottom-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 w-full max-w-3xl px-6">
        <div className="text-center min-h-[4rem]">
          {transcript && (
            <p className="text-xl md:text-2xl text-emerald-300 font-light italic leading-relaxed tracking-wide drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              "{transcript}"
            </p>
          )}
        </div>
        
        <div className={`flex items-center justify-center p-6 rounded-full transition-all duration-300 ${isListening ? 'bg-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.4)] scale-110' : 'bg-white/5 border border-white/10'}`}>
          <Mic className={`w-8 h-8 ${isListening ? 'text-rose-500 animate-pulse' : 'text-white/30'}`} />
        </div>
        <p className="text-white/30 text-sm font-mono tracking-widest uppercase mt-4">
          {isListening ? 'Escuchando activamente...' : 'A.R.I.A está analizando...'}
        </p>
      </div>

    </div>
  );
};
