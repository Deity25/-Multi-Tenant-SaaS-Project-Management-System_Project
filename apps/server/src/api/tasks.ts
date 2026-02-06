import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../audit/logger";
import { requirePermission } from "../rbac/middleware";

export const taskRouter = Router();

const createTaskSchema = z.object({
  boardId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional()
});

taskRouter.post("/", requirePermission("task:create"), async (req: AuthedRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const board = await prisma.board.findUnique({
    where: { id: parsed.data.boardId },
    include: { project: true }
  });
  if (!board || board.project.tenantId !== req.auth!.tenantId) {
    return res.status(403).json({ error: "Board not in tenant" });
  }
  if (req.auth!.role !== "OWNER" && req.auth!.role !== "ADMIN") {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: board.projectId, userId: req.auth!.userId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not assigned to project" });
    }
  }

  const task = await prisma.task.create({
    data: {
      boardId: parsed.data.boardId,
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId,
      createdById: req.auth!.userId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  await logAudit({
    tenantId: req.auth!.tenantId,
    actorId: req.auth!.userId,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    metadata: { title: task.title }
  });

  return res.status(201).json(task);
});

const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});

taskRouter.patch("/:id", requirePermission("task:update"), async (req: AuthedRequest, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { board: { include: { project: true } } }
  });
  if (!existing || existing.board.project.tenantId !== req.auth!.tenantId) {
    return res.status(404).json({ error: "Task not found" });
  }
  if (req.auth!.role !== "OWNER" && req.auth!.role !== "ADMIN") {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: existing.board.projectId, userId: req.auth!.userId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not assigned to project" });
    }
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId ?? undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  await logAudit({
    tenantId: req.auth!.tenantId,
    actorId: req.auth!.userId,
    action: "task.updated",
    entityType: "task",
    entityId: task.id,
    metadata: { status: task.status }
  });

  return res.json(task);
});

taskRouter.delete("/:id", requirePermission("task:delete"), async (req: AuthedRequest, res) => {
  const existing = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { board: { include: { project: true } } }
  });
  if (!existing || existing.board.project.tenantId !== req.auth!.tenantId) {
    return res.status(404).json({ error: "Task not found" });
  }

  await prisma.task.delete({ where: { id: existing.id } });

  await logAudit({
    tenantId: req.auth!.tenantId,
    actorId: req.auth!.userId,
    action: "task.deleted",
    entityType: "task",
    entityId: existing.id,
    metadata: { title: existing.title }
  });

  return res.json({ ok: true });
});
