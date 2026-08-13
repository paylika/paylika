import { useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { colors } from "@/theme/colors";
import { useAsync, fetchGroups, addSubscriber } from "@/data/queries";

export default function NouvelAbonneScreen() {
  const router = useRouter();
  const { data: groups, loading: groupsLoading } = useAsync(fetchGroups);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = fullName.trim().length > 0 && !!groupId;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addSubscriber({
        fullName: fullName.trim(),
        telegramUsername: username.trim().replace(/^@/, ""),
        groupId: groupId!,
      });
      router.replace("/abonnes");
    } catch (e: any) {
      setError(e?.message ?? "Ajout impossible");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle
        eyebrow="Gérer · Nouvel abonné"
        title="Ajouter un abonné"
        subtitle="Crée un abonnement actif (30 j) sur le groupe choisi."
      />

      <Card>
        <View style={{ gap: 16 }}>
          <Input
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ex. Awa Ndiaye"
            autoFocus
          />
          <Input
            label="@ Telegram (optionnel)"
            value={username}
            onChangeText={setUsername}
            placeholder="awa_ndiaye"
          />
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
                    active={groupId === g.id}
                    onPress={() => setGroupId(g.id)}
                  />
                ))}
              </View>
            )}
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
            label={saving ? "Ajout…" : "Ajouter l'abonné"}
            icon="check"
            variant="accent"
            onPress={save}
          />
        </View>
      </View>

      {!valid ? (
        <Text className="text-center font-sans text-[11px] text-ink-muted">
          Renseignez un nom et choisissez un groupe.
        </Text>
      ) : null}
    </Screen>
  );
}
