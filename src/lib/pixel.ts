// Pixel Meta (Facebook) de PAYLIKA — pour tracker les inscriptions via les pubs.
// (À ne pas confondre avec un pixel par-offre : ici c'est l'acquisition Paylika.)
// L'ID vient des réglages plateforme (éditable en admin). No-op hors web / sans ID.

let inited = false;

export function initPixel(pixelId?: string | null): void {
  if (inited || !pixelId) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  inited = true;
  const w = window as any;
  const d = document as any;
  if (!w.fbq) {
    const n: any = (w.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = d.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const s = d.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(t, s);
  }
  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}

/** Événement d'inscription (Meta « CompleteRegistration ») — objectif de campagne. */
export function trackSignup(): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.fbq) w.fbq("track", "CompleteRegistration");
}
