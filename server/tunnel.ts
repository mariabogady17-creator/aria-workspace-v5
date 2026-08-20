import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { logEvent } from "./providers";

/**
 * A.R.I.A. Workspace - Cloudflare quick tunnel manager.
 * Spawns cloudflared.exe to create a public link for sharing A.R.I.A.
 */

let proc: ChildProcess | null = null;
let publicUrl: string | null = null;
let lastError: string | null = null;
let outputTail: string[] = [];

function cloudflaredPath(): string | null {
  const candidates = [
    process.env.CLOUDFLARED_PATH || "",
    path.join(process.cwd(), "cloudflared.exe"),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return path.resolve(p);
  }
  
  // check if cloudflared is in PATH
  try {
    const out = require("child_process").execSync("where cloudflared", { stdio: "pipe" });
    if (out.toString().trim()) return "cloudflared";
  } catch {
    // not in path
  }
  return null;
}

export function tunnelStatus() {
  return {
    running: proc !== null,
    active: proc !== null && publicUrl !== null,
    url: publicUrl,
    error: lastError,
    output: outputTail.slice(-12),
    available: true, // ssh is almost always available
  };
}

export function startTunnel(port: number): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    if (proc && publicUrl) return resolve({ url: publicUrl });
    if (proc) return reject(new Error("El túnel se está iniciando..."));

    lastError = null;
    publicUrl = null;
    outputTail = [];

    const exe = cloudflaredPath();
    if (exe) {
      logEvent("INFO", `Iniciando cloudflared tunnel -> http://localhost:${port}`);
      proc = spawn(exe, ["tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const onData = (data: Buffer) => {
        const text = data.toString();
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) outputTail.push(trimmed);
          if (outputTail.length > 60) outputTail.shift();
          const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
          if (match && !publicUrl) {
            publicUrl = match[0];
            logEvent("INFO", `Enlace remoto Cloudflare creado: ${publicUrl}`);
            resolve({ url: publicUrl });
          }
        }
      };

      proc.stdout?.on("data", onData);
      proc.stderr?.on("data", onData);
      
    } else {
      // Fallback to nport
      logEvent("INFO", `cloudflared.exe no encontrado. Iniciando nport -> http://localhost:${port}`);
      proc = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "nport@latest", port.toString()], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Send '1' and newline in case nport asks for language selection
      if (proc.stdin) {
        proc.stdin.write("1\n");
      }

      const onData = (data: Buffer) => {
        const text = data.toString();
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) outputTail.push(trimmed);
          if (outputTail.length > 60) outputTail.shift();
          
          // Match common tunnel URLs that nport or others might output
          const match = text.match(/https:\/\/[a-z0-9-]+\.(trycloudflare\.com|loca\.lt|serveo\.net|ngrok-free\.app|nport\.io)/i);
          if (match && !publicUrl) {
            publicUrl = match[0];
            logEvent("INFO", `Enlace remoto creado: ${publicUrl}`);
            resolve({ url: publicUrl });
          }
        }
      };

      proc.stdout?.on("data", onData);
      proc.stderr?.on("data", onData);
    }

    proc.on("error", (err) => {
      proc = null;
      lastError = err.message;
      logEvent("ERROR", `Error en el túnel: ${err.message}`);
      reject(err);
    });

    proc.on("exit", (code) => {
      proc = null;
      const had = publicUrl;
      publicUrl = null;
      logEvent("WARN", `El proceso del túnel terminó (code ${code})${had ? ` - enlace ${had} ya no válido` : ""}`);
      if (!had) reject(new Error(`El túnel falló antes de crear el enlace (code ${code})`));
    });

    // timeout: 30s to get URL
    setTimeout(() => {
      if (!publicUrl && proc) {
        reject(new Error("Timeout esperando el enlace del túnel (30s). Revisa el log en Admin."));
      }
    }, 30_000);
  });
}

export function stopTunnel(): void {
  if (proc) {
    logEvent("INFO", "Deteniendo túnel público");
    proc.kill("SIGTERM");
    proc = null;
  }
  publicUrl = null;
}
