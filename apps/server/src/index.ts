import express from "express";
import cors from "cors";
import { config } from "./shared/config";
import { authRouter } from "./api/auth";
import { requireAuth } from "./auth/middleware";
import { requireTenant } from "./tenancy/requireTenant";
import { projectRouter } from "./api/projects";
import { taskRouter } from "./api/tasks";
import { auditRouter } from "./api/audit";
import { billingRouter } from "./api/billing";
import { adminRouter } from "./api/admin";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://considerate-bravery-production-e198.up.railway.app"
    ],
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);

app.use(requireAuth);
app.use(requireTenant);

app.use("/projects", projectRouter);
app.use("/tasks", taskRouter);
app.use("/audit", auditRouter);
app.use("/billing", billingRouter);
app.use("/admin", adminRouter);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
