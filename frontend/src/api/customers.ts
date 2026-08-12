import { apiFetch } from "./client";

export type CustomerType = "Retail" | "Wholesale" | "Distributor";
export type CustomerStatus = "Lead" | "Active" | "Inactive";

export const CUSTOMER_TYPES: CustomerType[] = ["Retail", "Wholesale", "Distributor"];
export const CUSTOMER_STATUSES: CustomerStatus[] = ["Lead", "Active", "Inactive"];

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  customerId: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  followUps: FollowUp[];
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

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus | "";
  customerType?: CustomerType | "";
}

export interface CustomerFormInput {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: CustomerType;
  address?: string;
  status?: CustomerStatus;
  followUpDate?: string;
}

function buildQuery(params: CustomerListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.customerType) query.set("customerType", params.customerType);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listCustomers(token: string, params: CustomerListParams) {
  return apiFetch<Paginated<Customer>>(`/customers${buildQuery(params)}`, { token });
}

export function getCustomer(token: string, id: string) {
  return apiFetch<{ customer: CustomerDetail }>(`/customers/${id}`, { token });
}

export function createCustomer(token: string, input: CustomerFormInput) {
  return apiFetch<{ customer: Customer }>(`/customers`, {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

export function updateCustomer(token: string, id: string, input: Partial<CustomerFormInput>) {
  return apiFetch<{ customer: Customer }>(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    token,
  });
}

export function addFollowUp(token: string, id: string, note: string) {
  return apiFetch<{ followUp: FollowUp }>(`/customers/${id}/followups`, {
    method: "POST",
    body: JSON.stringify({ note }),
    token,
  });
}
