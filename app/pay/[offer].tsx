import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Button, Eyebrow, Tag } from "@/components/ui";
import { Input, Segmented } from "@/components/form";
import { Logo } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";

type PayPlan = {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  currency: string;
  groupName: string;
};

const CREATE_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/unitech-create";
const OFFER_INFO_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/offer-info";

function redirect(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
  } else {
    Linking.openURL(url);
  }
}

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const { offer, tg } = useLocalSearchParams<{ offer: string; tg?: string }>();

  const [plan, setPlan] = useState<PayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<"wave" | "orange_money">("wave");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${OFFER_INFO_URL}?id=${encodeURIComponent(String(offer))}`);
        const data = await res.json();
        if (data && data.id) setPlan(data);
      } catch {
        /* offre introuvable */
      } finally {
        setLoading(false);
      }
    })();
  }, [offer]);

  const phoneOk = phone.replace(/\D/g, "").length >= 9;

  async function pay() {
    if (!phoneOk || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer: String(offer),
          tg: tg ?? "",
          operator,
          phone: phone.replace(/\s/g, ""),
          fullName: fullName.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        redirect(data.url);
        return;
      }
      setError(data.error || "Paiement impossible. Réessayez.");
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

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

        {loading ? (
          <Card>
            <View className="items-center py-8">
              <ActivityIndicator color={colors.bordeaux[600]} />
            </View>
          </Card>
        ) : !plan ? (
          <Card>
            <Text className="font-sans text-[13px] text-ink-muted">Offre introuvable.</Text>
          </Card>
        ) : (
          <>
            <Card>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Eyebrow>Abonnement</Eyebrow>
                  <Text className="mt-1 font-display-semi text-[17px] text-ink">
                    {plan.name}
                  </Text>
                  <View className="mt-2">
                    <Tag tone="bordeaux">{plan.groupName}</Tag>
                  </View>
                </View>
                <View className="items-end">
                  {plan.comparePrice ? (
                    <Text
                      className="font-medium text-[13px] text-ink-muted"
                      style={{ textDecorationLine: "line-through" }}
                    >
                      {formatInt(plan.comparePrice)}
                    </Text>
                  ) : null}
                  <Text className="font-display-x text-[26px] text-ink" style={{ letterSpacing: -1 }}>
                    {formatInt(plan.price)}
                  </Text>
                  <Text className="font-medium text-[11px] text-ink-muted">{plan.currency}</Text>
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ gap: 16 }}>
                <Segmented
                  label="Moyen de paiement"
                  value={operator}
                  onChange={setOperator}
                  options={[
                    { label: "Wave", value: "wave" },
                    { label: "Orange Money", value: "orange_money" },
                  ]}
                />
                <Input
                  label="Nom complet (optionnel)"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ex. Awa Ndiaye"
                />
                <Input
                  label="Numéro de téléphone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="numeric"
                  placeholder="77 000 00 00"
                />
                {error ? (
                  <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
                ) : null}
                <Button
                  label={submitting ? "Traitement…" : `Payer ${formatInt(plan.price)} ${plan.currency}`}
                  icon="arrow-up-right"
                  variant="accent"
                  onPress={pay}
                />
                <Text className="text-center font-sans text-[11px] text-ink-muted">
                  Vous serez redirigé vers {operator === "wave" ? "Wave" : "Orange Money"} pour confirmer. L'accès arrive sur Telegram.
                </Text>
              </View>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
