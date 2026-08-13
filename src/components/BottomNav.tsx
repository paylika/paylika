import { View, Text, Pressable } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/theme/colors";

const TABS: { label: string; path: string; icon: IconName }[] = [
  { label: "Accueil", path: "/", icon: "home" },
  { label: "Offres", path: "/offres", icon: "tag" },
  { label: "Stats", path: "/stats", icon: "chart" },
  { label: "Accès", path: "/acces", icon: "send" },
  { label: "Argent", path: "/argent", icon: "wallet" },
];

function isActive(pathname: string, path: string) {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

/**
 * Floating pill bottom navigation (mobile) — the active tab expands into a
 * bordeaux pill with its label, inspired by the "Reading App" nav reference.
 */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 8,
        alignItems: "center",
      }}
    >
      <View
        className="flex-row items-center rounded-full bg-card"
        style={{
          paddingHorizontal: 6,
          paddingVertical: 6,
          gap: 2,
          borderWidth: 1,
          borderColor: "rgba(33,27,24,0.06)",
          shadowColor: "#211B18",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.path);
          return (
            <Pressable
              key={tab.path}
              onPress={() => router.push(tab.path as any)}
              hitSlop={6}
            >
              {active ? (
                <View className="flex-row items-center rounded-full bg-bordeaux-600 px-3.5 py-2.5">
                  <Icon name={tab.icon} size={19} color={colors.white} strokeWidth={2} />
                  <Text className="ml-1.5 font-semibold text-[13px] text-white">
                    {tab.label}
                  </Text>
                </View>
              ) : (
                <View
                  className="items-center justify-center"
                  style={{ width: 46, height: 44 }}
                >
                  <Icon name={tab.icon} size={22} color={colors.muted} strokeWidth={1.9} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
