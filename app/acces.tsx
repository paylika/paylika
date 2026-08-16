import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Eyebrow, Button } from "@/components/ui";
import { SkeletonList, ErrorState, EmptyState } from "@/components/States";
import { Chip } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import {
  fetchConnections,
  fetchGroups,
  linkConnection,
  unlinkConnection,
  type Connection,
  type Group,
} from "@/data/queries";


function Step({ n, text }: { n: number; text: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 10 }}>
      <View className="h-6 w-6 items-center justify-center rounded-full bg-bordeaux-50">
        <Text className="font-bold text-[12px] text-bordeaux-700">{n}</Text>
      </View>
      <Text className="flex-1 font-sans text-[13px] text-ink-soft">{text}</Text>
    </View>
  );
}

export default function AccesScreen() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyChat, setBusyChat] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [conns, grps] = await Promise.all([fetchConnections(), fetchGroups()]);
      setConnections(conns);
      setGroups(grps);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act(chatId: number, fn: () => Promise<void>) {
    setBusyChat(chatId);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Action impossible");
    } finally {
      setBusyChat(null);
    }
  }

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "—";
  const linkedCount = (connections ?? []).filter((c) => c.groupId).length;

  return (
    <Screen onRefresh={load}>
      <PageTitle
        eyebrow="Gérer"
        title="Accès & Bot"
        subtitle="Connectez vos groupes Telegram à @Paylikabot."
      />

      {/* Bot status */}
      <Card tone="dark">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-bordeaux-600">
            <Icon name="send" size={24} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="font-display-semi text-[16px] text-white">@Paylikabot</Text>
            <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.forest }} />
              <Text className="font-medium text-[12px] text-white/60">
                En ligne · {linkedCount} groupe{linkedCount > 1 ? "s" : ""} relié{linkedCount > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-4" style={{ maxWidth: 240 }}>
          <Button
            label="Connecter un groupe"
            icon="send"
            variant="accent"
            onPress={() => router.push("/onboarding?mode=add" as any)}
          />
        </View>
      </Card>

      {/* How to connect */}
      <Card>
        <Eyebrow>Connecter un groupe</Eyebrow>
        <View className="mt-3" style={{ gap: 12 }}>
          <Step n={1} text="Cliquez « Connecter un groupe » : Telegram s'ouvre sur les groupes où vous êtes admin." />
          <Step n={2} text="Choisissez le groupe — le bot est ajouté admin avec les bons droits automatiquement." />
          <Step n={3} text="De retour dans l'app, la connexion est détectée : vous définissez l'offre et le tour est joué." />
        </View>
      </Card>

      {/* Connected groups */}
      {connections === null && error ? (
        <ErrorState message={error} onRetry={load} />
      ) : connections === null ? (
        <SkeletonList count={2} />
      ) : (
        <>
          {error ? (
            <Card>
              <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
            </Card>
          ) : null}
          {connections.length ? (
        connections.map((c) => {
          const linked = !!c.groupId;
          const busy = busyChat === c.chatId;
          return (
            <Card key={c.chatId}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-display-semi text-[16px] text-ink">
                    {c.title ?? "Groupe Telegram"}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                    {linked ? `Relié à ${groupName(c.groupId)}` : "Pas encore relié"}
                  </Text>
                </View>
                <Tag tone={linked ? "bordeaux" : "sand"}>{linked ? "Connecté" : "À relier"}</Tag>
              </View>

              <View className="mt-4 border-t border-ink/[0.06] pt-3">
                {busy ? (
                  <ActivityIndicator color={colors.bordeaux[600]} />
                ) : linked ? (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => router.push(`/membres?group=${c.groupId}` as any)}
                      className="flex-row items-center rounded-full bg-bordeaux-600 px-3.5 py-2"
                    >
                      <Icon name="users" size={14} color={colors.white} />
                      <Text className="ml-1.5 font-semibold text-[12px] text-white">Membres</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => act(c.chatId, () => unlinkConnection(c.chatId))}
                      className="rounded-full bg-sand px-3.5 py-2"
                    >
                      <Text className="font-semibold text-[12px] text-ink">Délier</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Eyebrow>Relier à une offre</Eyebrow>
                    <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                      {groups.map((g) => (
                        <Chip
                          key={g.id}
                          label={g.name}
                          active={false}
                          onPress={() => act(c.chatId, () => linkConnection(c.chatId, g.id))}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            </Card>
          );
        })
          ) : (
            <EmptyState
              icon="send"
              title="Aucun groupe connecté"
              text="Ajoute @Paylikabot comme admin d'un de tes groupes pour le voir apparaître ici."
              action={
                <Button
                  label="Connecter un groupe"
                  icon="send"
                  variant="outline"
                  onPress={() => router.push("/onboarding?mode=add" as any)}
                />
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}
