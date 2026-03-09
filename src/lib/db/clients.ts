import { Client } from "@/types/client.types";
import {
  readJSON,
  appendJSON,
  updateJSON,
  findById,
  deleteById,
} from "@/lib/utils/file-storage";

const FILE = "clients.json";

export async function getAllClients(): Promise<Client[]> {
  return readJSON<Client>(FILE);
}

export async function getClientById(id: string): Promise<Client | null> {
  return findById<Client>(FILE, id);
}

export async function createClient(client: Client): Promise<Client> {
  await appendJSON<Client>(FILE, client);
  return client;
}

export async function updateClient(
  id: string,
  updates: Partial<Client>
): Promise<Client | null> {
  return updateJSON<Client>(FILE, id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteClient(id: string): Promise<boolean> {
  return deleteById<Client>(FILE, id);
}
