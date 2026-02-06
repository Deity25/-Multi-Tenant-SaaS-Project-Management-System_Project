import { Response, NextFunction } from "express";
import { AuthedRequest } from "../auth/middleware";

export function requireTenant(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth?.tenantId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }
  return next();
}
