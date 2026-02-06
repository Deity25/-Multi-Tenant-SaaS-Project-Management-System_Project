import { Response, NextFunction } from "express";
import { AuthedRequest } from "../auth/middleware";
import { Permission, rolePermissions } from "./permissions";

export function requirePermission(permission: Permission) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const allowed = rolePermissions[role]?.includes(permission);
    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
