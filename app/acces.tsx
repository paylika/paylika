import { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { Chip } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import {
  fetchConnections,
  fetchGroups,
  linkConnection,
  type Connection,
  type Group,
} from "@/data/queries";

export default function AccesScreen() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkingChat, setLinkingChat] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [conns, grps] = await Promise.all([fetchConnections(), fetchGroups()]);
      setConnections(conns);
      setGroups(grps);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onLink(chatId: number, groupId: string) {
    setLinkingChat(chatId);
    try {
      await linkConnection(chatId, groupId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Liaison impossible");
    } finally {
      setLinkingChat(null);
    }
  }

  const groupName = (id: string | null) =>
    groups.find((g) => g.id === id)?.name ?? "—";

  return (
    <Screen>
      <PageTitle
        eyebrow="Gérer"
        title="Accès & Bot"
        subtitle="Vos groupes Telegram connectés à @Paylikabot."
      />

      {/* How-to card */}
      <Card tone="dark">
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-bordeaux-600">
            <Icon name="send" size={22} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="font-display-semi text-[15px] text-white">
              Connecter un groupe
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-white/55">
              Ajoute @Paylikabot comme admin de ton groupe → il apparaît ici.
            </Text>
          </View>
        </View>
      </Card>

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text className="font-semibold text-[13px] text-bordeaux-700">Erreur</Text>
          <Text className="mt-1 font-sans text-[12px] text-ink-muted">{error}</Text>
        </Card>
      ) : connections && connections.length ? (
        connections.map((c) => {
          const linked = !!c.groupId;
          const isLinking = linkingChat === c.chatId;
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
                <Tag tone={linked ? "bordeaux" : "sand"}>
                  {linked ? "Connecté" : "À relier"}
                </Tag>
              </View>

              {!linked ? (
                <View className="mt-4 border-t border-ink/[0.06] pt-3">
                  <Eyebrow>Relier à une offre</Eyebrow>
                  {isLinking ? (
                    <View className="py-3">
                      <ActivityIndicator color={colors.bordeaux[600]} />
                    </View>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                      {groups.map((g) => (
                        <Chip
                          key={g.id}
                          label={g.name}
                          active={false}
                          onPress={() => onLink(c.chatId, g.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </Card>
          );
        })
      ) : (
        <Card>
          <Eyebrow>Aucun groupe connecté</Eyebrow>
          <Text className="mt-2 font-sans text-[13px] text-ink-muted">
            Ajoute @Paylikabot comme admin d'un groupe pour le voir apparaître ici.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
