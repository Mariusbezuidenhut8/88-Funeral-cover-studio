import { Product } from "@/types/product.types";
import { readJSON, updateJSON } from "@/lib/utils/file-storage";

const FILE = "products.json";

export async function getAllProducts(): Promise<Product[]> {
  return readJSON<Product>(FILE);
}

export async function getActiveProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.isActive);
}

export async function getProductById(id: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.id === id) || null;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  return updateJSON<Product>(FILE, id, updates);
}
