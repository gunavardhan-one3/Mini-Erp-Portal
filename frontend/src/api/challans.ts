import { apiFetch } from "./client";

export type ChallanStatus = "Draft" | "Confirmed" | "Cancelled";

export const CHALLAN_STATUSES: ChallanStatus[] = ["Draft", "Confirmed", "Cancelled"];

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
}

export interface ChallanListRow {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  customer: { id: string; name: string };
  _count: { items: number };
}

export interface ChallanDetail {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  items: ChallanItem[];
  customer: {
    id: string;
    name: string;
    mobile: string;
    businessName: string | null;
  };
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

export interface ChallanListParams {
  page?: number;
  limit?: number;
  status?: ChallanStatus | "";
  customerId?: string;
}

export interface ChallanFormInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export interface InsufficientItem {
  productId: string;
  name: string;
  sku: string;
  requested: number;
  available: number;
}

function buildQuery(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listChallans(token: string, params: ChallanListParams) {
  return apiFetch<Paginated<ChallanListRow>>(`/challans${buildQuery(params)}`, { token });
}

export function getChallan(token: string, id: string) {
  return apiFetch<{ challan: ChallanDetail }>(`/challans/${id}`, { token });
}

export function createChallan(token: string, input: ChallanFormInput) {
  return apiFetch<{ challan: ChallanDetail }>(`/challans`, {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

export function updateChallan(token: string, id: string, input: ChallanFormInput) {
  return apiFetch<{ challan: ChallanDetail }>(`/challans/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    token,
  });
}

export function confirmChallan(token: string, id: string) {
  return apiFetch<{ challan: ChallanDetail }>(`/challans/${id}/confirm`, {
    method: "POST",
    token,
  });
}

export function cancelChallan(token: string, id: string) {
  return apiFetch<{ challan: ChallanDetail }>(`/challans/${id}/cancel`, {
    method: "POST",
    token,
  });
}
