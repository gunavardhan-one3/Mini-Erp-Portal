import { z } from "zod";
import { CustomerStatus, CustomerType } from "@prisma/client";

const mobileRegex = /^[+]?[0-9][0-9\s-]{6,14}$/;

const customerTypeSchema = z.nativeEnum(CustomerType);
const customerStatusSchema = z.nativeEnum(CustomerStatus);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobile: z.string().trim().regex(mobileRegex, "Mobile must be a valid phone number"),
  email: z.string().trim().email("Email must be valid").optional().or(z.literal("")),
  businessName: z.string().trim().min(1).optional(),
  gstNumber: z.string().trim().min(1).optional(),
  customerType: customerTypeSchema,
  address: z.string().trim().min(1).optional(),
  status: customerStatusSchema.optional(),
  followUpDate: z.coerce.date().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  mobile: z.string().trim().regex(mobileRegex, "Mobile must be a valid phone number").optional(),
  email: z.string().trim().email("Email must be valid").optional().or(z.literal("")),
  businessName: z.string().trim().min(1).optional().or(z.literal("")),
  gstNumber: z.string().trim().min(1).optional().or(z.literal("")),
  customerType: customerTypeSchema.optional(),
  address: z.string().trim().min(1).optional().or(z.literal("")),
  status: customerStatusSchema.optional(),
  followUpDate: z.coerce.date().nullable().optional(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  status: customerStatusSchema.optional(),
  customerType: customerTypeSchema.optional(),
});

export const createFollowUpSchema = z.object({
  note: z.string().trim().min(1, "Note is required"),
  date: z.coerce.date().optional(),
});
