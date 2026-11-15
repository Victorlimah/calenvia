/**
 * npm run billing:sync — cria no Stripe os produtos/preços de `billing_prices` que ainda não têm
 * `provider_price_id` (CAL-076 fase 6). Lê BILLING_API_KEY, NEXT_PUBLIC_SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY do ambiente (ex.: node --env-file=.env.local).
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { syncCatalog } from "../src/lib/billing/stripe-catalog.ts";

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
};

const stripe = new Stripe(need("BILLING_API_KEY"), { apiVersion: "2025-08-27.basil" });
const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const { created } = await syncCatalog(stripe, db);
console.log(`Stripe sincronizado: ${created} preço(s) novo(s).`);
