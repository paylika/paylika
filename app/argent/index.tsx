import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchMoney, type Money, type Transaction } from "@/data/queries";
import { formatInt } from "@/components/cards";

const MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
function shortDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function TxRow({ t, last }: { t: Transaction; last: boolean }) {
  const isIn = t.kind === "in";
  return (
    <View className={`flex-row items-center py-3 ${last ? "" : "border-b border-ink/[0.06]"}`}>
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isIn ? "rgba(47,107,79,0.12)" : colors.bordeaux[50] }}
      >
        <Icon
          name={isIn ? "trend-up" : "arrow-up-right"}
          size={16}
          color={isIn ? colors.forest : colors.bordeaux[600]}
        />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-[13px] text-ink">{t.label}</Text>
        <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">{shortDate(t.date)}</Text>
      </View>
      <Text
        className="font-semibold text-[14px]"
        style={{ color: isIn ? colors.forest : colors.bordeaux[600] }}
      >
        {isIn ? "+" : ""}
        {formatInt(t.amount)}
      </Text>
    </View>
  );
}

export default function ArgentScreen() {
  const router = useRouter();
  const [money, setMoney] = useState<Money | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setMoney(await fetchMoney());
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <PageTitle
        eyebrow="Encaisser"
        title="Argent"
        subtitle="Solde, retraits gratuits et transparence des flux."
      />

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {money === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          {/* Solde hero */}
          <Card tone="dark">
            <Eyebrow>Solde disponible</Eyebrow>
            <View className="mt-2 flex-row items-baseline">
              <Text className="font-display-x text-[40px] text-white" style={{ letterSpacing: -1.6 }}>
                {formatInt(money.available)}
              </Text>
              <Text className="ml-2 font-medium text-[15px] text-white/60">{money.currency}</Text>
            </View>
            <Text className="mt-1 font-sans text-[12px] text-white/50">
              Après commission Paylika · retrait gratuit
            </Text>
            <View className="mt-4" style={{ maxWidth: 220 }}>
              <Button
                label="Retirer"
                icon="arrow-up-right"
                variant="accent"
                onPress={() => router.push("/argent/retrait" as any)}
              />
            </View>
          </Card>

          {/* Stats / transparence */}
          <View className="flex-row" style={{ gap: 14 }}>
            <Card className="flex-1">
              <Eyebrow>Revenu brut</Eyebrow>
              <Text className="mt-2 font-display text-[22px] text-ink" style={{ letterSpacing: -0.6 }}>
                {formatInt(money.totalRevenue)}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-ink-muted">
                {money.paymentsCount} paiement{money.paymentsCount > 1 ? "s" : ""}
              </Text>
            </Card>
            <Card className="flex-1">
              <Eyebrow>Commission 10 %</Eyebrow>
              <Text className="mt-2 font-display text-[22px] text-bordeaux-600" style={{ letterSpacing: -0.6 }}>
                −{formatInt(money.commission)}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-ink-muted">part Paylika</Text>
            </Card>
          </View>

          <View className="flex-row" style={{ gap: 14 }}>
            <Card className="flex-1">
              <Eyebrow>Net gagné</Eyebrow>
              <Text className="mt-2 font-display text-[22px] text-forest" style={{ letterSpacing: -0.6 }}>
                {formatInt(money.netEarned)}
              </Text>
            </Card>
            <Card className="flex-1">
              <Eyebrow>Déjà retiré</Eyebrow>
              <Text className="mt-2 font-display text-[22px] text-ink" style={{ letterSpacing: -0.6 }}>
                {formatInt(money.paidOut)}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-ink-muted">
                {money.payoutsCount} retrait{money.payoutsCount > 1 ? "s" : ""}
              </Text>
            </Card>
          </View>

          {/* Transactions */}
          <Card>
            <Eyebrow>Transactions</Eyebrow>
            {money.transactions.length ? (
              <View className="mt-1">
                {money.transactions.slice(0, 20).map((t, i) => (
                  <TxRow key={t.id} t={t} last={i === Math.min(money.transactions.length, 20) - 1} />
                ))}
              </View>
            ) : (
              <Text className="mt-2 font-sans text-[13px] text-ink-muted">
                Aucune transaction pour le moment.
              </Text>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
