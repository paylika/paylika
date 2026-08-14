import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Button, Eyebrow } from "@/components/ui";
import { Chip } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchMembers, removeMember, inviteMember, fetchGroups, type Member } from "@/data/queries";
import { copyOrShare } from "@/lib/clipboard";

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
  const [inviteBusy, setInviteBusy] = useState<number | "new" | null>(null);
  const [linkInfo, setLinkInfo] = useState<{ link: string; dmSent: boolean; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function invite(m?: Member) {
    setInviteBusy(m?.telegramUserId ?? "new");
    setError(null);
    setCopied(false);
    try {
      const r = await inviteMember(groupId, m?.telegramUserId);
      setLinkInfo({ link: r.link, dmSent: r.dmSent, name: m?.name ?? "nouveau membre" });
    } catch (e: any) {
      setError(e?.message ?? "Envoi impossible.");
    } finally {
      setInviteBusy(null);
    }
  }

  async function copyLink() {
    if (!linkInfo) return;
    const r = await copyOrShare(linkInfo.link);
    if (r !== "failed") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

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

      <View style={{ maxWidth: 280 }}>
        <Button
          label={inviteBusy === "new" ? "…" : "Générer un lien d'accès"}
          icon="send"
          variant="outline"
          onPress={() => invite()}
        />
      </View>

      {linkInfo ? (
        <Card>
          <Eyebrow>Lien d'accès créé</Eyebrow>
          <Text className="mt-1 font-sans text-[12px] text-ink-muted">
            {linkInfo.dmSent ? `Envoyé en privé à ${linkInfo.name}. ` : "À partager avec la personne. "}
            Usage unique, valable 24 h.
          </Text>
          <Pressable
            onPress={copyLink}
            className="mt-3 flex-row items-center justify-between rounded-2xl bg-sand px-4 py-3"
          >
            <Text numberOfLines={1} className="flex-1 pr-2 font-medium text-[12px] text-bordeaux-700">
              {linkInfo.link}
            </Text>
            <View className="flex-row items-center rounded-full bg-bordeaux-600 px-3 py-1.5" style={{ gap: 4 }}>
              {copied ? <Icon name="check" size={12} color={colors.white} strokeWidth={2.6} /> : null}
              <Text className="font-semibold text-[11px] text-white">{copied ? "Copié" : "Copier"}</Text>
            </View>
          </Pressable>
        </Card>
      ) : null}

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
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {inviteBusy === m.telegramUserId ? (
                        <ActivityIndicator color={colors.bordeaux[600]} />
                      ) : (
                        <Pressable
                          onPress={() => invite(m)}
                          className="flex-row items-center rounded-full bg-bordeaux-600 px-3.5 py-2"
                        >
                          <Icon name="send" size={14} color={colors.white} />
                          <Text className="ml-1.5 font-semibold text-[12px] text-white">Donner l'accès</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => setConfirmId(m.telegramUserId)}
                        className="flex-row items-center rounded-full bg-sand px-3.5 py-2"
                      >
                        <Icon name="trash" size={14} color={colors.ink} />
                        <Text className="ml-1.5 font-semibold text-[12px] text-ink">Retirer</Text>
                      </Pressable>
                    </View>
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
