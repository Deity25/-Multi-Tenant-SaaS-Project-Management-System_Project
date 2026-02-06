import { Router } from "express";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../auth/middleware";
import { requirePermission } from "../rbac/middleware";
import { stripe } from "../billing/stripe";
import { config } from "../shared/config";

export const billingRouter = Router();

billingRouter.post("/checkout", requirePermission("billing:manage"), async (req: AuthedRequest, res) => {
  if (!stripe || !config.stripePriceId) {
    return res.status(400).json({ error: "Stripe not configured" });
  }

  const tenantId = req.auth!.tenantId;
  const billing = await prisma.billingAccount.findUnique({ where: { tenantId } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billing?.stripeCustomerId ?? undefined,
    line_items: [{ price: config.stripePriceId, quantity: 1 }],
    success_url: "http://localhost:5173/billing/success",
    cancel_url: "http://localhost:5173/billing/cancel",
    metadata: { tenantId }
  });

  return res.json({ url: session.url });
});
