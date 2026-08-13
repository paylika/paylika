import "../global.css";

import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useWide } from "@/components/Screen";
import { AuthProvider, useAuth } from "@/lib/auth";

function AppShell() {
  const wide = useWide();
  const pathname = usePathname();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { session, loading } = useAuth();

  const isPay = pathname.startsWith("/pay"); // public customer checkout
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (loading || isPay) return;
    if (!session && !isLogin) router.replace("/login");
    if (session && isLogin) router.replace("/");
  }, [loading, session, pathname, isPay, isLogin, router]);

  let content = null;
  if (isPay) {
    content = <Slot />; // no auth, no owner chrome
  } else if (loading) {
    content = null; // brief splash
  } else if (isLogin) {
    content = <Slot />;
  } else if (!session) {
    content = null; // redirecting to /login
  } else {
    content = (
      <>
        <TopBar />
        <Slot />
        {!wide ? <BottomNav /> : null}
      </>
    );
  }

  return (
    <View className="bg-paper" style={{ height }}>
      {content}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
