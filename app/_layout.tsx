import "../global.css";

import { useEffect } from "react";
import { View, ActivityIndicator, useWindowDimensions } from "react-native";
import { Logo } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { Slot, usePathname, useRouter, useLocalSearchParams } from "expo-router";
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
import { AdminBar } from "@/components/AdminBar";
import { useWide } from "@/components/Screen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { fetchPlatformPixelId } from "@/data/queries";
import { initPixel } from "@/lib/pixel";

/** Écran de chargement de marque (session en cours de vérification). */
function BrandLoader() {
  return (
    <View className="flex-1 items-center justify-center bg-paper" style={{ gap: 18 }}>
      <Logo size={46} />
      <ActivityIndicator color={colors.bordeaux[600]} />
    </View>
  );
}

function AppShell() {
  const wide = useWide();
  const pathname = usePathname();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextParam = typeof params.next === "string" ? params.next : "";
  const { height } = useWindowDimensions();
  const { session, loading, isAdmin, adminChecked } = useAuth();

  const isPay = pathname.startsWith("/pay") || pathname.startsWith("/access"); // pages publiques client
  const isLanding = pathname === "/decouvrir"; // page marketing publique
  const isLogin = pathname === "/login";
  const isOnboarding = pathname === "/onboarding";
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    if (loading || isPay || isLanding) return;
    if (!session) {
      if (isLogin) return;
      // Visiteur non connecté : la racine mène à la landing (pour les pubs) ;
      // les autres pages protégées mènent au login (avec retour).
      if (pathname === "/") {
        router.replace("/decouvrir" as any);
      } else {
        router.replace(`/login?next=${encodeURIComponent(pathname)}` as any);
      }
      return;
    }
    if (isLogin) {
      // Destination explicite (ex. on venait de /admin) : on y retourne.
      if (nextParam && nextParam !== "/") {
        router.replace(nextParam as any);
      } else if (adminChecked && isAdmin) {
        router.replace("/admin" as any);
      } else {
        // Non bloquant : on entre dès que la session existe (les inscrits venus
        // des pubs passent de toute façon par /signup). L'admin sera VERROUILLÉ
        // sur la console par le bloc ci-dessous dès que la vérif revient.
        router.replace("/" as any);
      }
      return;
    }
    if (adminChecked) {
      // VERROU DÉTERMINISTE :
      //  • l'admin reste TOUJOURS sur la console (jamais sur l'app propriétaire) ;
      //  • un non-admin ne peut jamais entrer dans la console.
      if (isAdmin && !isAdminRoute) {
        router.replace("/admin" as any);
        return;
      }
      if (!isAdmin && isAdminRoute) {
        router.replace("/" as any);
        return;
      }
    }
  }, [loading, session, pathname, isPay, isLanding, isLogin, isAdminRoute, isAdmin, adminChecked, nextParam, router]);

  let content = null;
  if (isPay || isLanding || isLogin) {
    content = <Slot />; // pages publiques (checkout, accès, landing, connexion), sans chrome
  } else if (loading) {
    content = <BrandLoader />; // vérification de session : loader de marque, pas un écran blanc
  } else if (!session) {
    content = null; // redirecting to /login
  } else if (isOnboarding) {
    content = <Slot />; // logged in, focused wizard (no chrome)
  } else if (isAdminRoute) {
    // Console super-admin : chrome sombre dédié. On attend la vérif du statut
    // pour ne jamais flasher la console à un non-admin.
    content =
      adminChecked && !isAdmin ? null : (
        <>
          <AdminBar />
          <Slot />
        </>
      );
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
  // On charge nos polices de marque, mais SANS bloquer le rendu :
  // sur réseau lent, gated => page blanche. On affiche l'app tout de suite
  // (police système en repli) et les polices custom s'appliquent au chargement.
  useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Pixel Meta Paylika (web) : chargé une fois depuis les réglages plateforme.
  useEffect(() => {
    fetchPlatformPixelId().then(initPixel).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
