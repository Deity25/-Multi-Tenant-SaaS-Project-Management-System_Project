import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt";

export type AuthedRequest = Request & { auth?: ReturnType<typeof verifyToken> };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [, token] = header.split(" ");
  try {
    req.auth = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
