import { useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAsync, fetchGroups, createOffer, PERIODICITIES } from "@/data/queries";

const NEW = "__new__";

type TierForm = { days: number; price: string; compare: string };

function TierCard({
  index,
  tier,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  tier: TierForm;
  onChange: (t: TierForm) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Eyebrow>{index === 0 ? "Formule principale" : `Formule ${index + 1} (optionnelle)`}</Eyebrow>
        {removable ? (
          <Pressable onPress={onRemove} className="h-7 w-7 items-center justify-center rounded-full bg-bordeaux-50">
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
                active={tier.days === p.days}
                onPress={() => onChange({ ...tier, days: p.days })}
              />
            ))}
          </View>
        </View>
        <View className="flex-row" style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix"
              value={tier.price}
              onChangeText={(v) => onChange({ ...tier, price: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="10000"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix barré (option)"
              value={tier.compare}
              onChangeText={(v) => onChange({ ...tier, compare: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="15000"
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function NouvelleOffreScreen() {
  const router = useRouter();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const onboarding = first === "1";
  const { data: groups, loading: groupsLoading } = useAsync(fetchGroups);

  const [groupChoice, setGroupChoice] = useState<string>(NEW);
  const [newGroupName, setNewGroupName] = useState("");
  const [tiers, setTiers] = useState<TierForm[]>([{ days: 30, price: "", compare: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatingNewGroup = groupChoice === NEW;
  // Le nom de l'offre = le nom du groupe/canal (nouveau ou existant).
  const selectedGroupName = groups?.find((g) => g.id === groupChoice)?.name ?? "";
  const offerName = creatingNewGroup ? newGroupName.trim() : selectedGroupName;
  const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
  const validTiers = tiers.filter((t) => num(t.price) > 0);
  const valid =
    (creatingNewGroup ? newGroupName.trim().length > 0 : !!groupChoice) &&
    validTiers.length > 0;

  function updateTier(i: number, t: TierForm) {
    setTiers((prev) => prev.map((x, idx) => (idx === i ? t : x)));
  }
  function addTier() {
    if (tiers.length >= 3) return;
    // pick a periodicity not already used
    const used = new Set(tiers.map((t) => t.days));
    const next = PERIODICITIES.find((p) => !used.has(p.days))?.days ?? 30;
    setTiers((prev) => [...prev, { days: next, price: "", compare: "" }]);
  }
  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createOffer({
        offerName: offerName || "Offre",
        currency: "XOF",
        groupId: creatingNewGroup ? undefined : groupChoice,
        newGroup: creatingNewGroup ? { name: newGroupName.trim(), kind: "telegram" } : undefined,
        tiers: validTiers.map((t) => ({
          intervalDays: t.days,
          price: num(t.price),
          comparePrice: num(t.compare) > 0 ? num(t.compare) : null,
        })),
      });
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Création impossible.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle
        eyebrow={onboarding ? "Bienvenue 👋" : "Vendre · Nouvelle offre"}
        title={onboarding ? "Créez votre première offre" : "Créer une offre"}
        subtitle={
          onboarding
            ? "En 1 minute : nommez votre offre, choisissez le groupe, fixez vos prix."
            : "Nom, groupe et jusqu'à 3 formules (périodicités au choix)."
        }
      />

      <Card>
        <View style={{ gap: 16 }}>
          <View>
            <FieldLabel>Groupe / canal</FieldLabel>
            <Text className="mb-2 font-sans text-[11px] text-ink-muted">
              Son nom devient le nom de l'offre.
            </Text>
            {groupsLoading ? (
              <ActivityIndicator color={colors.bordeaux[600]} />
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {(groups ?? []).map((g) => (
                  <Chip key={g.id} label={g.name} active={groupChoice === g.id} onPress={() => setGroupChoice(g.id)} />
                ))}
                <Chip label="+ Nouveau groupe" active={creatingNewGroup} onPress={() => setGroupChoice(NEW)} />
              </View>
            )}
          </View>
          {creatingNewGroup ? (
            <Input
              label="Nom du groupe / canal Telegram"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Ex. Crypto Signals VIP"
              autoFocus
            />
          ) : null}
        </View>
      </Card>

      {/* Formules */}
      {tiers.map((t, i) => (
        <TierCard
          key={i}
          index={i}
          tier={t}
          onChange={(nt) => updateTier(i, nt)}
          onRemove={() => removeTier(i)}
          removable={i > 0}
        />
      ))}

      {tiers.length < 3 ? (
        <Pressable
          onPress={addTier}
          className="flex-row items-center justify-center rounded-2xl border border-dashed border-ink/20 py-3.5"
        >
          <Icon name="plus" size={16} color={colors.bordeaux[600]} strokeWidth={2} />
          <Text className="ml-2 font-semibold text-[13px] text-bordeaux-700">
            Ajouter une formule
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

      <View className="flex-row" style={{ gap: 10 }}>
        {!onboarding ? (
          <View style={{ flex: 1 }}>
            <Button label="Annuler" variant="outline" onPress={() => router.back()} />
          </View>
        ) : null}
        <View style={{ flex: 1.4 }}>
          <Button
            label={saving ? "Création…" : "Créer l'offre"}
            icon="check"
            variant="accent"
            onPress={save}
          />
        </View>
      </View>

      {!valid ? (
        <Text className="text-center font-sans text-[11px] text-ink-muted">
          Renseignez un nom, un groupe et au moins un prix.
        </Text>
      ) : null}
    </Screen>
  );
}
