import jwt from "jsonwebtoken";
import { config } from "../shared/config";

export type AuthToken = {
  userId: string;
  tenantId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
};

export function signToken(payload: AuthToken) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as AuthToken;
}
