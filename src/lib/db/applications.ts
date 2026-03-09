import { Application } from "@/types/application.types";
import {
  readJSON,
  appendJSON,
  updateJSON,
  findById,
} from "@/lib/utils/file-storage";

const FILE = "applications.json";

export async function getAllApplications(): Promise<Application[]> {
  return readJSON<Application>(FILE);
}

export async function getApplicationById(
  id: string
): Promise<Application | null> {
  return findById<Application>(FILE, id);
}

export async function getApplicationsByClient(
  clientId: string
): Promise<Application[]> {
  const all = await getAllApplications();
  return all.filter((a) => a.clientId === clientId);
}

export async function createApplication(
  app: Application
): Promise<Application> {
  await appendJSON<Application>(FILE, app);
  return app;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<Application | null> {
  return updateJSON<Application>(FILE, id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}
