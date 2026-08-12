import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination, buildPaginatedResult } from "../utils/pagination";
import {
  createChallanSchema,
  updateChallanSchema,
  listChallansQuerySchema,
} from "../validation/challanSchemas";

async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const last = await tx.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: "desc" },
  });

  const lastSeq = last ? parseInt(last.challanNumber.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

function isChallanNumberConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    ((err.meta?.target as string[] | undefined)?.includes("challanNumber") ?? false)
  );
}

// The challan number is generated inside the same transaction as the insert
// (read-max-then-increment). Under concurrent creates that can collide on
// the unique constraint, so we retry a few times rather than serializing
// all challan creation behind a lock.
async function runWithChallanNumberRetry<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  attempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (err) {
      if (isChallanNumberConflict(err) && attempt < attempts) continue;
      throw err;
    }
  }
  /* istanbul ignore next */
  throw new Error("unreachable");
}

export const createChallan = asyncHandler(async (req, res) => {
  const parsed = createChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }
  const { customerId, items } = parsed.data;

  const challan = await runWithChallanNumberRetry(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(400, "Customer not found", {
        fieldErrors: { customerId: ["Customer not found"] },
      });
    }

    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length > 0) {
      throw new AppError(400, "One or more products were not found", {
        missingProductIds: missing,
      });
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const challanNumber = await generateChallanNumber(tx);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        createdBy: req.user!.id,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true, customer: true, creator: { select: { name: true } } },
    });
  });

  res.status(201).json({ challan });
});

export const listChallans = asyncHandler(async (req, res) => {
  const parsedQuery = listChallansQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Invalid query parameters", parsedQuery.error.flatten());
  }
  const { status, customerId } = parsedQuery.data;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [challans, total] = await prisma.$transaction([
    prisma.challan.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.challan.count({ where }),
  ]);

  res.status(200).json(buildPaginatedResult(challans, total, pagination));
});

export const getChallan = asyncHandler(async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      customer: true,
      creator: { select: { name: true } },
    },
  });
  if (!challan) {
    throw new AppError(404, "Challan not found");
  }
  res.status(200).json({ challan });
});

export const updateChallan = asyncHandler(async (req, res) => {
  const parsed = updateChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }
  const { customerId, items } = parsed.data;

  const existing = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw new AppError(404, "Challan not found");
  }
  if (existing.status !== "Draft") {
    throw new AppError(400, `Only Draft challans can be edited (current status: ${existing.status})`);
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(400, "Customer not found", {
      fieldErrors: { customerId: ["Customer not found"] },
    });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length > 0) {
    throw new AppError(400, "One or more products were not found", {
      missingProductIds: missing,
    });
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const challan = await prisma.$transaction(async (tx) => {
    await tx.challanItem.deleteMany({ where: { challanId: req.params.id } });
    return tx.challan.update({
      where: { id: req.params.id },
      data: {
        customerId,
        totalQuantity,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true, customer: true, creator: { select: { name: true } } },
    });
  });

  res.status(200).json({ challan });
});

export const confirmChallan = asyncHandler(async (req, res) => {
  const challanId = req.params.id;

  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({
      where: { id: challanId },
      include: { items: true },
    });
    if (!existing) {
      throw new AppError(404, "Challan not found");
    }
    if (existing.status !== "Draft") {
      throw new AppError(400, `Only Draft challans can be confirmed (current status: ${existing.status})`);
    }

    // Aggregate demand per product first — a challan could (in theory) carry
    // more than one line referencing the same product, and checking each
    // line in isolation would miss an over-commit that only shows up when
    // their quantities are combined.
    const demandByProduct = new Map<string, number>();
    for (const item of existing.items) {
      demandByProduct.set(item.productId, (demandByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const productIds = [...demandByProduct.keys()];
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const insufficient = productIds
      .map((productId) => {
        const product = productMap.get(productId);
        const requested = demandByProduct.get(productId)!;
        const available = product?.currentStock ?? 0;
        return { productId, product, requested, available };
      })
      .filter(({ requested, available }) => requested > available)
      .map(({ productId, product, requested, available }) => ({
        productId,
        name: product?.name ?? "(unknown product)",
        sku: product?.sku ?? "-",
        requested,
        available,
      }));

    if (insufficient.length > 0) {
      throw new AppError(400, "Insufficient stock for one or more items — nothing was confirmed", {
        insufficientItems: insufficient,
      });
    }

    // All sufficient — check passed, now write. Every write below happens in
    // this same transaction, so a failure partway through rolls everything
    // back rather than leaving stock partially decremented.
    for (const item of existing.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantityChanged: item.quantity,
          movementType: "OUT",
          reason: "Challan Confirmed",
          createdBy: req.user!.id,
          challanId: existing.id,
        },
      });
    }

    return tx.challan.update({
      where: { id: challanId },
      data: { status: "Confirmed" },
      include: { items: true, customer: true, creator: { select: { name: true } } },
    });
  });

  res.status(200).json({ challan });
});

export const cancelChallan = asyncHandler(async (req, res) => {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw new AppError(404, "Challan not found");
  }
  if (existing.status === "Cancelled") {
    throw new AppError(400, "Challan is already cancelled");
  }

  // Assumption: cancelling a Confirmed challan intentionally does NOT
  // restore stock automatically. By the time a challan is Confirmed, goods
  // may have already physically left the warehouse, so silently reversing
  // the StockMovement could mask a real-world discrepancy. Any stock
  // reversal here should be a deliberate, separately-audited stock-in
  // movement (logged like any other stock movement), not an implicit side
  // effect of cancellation. Draft -> Cancelled never touched stock in the
  // first place, so it's just a status change either way.
  const challan = await prisma.challan.update({
    where: { id: req.params.id },
    data: { status: "Cancelled" },
    include: { items: true, customer: true, creator: { select: { name: true } } },
  });

  res.status(200).json({ challan });
});
