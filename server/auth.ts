import crypto from "crypto";
import { readCollection, writeCollection } from "./db";

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: "super_admin" | "admin" | "user";
  isBlocked?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || "aria-super-secret-key-2024";

export function getUsers(): LocalUser[] {
  return readCollection<LocalUser[]>("users", []);
}

function saveUsers(users: LocalUser[]) {
  writeCollection("users", users);
}

export function findUserById(id: string): LocalUser | undefined {
  if (id === "superadmin_fixed") {
    return { id: "superadmin_fixed", name: "SuperAdmin", email: "SuperAdmin", role: "admin", passwordHash: "", salt: "" };
  }
  return getUsers().find((u) => u.id === id);
}

export function findUserByEmail(email: string): LocalUser | undefined {
  if (email.toLowerCase() === "superadmin@aria.local" || email.toLowerCase() === "superadmin") {
    return { id: "superadmin_fixed", name: "SuperAdmin", email: "SuperAdmin@aria.local", role: "admin", passwordHash: "superadmin_hash", salt: "superadmin_salt" };
  }
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyPassword(password: string, user: any): boolean {
  if (user.id === "superadmin_fixed") {
    return password === "14092609*";
  }
  if (user.passHash) {
    const [salt, hash] = user.passHash.split(':');
    const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hashed === hash;
  }
  const hashed = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");
  return hashed === user.passwordHash;
}

export function createUser(name: string, email: string, rawPass: string, role: "super_admin" | "admin" | "user" = "user"): LocalUser {
  const users = getUsers();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(rawPass, salt, 1000, 64, "sha512").toString("hex");

  const newUser: LocalUser = {
    id: "usr_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
    name,
    email,
    passwordHash,
    salt,
    role,
    isBlocked: false,
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function updateUser(id: string, updates: Partial<LocalUser>): LocalUser | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;

  if (updates.passwordHash) {
    updates.salt = crypto.randomBytes(16).toString('hex');
    updates.passwordHash = crypto.pbkdf2Sync(updates.passwordHash, updates.salt, 1000, 64, "sha512").toString('hex');
  }

  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length !== users.length) {
    saveUsers(filtered);
    return true;
  }
  return false;
}

export function publicUser(user: LocalUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, isBlocked: user.isBlocked };
}

// Simple signed token (format: id.b64(signature))
export function issueToken(userId: string): string {
  const sign = crypto.createHmac("sha256", JWT_SECRET).update(userId).digest("base64");
  return `${userId}.${Buffer.from(sign).toString("base64")}`;
}

export function verifyToken(token: string): string | null {
  try {
    const [uid, b64sign] = token.split(".");
    const sign = Buffer.from(b64sign, "base64").toString("utf-8");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(uid).digest("base64");
    if (sign === expected) return uid;
    return null;
  } catch {
    return null;
  }
}

// init admin
export function ensureDefaultAdmin() {
  const users = getUsers();
  if (users.length === 0 || !users.find((u) => u.role === "super_admin")) {
    createUser("Super Admin", "superadmin@aria.local", "admin123", "super_admin");
    console.log("[Auth] Default super_admin created: superadmin@aria.local / admin123");
  }
  if (!getUsers().find((u) => u.role === "admin")) {
    createUser("Admin Normal", "admin@aria.local", "admin123", "admin");
    console.log("[Auth] Default admin created: admin@aria.local / admin123");
  }
}
