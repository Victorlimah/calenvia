/** Envia um erro do navegador para /api/errors (melhor esforço, nunca lança). */
export function reportClientError(error: Error & { digest?: string }) {
  try {
    const payload = JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack?.slice(0, 4000),
      digest: error.digest,
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/errors", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/errors", { method: "POST", body: payload, keepalive: true });
    }
  } catch {
    // ignora
  }
}
