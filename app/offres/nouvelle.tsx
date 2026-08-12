import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, Segmented, Chip, FieldLabel } from "@/components/form";
import { colors } from "@/theme/colors";
import { useAsync, fetchGroups, createOffer } from "@/data/queries";

const NEW = "__new__";

export default function NouvelleOffreScreen() {
  const router = useRouter();
  const { data: groups, loading: groupsLoading } = useAsync(fetchGroups);

  const [planName, setPlanName] = useState("");
  const [groupChoice, setGroupChoice] = useState<string>(NEW);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupKind, setNewGroupKind] = useState<"telegram" | "gym" | "other">(
    "telegram"
  );
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<"30" | "90" | "365">("30");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNum = parseInt(price.replace(/\D/g, ""), 10) || 0;
  const creatingNewGroup = groupChoice === NEW;
  const valid =
    planName.trim().length > 0 &&
    priceNum > 0 &&
    (creatingNewGroup ? newGroupName.trim().length > 0 : true);

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOffer({
        planName: planName.trim(),
        price: priceNum,
        currency: "XOF",
        intervalDays: parseInt(interval, 10),
        groupId: creatingNewGroup ? undefined : groupChoice,
        newGroup: creatingNewGroup
          ? { name: newGroupName.trim(), kind: newGroupKind }
          : undefined,
      });
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Création impossible.");
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <PageTitle
        eyebrow="Vendre · Nouvelle offre"
        title="Créer une offre"
        subtitle="Un paywall = un groupe + un prix + une périodicité."
      />

      <Card>
        <View style={{ gap: 16 }}>
          <Input
            label="Nom de l'offre"
            value={planName}
            onChangeText={setPlanName}
            placeholder="Ex. VIP Signaux — Mensuel"
            autoFocus
          />

          {/* Group picker */}
          <View>
            <FieldLabel>Groupe</FieldLabel>
            {groupsLoading ? (
              <ActivityIndicator color={colors.bordeaux[600]} />
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {(groups ?? []).map((g) => (
                  <Chip
                    key={g.id}
                    label={g.name}
                    active={groupChoice === g.id}
                    onPress={() => setGroupChoice(g.id)}
                  />
                ))}
                <Chip
                  label="+ Nouveau groupe"
                  active={creatingNewGroup}
                  onPress={() => setGroupChoice(NEW)}
                />
              </View>
            )}
          </View>

          {creatingNewGroup ? (
            <View style={{ gap: 16 }}>
              <Input
                label="Nom du nouveau groupe"
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Ex. Crypto Signals VIP"
              />
              <Segmented
                label="Type d'accès"
                value={newGroupKind}
                onChange={setNewGroupKind}
                options={[
                  { label: "Telegram", value: "telegram" },
                  { label: "Salle", value: "gym" },
                  { label: "Autre", value: "other" },
                ]}
              />
            </View>
          ) : null}

          <Input
            label="Prix"
            value={price}
            onChangeText={setPrice}
            placeholder="10000"
            keyboardType="numeric"
            suffix="XOF"
          />

          <Segmented
            label="Périodicité"
            value={interval}
            onChange={setInterval}
            options={[
              { label: "Mensuel", value: "30" },
              { label: "Trimestriel", value: "90" },
              { label: "Annuel", value: "365" },
            ]}
          />

          {error ? (
            <View className="rounded-2xl bg-bordeaux-50 border border-bordeaux-200 px-4 py-3">
              <Text className="font-semibold text-[13px] text-bordeaux-700">
                Création impossible
              </Text>
              <Text className="mt-0.5 font-sans text-[12px] text-bordeaux-700/80">
                {error}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <View className="flex-row" style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Annuler" variant="outline" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={submitting ? "Création…" : "Créer l'offre"}
            icon="check"
            variant="accent"
            onPress={submit}
          />
        </View>
      </View>

      {!valid ? (
        <Text className="text-center font-sans text-[11px] text-ink-muted">
          Renseignez un nom, un groupe et un prix pour continuer.
        </Text>
      ) : null}
    </Screen>
  );
}
