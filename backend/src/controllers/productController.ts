import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination, buildPaginatedResult } from "../utils/pagination";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  createStockMovementSchema,
  listStockMovementsQuerySchema,
} from "../validation/productSchemas";

function withLowStock<T extends { currentStock: number; minStockAlert: number }>(product: T) {
  return { ...product, lowStock: product.currentStock <= product.minStockAlert };
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export const createProduct = asyncHandler(async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }

  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    throw new AppError(400, "A product with this SKU already exists", {
      fieldErrors: { sku: ["SKU must be unique"] },
    });
  }

  try {
    const product = await prisma.product.create({ data: parsed.data });
    res.status(201).json({ product: withLowStock(product) });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(400, "A product with this SKU already exists", {
        fieldErrors: { sku: ["SKU must be unique"] },
      });
    }
    throw err;
  }
});

export const listProducts = asyncHandler(async (req, res) => {
  const parsedQuery = listProductsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Invalid query parameters", parsedQuery.error.flatten());
  }
  const { search, category } = parsedQuery.data;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  res
    .status(200)
    .json(buildPaginatedResult(products.map(withLowStock), total, pagination));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }
  res.status(200).json({ product: withLowStock(product) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw new AppError(404, "Product not found");
  }

  if (parsed.data.sku && parsed.data.sku !== existing.sku) {
    const skuTaken = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
    if (skuTaken) {
      throw new AppError(400, "A product with this SKU already exists", {
        fieldErrors: { sku: ["SKU must be unique"] },
      });
    }
  }

  const { location, ...rest } = parsed.data;

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(location !== undefined ? { location: location || null } : {}),
      },
    });
    res.status(200).json({ product: withLowStock(product) });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError(400, "A product with this SKU already exists", {
        fieldErrors: { sku: ["SKU must be unique"] },
      });
    }
    throw err;
  }
});

export const createStockMovement = asyncHandler(async (req, res) => {
  const parsed = createStockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }
  const { quantityChanged, movementType, reason } = parsed.data;
  const productId = req.params.id;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(404, "Product not found");
    }

    const newStock =
      movementType === "IN" ? product.currentStock + quantityChanged : product.currentStock - quantityChanged;

    if (newStock < 0) {
      throw new AppError(400, "Insufficient stock for this movement", {
        product: { id: product.id, name: product.name, sku: product.sku },
        currentStock: product.currentStock,
        requested: quantityChanged,
      });
    }

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    const stockMovement = await tx.stockMovement.create({
      data: {
        productId,
        quantityChanged,
        movementType,
        reason,
        createdBy: req.user!.id,
      },
      include: { creator: { select: { name: true } } },
    });

    return { product: updatedProduct, stockMovement };
  });

  res.status(201).json({
    product: withLowStock(result.product),
    stockMovement: result.stockMovement,
  });
});

export const listStockMovements = asyncHandler(async (req, res) => {
  const parsedQuery = listStockMovementsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Invalid query parameters", parsedQuery.error.flatten());
  }
  const productId = req.params.id;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where: Prisma.StockMovementWhereInput = { productId };

  const [movements, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { timestamp: "desc" },
      include: { creator: { select: { name: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.status(200).json(buildPaginatedResult(movements, total, pagination));
});
