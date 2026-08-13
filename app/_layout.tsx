import "../global.css";

import { View, useWindowDimensions } from "react-native";
import { Slot, usePathname } from "expo-router";
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

export default function RootLayout() {
  const wide = useWide();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  // Standalone pages (no owner chrome): the public customer checkout.
  const standalone = pathname.startsWith("/pay");
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="bg-paper" style={{ height }}>
        {fontsLoaded ? (
          standalone ? (
            <Slot />
          ) : (
            <>
              <TopBar />
              <Slot />
              {!wide ? <BottomNav /> : null}
            </>
          )
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
