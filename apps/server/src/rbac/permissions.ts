export type Permission =
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:delete"
  | "task:create"
  | "task:read"
  | "task:update"
  | "task:delete"
  | "billing:manage"
  | "member:invite"
  | "audit:read";

export const rolePermissions: Record<string, Permission[]> = {
  OWNER: [
    "project:create",
    "project:read",
    "project:update",
    "project:delete",
    "task:create",
    "task:read",
    "task:update",
    "task:delete",
    "billing:manage",
    "member:invite",
    "audit:read"
  ],
  ADMIN: [
    "project:create",
    "project:read",
    "project:update",
    "task:create",
    "task:read",
    "task:update",
    "member:invite",
    "audit:read"
  ],
  MEMBER: ["project:read", "task:create", "task:read", "task:update"],
  VIEWER: ["project:read", "task:read"]
};
