import { AuditEvent, AuditAction } from "@/types/audit.types";
import { appendJSON, readJSON } from "@/lib/utils/file-storage";
import { v4 as uuidv4 } from "uuid";

const FILE = "audit-trail.json";

export async function logAuditEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): Promise<void> {
  const auditEvent: AuditEvent = {
    ...event,
    id: uuidv4(),
    timestamp: new Date().toISOString(), // Server-set, not client-provided
  };
  await appendJSON<AuditEvent>(FILE, auditEvent);
}

export async function getAllAuditEvents(): Promise<AuditEvent[]> {
  const events = await readJSON<AuditEvent>(FILE);
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getAuditEventsByApplication(
  applicationId: string
): Promise<AuditEvent[]> {
  const all = await getAllAuditEvents();
  return all.filter((e) => e.applicationId === applicationId);
}
