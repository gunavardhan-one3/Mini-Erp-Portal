import { apiFetch } from "./client";

export type MovementType = "IN" | "OUT";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  lowStock: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdBy: string;
  timestamp: string;
  creator?: { name: string };
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface ProductCreateInput {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  location?: string;
}

export interface ProductUpdateInput {
  name?: string;
  sku?: string;
  category?: string;
  unitPrice?: number;
  minStockAlert?: number;
  location?: string;
}

export interface StockMovementInput {
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
}

function buildQuery(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listProducts(token: string, params: ProductListParams) {
  return apiFetch<Paginated<Product>>(`/products${buildQuery(params)}`, { token });
}

export function getProduct(token: string, id: string) {
  return apiFetch<{ product: Product }>(`/products/${id}`, { token });
}

export function createProduct(token: string, input: ProductCreateInput) {
  return apiFetch<{ product: Product }>(`/products`, {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

export function updateProduct(token: string, id: string, input: ProductUpdateInput) {
  return apiFetch<{ product: Product }>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    token,
  });
}

export function listStockMovements(
  token: string,
  productId: string,
  params: { page?: number; limit?: number }
) {
  return apiFetch<Paginated<StockMovement>>(
    `/products/${productId}/stock-movements${buildQuery(params)}`,
    { token }
  );
}

export function createStockMovement(token: string, productId: string, input: StockMovementInput) {
  return apiFetch<{ product: Product; stockMovement: StockMovement }>(
    `/products/${productId}/stock-movements`,
    {
      method: "POST",
      body: JSON.stringify(input),
      token,
    }
  );
}
