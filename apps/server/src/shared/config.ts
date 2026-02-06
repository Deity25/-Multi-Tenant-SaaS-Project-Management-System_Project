import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 5555),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  stripeSecret: process.env.STRIPE_SECRET ?? "",
  stripePriceId: process.env.STRIPE_PRICE_ID ?? ""
};
