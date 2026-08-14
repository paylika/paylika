import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { colors } from "@/theme/colors";
import { fetchOffre, updateOffer, PERIODICITIES } from "@/data/queries";

export default function EditOffreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await fetchOffre(String(id));
        if (o) {
          setName(o.name);
          setPrice(String(o.price));
          setDays(o.interval_days);
          setGroupName(o.groupName);
        } else {
          setError("Offre introuvable.");
        }
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const priceNum = parseInt(price.replace(/\D/g, ""), 10) || 0;
  const valid = name.trim().length > 0 && priceNum > 0;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateOffer(String(id), {
        name: name.trim(),
        price: priceNum,
        intervalDays: days,
      });
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle eyebrow="Vendre · Modifier" title="Modifier l'offre" />

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ gap: 16 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text className="font-semibold text-[12px] text-ink-soft">Groupe :</Text>
                <Tag tone="bordeaux">{groupName}</Tag>
              </View>
              <Input label="Nom de l'offre" value={name} onChangeText={setName} />
              <Input
                label="Prix"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                suffix="XOF"
              />
              <View>
                <FieldLabel>Périodicité</FieldLabel>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {PERIODICITIES.map((p) => (
                    <Chip
                      key={p.days}
                      label={p.label}
                      active={days === p.days}
                      onPress={() => setDays(p.days)}
                    />
                  ))}
                </View>
              </View>
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
                label={saving ? "Enregistrement…" : "Enregistrer"}
                icon="check"
                variant="accent"
                onPress={save}
              />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
