import { Platform, Share } from "react-native";

/**
 * Copy on web (navigator.clipboard), share sheet on native.
 * Returns what happened so the UI can show feedback.
 */
export async function copyOrShare(text: string): Promise<"copied" | "shared" | "failed"> {
  try {
    const nav = (globalThis as any).navigator;
    if (Platform.OS === "web" && nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return "copied";
    }
    await Share.share({ message: text });
    return "shared";
  } catch {
    return "failed";
  }
}
