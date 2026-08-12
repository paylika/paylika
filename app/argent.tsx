import { View, Text, ActivityIndicator } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { colors } from "@/theme/colors";
import { useAsync, fetchMoney } from "@/data/queries";
import { formatInt } from "@/components/cards";

export default function ArgentScreen() {
  const { data, loading, error } = useAsync(fetchMoney);

  return (
    <Screen>
      <PageTitle
        eyebrow="Encaisser"
        title="Argent"
        subtitle="Revenus, commission Paylika (10 %) et retraits gratuits."
      />

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text className="font-sans text-[12px] text-ink-muted">{error}</Text>
        </Card>
      ) : data ? (
        <>
          {/* Solde disponible (dark hero) */}
          <Card tone="dark">
            <Eyebrow>Solde disponible</Eyebrow>
            <View className="mt-2 flex-row items-baseline">
              <Text
                className="font-display-x text-[38px] text-white"
                style={{ letterSpacing: -1.4 }}
              >
                {formatInt(data.netBalance)}
              </Text>
              <Text className="ml-2 font-medium text-[14px] text-white/60">
                {data.currency}
              </Text>
            </View>
            <Text className="mt-1 font-sans text-[12px] text-white/50">
              Après commission · retrait gratuit
            </Text>
            <View className="mt-4" style={{ maxWidth: 220 }}>
              <Button label="Retirer" icon="arrow-up-right" variant="accent" />
            </View>
          </Card>

          {/* Breakdown */}
          <View className="flex-row" style={{ gap: 14 }}>
            <Card className="flex-1">
              <Eyebrow>Revenu brut</Eyebrow>
              <Text
                className="mt-2 font-display text-[24px] text-ink"
                style={{ letterSpacing: -0.6 }}
              >
                {formatInt(data.totalRevenue)}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-ink-muted">
                {data.paymentsCount} paiement{data.paymentsCount > 1 ? "s" : ""}
              </Text>
            </Card>
            <Card className="flex-1">
              <Eyebrow>Commission Paylika</Eyebrow>
              <Text
                className="mt-2 font-display text-[24px] text-bordeaux-600"
                style={{ letterSpacing: -0.6 }}
              >
                −{formatInt(data.commission)}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-ink-muted">10 % des paiements</Text>
            </Card>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
