import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { env } from "../utils/env";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid input", parsed.error.flatten());
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
