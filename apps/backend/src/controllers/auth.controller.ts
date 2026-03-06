import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { client } from "@repo/db/client";
import asyncHandler from "../utils/controller-utils/asynchandler";
import ApiResponse from "../utils/controller-utils/ApiResponse";
import ApiError from "../utils/controller-utils/ApiError";
import { AuthRequest } from "../middleware/requireAuth";

export const register = asyncHandler(async (req: any, res: any) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return new ApiError(400, "Email and password are required").send(res);
  }

  const existing = await client.user.findUnique({ where: { email } });
  if (existing) {
    return new ApiError(409, "User already exists with this email").send(res);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await client.user.create({
    data: { email, passwordHash, name },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return new ApiResponse(201, { token, user: { id: user.id, email: user.email, name: user.name } }, "Registration successful").send(res);
});

export const login = asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return new ApiError(400, "Email and password are required").send(res);
  }

  const user = await client.user.findUnique({ where: { email } });
  if (!user) {
    return new ApiError(401, "Invalid email or password").send(res);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return new ApiError(401, "Invalid email or password").send(res);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return new ApiResponse(200, { token, user: { id: user.id, email: user.email, name: user.name } }, "Login successful").send(res);
});

export const me = asyncHandler(async (req: AuthRequest, res: any) => {
  const user = await client.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return new ApiError(404, "User not found").send(res);
  }

  return new ApiResponse(200, user, "User retrieved").send(res);
});
