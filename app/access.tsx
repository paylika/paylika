import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Platform, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Button } from "@/components/ui";
import { Logo, Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";

const STATUS_URL = "https://xkdiodbppotyiyldlwbg.functions.supabase.co/access-status";

type State = {
  status: "pending" | "completed" | "unknown";
  deliveryType: string;
  offerName: string;
  target: string | null;
};

function openTarget(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = url;
  else Linking.openURL(url);
}

export default function AccessScreen() {
  const insets = useSafeAreaInsets();
  const { ref: refParam } = useLocalSearchParams<{ ref?: string }>();
  const [ref, setRef] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let r = typeof refParam === "string" && refParam ? refParam : null;
    if (!r && typeof window !== "undefined") r = window.localStorage.getItem("paylika_last_ref");
    setRef(r);
  }, [refParam]);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    let n = 0;
    let id: ReturnType<typeof setInterval>;
    const tick = async () => {
      try {
        const res = await fetch(`${STATUS_URL}?ref=${encodeURIComponent(ref)}`);
        const data = (await res.json()) as State;
        if (!alive) return;
        setState(data);
        if (data.status === "completed") clearInterval(id);
      } catch {
        /* réseau */
      }
    };
    tick();
    id = setInterval(() => {
      n += 1;
      if (n > 40) clearInterval(id); // ~2 min max
      tick();
    }, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ref]);

  const completed = state?.status === "completed";
  const dt = state?.deliveryType;

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ width: "100%", maxWidth: 440, gap: 16 }}>
        <View className="items-center">
          <Logo size={44} />
          <Text className="mt-2 font-display text-[22px] text-ink" style={{ letterSpacing: -0.5 }}>
            Pay<Text className="text-bordeaux-600">lika</Text>
          </Text>
        </View>

        {!ref ? (
          <Card>
            <Text className="font-sans text-[13px] text-ink-muted">
              Aucun paiement à afficher. Revenez depuis votre lien de paiement.
            </Text>
          </Card>
        ) : !completed ? (
          <Card>
            <View className="items-center py-6">
              <ActivityIndicator color={colors.bordeaux[600]} />
              <Text className="mt-3 font-display-semi text-[16px] text-ink">
                Paiement en cours de confirmation…
              </Text>
              <Text className="mt-1 text-center font-sans text-[12px] text-ink-muted">
                Quelques secondes. Ne fermez pas cette page.
              </Text>
            </View>
          </Card>
        ) : (
          <Card>
            <View className="items-center">
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.forest }}
              >
                <Icon name="check" size={24} color={colors.white} strokeWidth={2.6} />
              </View>
              <Text className="mt-3 font-display-semi text-[18px] text-ink">Paiement confirmé</Text>
              {state?.offerName ? (
                <Text className="mt-1 text-center font-sans text-[13px] text-ink-muted">{state.offerName}</Text>
              ) : null}
            </View>

            {dt === "whatsapp" && state?.target ? (
              <View className="mt-5">
                <Button
                  label="Rejoindre le groupe WhatsApp"
                  icon="arrow-up-right"
                  variant="accent"
                  onPress={() => openTarget(state.target!)}
                />
                <Text className="mt-2 text-center font-sans text-[11px] text-ink-muted">
                  Cliquez pour ouvrir WhatsApp et rejoindre le groupe.
                </Text>
              </View>
            ) : dt === "link" && state?.target ? (
              <View className="mt-5">
                <Button
                  label="Accéder au contenu"
                  icon="arrow-up-right"
                  variant="accent"
                  onPress={() => openTarget(state.target!)}
                />
              </View>
            ) : (
              <Text className="mt-4 text-center font-sans text-[12px] text-ink-muted">
                Merci ! Votre paiement est bien enregistré.
              </Text>
            )}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
