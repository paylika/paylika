import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { adminOwnerDetail, adminResendLink, type AdminOwnerDetail } from "@/lib/admin";

export default function AdminOwnerScreen() {
  const { ownerId } = useLocalSearchParams<{ ownerId: string }>();
  const id = String(ownerId ?? "");

  const [data, setData] = useState<AdminOwnerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await adminOwnerDetail(id));
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groupName = (gid: string | null) => data?.groups.find((g) => g.id === gid)?.name ?? "—";

  async function resend(subId: string, groupId: string | null, tgId: number | null) {
    if (!groupId || !tgId) {
      setError("Impossible : abonné sans groupe ou sans Telegram.");
      return;
    }
    setBusy(subId);
    setError(null);
    try {
      await adminResendLink(groupId, tgId);
      setSent(subId);
      setTimeout(() => setSent(null), 2000);
    } catch (e: any) {
      setError(e?.message ?? "Envoi impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen onRefresh={load}>
      <PageTitle eyebrow="Super-admin · Propriétaire" title="Détails" subtitle="Groupes, abonnés et envoi de lien manuel." />

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {data === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <Eyebrow>Groupes ({data.groups.length})</Eyebrow>
            <View className="mt-2" style={{ gap: 6 }}>
              {data.groups.length ? (
                data.groups.map((g) => (
                  <View key={g.id} className="flex-row items-center justify-between">
                    <Text className="font-semibold text-[13px] text-ink">{g.name}</Text>
                    <Tag tone="sand">{g.kind}</Tag>
                  </View>
                ))
              ) : (
                <Text className="font-sans text-[12px] text-ink-muted">Aucun groupe.</Text>
              )}
            </View>
          </Card>

          <View className="mt-1">
            <Eyebrow>Abonnements ({data.subscriptions.length})</Eyebrow>
          </View>

          {data.subscriptions.map((s) => {
            const tgId = s.subscribers?.telegram_user_id ?? null;
            const active = s.status === "active";
            const isBusy = busy === s.id;
            const isSent = sent === s.id;
            return (
              <Card key={s.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-display-semi text-[14px] text-ink">
                      {s.subscribers?.full_name ?? "Abonné"}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                      {groupName(s.group_id)}
                      {s.expires_at ? ` · expire le ${new Date(s.expires_at).toLocaleDateString("fr-FR")}` : ""}
                    </Text>
                  </View>
                  <Tag tone={active ? "bordeaux" : "sand"}>{active ? "Actif" : s.status}</Tag>
                </View>

                <View className="mt-3 border-t border-ink/[0.06] pt-3">
                  {isBusy ? (
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  ) : (
                    <Pressable
                      onPress={() => resend(s.id, s.group_id, tgId)}
                      disabled={!tgId}
                      className="flex-row items-center self-start rounded-full bg-sand px-3.5 py-2"
                      style={{ opacity: tgId ? 1 : 0.5 }}
                    >
                      <Icon name={isSent ? "check" : "send"} size={14} color={colors.bordeaux[600]} />
                      <Text className="ml-1.5 font-semibold text-[12px] text-bordeaux-700">
                        {isSent ? "Lien envoyé" : "Renvoyer le lien"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
