import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import { adminOwners, adminBan, adminUnban, type AdminOwner } from "@/lib/admin";

export default function AdminOwners() {
  const router = useRouter();
  const [owners, setOwners] = useState<AdminOwner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOwners(await adminOwners());
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleBan(o: AdminOwner) {
    setBusyId(o.id);
    setError(null);
    try {
      if (o.banned) await adminUnban(o.id);
      else await adminBan(o.id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  const cur = "XOF";

  return (
    <Screen onRefresh={load}>
      <View>
        <Eyebrow>Console · Comptes</Eyebrow>
        <Text className="mt-1 font-display-x text-[28px] text-ink" style={{ letterSpacing: -1 }}>
          Propriétaires
        </Text>
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {owners === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        owners.map((o) => {
          const busy = busyId === o.id;
          return (
            <Card key={o.id}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-display-semi text-[15px] text-ink">{o.email}</Text>
                  <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                    {o.groups} groupe{o.groups > 1 ? "s" : ""} · {o.activeSubscribers}/{o.subscribers} actifs · MRR {formatInt(o.mrr)} {cur}
                  </Text>
                </View>
                {o.banned ? <Tag tone="bordeaux">Exclu</Tag> : <Tag tone="sand">Actif</Tag>}
              </View>

              <View className="mt-2 flex-row items-center justify-between border-t border-ink/[0.06] pt-3">
                <View>
                  <Text className="font-display-x text-[18px] text-ink" style={{ letterSpacing: -0.6 }}>
                    {formatInt(o.revenue)} {cur}
                  </Text>
                  <Text className="font-sans text-[11px] text-ink-muted">
                    encaissé · {formatInt(o.commission)} pour Paylika
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(`/admin/${o.id}` as any)}
                    className="flex-row items-center rounded-full bg-sand px-3.5 py-2"
                  >
                    <Text className="font-semibold text-[12px] text-ink">Détails</Text>
                    <Icon name="chevron-right" size={14} color={colors.muted} />
                  </Pressable>
                  {busy ? (
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  ) : (
                    <Pressable
                      onPress={() => toggleBan(o)}
                      className={`rounded-full px-3.5 py-2 ${o.banned ? "bg-forest" : "bg-bordeaux-600"}`}
                    >
                      <Text className="font-semibold text-[12px] text-white">
                        {o.banned ? "Réactiver" : "Exclure"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
