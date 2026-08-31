import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import {
  createUser, findUserByEmail, findUserById, getUsers,
  issueToken, verifyToken, verifyPassword, publicUser, LocalUser,
} from "./server/auth";
import {
  chatWithFallback, listModels, getProvidersConfig, saveProvidersConfig,
  getLogs, getStats, logEvent, setToolExecutor, enforceTokenLimits
} from "./server/providers";
import { compileDocx, compileXlsx, compilePptx } from "./server/documentCompiler";
import { listSkills, buildSkillsPrompt } from "./server/skills";
import { startTunnel, stopTunnel, tunnelStatus } from "./server/tunnel";
import { readCollection, writeCollection, docsDir, connectDB } from "./server/db";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || process.env.ARIA_PORT || 3000);

app.use(express.json({ limit: "25mb" }));

// ================= security headers =================
app.use((_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://image.pollinations.ai; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

// ================= auth helpers =================

function authUser(req: express.Request): LocalUser | null {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const uid = verifyToken(token);
  return uid ? findUserById(uid) || null : null;
}

function requireAuth(req: express.Request, res: express.Response): LocalUser | null {
  const user = authUser(req);
  if (!user) res.status(401).json({ error: "No autenticado." });
  return user;
}

function requireAdmin(req: express.Request, res: express.Response): LocalUser | null {
  const user = authUser(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado." });
    return null;
  }
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Solo administradores." });
    return null;
  }
  return user;
}

// ================= auth endpoints =================

// Public user list for the animated login picker
app.get("/api/auth/users", (_req, res) => {
  res.json({ users: getUsers().map((u) => ({ id: u.id, name: u.name, email: u.email })) });
});

app.post("/api/auth/signup", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Nombre, email y contraseña son requeridos." });
  }
  if (password.length < 4) return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres." });
  if (findUserByEmail(email)) return res.status(409).json({ error: "Ya existe un usuario con ese email." });

  const user = createUser(name, email, password);
  logEvent("INFO", `Usuario creado: ${user.email} (${user.role})`);
  res.json({ token: issueToken(user.id), user: publicUser(user) });
});

app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? findUserByEmail(email) : undefined;
  if (!user || !verifyPassword(password || "", user)) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }
  if (user.isBlocked) {
    return res.status(403).json({ error: "Esta cuenta está bloqueada." });
  }
  logEvent("INFO", `Login: ${user.email}`);
  res.json({ token: issueToken(user.id), user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "No autenticado." });
  res.json({ user: publicUser(user) });
});

// Admin User Management
import { updateUser, deleteUser } from "./server/auth";

app.get("/api/admin/users", (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  let allUsers = getUsers();
  // Unconditionally hide super_admins from the management list
  allUsers = allUsers.filter((u) => u.role !== "super_admin");
  res.json({ users: allUsers.map(publicUser) });
});

app.put("/api/admin/users/:id", (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  const targetUser = findUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "Usuario no encontrado" });
  if (user.role === "admin" && targetUser.role === "super_admin") {
    return res.status(403).json({ error: "No tienes permisos para modificar a un super_admin." });
  }
  if (user.role === "admin" && req.body.role === "super_admin") {
    return res.status(403).json({ error: "No puedes asignar el rol de super_admin." });
  }
  const updated = updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ user: publicUser(updated) });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  const targetUser = findUserById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: "Usuario no encontrado" });
  if (user.role === "admin" && targetUser.role === "super_admin") {
    return res.status(403).json({ error: "No tienes permisos para eliminar a un super_admin." });
  }
  const success = deleteUser(req.params.id);
  res.json({ success });
});

// ================= calendar =================

app.get("/api/calendar", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const calendarData = readCollection<Record<string, any[]>>("calendar", {});
  const userEvents = calendarData[user.id] || [];
  res.json({ events: userEvents });
});

app.post("/api/calendar", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { title, date, type, description } = req.body;
  if (!title || !date) return res.status(400).json({ error: "Faltan datos requeridos" });
  
  const calendarData = readCollection<Record<string, any[]>>("calendar", {});
  if (!calendarData[user.id]) {
    calendarData[user.id] = [];
  }
  
  const newEvent = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    title,
    date,
    type: type || "meeting",
    description: description || ""
  };
  
  calendarData[user.id].push(newEvent);
  writeCollection("calendar", calendarData);
  res.json({ success: true, event: newEvent });
});

app.delete("/api/calendar/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const calendarData = readCollection<Record<string, any[]>>("calendar", {});
  if (!calendarData[user.id]) return res.status(404).json({ error: "Evento no encontrado" });
  
  const initialLength = calendarData[user.id].length;
  calendarData[user.id] = calendarData[user.id].filter((ev) => ev.id !== req.params.id);
  
  if (calendarData[user.id].length !== initialLength) {
    writeCollection("calendar", calendarData);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Evento no encontrado" });
  }
});

// ================= models & chat =================

app.get("/api/models", (req, res) => {
  if (!requireAuth(req, res)) return;
  res.json({ models: listModels() });
});

const OFFICE_TOOL_DECLARATION = {
  name: "create_office_document",
  description:
    "Crea un documento Office real (.docx, .xlsx o .pptx) y devuelve un enlace de descarga. Úsala SIEMPRE que el usuario pida crear un documento, informe, carta, tabla, planilla o presentación. El contenido debe ser completo y profesional, en el idioma del usuario.",
  parameters: {
    type: "object",
    properties: {
      filename: { type: "string", description: "Nombre con extensión: informe.docx, datos.xlsx, presentacion.pptx" },
      title: { type: "string", description: "Título del documento" },
      paragraphs: {
        type: "array", items: { type: "string" },
        description: "Para .docx: párrafos completos del documento. Prefija con '# ' los encabezados de sección.",
      },
      sheets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            rows: { type: "array", items: { type: "array", items: { anyOf: [{ type: "string" }, { type: "object", properties: { formula: { type: "string" } } }] } } },
          },
        },
        description: "Para .xlsx: hojas con filas (primera fila = encabezados).",
      },
      slides: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
        },
        description: "Para .pptx: diapositivas con título y bullets.",
      },
    },
    required: ["filename"],
  }
};

export const SEARCH_WEB_TOOL_DECLARATION = {
  name: "search_web",
  description: "Busca en internet en tiempo real para encontrar información actualizada, noticias, precios o datos recientes que no conoces. Úsalo siempre que el usuario pregunte por algo actual o necesites confirmar un dato de la web.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La consulta de búsqueda a realizar.",
      },
    },
    required: ["query"],
  },
};

async function duckDuckGoSearch(query: string) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Very basic regex extraction for 0-dependency scraping
    const results = [];
    const resultRegex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < 5) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();
      results.push(`[${title}](${url})\n${snippet}`);
      count++;
    }
    
    if (results.length === 0) return "No se encontraron resultados.";
    return results.join("\n\n");
  } catch (err) {
    return "Error al buscar en internet: " + (err as Error).message;
  }
}


setToolExecutor(async (name, args) => {
  if (name === "search_web") {
    logEvent("INFO", `Ejecutando búsqueda web: ${args.query}`);
    const results = await duckDuckGoSearch(args.query);
    return { result: results };
  }

  if (name !== "create_office_document") throw new Error(`Tool desconocida: ${name}`);
  const file = await createOfficeDocument(args.filename, {
    title: args.title,
    paragraphs: args.paragraphs,
    sheets: args.sheets,
    slides: args.slides,
  });
  logEvent("INFO", `Documento creado: ${file.name}`);
  return { result: `Documento creado correctamente: ${file.name}. Enlace de descarga: ${file.url}`, file };
});

app.post("/api/chat", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const { messages, selectedModel, systemInstruction, attachmentContext, imageBase64 } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    // per-user settings: enabled skills get injected into the system prompt
    const allSettings = readCollection<Record<string, any>>("settings", {});
    const userSettings = allSettings[user.id] || {};
    const skillsPrompt = buildSkillsPrompt(userSettings.enabledSkills || []);

    const sysBase =
      systemInstruction ||
      `You are A.R.I.A. (Autonomous Responsive Intelligent Assistant), a sophisticated high-performance AI workspace companion. Respond with technical elegance, structured formatting, markdown code blocks when applicable, and helpful clarity.

CRITICAL (DOCUMENTS): If the user asks you to GENERATE a file (Excel, Word, PowerPoint), you MUST NOT output Python code or say you can't. Instead, you MUST output a JSON block wrapped EXACTLY in these tags:
[ARIA_DOCUMENT]
{
  "filename": "Example.xlsx",
  "title": "Document Title",
  "paragraphs": ["For docx only"],
  "sheets": [{"name": "Sheet1", "rows": [["Header1", "Header2"], ["Val1", "Val2"]]}],
  "slides": [{"title": "Slide 1", "bullets": ["Point 1"]}]
}
[/ARIA_DOCUMENT]

CRITICAL (IMAGES): If the user asks you to GENERATE an image, you MUST return a markdown image link using the free Pollinations Image API. Format: ![Descripción detallada](https://image.pollinations.ai/prompt/descripción%20detallada%20en%20inglés?width=1024&height=1024&nologo=true). NEVER refuse to generate an image.`;

    const systemInstructionFinal = sysBase + skillsPrompt;

    const reqModelId = selectedModel || "3.6 Flash";
    const models = listModels();
    const modelConfig = models.find((m) => m.id === reqModelId) || models[0];
    const maxTokens = modelConfig.maxTokens || 1000000;

    // flatten history to {role, content}
    const flat = messages.map((m: any) => ({ role: m.role === "user" ? "user" : "model", content: m.content || m.text || "", imageBase64: m.imageBase64 || undefined }));
    const latest = flat[flat.length - 1];
    if (attachmentContext) {
      latest.content = `[Attached Context/Document]:\n${attachmentContext}\n\n[User Query]:\n${latest.content}`;
    }
    if (imageBase64) {
      latest.imageBase64 = imageBase64;
    }

    // Apply Smart Token Limit Enforcement
    const optimizedMessages = enforceTokenLimits(flat, maxTokens);

    const result = await chatWithFallback({
      requestedModel: reqModelId,
      messages: optimizedMessages,
      systemInstruction: systemInstructionFinal,
      toolDeclarations: [OFFICE_TOOL_DECLARATION, SEARCH_WEB_TOOL_DECLARATION],
    });

    // Universal Document Interceptor
    let finalMsgText = result.text;
    const finalFiles = result.files || [];
    
    const docRegex = /\[ARIA_DOCUMENT\]([\s\S]*?)\[\/ARIA_DOCUMENT\]/g;
    let match;
    while ((match = docRegex.exec(result.text)) !== null) {
      try {
        const jsonContent = JSON.parse(match[1].trim());
        const fileResult = await createOfficeDocument(jsonContent.filename || "Document.docx", jsonContent);
        finalFiles.push(fileResult);
        logEvent("INFO", `Universal Document Generated: ${fileResult.name}`);
        // Remove the raw JSON block from the chat output
        finalMsgText = finalMsgText.replace(match[0], `\n> ✨ **Documento Generado:** [${fileResult.name}](${fileResult.url})\n`);
      } catch (err) {
        logEvent("ERROR", "Failed to parse ARIA_DOCUMENT JSON: " + err);
        finalMsgText = finalMsgText.replace(match[0], `\n> ❌ **Error al generar documento:** formato inválido.\n`);
      }
    }

    res.json({
      text: finalMsgText,
      modelUsed: result.modelUsed,
      providerUsed: result.providerUsed,
      fallback: result.fallback,
      files: finalFiles.length > 0 ? finalFiles : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logEvent("ERROR", `/api/chat: ${error.message}`);
    res.status(500).json({ error: error.message || "Error inesperado en A.R.I.A." });
  }
});

// ================= conversations (per-user history) =================

app.get("/api/conversations", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any[]>>("conversations", {});
  const list = (all[user.id] || [])
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt, messageCount: c.messages?.length || 0, preview: c.messages?.[0]?.content?.slice(0, 90) || "" }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ conversations: list });
});

app.get("/api/conversations/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any[]>>("conversations", {});
  const convo = (all[user.id] || []).find((c) => c.id === req.params.id);
  if (!convo) return res.status(404).json({ error: "Conversación no encontrada." });
  res.json({ conversation: convo });
});

app.post("/api/conversations", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id, title, messages } = req.body || {};
  if (!id || !Array.isArray(messages)) return res.status(400).json({ error: "id y messages requeridos." });

  const all = readCollection<Record<string, any[]>>("conversations", {});
  const list = all[user.id] || [];
  const idx = list.findIndex((c) => c.id === id);
  const convo = { id, title: title || "Nueva conversación", messages, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = convo;
  else list.push(convo);
  all[user.id] = list.slice(-100); // keep last 100 per user
  writeCollection("conversations", all);
  res.json({ ok: true });
});

app.delete("/api/conversations/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any[]>>("conversations", {});
  all[user.id] = (all[user.id] || []).filter((c) => c.id !== req.params.id);
  writeCollection("conversations", all);
  res.json({ ok: true });
});

// ================= documents vault (per-user) =================

app.get("/api/documents", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any[]>>("documents", {});
  res.json({ documents: all[user.id] || [] });
});

app.post("/api/documents", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const doc = req.body;
  if (!doc?.id || !doc?.name) return res.status(400).json({ error: "Documento inválido." });
  const all = readCollection<Record<string, any[]>>("documents", {});
  all[user.id] = [doc, ...(all[user.id] || [])].slice(0, 200);
  writeCollection("documents", all);
  res.json({ ok: true });
});

app.delete("/api/documents/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any[]>>("documents", {});
  all[user.id] = (all[user.id] || []).filter((d) => d.id !== req.params.id);
  writeCollection("documents", all);
  res.json({ ok: true });
});

// ================= settings (per-user) =================

app.get("/api/settings", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any>>("settings", {});
  res.json({ settings: all[user.id] || {} });
});

app.post("/api/settings", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const all = readCollection<Record<string, any>>("settings", {});
  all[user.id] = { ...(all[user.id] || {}), ...req.body };
  writeCollection("settings", all);
  res.json({ ok: true });
});

// ================= skills =================

app.get("/api/skills", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ skills: listSkills() });
});

// ================= doc analysis & meeting (via fallback engine) =================

app.post("/api/analyze-doc", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const { docText, docName, action } = req.body;
    if (!docText) return res.status(400).json({ error: "Document content is required." });

    let prompt = `Analyze the following document named "${docName || "Untitled"}":\n\n${docText}\n\nProvide: 1. Executive Summary, 2. Key Actionable Insights, 3. Suggested Next Steps.`;
    if (action === "summary") prompt = `Summarize this document in 3 clear bullet points:\n\n${docText}`;
    else if (action === "code-review") prompt = `Perform a comprehensive security & performance code review for:\n\n${docText}`;

    const result = await chatWithFallback({
      requestedModel: "3.6 Flash",
      messages: [{ role: "user", content: prompt }],
      systemInstruction: "You are A.R.I.A. document intelligence.",
    });
    res.json({ analysis: result.text, docName, modelUsed: result.modelUsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to analyze document." });
  }
});

app.post("/api/meeting-summary", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: "Transcript text is required." });

    const result = await chatWithFallback({
      requestedModel: "3.6 Flash",
      messages: [{
        role: "user",
        content: `Eres un asistente de inteligencia de reuniones. Procesa la siguiente transcripción y devuelve SOLO JSON válido con: {"executiveSummary": "2 oraciones EN ESPAÑOL", "actionItems": ["responsable: tarea (EN ESPAÑOL)"], "keyTopics": ["tema (EN ESPAÑOL)"]}\n\nTranscript:\n${transcript}`,
      }],
      systemInstruction: "You are A.R.I.A. meeting intelligence. Respond only with valid JSON.",
    });

    let summary: any = {};
    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      summary = match ? JSON.parse(match[0]) : { executiveSummary: result.text };
    } catch {
      summary = { executiveSummary: result.text };
    }
    res.json({ summary, modelUsed: result.modelUsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process meeting transcript." });
  }
});

// ================= generated files download / JSON compilation =================

app.post("/api/documents/compile", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  
  try {
    const masterJson = req.body;
    if (!masterJson || !masterJson.metadata || !masterJson.metadata.type) {
       return res.status(400).json({ error: "Estructura JSON inválida o falta metadata.type" });
    }

    let buffer: Buffer;
    let ext = "";
    
    if (masterJson.metadata.type === "docx") {
      buffer = await compileDocx(masterJson);
      ext = ".docx";
    } else if (masterJson.metadata.type === "xlsx") {
      buffer = await compileXlsx(masterJson);
      ext = ".xlsx";
    } else if (masterJson.metadata.type === "pptx") {
      buffer = await compilePptx(masterJson);
      ext = ".pptx";
    } else {
      return res.status(400).json({ error: "Tipo de documento no soportado" });
    }

    const safeTitle = (masterJson.metadata.title || "documento").replace(/[^a-zA-Z0-9.\-_ áéíóúÁÉÍÓÚñÑ]/g, "").trim() || "documento";

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}${ext}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Compile Error:", error);
    res.status(500).json({ error: error.message || "Fallo en compilación nativa" });
  }
});

app.get("/api/files/:name", (req, res) => {
  const name = path.basename(req.params.name); // no traversal
  const file = path.join(docsDir(), name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Archivo no encontrado." });
  res.download(file, name.replace(/^\d+_[a-f0-9]+_/, ""));
});

// ================= admin: providers, logs, stats, tunnel =================

app.get("/api/admin/stats", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const providers = getProvidersConfig();
  res.json({
    stats: getStats(),
    providerCount: providers.openaiSlots.filter((s) => s.enabled).length + (providers.geminiKeys.length > 0 || process.env.GEMINI_API_KEY ? 1 : 0),
    userCount: getUsers().length,
    skillCount: listSkills().length,
  });
});

app.get("/api/admin/users", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const users = getUsers().map(u => ({
    id: u.id || u.email,
    name: u.name,
    email: u.email,
    role: u.role
  }));
  res.json({ users });
});

app.get("/api/admin/logs", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ logs: getLogs() });
});

app.get("/api/admin/providers", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const cfg = getProvidersConfig();
  res.json({
    providers: {
      geminiKeys: cfg.geminiKeys.map((k) => `•••${k.slice(-4)}`),
      geminiEnvKeys: process.env.GEMINI_API_KEY ? 1 : 0,
      openaiSlots: cfg.openaiSlots.map((s) => ({ ...s, apiKey: `•••${s.apiKey.slice(-4)}` })),
    },
  });
});

app.post("/api/admin/providers/gemini-key", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.body || {};
  if (!key || key.length < 10) return res.status(400).json({ error: "Key inválida." });
  const cfg = getProvidersConfig();
  cfg.geminiKeys.push(key);
  saveProvidersConfig(cfg);
  logEvent("INFO", `Gemini key agregada (•••${key.slice(-4)}) — entra a la cadena de fallback`);
  res.json({ ok: true });
});

app.delete("/api/admin/providers/gemini-key/:index", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const cfg = getProvidersConfig();
  cfg.geminiKeys.splice(Number(req.params.index), 1);
  saveProvidersConfig(cfg);
  res.json({ ok: true });
});

app.post("/api/admin/providers/openai-slot", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, baseUrl, apiKey, models } = req.body || {};
  if (!name || !baseUrl || !apiKey) return res.status(400).json({ error: "name, baseUrl y apiKey requeridos." });
  const cfg = getProvidersConfig();
  cfg.openaiSlots.push({
    name,
    baseUrl,
    apiKey,
    models: Array.isArray(models) ? models : String(models || "").split(",").map((m: string) => m.trim()).filter(Boolean),
    enabled: true,
  });
  saveProvidersConfig(cfg);
  logEvent("INFO", `Proveedor OpenAI-compatible agregado: ${name}`);
  res.json({ ok: true });
});

app.delete("/api/admin/providers/openai-slot/:name", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const cfg = getProvidersConfig();
  cfg.openaiSlots = cfg.openaiSlots.filter((s) => s.name !== req.params.name);
  saveProvidersConfig(cfg);
  res.json({ ok: true });
});

app.post("/api/admin/tunnel/start", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { url } = await startTunnel(PORT);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/tunnel/stop", (req, res) => {
  if (!requireAdmin(req, res)) return;
  stopTunnel();
  res.json({ ok: true });
});

app.get("/api/admin/tunnel/status", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(tunnelStatus());
});

// ================= health =================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ================= Productivity Apps =================

app.get("/api/notes", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const notes = readCollection<Record<string, any>>("notes", {});
  res.json({ notes: notes[user.id] || [] });
});
  
// ================= Autonomous Agents =================

let agentTasks: any[] = [];
let agentRunning = false;

app.get("/api/agents", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ tasks: agentTasks.filter(t => t.userId === user.id) });
});

app.post("/api/agents", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { goal } = req.body;
  
  const newTask = {
    id: `task_${Date.now()}`,
    userId: user.id,
    goal,
    status: "running",
    result: "",
    createdAt: new Date().toISOString()
  };
  
  agentTasks.push(newTask);
  res.json({ task: newTask });
  
  // Start loop if not running
  if (!agentRunning) runAgentLoop();
});

async function runAgentLoop() {
  agentRunning = true;
  while (agentTasks.some(t => t.status === "running")) {
    const task = agentTasks.find(t => t.status === "running");
    if (!task) break;
    
    try {
      const result = await chatWithFallback({
        requestedModel: "gemini-2.5-flash",
        messages: [{ role: "user", content: `TAREA AUTÓNOMA: ${task.goal}\n\nInstrucción: Escribe un informe detallado sobre esto. Sé exhaustivo.` }],
        systemInstruction: "Eres un agente autónomo de investigación. Realiza el informe pedido de manera completa.",
        toolDeclarations: [SEARCH_WEB_TOOL_DECLARATION]
      });
      
      task.status = "done";
      task.result = result.text;
      
      // Auto-save to user notes
      const notes = readCollection<Record<string, any>>("notes", {});
      const userNotes = notes[task.userId] || [];
      userNotes.push({
        id: `note_agent_${Date.now()}`,
        title: `Reporte: ${task.goal.slice(0, 30)}...`,
        content: result.text,
        color: "bg-indigo-500/20",
        updatedAt: new Date().toISOString()
      });
      notes[task.userId] = userNotes;
      writeCollection("notes", notes);
      
    } catch (e) {
      task.status = "error";
      task.result = "Error: " + String(e);
    }
  }
  agentRunning = false;
}

// ================= Widgets (Mini-Apps) =================

app.get("/api/widgets", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const widgets = readCollection<Record<string, any>>("widgets", {});
  res.json({ widgets: widgets[user.id] || [] });
});

app.post("/api/widgets", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id, name, html } = req.body;
  const widgets = readCollection<Record<string, any>>("widgets", {});
  const userWidgets = widgets[user.id] || [];
  
  const newWidget = { id: id || `widget_${Date.now()}`, name, html, createdAt: new Date().toISOString() };
  
  const existingIdx = userWidgets.findIndex((w: any) => w.id === newWidget.id);
  if (existingIdx >= 0) userWidgets[existingIdx] = newWidget;
  else userWidgets.push(newWidget);
  
  widgets[user.id] = userWidgets;
  writeCollection("widgets", widgets);
  res.json({ widget: newWidget });
});

app.delete("/api/widgets/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const widgets = readCollection<Record<string, any>>("widgets", {});
  if (widgets[user.id]) {
    widgets[user.id] = widgets[user.id].filter((w: any) => w.id !== req.params.id);
    writeCollection("widgets", widgets);
  }
  res.json({ success: true });
});

// ================= vite / static =================

app.post("/api/notes", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id, title, content, color } = req.body;
  const notes = readCollection<Record<string, any>>("notes", {});
  const userNotes = notes[user.id] || [];
  const newNote = { id: id || `note_${Date.now()}`, title, content, color, updatedAt: new Date().toISOString() };
  
  const existingIdx = userNotes.findIndex((n: any) => n.id === newNote.id);
  if (existingIdx >= 0) userNotes[existingIdx] = newNote;
  else userNotes.push(newNote);
  
  notes[user.id] = userNotes;
  writeCollection("notes", notes);
  res.json({ note: newNote });
});

app.delete("/api/notes/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const notes = readCollection<Record<string, any>>("notes", {});
  if (notes[user.id]) {
    notes[user.id] = notes[user.id].filter((n: any) => n.id !== req.params.id);
    writeCollection("notes", notes);
  }
  res.json({ ok: true });
});

app.get("/api/calendar", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const events = readCollection<Record<string, any>>("calendar", {});
  res.json({ events: events[user.id] || [] });
});

app.post("/api/calendar", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const { id, title, date, description, type } = req.body;
  const events = readCollection<Record<string, any>>("calendar", {});
  const userEvents = events[user.id] || [];
  const newEvent = { id: id || `ev_${Date.now()}`, title, date, description, type };
  
  const existingIdx = userEvents.findIndex((e: any) => e.id === newEvent.id);
  if (existingIdx >= 0) userEvents[existingIdx] = newEvent;
  else userEvents.push(newEvent);
  
  events[user.id] = userEvents;
  writeCollection("calendar", events);
  res.json({ event: newEvent });
});

app.delete("/api/calendar/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const events = readCollection<Record<string, any>>("calendar", {});
  if (events[user.id]) {
    events[user.id] = events[user.id].filter((e: any) => e.id !== req.params.id);
    writeCollection("calendar", events);
  }
  res.json({ ok: true });
});

// ================= vite / static =================

import { ensureDefaultAdmin } from "./server/auth";

// Interceptar peticiones a modelos locales para evitar que Vite devuelva index.html (SPA fallback)
// Si el archivo no existe, forzamos un 404 para que Transformers.js haga fallback remoto.

// Serve robots.txt and llms.txt explicitly so SPA fallback never intercepts them
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(process.cwd(), "dist", "robots.txt"));
});
app.get("/llms.txt", (_req, res) => {
  res.type("text/plain").sendFile(path.join(process.cwd(), "dist", "llms.txt"));
});

app.use("/models", express.static(path.join(process.cwd(), "public/models")));
app.get("/models/*", (_req, res) => {
  res.status(404).json({ error: "Model file not found locally" });
});

async function startServer() {
  connectDB().catch(() => {});
  ensureDefaultAdmin();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`A.R.I.A. Workspace listening on http://127.0.0.1:${PORT}`);
    logEvent("INFO", `Servidor iniciado en puerto ${PORT}`);
    
    // Automatically open browser on Windows
    try {
      const { exec } = require("child_process");
      exec(`start http://127.0.0.1:${PORT}/register`);
    } catch (e) {}
  });
}

startServer();
