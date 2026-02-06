import { Router } from "express";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../auth/middleware";
import { requirePermission } from "../rbac/middleware";

export const auditRouter = Router();

auditRouter.get("/", requirePermission("audit:read"), async (req: AuthedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return res.json(logs);
});
