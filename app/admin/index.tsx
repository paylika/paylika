import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Button, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import {
  adminWhoami,
  adminOverview,
  adminOwners,
  adminBan,
  adminUnban,
  type AdminOverview,
  type AdminOwner,
} from "@/lib/admin";

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View
      className="rounded-2xl border border-ink/[0.08] bg-card p-4"
      style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150 }}
    >
      <Text className="font-medium text-[11px] uppercase text-ink-muted" style={{ letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text
        className={`mt-1.5 font-display-x text-[22px] ${accent ? "text-bordeaux-700" : "text-ink"}`}
        style={{ letterSpacing: -0.8 }}
      >
        {value}
      </Text>
      {sub ? <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">{sub}</Text> : null}
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [ov, setOv] = useState<AdminOverview | null>(null);
  const [owners, setOwners] = useState<AdminOwner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const who = await adminWhoami();
      if (!who.isAdmin) {
        setAllowed(false);
        router.replace("/");
        return;
      }
      setAllowed(true);
      const [o, ow] = await Promise.all([adminOverview(), adminOwners()]);
      setOv(o);
      setOwners(ow);
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, [router]);

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

  if (allowed === null) {
    return (
      <Screen>
        <View className="items-center py-16">
          <ActivityIndicator color={colors.bordeaux[600]} />
        </View>
      </Screen>
    );
  }

  const cur = ov?.currency ?? "XOF";

  return (
    <Screen onRefresh={load}>
      <PageTitle
        eyebrow="Paylika · Super-admin"
        title="Pilotage"
        subtitle="Vue plateforme : tous les propriétaires, revenus et accès."
      />

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {/* KPIs plateforme */}
      {ov ? (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <Kpi label="Gains Paylika" value={`${formatInt(ov.paylikaEarnings)}`} sub={`${cur} · commission 10%`} accent />
          <Kpi label="Volume encaissé" value={`${formatInt(ov.totalRevenue)}`} sub={cur} />
          <Kpi label="MRR plateforme" value={`${formatInt(ov.mrr)}`} sub={`${cur}/mois`} />
          <Kpi label="Propriétaires" value={`${ov.owners}`} />
          <Kpi label="Groupes" value={`${ov.groups}`} />
          <Kpi label="Abonnés actifs" value={`${ov.activeSubscribers}`} sub={`sur ${ov.subscribers} au total`} />
        </View>
      ) : (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      )}

      {/* Propriétaires */}
      <View className="mt-2">
        <Eyebrow>Propriétaires ({owners.length})</Eyebrow>
      </View>

      {owners.map((o) => {
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
                <Text className="font-sans text-[11px] text-ink-muted">encaissé · {formatInt(o.commission)} pour Paylika</Text>
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
      })}
    </Screen>
  );
}
