import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAllClients, createClient } from "@/lib/db/clients";
import { logAuditEvent } from "@/lib/audit/audit-logger";

// TODO: Add admin auth check on GET in future

export async function GET() {
  try {
    const clients = await getAllClients();
    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adviserId, adviserName, ...clientFields } = body;

    if (!adviserId) {
      return NextResponse.json(
        { error: "adviserId is required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const client = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      adviserId,
      ...clientFields,
    };

    const created = await createClient(client);

    await logAuditEvent({
      adviserId,
      adviserName: adviserName || adviserId,
      clientId: created.id,
      action: "CLIENT_CREATED",
      description: `New client record created: ${created.firstName} ${created.lastName}`,
      metadata: {
        clientName: `${created.firstName} ${created.lastName}`,
        idNumber: created.idNumber
          ? `******${created.idNumber.slice(-4)}`
          : undefined,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
