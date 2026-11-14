/**
 * Mostra uma notificação do sistema. No Android só funciona pelo service worker
 * (registration.showNotification); no desktop, o construtor Notification serve.
 */
export async function showSystemNotification(
  title: string,
  opts: { body: string; tag?: string; url?: string },
): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body: opts.body,
    tag: opts.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: opts.url ?? "/" },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      if (opts.url) window.location.href = opts.url;
    };
  } catch {
    // navegador sem suporte: o aviso na tela continua
  }
}
