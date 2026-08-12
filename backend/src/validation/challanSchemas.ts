import { z } from "zod";
import { ChallanStatus } from "@prisma/client";

const challanItemInputSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number"),
});

function uniqueProductIds(items: { productId: string }[]): boolean {
  const ids = items.map((i) => i.productId);
  return new Set(ids).size === ids.length;
}

export const challanItemsSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    items: z.array(challanItemInputSchema).min(1, "At least one product line is required"),
  })
  .refine((data) => uniqueProductIds(data.items), {
    message: "Each product can only appear once per challan — combine quantities into a single line",
    path: ["items"],
  });

export const createChallanSchema = challanItemsSchema;
export const updateChallanSchema = challanItemsSchema;

export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(ChallanStatus).optional(),
  customerId: z.string().min(1).optional(),
});
