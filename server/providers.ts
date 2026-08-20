import { GoogleGenAI } from "@google/genai";
import { readCollection, writeCollection } from "./db";

/**
 * A.R.I.A. Workspace - Provider registry + fallback chain.
 * Ported from ARIA Fusion's patch_provider_fallback.py:
 * when a request fails (429 / 401 / 403 / 5xx / timeout / network),
 * automatically retry with the next key slot of the same provider,
 * then fall through to the next configured provider.
 */

export interface OpenAICompatSlot {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[]; // declared model ids available on this slot
  enabled: boolean;
}

export interface ProvidersConfig {
  geminiKeys: string[]; // extra Gemini keys added from Admin panel (env keys come first)
  openaiSlots: OpenAICompatSlot[];
}

export interface ModelOption {
  id: string;
  label: string;
  desc: string;
  provider: "gemini" | "openai";
  supportsTools: boolean;
  supportsVision?: boolean;
  supportsImageGeneration?: boolean;
  maxTokens: number;
}

export interface ChatAttempt {
  provider: string;
  slot: string;
  model: string;
  ok: boolean;
  error?: string;
}

export interface ChatResult {
  text: string;
  modelUsed: string;
  providerUsed: string;
  fallback: boolean;
  attempts: ChatAttempt[];
  files?: { name: string; url: string }[];
}

// ---------- config ----------

const DEFAULT_PROVIDERS: ProvidersConfig = { 
  geminiKeys: [], 
  openaiSlots: [
    {
      name: "CEREBRAS",
      baseUrl: "https://api.cerebras.ai/v1",
      apiKey: "csk-8dwwwfxd336m9t9tpr4wf52vtj322xnr9tnpm4hrr6j4dytt",
      models: ["gemma-4-31b", "gpt-oss-120b", "zai-glm-4.7"],
      enabled: true
    },
    {
      name: "DEEPSEEK",
      baseUrl: "https://api.deepseek.com",
      apiKey: "sk-f73d4fdc8ca048ab8f78564e694fce43",
      models: ["deepseek-chat", "deepseek-v4-flash"],
      enabled: true
    },
    {
      name: "NVIDIA NIM",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      apiKey: "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",
      models: ["meta/llama-3.1-8b-instruct"],
      enabled: true
    },

    {
      name: "9ROUTER",
      baseUrl: "http://localhost:20128/v1",
      apiKey: "sk-1cae4ee2aa7073b4-nrv3o1-887d7816",
      models: ["kiro-ai"],
      enabled: true
    },
    {
      name: "OPENROUTER (FREE)",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "sk-or-v1-bc9653ee185b0a0da3e44d29054a2a23491f54253bd19501858807d9b7f5256e492211475fc9ec059d04",
      models: ["google/gemini-2.0-pro-exp-0205:free", "meta-llama/llama-3.3-70b-instruct:free"],
      enabled: true
    },
    {
      name: "GITHUB MODELS",
      baseUrl: "https://models.inference.ai.azure.com",
      apiKey: "YOUR_GITHUB_TOKEN", // El usuario debe poner su token de Github
      models: ["gpt-4o-mini", "Phi-3-mini-4k-instruct"],
      enabled: true
    },
    {
      name: "POLLINATIONS",
      baseUrl: "https://text.pollinations.ai/openai",
      apiKey: "free",
      models: ["pollinations-fallback"],
      enabled: true
    }
  ] 
};

export function getProvidersConfig(): ProvidersConfig {
  const cfg = readCollection<{ providers?: ProvidersConfig }>("config", {});
  return { ...DEFAULT_PROVIDERS, ...(cfg.providers || {}) };
}

export function saveProvidersConfig(providers: ProvidersConfig): void {
  const cfg = readCollection<Record<string, any>>("config", {});
  writeCollection("config", { ...cfg, providers });
}

function envGeminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    keys.push(process.env.GEMINI_API_KEY);
  }
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

export function allGeminiKeys(): string[] {
  return [...envGeminiKeys(), ...getProvidersConfig().geminiKeys].filter(Boolean);
}

// ---------- model catalog ----------

const GEMINI_MODEL_MAP: Record<string, string> = {
  "3.6 Flash": "gemini-1.5-flash", 
  "3.1 Pro": "gemini-1.5-pro",
  "Flash 2.5": "gemini-1.5-flash-8b",
  "Gemini 2.0 Pro": "gemini-2.0-pro-exp-0205",
  "Gemini 2.0 Flash": "gemini-2.0-flash",
  "Gemini 1.5 Pro": "gemini-1.5-pro",
  "Gemini 1.5 Flash": "gemini-1.5-flash"
};

const offlineModels = new Set<string>();

export function markModelOffline(modelId: string) {
  offlineModels.add(modelId);
  logEvent("WARN", `Modelo deshabilitado dinámicamente por fallos: ${modelId}`);
}

export function listModels(): ModelOption[] {
  let models: ModelOption[] = [
    { id: "Gemini 2.0 Pro", label: "Gemini 2.0 Pro", desc: "El más potente y avanzado (Experimental)", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 2000000 },
    { id: "Gemini 2.0 Flash", label: "Gemini 2.0 Flash", desc: "Rápido y de última generación", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 1000000 },
    { id: "Gemini 1.5 Pro", label: "Gemini 1.5 Pro", desc: "Razonamiento complejo", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 2000000 },
    { id: "Gemini 1.5 Flash", label: "Gemini 1.5 Flash", desc: "Rápido y ligero", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 1000000 },
    { id: "3.6 Flash", label: "3.6 Flash (Legacy)", desc: "Alias para Flash", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 1000000 },
    { id: "3.1 Pro", label: "3.1 Pro (Legacy)", desc: "Alias para Pro", provider: "gemini", supportsTools: true, supportsVision: true, supportsImageGeneration: true, maxTokens: 2000000 },
  ];
  for (const slot of getProvidersConfig().openaiSlots) {
    if (!slot.enabled) continue;
    for (const m of slot.models) {
      models.push({
        id: `oc:${slot.name}:${m}`,
        label: m,
        desc: `${slot.name} (Universal Tools)`,
        provider: "openai",
        supportsTools: true, // Universal fallback tool via JSON tag supported
        supportsVision: m.toLowerCase().includes("vision") || m.includes("4o"),
        supportsImageGeneration: true, // Universal markdown image prompt supported everywhere
        maxTokens: 128000,
      });
    }
  }
  
  // Filtrar los que fallaron
  models = models.filter((m) => !offlineModels.has(m.id));

  // Ordenar: supportsTools primero
  models.sort((a, b) => (a.supportsTools === b.supportsTools ? 0 : a.supportsTools ? -1 : 1));

  return models;
}

// ---------- logging ----------

export interface LogEntry {
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "FALLBACK";
  msg: string;
}

const logs: LogEntry[] = [];

export function logEvent(level: LogEntry["level"], msg: string): void {
  logs.push({ ts: new Date().toISOString(), level, msg });
  if (logs.length > 300) logs.shift();
  if (level !== "INFO") console.log(`[${level}] ${msg}`);
}

export function getLogs(): LogEntry[] {
  return [...logs].reverse();
}

// ---------- stats ----------

const stats = { startedAt: new Date().toISOString(), requests: 0, fallbacks: 0, failures: 0 };

export function getStats() {
  return { ...stats, uptimeSec: Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000) };
}

// ---------- Gemini call ----------

function geminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

async function callGemini(
  apiKey: string,
  geminiModel: string,
  contents: any[],
  systemInstruction: string,
  tools?: any[]
): Promise<{ text: string; functionCalls?: any[]; raw: any }> {
  const ai = geminiClient(apiKey);
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      ...(tools && tools.length > 0 ? { tools } : {}),
    },
  });
  const calls = (response as any).functionCalls as any[] | undefined;
  return { text: response.text || "", functionCalls: calls && calls.length ? calls : undefined, raw: response };
}

// ---------- OpenAI-compatible call ----------

async function callOpenAICompat(
  slot: OpenAICompatSlot,
  model: string,
  messages: { role: string; content: string }[],
  systemInstruction: string
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${slot.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${slot.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction }, 
          ...messages.map(m => ({ role: m.role === "model" ? "assistant" : m.role, content: m.content }))
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${body.slice(0, 200)}`) as any;
      err.status = res.status;
      throw err;
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(err: any): boolean {
  // Tesla Rule: ALWAYS let the fallback chain continue.
  // 400 = bad request (role mismatch between providers), 401 = bad key,
  // 402 = insufficient balance, 403 = forbidden, 429 = rate limit, 5xx = server error
  const status = err?.status || err?.httpStatusCode;
  if (status && (status === 400 || status === 401 || status === 402 || status === 403 || status === 429 || status >= 500)) return true;
  const msg = String(err?.message || err || "");
  return /timeout|timed out|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|abort|quota|rate.?limit|RESOURCE_EXHAUSTED|Insufficient|balance/i.test(msg);
}

// ---------- circuit breaker ----------

enum CircuitState { CLOSED, OPEN, HALF_OPEN }

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailure = 0;
  private successAfterHalfOpen = 0;
  private readonly failureThreshold = 3;
  private readonly recoveryTime = 60_000;

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) return true;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailure >= this.recoveryTime) {
        this.state = CircuitState.HALF_OPEN;
        logEvent("INFO", "Circuit Breaker: OPEN → HALF_OPEN (probando provider)");
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successAfterHalfOpen++;
      if (this.successAfterHalfOpen >= 2) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successAfterHalfOpen = 0;
        logEvent("INFO", "Circuit Breaker: HALF_OPEN → CLOSED (provider restaurado)");
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    this.successAfterHalfOpen = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logEvent("WARN", "Circuit Breaker: HALF_OPEN → OPEN (provider sigue fallando)");
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      logEvent("WARN", `Circuit Breaker: CLOSED → OPEN (${this.failures} fallos consecutivos, pausa ${this.recoveryTime / 1000}s)`);
    }
  }

  getState(): string {
    return CircuitState[this.state];
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(slotKey: string): CircuitBreaker {
  if (!circuitBreakers.has(slotKey)) {
    circuitBreakers.set(slotKey, new CircuitBreaker());
  }
  return circuitBreakers.get(slotKey)!;
}

// ---------- tool execution hook (set by server.ts) ----------

export type ToolExecutor = (name: string, args: any) => Promise<{ result: any; file?: { name: string; url: string } }>;
let toolExecutor: ToolExecutor | null = null;
export function setToolExecutor(exec: ToolExecutor) {
  toolExecutor = exec;
}

// ---------- smart token manager ----------

export function enforceTokenLimits(messages: { role: string; content: string }[], maxTokens: number): { role: string; content: string }[] {
  // Aprox. 4 chars = 1 token. Leave room for system prompt and tool declarations.
  const charLimit = Math.max(maxTokens * 4 - 4000, 8000); 
  let currentChars = 0;
  const result: { role: string; content: string }[] = [];
  
  // Iterate backwards to keep the newest context intact
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (currentChars + msg.content.length <= charLimit) {
      result.unshift(msg);
      currentChars += msg.content.length;
    } else {
      const remaining = charLimit - currentChars;
      if (remaining > 2000) {
        // Truncate from the beginning of this message (older context)
        const truncatedContent = "[...texto anterior omitido por límite de tokens...]\n" + msg.content.slice(-(remaining - 200));
        result.unshift({ ...msg, content: truncatedContent });
        currentChars += truncatedContent.length;
      }
      break; 
    }
  }
  
  if (result.length === 0 && messages.length > 0) {
    // Failsafe: if a single message is gigantic, take its tail.
    const lastMsg = messages[messages.length - 1];
    result.push({ ...lastMsg, content: lastMsg.content.slice(-charLimit) });
  }
  
  return result;
}

// ---------- main: chat with fallback chain ----------

export async function chatWithFallback(opts: {
  requestedModel: string;
  messages: { role: string; content: string; imageBase64?: string }[];
  systemInstruction: string;
  toolDeclarations?: any[];
}): Promise<ChatResult> {
  const { requestedModel, messages, systemInstruction, toolDeclarations } = opts;
  stats.requests++;
  const attempts: ChatAttempt[] = [];
  const files: { name: string; url: string }[] = [];

  const geminiModel = GEMINI_MODEL_MAP[requestedModel];
  const isOpenAIModel = requestedModel.startsWith("oc:");

  // Build the ordered fallback chain of slots
  type Slot =
    | { kind: "gemini"; key: string; label: string; model: string }
    | { kind: "openai"; slot: OpenAICompatSlot; label: string; model: string };

  const chain: Slot[] = [];

  if (isOpenAIModel) {
    const [, slotName, model] = requestedModel.split(":");
    for (const s of getProvidersConfig().openaiSlots) {
      if (s.enabled && s.name === slotName) chain.push({ kind: "openai", slot: s, label: s.name, model });
    }
    // fallback: other enabled slots with any model
    for (const s of getProvidersConfig().openaiSlots) {
      if (s.enabled && s.name !== slotName && s.models.length > 0)
        chain.push({ kind: "openai", slot: s, label: s.name, model: s.models[0] });
    }
  } else {
    const gModel = geminiModel || "gemini-3.6-flash";
    allGeminiKeys().forEach((key, i) =>
      chain.push({ kind: "gemini", key, label: `gemini-key-${i + 1}`, model: gModel })
    );
    // after Gemini keys exhausted -> openai-compatible slots as backup
    for (const s of getProvidersConfig().openaiSlots) {
      if (s.enabled && s.models.length > 0) chain.push({ kind: "openai", slot: s, label: s.name, model: s.models[0] });
    }
  }

  // ===== OFFLINE LOCAL AI FALLBACK =====
  // Si todo falla (ej. sin internet), intentamos usar Ollama localmente.
  chain.push({
    kind: "openai",
    slot: { 
      name: "Ollama Local (Offline)", 
      baseUrl: "http://127.0.0.1:11434/v1", 
      apiKey: "ollama", 
      models: ["llama3.2:latest", "llama3.1", "qwen2.5"], 
      enabled: true 
    },
    label: "Ollama Local (Offline)",
    model: "llama3.2:latest" // Default fast model
  });

  if (chain.length === 0) {
    stats.failures++;
    throw new Error("No hay proveedores configurados. Agrega una GEMINI_API_KEY en .env o un proveedor en Admin.");
  }

  let lastError: any = null;

  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const usedFallback = i > 0;
    const slotKey = slot.kind === "gemini" ? `gemini:${slot.key.slice(-8)}` : `openai:${slot.slot.name}`;
    const breaker = getCircuitBreaker(slotKey);

    if (!breaker.canExecute()) {
      logEvent("INFO", `Circuit Breaker OPEN: saltando ${slot.label} (reintentará en ~60s)`);
      continue;
    }

    try {
      if (usedFallback) {
        stats.fallbacks++;
        logEvent("FALLBACK", `Reintentando con ${slot.label} (${slot.model}) tras fallo del proveedor anterior`);
      }

      if (slot.kind === "gemini") {
        // Gemini with function-calling loop
        // Gemini SDK uses 'user' and 'model' roles (NOT 'assistant'!)
        // The 'assistant' error was coming from OpenAI-compatible providers, not Gemini.
        const contents: any[] = messages.map((m) => {
          const parts: any[] = [{ text: m.content }];
          if (m.imageBase64) {
            const mimeType = m.imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
            const base64Data = m.imageBase64.split(',')[1];
            if (base64Data) parts.push({ inlineData: { data: base64Data, mimeType } });
          }
          return { role: m.role === "user" ? "user" : "model", parts };
        });

        const tools = toolDeclarations?.length ? [{ functionDeclarations: toolDeclarations }] : undefined;
        let result = await callGemini(slot.key, slot.model, contents, systemInstruction, tools);

        // tool loop (max 4 hops)
        let hops = 0;
        while (result.functionCalls && result.functionCalls.length > 0 && hops < 4 && toolExecutor) {
          hops++;
          const call = result.functionCalls[0];
          logEvent("INFO", `Tool call: ${call.name} (${slot.label})`);
          const execResult = await toolExecutor(call.name, call.args || {});
          if (execResult.file) files.push(execResult.file);
          contents.push({ role: "model", parts: [{ functionCall: { name: call.name, args: call.args } }] });
          contents.push({
            role: "function",
            parts: [{ functionResponse: { name: call.name, response: { result: execResult.result } } }],
          });
          result = await callGemini(slot.key, slot.model, contents, systemInstruction, tools);
        }

        attempts.push({ provider: "gemini", slot: slot.label, model: slot.model, ok: true });
        logEvent("INFO", `Chat OK via ${slot.label} model=${slot.model}${usedFallback ? " (fallback)" : ""}`);
        breaker.recordSuccess();
        return {
          text: result.text || "Sin respuesta del modelo.",
          modelUsed: slot.model,
          providerUsed: slot.label,
          fallback: usedFallback,
          attempts,
          files: files.length ? files : undefined,
        };
      } else {
        // OpenAI-compatible fallback
        const openAIMessages = messages.map(m => {
          if (m.imageBase64) {
            return {
              role: m.role === "user" ? "user" : "assistant",
              content: [
                { type: "text", text: m.content },
                { type: "image_url", image_url: { url: m.imageBase64 } }
              ]
            }
          }
          return { role: m.role === "user" ? "user" : "assistant", content: m.content };
        });
        const resText = await callOpenAICompat(slot.slot, slot.model, openAIMessages as any, systemInstruction);
        attempts.push({ provider: "openai", slot: slot.label, model: slot.model, ok: true });
        logEvent("INFO", `Chat OK via ${slot.label} model=${slot.model}${usedFallback ? " (fallback)" : ""}`);
        breaker.recordSuccess();
        return {
          text: resText || "Sin respuesta del modelo.",
          modelUsed: slot.model,
          providerUsed: slot.label,
          fallback: usedFallback,
          attempts,
        };
      }
    } catch (err: any) {
      lastError = err;
      attempts.push({ provider: slot.kind, slot: slot.label, model: slot.model, ok: false, error: String(err?.message || err).slice(0, 200) });
      logEvent("WARN", `Fallo en ${slot.label}: ${String(err?.message || err).slice(0, 200)}`);
      breaker.recordFailure();
      // Tesla Rule: NEVER break the chain. Always try the next provider.
      // Even "fatal" errors on one provider don't mean the next one will fail.
      continue;
    }
  }

  // Si fallan TODOS en la cadena, marcamos el modelo solicitado original como offline para depurar la lista
  if (stats.failures > 0) {
    markModelOffline(requestedModel);
  }

  stats.failures++;
  throw new Error(
    `Todos los proveedores fallaron. Último error: ${String(lastError?.message || lastError).slice(0, 300)}`
  );
}
