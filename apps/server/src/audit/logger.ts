import { prisma } from "../db/prisma";

export async function logAudit(params: {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const metadata =
    params.metadata === undefined ? undefined : JSON.stringify(params.metadata);
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata
    }
  });
}
