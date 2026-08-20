import { pipeline, env } from '@xenova/transformers';

// Configurar entorno: intentar cargar desde el servidor local primero (/models/)
// Si fallan, descargará automáticamente de internet al caché del navegador.
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.allowRemoteModels = true;

let asrPipeline: any = null;
let textGenPipeline: any = null;

class PipelineFactory {
  static async getASR(onProgress: Function) {
    if (!asrPipeline) {
      asrPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: onProgress,
      });
    }
    return asrPipeline;
  }

  static async getTextGen(onProgress: Function) {
    if (!textGenPipeline) {
      textGenPipeline = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', {
        progress_callback: onProgress,
      });
    }
    return textGenPipeline;
  }
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  try {
    if (type === 'load_models') {
      await PipelineFactory.getASR((p: any) => self.postMessage({ type: 'progress', model: 'asr', data: p }));
      await PipelineFactory.getTextGen((p: any) => self.postMessage({ type: 'progress', model: 'text', data: p }));
      self.postMessage({ type: 'models_loaded' });
    } 
    else if (type === 'transcribe') {
      const { audioData } = payload; // Float32Array
      const asr = await PipelineFactory.getASR(() => {});
      const result = await asr(audioData);
      self.postMessage({ type: 'transcription_result', text: result.text });
    }
    else if (type === 'generate') {
      const { messages, systemInstruction } = payload;
      const textGen = await PipelineFactory.getTextGen(() => {});
      
      const formattedMessages = [
        { role: 'system', content: systemInstruction + "\n\n[MODO OFFLINE ACTIVO. ESTÁS CORRIENDO DE FORMA LOCAL EN EL NAVEGADOR DEL USUARIO. SÉ BREVE Y DIRECTO.]" },
        ...messages.map((m: any) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content
        }))
      ];
      
      const result = await textGen(formattedMessages, {
        max_new_tokens: 512,
        temperature: 0.7,
        do_sample: true
      });

      let generatedText = "";
      if (Array.isArray(result) && result.length > 0) {
         const gen = result[0].generated_text;
         if (typeof gen === 'string') {
            generatedText = gen;
         } else if (Array.isArray(gen)) {
            // Usually returns the full conversation history. We extract the last assistant message.
            const lastMsg = gen[gen.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
               generatedText = lastMsg.content;
            } else {
               generatedText = lastMsg.content || "";
            }
         }
      }
      
      if (!generatedText) generatedText = "Error en la generación local (V6).";
      
      self.postMessage({ type: 'generation_result', text: generatedText });
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message });
  }
});
