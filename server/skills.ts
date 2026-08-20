import fs from "fs";
import path from "path";

/**
 * A.R.I.A. Workspace - Skills registry.
 * Scans the opencode-skills-125 directory (SKILL.md per folder),
 * and injects enabled skills into the system prompt at chat time.
 */

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
}

const EXCLUDED_DIRS = new Set([
  ".agents", ".claude", ".claude-plugin", ".cursor", ".github",
  ".pi", ".windsurf", "plugins", "scripts", "docs", "node_modules",
]);

function skillsDir(): string | null {
  const dir = process.env.ARIA_SKILLS_DIR || path.join(process.cwd(), "opencode-skills-125");
  const resolved = path.resolve(dir);
  return fs.existsSync(resolved) ? resolved : null;
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  if (!content.startsWith("---")) return {};
  const end = content.indexOf("---", 3);
  if (end === -1) return {};
  const front = content.slice(3, end);
  const meta: any = {};
  for (const line of front.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key === "name" || key === "description") meta[key] = val;
  }
  return meta;
}

export function listSkills(): SkillInfo[] {
  const dir = skillsDir();
  if (!dir) return [];
  const out: SkillInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;
    const skillFile = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;
    try {
      const meta = parseFrontmatter(fs.readFileSync(skillFile, "utf-8"));
      if (meta.name) {
        out.push({ id: entry.name, name: meta.name, description: meta.description || "" });
      }
    } catch {
      /* skip unreadable skill */
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkillBody(id: string, maxChars = 4000): string | null {
  const dir = skillsDir();
  if (!dir || /[^a-zA-Z0-9._-]/.test(id)) return null;
  const skillFile = path.join(dir, id, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;
  try {
    const content = fs.readFileSync(skillFile, "utf-8");
    const end = content.startsWith("---") ? content.indexOf("---", 3) : -1;
    const body = end > 0 ? content.slice(end + 3).trim() : content.trim();
    return body.slice(0, maxChars);
  } catch {
    return null;
  }
}

export function buildSkillsPrompt(enabledIds: string[]): string {
  const parts: string[] = [];
  for (const id of enabledIds.slice(0, 3)) {
    const body = getSkillBody(id);
    if (body) parts.push(`\n\n--- SKILL ACTIVA: ${id} ---\n${body}`);
  }
  return parts.join("");
}
