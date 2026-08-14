import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Logo } from "./Icon";
import { colors } from "@/theme/colors";
import { maxWidthFor } from "./Screen";
import { signOut } from "@/lib/auth";

const TABS: { label: string; path: string }[] = [
  { label: "Pilotage", path: "/admin" },
  { label: "Utilisateurs", path: "/admin/users" },
  { label: "Propriétaires", path: "/admin/owners" },
  { label: "Transactions", path: "/admin/transactions" },
];

function active(pathname: string, path: string) {
  return path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);
}

/** Console super-admin : chrome sombre et dédié, distinct de l'app propriétaire. */
export function AdminBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const maxW = maxWidthFor(width >= 900);

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.night }} className="items-center">
      <View style={{ width: "100%", maxWidth: maxW }} className="px-5 pb-1 pt-2">
        {/* Marque + actions */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Logo size={28} />
            <Text className="font-display text-[19px] text-white" style={{ letterSpacing: -0.5 }}>
              Pay<Text className="text-bordeaux-400">lika</Text>
            </Text>
            <View className="rounded-full bg-bordeaux-600 px-2 py-0.5">
              <Text className="font-bold text-[9px] uppercase text-white" style={{ letterSpacing: 1 }}>
                Console
              </Text>
            </View>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={() => router.replace("/")}
              className="flex-row items-center rounded-full bg-white/10 px-3 py-2"
            >
              <Icon name="home" size={14} color={colors.white} />
              <Text className="ml-1.5 font-semibold text-[12px] text-white">Vue app</Text>
            </Pressable>
            <Pressable onPress={logout} className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Icon name="close" size={16} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Onglets console */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 22 }}
        >
          {TABS.map((t) => {
            const on = active(pathname, t.path);
            return (
              <Pressable key={t.path} onPress={() => router.push(t.path as any)} className="pb-2">
                <Text className={`font-semibold text-[14px] ${on ? "text-white" : "text-white/45"}`}>
                  {t.label}
                </Text>
                <View
                  style={{
                    height: 2.5,
                    borderRadius: 2,
                    marginTop: 6,
                    backgroundColor: on ? colors.bordeaux[400] : "transparent",
                  }}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
