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
import { fetchOffre, type Offre } from "@/data/queries";
import { formatInt } from "@/components/cards";

const SOFTPAY_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/paydunya-softpay";

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

  const [plan, setPlan] = useState<Offre | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<"wave" | "orange_money">("wave");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setPlan(await fetchOffre(String(offer)));
      } catch {
        setError("Offre introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [offer]);

  const phoneOk = phone.replace(/\D/g, "").length >= 9;
  const valid = phoneOk && fullName.trim().length > 0;

  async function pay() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(SOFTPAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer: String(offer),
          tg: tg ?? "",
          operator,
          fullName: fullName.trim(),
          phone: phone.replace(/\s/g, ""),
        }),
      });
      const data = await res.json();
      if (data.url) {
        redirect(data.url);
        return;
      }
      if (data.ok) {
        setPending(true);
      } else {
        setError(data.error || data.message || "Paiement impossible. Réessayez.");
      }
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
        {/* Brand */}
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
            <Text className="font-sans text-[13px] text-ink-muted">
              {error ?? "Offre introuvable."}
            </Text>
          </Card>
        ) : pending ? (
          <Card>
            <Eyebrow>Presque fini</Eyebrow>
            <Text className="mt-2 font-display-semi text-[18px] text-ink">
              Confirmez sur votre téléphone
            </Text>
            <Text className="mt-2 font-sans text-[13px] text-ink-muted">
              Validez la demande de paiement reçue sur votre mobile. Dès la
              confirmation, votre accès au groupe arrive sur Telegram. ✅
            </Text>
          </Card>
        ) : (
          <>
            {/* Offer summary */}
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
                  <Text className="font-display-x text-[26px] text-ink" style={{ letterSpacing: -1 }}>
                    {formatInt(plan.price)}
                  </Text>
                  <Text className="font-medium text-[11px] text-ink-muted">{plan.currency}</Text>
                </View>
              </View>
            </Card>

            {/* Payment form */}
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
                  label="Nom complet"
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
                  icon="check"
                  variant="accent"
                  onPress={pay}
                />
                <Text className="text-center font-sans text-[11px] text-ink-muted">
                  Paiement sécurisé · l'accès est envoyé sur Telegram après confirmation.
                </Text>
              </View>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
