import { Component, type ReactNode } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Icon, Logo } from "./Icon";
import { colors } from "@/theme/colors";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Filet de sécurité global : si un écran plante au rendu, on affiche un écran de
 * récupération (avec « Réessayer ») au lieu d'une page blanche. Ça évite qu'un
 * bug ponctuel ne bloque définitivement l'utilisateur → churn en moins.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Trace visible en dev / console web ; à brancher sur un logger plus tard.
    console.error("[Paylika] crash écran :", error);
  }

  reset = () => {
    this.setState({ error: null });
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center bg-paper px-8">
        <Logo size={44} />
        <View
          className="mt-6 h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.bordeaux[600] + "14" }}
        >
          <Icon name="alert" size={24} color={colors.bordeaux[600]} strokeWidth={2} />
        </View>
        <Text className="mt-4 text-center font-display-x text-[20px] text-ink" style={{ letterSpacing: -0.6 }}>
          Une erreur est survenue
        </Text>
        <Text
          className="mt-2 text-center font-sans text-[13px] text-ink-muted"
          style={{ lineHeight: 19, maxWidth: 320 }}
        >
          Pas de panique, tes données sont en sécurité. Réessaie — si le problème
          persiste, écris-nous sur WhatsApp depuis les réglages.
        </Text>
        <Pressable
          onPress={this.reset}
          className="mt-6 flex-row items-center rounded-full bg-bordeaux-600 px-6 py-3"
          style={{ gap: 8 }}
        >
          <Icon name="refresh" size={17} color={colors.white} strokeWidth={2} />
          <Text className="font-semibold text-[14px] text-white">Réessayer</Text>
        </Pressable>
      </View>
    );
  }
}
