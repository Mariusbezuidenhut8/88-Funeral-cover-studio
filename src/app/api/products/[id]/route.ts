import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct } from "@/lib/db/products";
import { logAuditEvent } from "@/lib/audit/audit-logger";

// TODO: Add admin auth check in future

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
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
    const { adviserId, adviserName, ...updates } = body;

    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Prevent overwriting the product id
    const { id: _id, ...safeUpdates } = updates;

    const updated = await updateProduct(id, safeUpdates);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }

    // Log the product update event
    await logAuditEvent({
      adviserId: adviserId || "admin",
      adviserName: adviserName || "Admin",
      action: "PRODUCT_UPDATED",
      description: `Product "${existing.name}" updated.`,
      metadata: { productId: id, changes: safeUpdates },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
