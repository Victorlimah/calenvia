/**
 * Colunas de `appointments` que o papel `authenticated` pode ler (CAL-112). O valor
 * (`price_cents`) não está aqui: quem tem `finance.view` lê por `appointment_prices()`
 * (ver `src/lib/appointments/prices.ts`). Use no lugar de `select("*")` com o client do usuário.
 */
export const APPOINTMENT_COLUMNS =
  "id, business_id, customer_id, service_id, staff_member_id, starts_at, ends_at, status, source, notes, customer_name, customer_whatsapp, manage_code, created_at, canceled_at, messages_enabled, created_by_user_id, updated_by_user_id" as const;
