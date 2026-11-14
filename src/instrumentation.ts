import type { Instrumentation } from "next";

export async function register() {}

/** Erros não tratados em rotas, server components e server actions (CAL-029). */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { reportError } = await import("@/lib/monitoring");
  await reportError(error, {
    source: context.routeType === "action" ? "action" : "server",
    path: request.path,
    digest: (error as { digest?: string }).digest,
    extra: { method: request.method, routePath: context.routePath, routeType: context.routeType },
  });
};
