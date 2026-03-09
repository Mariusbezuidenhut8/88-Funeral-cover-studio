import { NextRequest, NextResponse } from "next/server";
import { getApplicationById, updateApplication } from "@/lib/db/applications";
import { logAuditEvent } from "@/lib/audit/audit-logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { adviserId, adviserName } = body;

    const application = await getApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status === "submitted") {
      return NextResponse.json(
        { error: "Application has already been submitted" },
        { status: 400 }
      );
    }

    // Validate required step: acceptanceData must exist (final step)
    if (!application.acceptanceData) {
      return NextResponse.json(
        {
          error:
            "Application cannot be submitted. Acceptance step (including signatures) must be completed first.",
        },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();

    const updated = await updateApplication(id, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    await logAuditEvent({
      adviserId: adviserId || application.adviserId,
      adviserName: adviserName || adviserId || application.adviserId,
      clientId: application.clientId,
      applicationId: application.id,
      action: "APPLICATION_SUBMITTED",
      description: `Application ${application.referenceNumber} submitted for review.`,
      metadata: {
        referenceNumber: application.referenceNumber,
        productName: application.productName,
        monthlyPremium: application.monthlyPremium,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/applications/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
