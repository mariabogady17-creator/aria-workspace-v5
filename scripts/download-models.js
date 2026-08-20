import { pipeline, env } from '@xenova/transformers';
import path from 'path';

// Override the cache directory to point to our public/models folder
env.cacheDir = path.resolve('./public/models');
env.localModelPath = path.resolve('./public/models');

console.log("=========================================");
console.log("🚀 Iniciando descarga de IA Offline...");
console.log("Guardando en:", env.cacheDir);
console.log("Esto puede tardar varios minutos dependiendo de tu internet.");
console.log("=========================================\n");

async function download() {
  console.log("⏳ [1/2] Descargando modelo de voz (Whisper Tiny)...");
  await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  console.log("✅ Whisper Tiny descargado.\n");
  
  console.log("⏳ [2/2] Descargando modelo de lenguaje (Qwen 1.5 0.5B)...");
  await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat');
  console.log("✅ Qwen 1.5 0.5B descargado.\n");
  
  console.log("🎉 ¡Descarga completada! Las IAs ya son portables.");
}

download().catch(err => {
    console.error("❌ Error descargando modelos:", err);
});
