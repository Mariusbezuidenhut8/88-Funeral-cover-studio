/**
 * Server-only JSON file storage utilities.
 * Uses atomic writes (write to temp file, then rename) to prevent corruption.
 * Designed so function signatures match Prisma-style later when migrating to PostgreSQL.
 */
import fs from "fs/promises";
import path from "path";
import os from "os";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.cwd(), process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

function filePath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

export async function readJSON<T>(filename: string): Promise<T[]> {
  try {
    const fp = filePath(filename);
    const content = await fs.readFile(fp, "utf-8");
    return JSON.parse(content) as T[];
  } catch {
    return [];
  }
}

export async function writeJSON<T>(filename: string, data: T[]): Promise<void> {
  const fp = filePath(filename);
  const tmp = fp + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, fp);
}

export async function appendJSON<T extends { id: string }>(
  filename: string,
  item: T
): Promise<void> {
  const data = await readJSON<T>(filename);
  data.push(item);
  await writeJSON(filename, data);
}

export async function updateJSON<T extends { id: string }>(
  filename: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const data = await readJSON<T>(filename);
  const index = data.findIndex((item) => item.id === id);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  await writeJSON(filename, data);
  return data[index];
}

export async function findById<T extends { id: string }>(
  filename: string,
  id: string
): Promise<T | null> {
  const data = await readJSON<T>(filename);
  return data.find((item) => item.id === id) || null;
}

export async function deleteById<T extends { id: string }>(
  filename: string,
  id: string
): Promise<boolean> {
  const data = await readJSON<T>(filename);
  const filtered = data.filter((item) => item.id !== id);
  if (filtered.length === data.length) return false;
  await writeJSON(filename, filtered);
  return true;
}
