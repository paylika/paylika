import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Linking, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Eyebrow } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import { adminOverview, adminOwners, type AdminOverview, type AdminOwner } from "@/lib/admin";

function openWa(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return;
  const url = `https://wa.me/${digits}`;
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
  else Linking.openURL(url).catch(() => {});
}

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

function NavCard({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150 }}>
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-bordeaux-50">
            <Icon name={icon} size={19} color={colors.bordeaux[600]} />
          </View>
          <Icon name="arrow-up-right" size={18} color={colors.muted} />
        </View>
        <Text className="mt-3 font-display-semi text-[15px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{sub}</Text>
      </Card>
    </Pressable>
  );
}

export default function AdminPilotage() {
  const router = useRouter();
  const [ov, setOv] = useState<AdminOverview | null>(null);
  const [owners, setOwners] = useState<AdminOwner[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [o, ow] = await Promise.all([adminOverview(), adminOwners()]);
      setOv(o);
      setOwners(ow);
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cur = ov?.currency ?? "XOF";
  const top = owners.slice(0, 3);
  const recent = [...owners]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <Screen onRefresh={load}>
      <View>
        <Eyebrow>Vue plateforme</Eyebrow>
        <Text className="mt-1 font-display-x text-[28px] text-ink" style={{ letterSpacing: -1 }}>
          Pilotage
        </Text>
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {ov ? (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <Kpi label="Gains Paylika" value={formatInt(ov.paylikaEarnings)} sub={`${cur} · commission 10%`} accent />
          <Kpi label="Volume encaissé" value={formatInt(ov.totalRevenue)} sub={cur} />
          <Kpi label="MRR plateforme" value={formatInt(ov.mrr)} sub={`${cur}/mois`} />
          <Kpi label="Propriétaires" value={`${ov.owners}`} />
          <Kpi label="Groupes" value={`${ov.groups}`} />
          <Kpi
            label="Abonnés actifs"
            value={`${ov.activeSubscribers}`}
            sub={ov.subscribers > ov.activeSubscribers ? `sur ${ov.subscribers} au total` : undefined}
          />
        </View>
      ) : (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      )}

      {/* Derniers inscrits — pour suivre l'effet des pubs en direct */}
      {recent.length ? (
        <Card>
          <View className="flex-row items-center justify-between">
            <Eyebrow>Derniers inscrits</Eyebrow>
            <Text className="font-semibold text-[12px] text-ink-muted">
              {ov?.owners ?? owners.length} au total
            </Text>
          </View>
          <View className="mt-3" style={{ gap: 12 }}>
            {recent.map((o) => (
              <View key={o.id} className="flex-row items-center" style={{ gap: 10 }}>
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-semibold text-[13px] text-ink">
                    {o.email}
                  </Text>
                  <Text className="font-sans text-[11px] text-ink-muted">
                    {o.country ? `${o.country} · ` : ""}
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </Text>
                </View>
                {o.whatsapp ? (
                  <Pressable
                    onPress={() => openWa(o.whatsapp!)}
                    className="flex-row items-center rounded-full px-2.5 py-1"
                    style={{ gap: 5, backgroundColor: colors.forest + "14" }}
                  >
                    <Icon name="whatsapp" size={13} color={colors.forest} />
                    <Text className="font-semibold text-[11px]" style={{ color: colors.forest }}>
                      {o.whatsapp}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="font-sans text-[11px] text-ink-muted">pas de WhatsApp</Text>
                )}
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Accès rapides console */}
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        <NavCard
          icon="users"
          title="Propriétaires"
          sub={`${owners.length} compte${owners.length > 1 ? "s" : ""} · gérer / exclure`}
          onPress={() => router.push("/admin/owners" as any)}
        />
        <NavCard
          icon="wallet"
          title="Transactions"
          sub="Flux de paiements en temps réel"
          onPress={() => router.push("/admin/transactions" as any)}
        />
        <NavCard
          icon="bolt"
          title="Marketing · Pixel"
          sub="Pixel Meta + pubs Facebook"
          onPress={() => router.push("/admin/marketing" as any)}
        />
      </View>

      {/* Top propriétaires */}
      {top.length ? (
        <Card>
          <View className="flex-row items-center justify-between">
            <Eyebrow>Top propriétaires</Eyebrow>
            <Pressable onPress={() => router.push("/admin/owners" as any)}>
              <Text className="font-semibold text-[12px] text-bordeaux-700">Tout voir</Text>
            </Pressable>
          </View>
          <View className="mt-2" style={{ gap: 10 }}>
            {top.map((o, i) => (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/admin/${o.id}` as any)}
                className="flex-row items-center"
                style={{ gap: 10 }}
              >
                <Text className="font-display-x text-[14px] text-ink-muted" style={{ width: 18 }}>
                  {i + 1}
                </Text>
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-semibold text-[13px] text-ink">
                    {o.email}
                  </Text>
                  <Text className="font-sans text-[11px] text-ink-muted">
                    {o.groups} groupe{o.groups > 1 ? "s" : ""} · {o.activeSubscribers} actifs
                  </Text>
                </View>
                <Text className="font-display-x text-[14px] text-ink" style={{ letterSpacing: -0.4 }}>
                  {formatInt(o.revenue)} {cur}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
