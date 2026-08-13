import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, Segmented } from "@/components/form";
import { useAsync, fetchMoney, createPayout } from "@/data/queries";
import { formatInt } from "@/components/cards";

export default function RetraitScreen() {
  const router = useRouter();
  const { data: money } = useAsync(fetchMoney);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"wave" | "orange_money" | "free_money">("wave");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = money?.available ?? 0;
  const amountNum = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const overBalance = amountNum > available;
  const valid = amountNum > 0 && !overBalance && destination.trim().length >= 6;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createPayout({ amount: amountNum, method, destination: destination.trim() });
      router.replace("/argent");
    } catch (e: any) {
      setError(e?.message ?? "Retrait impossible");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle eyebrow="Encaisser · Retrait" title="Retirer mon solde" />

      <Card tone="dark">
        <Eyebrow>Disponible</Eyebrow>
        <View className="mt-1 flex-row items-baseline">
          <Text className="font-display-x text-[30px] text-white" style={{ letterSpacing: -1 }}>
            {money ? formatInt(available) : "—"}
          </Text>
          <Text className="ml-2 font-medium text-[13px] text-white/60">
            {money?.currency ?? "XOF"}
          </Text>
        </View>
      </Card>

      <Card>
        <View style={{ gap: 16 }}>
          <Input
            label="Montant à retirer"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            suffix="XOF"
            autoFocus
          />
          {overBalance ? (
            <Text className="font-sans text-[12px] text-bordeaux-700">
              Montant supérieur au solde disponible.
            </Text>
          ) : null}
          <Segmented
            label="Moyen"
            value={method}
            onChange={setMethod}
            options={[
              { label: "Wave", value: "wave" },
              { label: "Orange", value: "orange_money" },
              { label: "Free", value: "free_money" },
            ]}
          />
          <Input
            label="Numéro de réception"
            value={destination}
            onChangeText={setDestination}
            keyboardType="numeric"
            placeholder="77 000 00 00"
          />
          <Text className="font-sans text-[11px] text-ink-muted">
            Retrait gratuit · traité sous 24 h.
          </Text>
          {error ? (
            <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
          ) : null}
        </View>
      </Card>

      <View className="flex-row" style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Annuler" variant="outline" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={saving ? "En cours…" : "Confirmer le retrait"}
            icon="check"
            variant="accent"
            onPress={submit}
          />
        </View>
      </View>
    </Screen>
  );
}
