import "server-only";
import type { BillingProvider } from "./provider";

/** Provedor Stripe: implementado na fase 6 do CAL-076. */
const notReady = () => {
  throw new Error("Stripe ainda não configurado (CAL-076 fase 6).");
};

export const stripeProvider: BillingProvider = {
  id: "stripe",
  createCheckout: async () => notReady(),
  syncItems: async () => notReady(),
  changePlan: async () => notReady(),
  cancel: async () => notReady(),
  resume: async () => notReady(),
  customerPortalUrl: async () => notReady(),
  parseWebhook: async () => notReady(),
};
