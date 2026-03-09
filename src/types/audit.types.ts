export type AuditAction =
  | "CLIENT_CREATED"
  | "APPLICATION_STARTED"
  | "STEP_COMPLETED"
  | "STEP_BACK"
  | "CALCULATOR_RUN"
  | "PRODUCT_SELECTED"
  | "DISCLOSURE_VIEWED"
  | "DISCLOSURE_ACCEPTED"
  | "ROA_GENERATED"
  | "SIGNATURE_CAPTURED"
  | "APPLICATION_SUBMITTED"
  | "DOCUMENT_DOWNLOADED"
  | "ADMIN_LOGIN"
  | "ADMIN_VIEWED_CLIENT"
  | "ADMIN_VIEWED_APPLICATION"
  | "PRODUCT_UPDATED";

export interface AuditEvent {
  id: string;
  timestamp: string; // Server-set ISO timestamp
  adviserId: string;
  adviserName: string;
  clientId?: string;
  applicationId?: string;
  action: AuditAction;
  stepNumber?: number;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
