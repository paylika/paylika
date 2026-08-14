import { Platform } from "react-native";

// Intégration Meta Pixel (web uniquement). Chaque propriétaire fournit son ID ;
// les pages publiques (vente, paiement, accès) chargent le pixel et poussent
// les événements (PageView, ViewContent, InitiateCheckout, Purchase).

let currentId: string | null = null;

export function loadPixel(id?: string | null) {
  if (!id || Platform.OS !== "web" || typeof window === "undefined") return;
  const w = window as any;
  if (currentId === id && w.fbq) return;
  currentId = id;

  if (!w.fbq) {
    /* eslint-disable */
    (function (f: any, b: any, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e);
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(w, window.document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }
  w.fbq("init", id);
  w.fbq("track", "PageView");
}

export function track(event: string, params?: Record<string, unknown>) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const w = window as any;
  if (w.fbq) w.fbq("track", event, params);
}
