import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../audit/logger";
import { requirePermission } from "../rbac/middleware";

export const projectRouter = Router();

projectRouter.get("/", requirePermission("project:read"), async (req: AuthedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const role = req.auth!.role;

  const where =
    role === "OWNER" || role === "ADMIN"
      ? { tenantId }
      : { tenantId, members: { some: { userId: req.auth!.userId } } };

  const projects = await prisma.project.findMany({
    where,
    include: { boards: true }
  });
  return res.json(projects);
});

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

projectRouter.post("/", requirePermission("project:create"), async (req: AuthedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const project = await prisma.project.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: req.auth!.userId,
      boards: { create: [{ name: "Backlog" }, { name: "In Progress" }, { name: "Done" }] },
      members: { create: [{ userId: req.auth!.userId, role: "OWNER" }] }
    }
  });

  await logAudit({
    tenantId,
    actorId: req.auth!.userId,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    metadata: { name: project.name }
  });

  return res.status(201).json(project);
});

projectRouter.get(
  "/:id/tasks",
  requirePermission("task:read"),
  async (req: AuthedRequest, res) => {
    const tenantId = req.auth!.tenantId;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: true }
    });
    if (!project || project.tenantId !== tenantId) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (req.auth!.role !== "OWNER" && req.auth!.role !== "ADMIN") {
      const isMember = project.members.some((m) => m.userId === req.auth!.userId);
      if (!isMember) {
        return res.status(403).json({ error: "Not assigned to project" });
      }
    }

    const tasks = await prisma.task.findMany({
      where: { board: { projectId: project.id } },
      orderBy: { createdAt: "desc" }
    });
    return res.json(tasks);
  }
);

projectRouter.delete(
  "/:id",
  requirePermission("project:delete"),
  async (req: AuthedRequest, res) => {
    const tenantId = req.auth!.tenantId;
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { boards: true }
    });
    if (!project || project.tenantId !== tenantId) {
      return res.status(404).json({ error: "Project not found" });
    }

    const boardIds = project.boards.map((b) => b.id);
    await prisma.task.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    await prisma.board.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });

    await logAudit({
      tenantId,
      actorId: req.auth!.userId,
      action: "project.deleted",
      entityType: "project",
      entityId: project.id,
      metadata: { name: project.name }
    });

    return res.json({ ok: true });
  }
);

projectRouter.get(
  "/:id/members",
  requirePermission("project:read"),
  async (req: AuthedRequest, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: true } } }
    });
    if (!project || project.tenantId !== req.auth!.tenantId) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (req.auth!.role !== "OWNER" && req.auth!.role !== "ADMIN") {
      const isMember = project.members.some((m) => m.userId === req.auth!.userId);
      if (!isMember) {
        return res.status(403).json({ error: "Not assigned to project" });
      }
    }
    return res.json(
      project.members.map((m) => ({
        id: m.id,
        role: m.role,
        user: { id: m.user.id, name: m.user.name, email: m.user.email }
      }))
    );
  }
);

projectRouter.post(
  "/:id/members",
  requirePermission("project:update"),
  async (req: AuthedRequest, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.tenantId !== req.auth!.tenantId) {
      return res.status(404).json({ error: "Project not found" });
    }
    const { userId, role } = req.body as { userId?: string; role?: string };
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const membership = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      update: { role: role ?? "MEMBER" },
      create: { projectId: project.id, userId, role: role ?? "MEMBER" }
    });

    return res.status(201).json(membership);
  }
);

projectRouter.delete(
  "/:id/members/:userId",
  requirePermission("project:update"),
  async (req: AuthedRequest, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.tenantId !== req.auth!.tenantId) {
      return res.status(404).json({ error: "Project not found" });
    }

    await prisma.projectMember.deleteMany({
      where: { projectId: project.id, userId: req.params.userId }
    });

    return res.json({ ok: true });
  }
);
