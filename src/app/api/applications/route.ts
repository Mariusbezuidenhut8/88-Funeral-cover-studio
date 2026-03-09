import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAllApplications, createApplication, getApplicationsByClient } from "@/lib/db/applications";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { generateReference } from "@/lib/utils/dates";

// TODO: Add admin auth check on GET in future

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (clientId) {
      const applications = await getApplicationsByClient(clientId);
      return NextResponse.json(applications);
    }

    const applications = await getAllApplications();
    return NextResponse.json(applications);
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, adviserId, adviserName } = body;

    if (!clientId || !adviserId) {
      return NextResponse.json(
        { error: "clientId and adviserId are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const application = {
      id: uuidv4(),
      referenceNumber: generateReference(),
      clientId,
      adviserId,
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    };

    const created = await createApplication(application);

    await logAuditEvent({
      adviserId,
      adviserName: adviserName || adviserId,
      clientId,
      applicationId: created.id,
      action: "APPLICATION_STARTED",
      description: `New application started. Reference: ${created.referenceNumber}`,
      metadata: { referenceNumber: created.referenceNumber },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
