import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchOffre, fetchGroupPlans, updateOfferTiers, PERIODICITIES } from "@/data/queries";

type Tier = { id?: string; days: number; price: string; compare: string };

export default function EditOffreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [offerName, setOfferName] = useState("");
  const [isTelegram, setIsTelegram] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await fetchOffre(String(id));
        if (!o) {
          setError("Offre introuvable.");
          setLoading(false);
          return;
        }
        setGroupId(o.groupId);
        setGroupName(o.groupName);
        setOfferName((o.name.split(" — ")[0] || o.name).trim());
        const tg = o.deliveryType === "telegram";
        setIsTelegram(tg);
        const plans = await fetchGroupPlans(o.groupId);
        const rows: Tier[] = plans.map((p) => ({
          id: p.id,
          days: p.intervalDays,
          price: String(p.price),
          compare: p.comparePrice != null ? String(p.comparePrice) : "",
        }));
        setTiers(rows.length ? rows : [{ days: tg ? 30 : 0, price: String(o.price), compare: "" }]);
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
  const updateTier = (i: number, patch: Partial<Tier>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));
  const addTier = () => {
    const used = new Set(tiers.map((t) => t.days));
    const next = PERIODICITIES.find((p) => !used.has(p.days))?.days ?? 30;
    setTiers((prev) => [...prev, { days: next, price: "", compare: "" }]);
  };

  const validTiers = tiers.filter((t) => num(t.price) > 0);
  const daysList = validTiers.map((t) => t.days);
  const hasDup = isTelegram && new Set(daysList).size !== daysList.length;
  const valid = validTiers.length > 0 && !hasDup;
  const canAdd = isTelegram && tiers.length < PERIODICITIES.length;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateOfferTiers({
        groupId,
        offerName: offerName || groupName || "Offre",
        tiers: validTiers.map((t) => ({
          id: t.id,
          intervalDays: isTelegram ? t.days : 0,
          price: num(t.price),
          comparePrice: t.compare ? num(t.compare) : null,
        })),
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
      ) : error && !groupId ? (
        <Card>
          <Text className="font-sans text-[13px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : (
        <>
          <Card>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text className="font-semibold text-[12px] text-ink-soft">{isTelegram ? "Groupe :" : "Offre :"}</Text>
              <Tag tone="bordeaux">{groupName}</Tag>
            </View>
            {!isTelegram ? (
              <View className="mt-4">
                <Input label="Nom de l'offre" value={offerName} onChangeText={setOfferName} />
              </View>
            ) : null}
          </Card>

          {isTelegram ? (
            <>
              {tiers.map((t, i) => {
                const usedByOthers = new Set(tiers.filter((_, idx) => idx !== i).map((x) => x.days));
                return (
                  <Card key={t.id ?? `new-${i}`}>
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-[11px] uppercase text-ink-muted" style={{ letterSpacing: 0.6 }}>
                        {`Formule ${i + 1}`}
                      </Text>
                      {tiers.length > 1 ? (
                        <Pressable
                          onPress={() => removeTier(i)}
                          className="h-7 w-7 items-center justify-center rounded-full bg-bordeaux-50"
                        >
                          <Icon name="close" size={14} color={colors.bordeaux[600]} />
                        </Pressable>
                      ) : null}
                    </View>
                    <View className="mt-3" style={{ gap: 12 }}>
                      <View>
                        <FieldLabel>Périodicité</FieldLabel>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                          {PERIODICITIES.map((p) => (
                            <Chip
                              key={p.days}
                              label={p.label}
                              active={t.days === p.days}
                              onPress={() => {
                                if (!usedByOthers.has(p.days)) updateTier(i, { days: p.days });
                              }}
                            />
                          ))}
                        </View>
                      </View>
                      <View className="flex-row" style={{ gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="Prix"
                            value={t.price}
                            onChangeText={(v) => updateTier(i, { price: v })}
                            keyboardType="numeric"
                            suffix="XOF"
                            placeholder="10000"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Input
                            label="Prix barré (option)"
                            value={t.compare}
                            onChangeText={(v) => updateTier(i, { compare: v })}
                            keyboardType="numeric"
                            suffix="XOF"
                            placeholder="15000"
                          />
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })}
              {canAdd ? (
                <Pressable
                  onPress={addTier}
                  className="flex-row items-center justify-center rounded-2xl border border-dashed border-bordeaux-600/40 py-3.5"
                  style={{ gap: 6 }}
                >
                  <Icon name="plus" size={16} color={colors.bordeaux[600]} strokeWidth={2} />
                  <Text className="font-semibold text-[13px] text-bordeaux-700">Ajouter une périodicité</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Card>
              <Input
                label="Prix"
                value={tiers[0]?.price ?? ""}
                onChangeText={(v) => updateTier(0, { price: v })}
                keyboardType="numeric"
                suffix="XOF"
                placeholder="5000"
              />
              <Text className="mt-2 font-sans text-[11px] text-ink-muted">
                Paiement unique (pas de récurrence sur ce mode de livraison).
              </Text>
            </Card>
          )}

          {hasDup ? (
            <Text className="font-sans text-[12px] text-bordeaux-700">Deux formules ont la même périodicité.</Text>
          ) : null}
          {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

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
