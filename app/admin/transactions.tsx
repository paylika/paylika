import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import { adminTransactions, type AdminTx } from "@/lib/admin";

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTransactions() {
  const [tx, setTx] = useState<AdminTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTx(await adminTransactions());
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = (tx ?? []).reduce((s, t) => s + t.amount, 0);
  const forPaylika = (tx ?? []).reduce((s, t) => s + t.commission, 0);

  return (
    <Screen onRefresh={load}>
      <View>
        <Eyebrow>Console · Flux</Eyebrow>
        <Text className="mt-1 font-display-x text-[28px] text-ink" style={{ letterSpacing: -1 }}>
          Transactions
        </Text>
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {tx !== null ? (
        <Card tone="dark">
          <View className="flex-row justify-between">
            <View>
              <Text className="font-medium text-[11px] uppercase text-white/50" style={{ letterSpacing: 0.4 }}>
                Volume ({tx.length})
              </Text>
              <Text className="mt-1 font-display-x text-[20px] text-white" style={{ letterSpacing: -0.6 }}>
                {formatInt(total)} XOF
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-medium text-[11px] uppercase text-white/50" style={{ letterSpacing: 0.4 }}>
                Dont Paylika
              </Text>
              <Text className="mt-1 font-display-x text-[20px] text-bordeaux-400" style={{ letterSpacing: -0.6 }}>
                {formatInt(forPaylika)} XOF
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {tx === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : tx.length === 0 ? (
        <Card>
          <Text className="font-sans text-[13px] text-ink-muted">Aucune transaction pour l'instant.</Text>
        </Card>
      ) : (
        tx.map((t) => (
          <Card key={t.id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-display-semi text-[15px] text-ink">
                  {formatInt(t.amount)} XOF
                </Text>
                <Text numberOfLines={1} className="mt-0.5 font-sans text-[12px] text-ink-muted">
                  {t.group} · {t.ownerEmail}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">
                  {when(t.paidAt)} · +{formatInt(t.commission)} pour Paylika
                </Text>
              </View>
              <Tag tone={t.status === "completed" ? "bordeaux" : "sand"}>
                {t.status === "completed" ? "Payé" : t.status}
              </Tag>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
