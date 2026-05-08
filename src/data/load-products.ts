import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { LLPProduct } from "@/lib/ai/product-types";

let cachedProducts: LLPProduct[] | null = null;

export function loadProducts(): LLPProduct[] {
  if (cachedProducts) return cachedProducts;
  const filePath = path.join(process.cwd(), "src/data/llp-products.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as { products: LLPProduct[] };
  cachedProducts = parsed.products;
  return cachedProducts;
}

export function invalidateProductCache(): void {
  cachedProducts = null;
}
