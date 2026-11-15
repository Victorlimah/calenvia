import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Client do Stripe com a chave secreta (`BILLING_API_KEY`). Só no servidor. */
export function stripeClient(): Stripe {
  const key = process.env.BILLING_API_KEY;
  if (!key) throw new Error("Variável de ambiente ausente: BILLING_API_KEY (Stripe).");
  client ??= new Stripe(key, { apiVersion: "2025-08-27.basil", appInfo: { name: "Calenvia" } });
  return client;
}
