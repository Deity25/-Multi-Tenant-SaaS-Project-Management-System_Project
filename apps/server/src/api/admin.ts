import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../auth/middleware";
import { requirePermission } from "../rbac/middleware";
import { hashPassword } from "../auth/password";

export const adminRouter = Router();

adminRouter.get("/members", requirePermission("member:invite"), async (req: AuthedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const members = await prisma.membership.findMany({
    where: { tenantId },
    include: { user: true }
  });
  return res.json(
    members.map((m) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      user: { id: m.user.id, name: m.user.name, email: m.user.email, createdAt: m.user.createdAt }
    }))
  );
});

adminRouter.get("/tenant", requirePermission("member:invite"), async (req: AuthedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { memberships: true, projects: true }
  });
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  const taskCount = await prisma.task.count({
    where: { board: { project: { tenantId } } }
  });

  return res.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    members: tenant.memberships.length,
    projects: tenant.projects.length,
    tasks: taskCount,
    createdAt: tenant.createdAt
  });
});

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  password: z.string().min(8)
});

adminRouter.post("/invite", requirePermission("member:invite"), async (req: AuthedRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, email, role, password } = parsed.data;
  const tenantId = req.auth!.tenantId;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password)
      }
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), name }
    });
  }

  const membership = await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    update: { role },
    create: { tenantId, userId: user.id, role }
  });

  return res.status(201).json({
    id: membership.id,
    role: membership.role,
    user: { id: user.id, name: user.name, email: user.email }
  });
});
