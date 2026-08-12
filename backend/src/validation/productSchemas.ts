import { z } from "zod";
import { MovementType } from "@prisma/client";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  category: z.string().trim().min(1, "Category is required"),
  unitPrice: z.coerce.number().nonnegative("Unit price must be zero or more"),
  currentStock: z.coerce.number().int().nonnegative().optional(),
  minStockAlert: z.coerce.number().int().nonnegative().optional(),
  location: z.string().trim().min(1).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  sku: z.string().trim().min(1, "SKU is required").optional(),
  category: z.string().trim().min(1, "Category is required").optional(),
  unitPrice: z.coerce.number().nonnegative("Unit price must be zero or more").optional(),
  minStockAlert: z.coerce.number().int().nonnegative().optional(),
  location: z.string().trim().min(1).optional().or(z.literal("")),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
});

export const createStockMovementSchema = z.object({
  quantityChanged: z.coerce.number().int().positive("Quantity must be a positive number"),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().trim().min(1, "Reason is required"),
});

export const listStockMovementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
