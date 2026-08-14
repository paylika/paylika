import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Logo } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import { loadPixel, track } from "@/lib/pixel";

const OFFER_INFO_URL = "https://xkdiodbppotyiyldlwbg.functions.supabase.co/offer-info";

type Tier = { id: string; price: number; comparePrice: number | null; intervalDays: number };
type Sales = {
  cover?: string | null;
  headline?: string;
  subheadline?: string;
  benefits?: string[];
  description?: string;
  guarantee?: string;
};
type Info = {
  id: string;
  offerName: string;
  currency: string;
  deliveryType?: string;
  metaPixelId?: string | null;
  salesPage?: Sales | null;
  tiers: Tier[];
};

function CTA({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center rounded-2xl bg-bordeaux-600 px-6 py-4"
      style={{ shadowColor: colors.bordeaux[600], shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
    >
      <Text className="font-display-semi text-[16px] text-white">{label}</Text>
      <Icon name="arrow-up-right" size={18} color={colors.white} />
    </Pressable>
  );
}

export default function SalesPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { offer } = useLocalSearchParams<{ offer: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${OFFER_INFO_URL}?id=${encodeURIComponent(String(offer))}`);
        const data = await res.json();
        if (data && data.tiers) {
          setInfo(data);
          loadPixel(data.metaPixelId);
          track("ViewContent", { content_name: data.offerName, currency: data.currency });
        }
      } catch {
        /* introuvable */
      } finally {
        setLoading(false);
      }
    })();
  }, [offer]);

  const buy = () => router.push(`/pay/${offer}` as any);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.bordeaux[600]} />
      </View>
    );
  }
  if (!info) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="font-sans text-[14px] text-ink-muted">Offre introuvable.</Text>
      </View>
    );
  }

  const s = info.salesPage ?? {};
  const cheapest = [...info.tiers].sort((a, b) => a.price - b.price)[0];
  const headline = s.headline?.trim() || info.offerName;
  const benefits = (s.benefits ?? []).filter((b) => b.trim());

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 40 }}
    >
      <View style={{ width: "100%", maxWidth: 560 }}>
        {/* Cover */}
        {s.cover ? (
          <Image source={{ uri: s.cover }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
        ) : (
          <View style={{ height: insets.top + 12 }} />
        )}

        <View className="px-5" style={{ marginTop: s.cover ? -28 : insets.top }}>
          {/* Carte héro */}
          <View className="rounded-3xl border border-ink/[0.08] bg-card p-5" style={{ gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Logo size={22} />
              <Text className="font-display text-[15px] text-ink" style={{ letterSpacing: -0.3 }}>
                Pay<Text className="text-bordeaux-600">lika</Text>
              </Text>
            </View>

            <Text className="font-display-x text-[26px] text-ink" style={{ letterSpacing: -1, lineHeight: 30 }}>
              {headline}
            </Text>
            {s.subheadline?.trim() ? (
              <Text className="font-sans text-[14px] text-ink-soft" style={{ lineHeight: 20 }}>
                {s.subheadline}
              </Text>
            ) : null}

            <View className="flex-row items-baseline" style={{ gap: 8 }}>
              {cheapest?.comparePrice ? (
                <Text className="font-medium text-[15px] text-ink-muted" style={{ textDecorationLine: "line-through" }}>
                  {formatInt(cheapest.comparePrice)}
                </Text>
              ) : null}
              <Text className="font-display-x text-[30px] text-ink" style={{ letterSpacing: -1.2 }}>
                {formatInt(cheapest?.price ?? 0)}
              </Text>
              <Text className="font-medium text-[13px] text-ink-muted">{info.currency}</Text>
            </View>

            <CTA label="Acheter maintenant" onPress={buy} />
            <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
              <Icon name="check" size={13} color={colors.forest} strokeWidth={2.4} />
              <Text className="font-sans text-[11px] text-ink-muted">
                Paiement Wave / Orange Money · Accès immédiat après paiement
              </Text>
            </View>
          </View>

          {/* Bénéfices */}
          {benefits.length ? (
            <View className="mt-4 rounded-3xl border border-ink/[0.08] bg-card p-5">
              <Text className="font-display-semi text-[16px] text-ink">Ce que vous obtenez</Text>
              <View className="mt-3" style={{ gap: 10 }}>
                {benefits.map((b, i) => (
                  <View key={i} className="flex-row items-start" style={{ gap: 10 }}>
                    <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-bordeaux-50">
                      <Icon name="check" size={12} color={colors.bordeaux[600]} strokeWidth={2.6} />
                    </View>
                    <Text className="flex-1 font-sans text-[14px] text-ink-soft" style={{ lineHeight: 20 }}>
                      {b}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Description */}
          {s.description?.trim() ? (
            <View className="mt-4 rounded-3xl border border-ink/[0.08] bg-card p-5">
              <Text className="font-sans text-[14px] text-ink-soft" style={{ lineHeight: 21 }}>
                {s.description}
              </Text>
            </View>
          ) : null}

          {/* Garantie */}
          {s.guarantee?.trim() ? (
            <View className="mt-4 flex-row items-center rounded-3xl bg-bordeaux-50 p-4" style={{ gap: 10 }}>
              <Icon name="check" size={18} color={colors.bordeaux[600]} strokeWidth={2.4} />
              <Text className="flex-1 font-semibold text-[13px] text-bordeaux-700" style={{ lineHeight: 18 }}>
                {s.guarantee}
              </Text>
            </View>
          ) : null}

          {/* CTA final */}
          <View className="mt-5">
            <CTA label={`Payer ${formatInt(cheapest?.price ?? 0)} ${info.currency}`} onPress={buy} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
