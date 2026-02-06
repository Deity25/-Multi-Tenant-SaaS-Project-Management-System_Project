import Stripe from "stripe";
import { config } from "../shared/config";

export const stripe = config.stripeSecret
  ? new Stripe(config.stripeSecret, { apiVersion: "2024-06-20" })
  : null;
