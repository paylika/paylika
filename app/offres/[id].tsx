import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag } from "@/components/ui";
import { Input } from "@/components/form";
import { Icon } from "@/components/Icon";
import { CoverPicker } from "@/components/CoverPicker";
import { colors } from "@/theme/colors";
import {
  fetchOffre,
  fetchGroupPlans,
  updateOfferTiers,
  updateSalesPage,
  PERIODICITIES,
  type SalesPage,
} from "@/data/queries";

type TierState = { id?: string; price: string; compare: string };

/** Ligne « périodicité à cocher » (identique à l'onboarding) : coche + prix. */
function PeriodRow({
  label,
  selected,
  disabled,
  onToggle,
  tier,
  onChange,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  tier: TierState;
  onChange: (t: TierState) => void;
}) {
  return (
    <View
      className={`rounded-2xl border px-3.5 py-3 ${selected ? "border-bordeaux-600 bg-bordeaux-50" : "border-ink/10 bg-card"}`}
      style={{ opacity: disabled && !selected ? 0.4 : 1 }}
    >
      <Pressable onPress={onToggle} disabled={disabled && !selected} className="flex-row items-center justify-between">
        <Text className={`font-semibold text-[14px] ${selected ? "text-bordeaux-700" : "text-ink"}`}>{label}</Text>
        <View
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{
            backgroundColor: selected ? colors.bordeaux[600] : "transparent",
            borderWidth: selected ? 0 : 1.5,
            borderColor: colors.muted,
          }}
        >
          {selected ? <Icon name="check" size={13} color={colors.white} strokeWidth={2.6} /> : null}
        </View>
      </Pressable>
      {selected ? (
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix"
              value={tier.price}
              onChangeText={(v) => onChange({ ...tier, price: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="5000"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix barré (option)"
              value={tier.compare}
              onChangeText={(v) => onChange({ ...tier, compare: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="8000"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function EditOffreScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [offerName, setOfferName] = useState("");
  const [isTelegram, setIsTelegram] = useState(true);
  const [tiers, setTiers] = useState<Record<number, TierState>>({});
  const [salesPage, setSalesPage] = useState<SalesPage | null>(null);
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
        setIsTelegram(o.deliveryType === "telegram");
        setSalesPage(o.salesPage ?? null);
        const plans = await fetchGroupPlans(o.groupId);
        const map: Record<number, TierState> = {};
        for (const p of plans) {
          map[p.intervalDays] = {
            id: p.id,
            price: String(p.price),
            compare: p.comparePrice != null ? String(p.comparePrice) : "",
          };
        }
        setTiers(map);
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const num = (s: string) => parseInt((s ?? "").replace(/\D/g, ""), 10) || 0;
  const selectedDays = Object.keys(tiers).map(Number);
  const validCount = selectedDays.filter((d) => num(tiers[d].price) > 0).length;
  const valid = validCount > 0;

  function toggle(days: number) {
    setTiers((prev) => {
      const next = { ...prev };
      if (next[days]) delete next[days];
      else if (Object.keys(next).length < 3) next[days] = { price: "", compare: "" };
      return next;
    });
  }
  function setTier(days: number, t: TierState) {
    setTiers((prev) => ({ ...prev, [days]: t }));
  }

  // L'image se sauvegarde tout de suite (comme la photo de profil).
  async function onCover(url: string | null) {
    const next: SalesPage = { ...(salesPage ?? {}), cover: url };
    setSalesPage(next);
    try {
      await updateSalesPage(groupId, next);
    } catch (e: any) {
      setError(e?.message ?? "Image non enregistrée.");
    }
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const tierArray = selectedDays
        .filter((d) => num(tiers[d].price) > 0)
        .map((d) => ({
          id: tiers[d].id,
          intervalDays: isTelegram ? d : 0,
          price: num(tiers[d].price),
          comparePrice: tiers[d].compare ? num(tiers[d].compare) : null,
        }));
      await updateOfferTiers({ groupId, offerName: offerName || groupName || "Offre", tiers: tierArray });
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible");
      setSaving(false);
    }
  }

  const t0 = tiers[0] ?? { price: "", compare: "" };

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

          <CoverPicker value={salesPage?.cover ?? null} onChange={onCover} />

          {isTelegram ? (
            <Card>
              <Text className="font-display-semi text-[15px] text-ink">Vos formules</Text>
              <Text className="mt-1 mb-3 font-sans text-[12px] text-ink-muted">
                Cochez les périodicités (jusqu'à 3) et fixez leurs prix.
              </Text>
              <View style={{ gap: 8 }}>
                {PERIODICITIES.map((p) => {
                  const selected = !!tiers[p.days];
                  return (
                    <PeriodRow
                      key={p.days}
                      label={p.label}
                      selected={selected}
                      disabled={selectedDays.length >= 3}
                      onToggle={() => toggle(p.days)}
                      tier={tiers[p.days] ?? { price: "", compare: "" }}
                      onChange={(t) => setTier(p.days, t)}
                    />
                  );
                })}
              </View>
            </Card>
          ) : (
            <Card>
              <Input
                label="Prix"
                value={t0.price}
                onChangeText={(v) => setTier(0, { ...t0, price: v })}
                keyboardType="numeric"
                suffix="XOF"
                placeholder="5000"
              />
              <Text className="mt-2 font-sans text-[11px] text-ink-muted">
                Paiement unique (pas de récurrence sur ce mode de livraison).
              </Text>
            </Card>
          )}

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
