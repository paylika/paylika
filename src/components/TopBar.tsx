import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./ui";
import { Icon, Logo } from "./Icon";
import { colors } from "@/theme/colors";
import { maxWidthFor } from "./Screen";

const TABS: { label: string; path: string }[] = [
  { label: "Accueil", path: "/" },
  { label: "Offres", path: "/offres" },
  { label: "Statistiques", path: "/stats" },
  { label: "Accès", path: "/acces" },
  { label: "Argent", path: "/argent" },
  { label: "Réglages", path: "/reglages" },
];

function isActive(pathname: string, path: string) {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

function Brand() {
  return (
    <View className="flex-row items-center">
      <Logo size={30} />
      <Text
        className="ml-2 font-display text-[21px] text-ink"
        style={{ letterSpacing: -0.5 }}
      >
        Pay<Text className="text-bordeaux-600">lika</Text>
      </Text>
    </View>
  );
}

/** Persistent top bar: brand (or back) + search + tab navigation. */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const maxW = maxWidthFor(wide);

  // A sub-page is any route that isn't one of the top-level tabs.
  const isSubPage = !TABS.some((t) => t.path === pathname);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ paddingTop: insets.top }} className="bg-paper items-center">
      <View style={{ width: "100%", maxWidth: maxW }} className="px-5 pt-2 pb-1">
        {/* Brand / back + actions */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {isSubPage ? (
              <Pressable
                onPress={goBack}
                className="h-10 w-10 items-center justify-center rounded-full bg-sand"
              >
                <Icon name="chevron-left" size={20} color={colors.ink} strokeWidth={2} />
              </Pressable>
            ) : null}
            <Brand />
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable onPress={() => router.push("/notifications" as any)}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-sand">
                <Icon name="bell" size={19} color={colors.ink} />
              </View>
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.bordeaux[600],
                  borderWidth: 1.5,
                  borderColor: colors.paper,
                }}
              />
            </Pressable>
            <Pressable onPress={() => router.push("/reglages" as any)}>
              <Avatar initials="AB" size={40} tone="ink" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center rounded-2xl bg-sand px-4 py-3">
          <Icon name="search" size={18} color={colors.muted} />
          <Text className="ml-3 flex-1 font-sans text-[14px] text-ink-muted">
            Rechercher un abonné, un groupe…
          </Text>
          <View className="rounded-md bg-card border border-ink/10 px-2 py-0.5">
            <Text className="font-medium text-[11px] text-ink-muted">⌘K</Text>
          </View>
        </View>

        {/* Tabs — desktop/tablet only; mobile uses the floating bottom nav */}
        {wide ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerStyle={{ gap: 22 }}
          >
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.path);
              return (
                <Pressable
                  key={tab.path}
                  onPress={() => router.push(tab.path as any)}
                  className="pb-2"
                >
                  <Text
                    className={`font-semibold text-[14px] ${
                      active ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={{
                      height: 2.5,
                      borderRadius: 2,
                      marginTop: 6,
                      backgroundColor: active ? colors.bordeaux[600] : "transparent",
                    }}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
