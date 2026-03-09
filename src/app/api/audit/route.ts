import { NextRequest, NextResponse } from "next/server";
import { getAllAuditEvents, logAuditEvent } from "@/lib/audit/audit-logger";
import { AuditAction } from "@/types/audit.types";

// TODO: Add admin auth check on GET in future

export async function GET() {
  try {
    const events = await getAllAuditEvents();
    // Sorted newest first, limit 500
    const limited = events.slice(0, 500);
    return NextResponse.json(limited);
  } catch (error) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      adviserId,
      adviserName,
      description,
      applicationId,
      clientId,
      stepNumber,
      metadata,
    } = body;

    if (!action || !adviserId || !description) {
      return NextResponse.json(
        { error: "action, adviserId, and description are required" },
        { status: 400 }
      );
    }

    // Server sets the timestamp — never trust client-provided timestamp
    await logAuditEvent({
      action: action as AuditAction,
      adviserId,
      adviserName: adviserName || adviserId,
      description,
      applicationId,
      clientId,
      stepNumber,
      metadata,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/audit error:", error);
    return NextResponse.json(
      { error: "Failed to log audit event" },
      { status: 500 }
    );
  }
}
