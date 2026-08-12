import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { parsePagination, buildPaginatedResult } from "../utils/pagination";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  createFollowUpSchema,
} from "../validation/customerSchemas";

export const createCustomer = asyncHandler(async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }
  const { email, ...rest } = parsed.data;

  const customer = await prisma.customer.create({
    data: { ...rest, email: email || undefined },
  });

  res.status(201).json({ customer });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const parsedQuery = listCustomersQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Invalid query parameters", parsedQuery.error.flatten());
  }
  const { search, status, customerType } = parsedQuery.data;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status } : {}),
    ...(customerType ? { customerType } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  res.status(200).json(buildPaginatedResult(customers, total, pagination));
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { followUps: { orderBy: { createdAt: "desc" } } },
  });

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  res.status(200).json({ customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw new AppError(404, "Customer not found");
  }

  const { email, businessName, gstNumber, address, ...rest } = parsed.data;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(businessName !== undefined ? { businessName: businessName || null } : {}),
      ...(gstNumber !== undefined ? { gstNumber: gstNumber || null } : {}),
      ...(address !== undefined ? { address: address || null } : {}),
    },
  });

  res.status(200).json({ customer });
});

export const addFollowUp = asyncHandler(async (req, res) => {
  const parsed = createFollowUpSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw new AppError(404, "Customer not found");
  }

  const followUp = await prisma.followUp.create({
    data: {
      customerId: req.params.id,
      note: parsed.data.note,
      createdBy: req.user!.id,
      ...(parsed.data.date ? { createdAt: parsed.data.date } : {}),
    },
  });

  res.status(201).json({ followUp });
});
