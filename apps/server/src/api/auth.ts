import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken } from "../auth/jwt";

export const authRouter = Router();

const signupSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { tenantName, tenantSlug, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ error: "Email already in use" });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      billing: { create: {} }
    }
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          tenantId: tenant.id,
          role: "OWNER"
        }
      }
    }
  });

  const token = signToken({ userId: user.id, tenantId: tenant.id, role: "OWNER" });
  return res.json({ token, tenantId: tenant.id, userId: user.id, role: "OWNER" });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(2)
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, tenantSlug } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } }
  });
  if (!membership) {
    return res.status(403).json({ error: "No membership for tenant" });
  }

  const token = signToken({
    userId: user.id,
    tenantId: tenant.id,
    role: membership.role
  });

  return res.json({ token, tenantId: tenant.id, userId: user.id, role: membership.role });
});
