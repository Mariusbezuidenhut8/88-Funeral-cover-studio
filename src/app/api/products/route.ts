import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/db/products";

// TODO: Add auth check here if products endpoint needs protection in future

export async function GET() {
  try {
    const products = await getActiveProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
