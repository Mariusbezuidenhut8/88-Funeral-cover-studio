import { NextRequest, NextResponse } from "next/server";
import { getClientById, updateClient } from "@/lib/db/clients";

// TODO: Add admin auth check in future

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientById(id);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
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

    const existing = await getClientById(id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Prevent overwriting immutable fields
    const { id: _id, createdAt: _created, adviserId: _adviser, ...safeUpdates } = body;

    const updated = await updateClient(id, {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update client" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}
