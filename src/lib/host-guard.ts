import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { HOST_KIND_HEADER, HOST_SLUG_HEADER } from "./host-headers";
import type { HostKind } from "./hosts";

/** Garante que a rota está sendo servida pelo host certo; senão, 404. */
export async function requireHost(kind: HostKind["kind"]): Promise<void> {
  const h = await headers();
  if (h.get(HOST_KIND_HEADER) !== kind) notFound();
}

/** Garante que a página do negócio está no subdomínio do próprio slug. */
export async function requireBusinessHost(slug: string): Promise<void> {
  const h = await headers();
  if (h.get(HOST_KIND_HEADER) !== "business" || h.get(HOST_SLUG_HEADER) !== slug) notFound();
}
