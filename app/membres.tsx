import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Button } from "@/components/ui";
import { Chip } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchMembers, removeMember, fetchGroups, type Member } from "@/data/queries";

type Filter = "all" | "paid" | "unpaid";

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "aujourd'hui";
  if (d < 2) return "hier";
  return `il y a ${Math.floor(d)} j`;
}

export default function MembresScreen() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const groupId = String(group ?? "");

  const [members, setMembers] = useState<Member[] | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [rows, groups] = await Promise.all([fetchMembers(groupId), fetchGroups()]);
      setMembers(rows);
      setGroupName(groups.find((g) => g.id === groupId)?.name ?? "Groupe");
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function remove(m: Member) {
    setBusyId(m.telegramUserId);
    setError(null);
    try {
      await removeMember(groupId, m.telegramUserId);
      setConfirmId(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Retrait impossible.");
    } finally {
      setBusyId(null);
    }
  }

  const list = (members ?? []).filter((m) =>
    filter === "all" ? true : filter === "paid" ? m.paid : !m.paid,
  );
  const paidCount = (members ?? []).filter((m) => m.paid).length;
  const unpaidCount = (members ?? []).filter((m) => !m.paid).length;

  return (
    <Screen onRefresh={load}>
      <PageTitle
        eyebrow={groupName}
        title="Membres"
        subtitle="Qui a payé, qui n'a pas payé. Retirez les non-payeurs en un tap."
      />

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Chip label={`Tous (${members?.length ?? 0})`} active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Payé (${paidCount})`} active={filter === "paid"} onPress={() => setFilter("paid")} />
        <Chip label={`Non payé (${unpaidCount})`} active={filter === "unpaid"} onPress={() => setFilter("unpaid")} />
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {members === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <Text className="font-sans text-[13px] text-ink-muted">
            Aucun membre détecté pour l'instant. Le roster se remplit dès qu'un membre paie, entre, ou écrit dans le groupe.
          </Text>
        </Card>
      ) : (
        list.map((m) => {
          const confirming = confirmId === m.telegramUserId;
          const busy = busyId === m.telegramUserId;
          return (
            <Card key={m.telegramUserId}>
              <View className="flex-row items-center">
                <View className="flex-1 pr-3">
                  <Text className="font-display-semi text-[15px] text-ink">{m.name}</Text>
                  <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                    {m.username ? `@${m.username} · ` : ""}
                    {m.inGroup ? `vu ${timeAgo(m.lastSeen)}` : "retiré"}
                  </Text>
                </View>
                <Tag tone={m.paid ? "bordeaux" : "sand"}>{m.paid ? "Payé" : "Non payé"}</Tag>
              </View>

              {m.inGroup ? (
                <View className="mt-3 border-t border-ink/[0.06] pt-3">
                  {busy ? (
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  ) : confirming ? (
                    <View className="flex-row" style={{ gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Button label="Annuler" variant="outline" onPress={() => setConfirmId(null)} />
                      </View>
                      <Pressable
                        onPress={() => remove(m)}
                        style={{ flex: 1 }}
                        className="flex-row items-center justify-center rounded-full bg-bordeaux-600 py-3"
                      >
                        <Text className="font-semibold text-[13px] text-white">Retirer</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setConfirmId(m.telegramUserId)}
                      className="flex-row items-center self-start rounded-full bg-sand px-3.5 py-2"
                    >
                      <Icon name="trash" size={14} color={colors.ink} />
                      <Text className="ml-1.5 font-semibold text-[12px] text-ink">Retirer du groupe</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
