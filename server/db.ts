import fs from "fs";
import path from "path";

/**
 * A.R.I.A. Workspace - Local JSON persistence layer.
 * Everything stays local: data/ directory next to the server.
 * Atomic writes (tmp + rename) to avoid corruption.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DOCS_DIR = path.join(process.cwd(), "user_documents");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function fileFor(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

export function readCollection<T>(collection: string, fallback: T): T {
  ensureDirs();
  const file = fileFor(collection);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeCollection<T>(collection: string, data: T): void {
  ensureDirs();
  const file = fileFor(collection);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

export function docsDir(): string {
  ensureDirs();
  return DOCS_DIR;
}
