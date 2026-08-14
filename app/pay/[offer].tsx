import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Pressable,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, FieldLabel } from "@/components/form";
import { Icon, Logo } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";

type Tier = {
  id: string;
  label: string;
  intervalDays: number;
  price: number;
  comparePrice: number | null;
};
type OfferInfo = {
  id: string;
  offerName: string;
  groupName: string;
  currency: string;
  tiers: Tier[];
};

const CREATE_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/unitech-create";
const OFFER_INFO_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/offer-info";

// Drapeaux ronds (images réelles embarquées).
const FLAGS: Record<string, any> = {
  SN: require("../../assets/flags/sn.png"),
  CI: require("../../assets/flags/ci.png"),
  BF: require("../../assets/flags/bf.png"),
  TG: require("../../assets/flags/tg.png"),
  BJ: require("../../assets/flags/bj.png"),
};

// Vrais logos opérateurs (PNG embarqués), affichés en pastille ronde.
const OP_LOGOS: Record<string, any> = {
  wave: require("../../assets/operators/wave.png"),
  wave_money: require("../../assets/operators/wave.png"),
  orange_money: require("../../assets/operators/orange.png"),
  mtn_money: require("../../assets/operators/mtn.png"),
  moov: require("../../assets/operators/moov.png"),
  togocell: require("../../assets/operators/mixx.png"),
  free_money: require("../../assets/operators/mixx.png"),
};
const OP_LABELS: Record<string, string> = {
  wave: "Wave",
  wave_money: "Wave",
  orange_money: "Orange Money",
  mtn_money: "MTN",
  moov: "Moov",
  togocell: "Mixx by Yas",
  free_money: "Mixx by Yas",
};

const COUNTRIES: { code: string; label: string; operators: string[] }[] = [
  { code: "SN", label: "Sénégal", operators: ["wave", "orange_money"] },
  { code: "CI", label: "Côte d'Ivoire", operators: ["wave_money", "orange_money", "mtn_money", "moov"] },
  { code: "BF", label: "Burkina Faso", operators: ["orange_money", "wave_money", "moov"] },
  { code: "TG", label: "Togo", operators: ["moov", "togocell"] },
  { code: "BJ", label: "Bénin", operators: ["moov", "mtn_money"] },
];

function redirect(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
  } else {
    Linking.openURL(url);
  }
}

/** Round selectable (flag or operator badge) with a label underneath. */
function Choice({
  selected,
  onPress,
  label,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: 78, alignItems: "center" }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: selected ? 2.5 : 1,
          borderColor: selected ? colors.bordeaux[600] : colors.ink + "1A",
          padding: 2,
        }}
      >
        {children}
      </View>
      <Text
        numberOfLines={1}
        className={`mt-1.5 text-[11px] ${selected ? "font-bold text-ink" : "font-medium text-ink-muted"}`}
        style={{ maxWidth: 76, textAlign: "center" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const { offer, tg } = useLocalSearchParams<{ offer: string; tg?: string }>();

  const [info, setInfo] = useState<OfferInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierId, setTierId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("SN");
  const [operator, setOperator] = useState("wave");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${OFFER_INFO_URL}?id=${encodeURIComponent(String(offer))}`);
        const data = await res.json();
        if (data && data.tiers) {
          setInfo(data);
          const initial = data.tiers.find((t: Tier) => t.id === offer) ?? data.tiers[0];
          setTierId(initial?.id ?? "");
        }
      } catch {
        /* offre introuvable */
      } finally {
        setLoading(false);
      }
    })();
  }, [offer]);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const tier = info?.tiers.find((t) => t.id === tierId) ?? info?.tiers[0] ?? null;
  const opLabel = OP_LABELS[operator] ?? "l'opérateur";
  const phoneOk = phone.replace(/\D/g, "").length >= 9;

  function pickCountry(code: string) {
    setCountryCode(code);
    const next = COUNTRIES.find((c) => c.code === code);
    if (next) setOperator(next.operators[0]);
  }

  async function pay() {
    if (!phoneOk || submitting || !tier) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer: tier.id,
          tg: tg ?? "",
          country: countryCode,
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
        ) : !info || !tier ? (
          <Card>
            <Text className="font-sans text-[13px] text-ink-muted">Offre introuvable.</Text>
          </Card>
        ) : (
          <>
            {/* Offre + formules */}
            <Card>
              <Eyebrow>Abonnement</Eyebrow>
              <Text className="mt-1 font-display-semi text-[19px] text-ink">{info.offerName}</Text>

              <View className="mt-4" style={{ gap: 8 }}>
                {info.tiers.map((t) => {
                  const active = t.id === tier.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTierId(t.id)}
                      className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                        active ? "border-bordeaux-600 bg-bordeaux-50" : "border-ink/10 bg-card"
                      }`}
                    >
                      <View className="flex-row items-center" style={{ gap: 10 }}>
                        <View
                          className="h-5 w-5 items-center justify-center rounded-full"
                          style={{
                            borderWidth: active ? 0 : 1.5,
                            borderColor: colors.muted,
                            backgroundColor: active ? colors.bordeaux[600] : "transparent",
                          }}
                        >
                          {active ? <Icon name="check" size={11} color={colors.white} strokeWidth={2.8} /> : null}
                        </View>
                        <Text className={`text-[14px] ${active ? "font-bold text-ink" : "font-semibold text-ink-soft"}`}>
                          {t.label}
                        </Text>
                      </View>
                      <View className="flex-row items-baseline" style={{ gap: 6 }}>
                        {t.comparePrice ? (
                          <Text className="font-medium text-[12px] text-ink-muted" style={{ textDecorationLine: "line-through" }}>
                            {formatInt(t.comparePrice)}
                          </Text>
                        ) : null}
                        <Text className="font-display-semi text-[16px] text-ink">{formatInt(t.price)}</Text>
                        <Text className="font-medium text-[10px] text-ink-muted">{info.currency}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Pays + opérateur */}
            <Card>
              <View style={{ gap: 18 }}>
                <View>
                  <FieldLabel>Votre pays</FieldLabel>
                  <View className="mt-1 flex-row flex-wrap" style={{ gap: 6, rowGap: 12 }}>
                    {COUNTRIES.map((c) => (
                      <Choice
                        key={c.code}
                        selected={c.code === countryCode}
                        onPress={() => pickCountry(c.code)}
                        label={c.label}
                      >
                        <Image
                          source={FLAGS[c.code]}
                          style={{ width: "100%", height: "100%", borderRadius: 24 }}
                          resizeMode="cover"
                        />
                      </Choice>
                    ))}
                  </View>
                </View>

                <View>
                  <FieldLabel>Moyen de paiement</FieldLabel>
                  <View className="mt-1 flex-row flex-wrap" style={{ gap: 6, rowGap: 12 }}>
                    {country.operators.map((key) => (
                      <Choice
                        key={key}
                        selected={key === operator}
                        onPress={() => setOperator(key)}
                        label={OP_LABELS[key] ?? key}
                      >
                        <View
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 24,
                            backgroundColor: "#FFFFFF",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <Image source={OP_LOGOS[key]} style={{ width: "88%", height: "88%" }} resizeMode="contain" />
                        </View>
                      </Choice>
                    ))}
                  </View>
                </View>
              </View>
            </Card>

            {/* Coordonnées + paiement */}
            <Card>
              <View style={{ gap: 16 }}>
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
                {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}
                <Button
                  label={submitting ? "Traitement…" : `Payer ${formatInt(tier.price)} ${info.currency}`}
                  icon="arrow-up-right"
                  variant="accent"
                  onPress={pay}
                />
                <Text className="text-center font-sans text-[11px] text-ink-muted">
                  Vous serez redirigé vers {opLabel} pour confirmer. L'accès arrive sur Telegram.
                </Text>
              </View>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
