import { Linking, Platform } from "react-native";

// Numéro WhatsApp d'assistance Paylika (+1 347 495 2236).
export const SUPPORT_WHATSAPP = "13474952236";

/** Ouvre une conversation WhatsApp avec le support Paylika. */
export function openSupport(message = "Bonjour, j'ai besoin d'aide avec Paylika 🙏"): void {
  const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch(() => {});
  }
}
