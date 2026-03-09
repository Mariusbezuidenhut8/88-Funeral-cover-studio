import { NextRequest, NextResponse } from "next/server";
import { getApplicationById, updateApplication } from "@/lib/db/applications";

// TODO: Add admin auth check in future

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await getApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("GET /api/applications/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getApplicationById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Prevent overwriting id or referenceNumber
    const { id: _id, referenceNumber: _ref, createdAt: _created, ...safeUpdates } = body;

    const updated = await updateApplication(id, {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/applications/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
