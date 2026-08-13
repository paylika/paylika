import { ScrollView, View, Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { Eyebrow } from "./ui";

export function useWide() {
  const { width } = useWindowDimensions();
  return width >= 900;
}

export function maxWidthFor(wide: boolean) {
  return wide ? 1180 : 520;
}

/** Scrollable page body, centered with a max width on wide screens. */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-paper">
      <View className="items-center">
        <View
          style={{
            width: "100%",
            maxWidth: maxWidthFor(wide),
            paddingHorizontal: 20,
            paddingTop: 18,
            // extra room on mobile so content clears the floating bottom nav
            paddingBottom: insets.bottom + (wide ? 40 : 104),
            gap: 16,
          }}
        >
          {children}
        </View>
      </View>
    </ScrollView>
  );
}

/** Standard page heading (eyebrow + title + optional subtitle). */
export function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Text
        className="mt-1.5 font-display-x text-[30px] text-ink"
        style={{ letterSpacing: -1.2, lineHeight: 34 }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1.5 font-sans text-[13px] text-ink-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
