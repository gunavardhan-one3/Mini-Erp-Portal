import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../utils/env";
import { AppError } from "../utils/AppError";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
};

export const requireRole = (...roles: Role[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError(401, "Not authenticated");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
};
