import { MongoClient, Db } from "mongodb";
import fs from "fs";
import path from "path";

/**
 * A.R.I.A. Workspace - MongoDB persistence layer.
 * Uses in-memory cache with write-through to MongoDB.
 * Falls back to local JSON files if MongoDB is unavailable.
 */

const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = "aria_workspace";
const DOCS_DIR = path.join(process.cwd(), "user_documents");

let client: MongoClient | null = null;
let db: Db | null = null;
const cache: Record<string, any> = {};
let mongoAvailable = false;

function ensureDocsDir() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
}

export async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    console.log("[DB] No MONGODB_URI configured, using local JSON fallback");
    return;
  }
  try {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    });
    await client.connect();
    db = client.db(DB_NAME);
    mongoAvailable = true;
    console.log("[DB] Connected to MongoDB Atlas");

    // Preload all collections into cache
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      cache[col.name] = docs.length === 1 ? docs[0].data : docs;
    }
    console.log("[DB] Cache loaded:", Object.keys(cache).join(", ") || "(empty)");
  } catch (err: any) {
    console.error("[DB] MongoDB connection failed:", err.message);
    console.log("[DB] Falling back to local JSON storage");
    mongoAvailable = false;
  }
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    mongoAvailable = false;
  }
}

// Local JSON fallback (same as original)
const DATA_DIR = path.join(process.cwd(), "data");

function ensureLocalDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fileFor(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readLocal<T>(collection: string, fallback: T): T {
  ensureLocalDirs();
  const file = fileFor(collection);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeLocal(collection: string, data: any): void {
  ensureLocalDirs();
  const file = fileFor(collection);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

export function readCollection<T>(collection: string, fallback: T): T {
  // Return from cache if available
  if (cache[collection] !== undefined) {
    return cache[collection] as T;
  }

  // If MongoDB is available, cache is empty for this collection = it doesn't exist yet
  if (mongoAvailable) {
    cache[collection] = fallback;
    return fallback;
  }

  // Fallback to local JSON
  return readLocal<T>(collection, fallback);
}

export async function writeCollectionAsync<T>(collection: string, data: T): Promise<void> {
  // Update cache
  cache[collection] = data;

  // Write to MongoDB if available
  if (mongoAvailable && db) {
    try {
      await db.collection(collection).deleteMany({});
      await db.collection(collection).insertOne({ data });
      return;
    } catch (err: any) {
      console.error(`[DB] MongoDB write error for ${collection}:`, err.message);
    }
  }

  // Fallback to local JSON
  writeLocal(collection, data);
}

export function writeCollection<T>(collection: string, data: T): void {
  // Update cache synchronously
  cache[collection] = data;

  // Write to MongoDB async (fire and forget)
  if (mongoAvailable && db) {
    db.collection(collection).deleteMany({}).then(() => {
      return db!.collection(collection).insertOne({ data });
    }).catch((err: any) => {
      console.error(`[DB] MongoDB write error for ${collection}:`, err.message);
    });
  }

  // Also write to local JSON as backup
  writeLocal(collection, data);
}

export function docsDir(): string {
  ensureDocsDir();
  return DOCS_DIR;
}
