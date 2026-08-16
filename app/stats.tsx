import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageHeader, useWide } from "@/components/Screen";
import { Card, Button, Eyebrow, Tag } from "@/components/ui";
import { SkeletonStatsGrid, SkeletonList, ErrorState, EmptyState } from "@/components/States";
import { Segmented } from "@/components/form";
import { useAsync, fetchStats, type OfferStat } from "@/data/queries";
import { RevenueCard, formatInt } from "@/components/cards";

function Kpi({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="flex-1">
      <Eyebrow>{label}</Eyebrow>
      <View className="mt-2 flex-row items-baseline">
        <Text
          className={`font-display text-[22px] ${accent ? "text-bordeaux-600" : "text-ink"}`}
          style={{ letterSpacing: -0.6 }}
        >
          {value}
        </Text>
        {unit ? (
          <Text className="ml-1 font-medium text-[11px] text-ink-muted">{unit}</Text>
        ) : null}
      </View>
      {sub ? (
        <Text className="mt-1 font-sans text-[11px] text-ink-muted">{sub}</Text>
      ) : null}
    </Card>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function OfferStatCard({ o, currency }: { o: OfferStat; currency: string }) {
  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-display-semi text-[15px] text-ink">{o.name}</Text>
          <View className="mt-1.5">
            <Tag tone="bordeaux">{o.groupName}</Tag>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-display text-[18px] text-ink" style={{ letterSpacing: -0.4 }}>
            {formatInt(o.revenue)}
          </Text>
          <Text className="font-medium text-[11px] text-ink-muted">
            {currency} net · {o.share}%
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row border-t border-ink/[0.06] pt-3">
        <Mini label="Membres actifs" value={String(o.active)} />
        <Mini label="Prix" value={`${formatInt(o.price)} ${currency}`} />
      </View>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="font-semibold text-[15px] text-ink">{value}</Text>
      <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const wide = useWide();
  const [view, setView] = useState<"global" | "offres">("global");
  const { data, error, reload } = useAsync(fetchStats);

  const cur = data?.currency ?? "XOF";
  const isEmpty =
    !!data && data.salesCount === 0 && data.totalMembers === 0 && data.offers.length === 0;
  const kpis = data
    ? [
        { label: "Revenu net", value: formatInt(data.netRevenue), unit: cur, accent: true, sub: `brut ${formatInt(data.totalRevenue)}` },
        { label: "Ce mois", value: formatInt(data.revenueThisMonth), unit: cur, sub: "revenu net" },
        { label: "Membres actifs", value: formatInt(data.activeMembers), sub: `sur ${formatInt(data.totalMembers)} au total` },
        { label: "Ventes", value: formatInt(data.salesCount), sub: "paiements" },
        { label: "Nouveaux membres", value: formatInt(data.newMembersThisMonth), sub: "ce mois" },
        { label: "Commission Paylika", value: formatInt(data.commission), unit: cur, sub: "10% prélevé" },
      ]
    : [];

  return (
    <Screen onRefresh={reload}>
      <PageHeader
        eyebrow="Activité"
        title="Statistiques"
        subtitle="Vue complète de votre activité et de vos offres."
        action={
          <Button
            label="Voir les abonnés"
            icon="users"
            variant="outline"
            onPress={() => router.push("/abonnes" as any)}
          />
        }
      />

      {/* Sub-nav */}
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { label: "Vue d'ensemble", value: "global" },
          { label: "Par offre", value: "offres" },
        ]}
      />

      {data === null && error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data === null ? (
        <>
          <SkeletonStatsGrid count={6} />
          <SkeletonList count={2} />
        </>
      ) : isEmpty ? (
        <EmptyState
          icon="chart"
          title="Pas encore de statistiques"
          text="Tes stats s'afficheront ici dès ta première vente. Partage tes liens d'offres pour lancer la machine."
        />
      ) : (
        <>
          {error ? (
            <Card>
              <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
            </Card>
          ) : null}
          {view === "global" ? (
        <>
          {/* KPI grid */}
          {chunk(kpis, wide ? 3 : 2).map((row, ri) => (
            <View key={ri} className="flex-row" style={{ gap: wide ? 16 : 14 }}>
              {row.map((k) => (
                <Kpi key={k.label} {...k} />
              ))}
              {row.length < (wide ? 3 : 2)
                ? Array.from({ length: (wide ? 3 : 2) - row.length }).map((_, i) => (
                    <View key={`e-${i}`} className="flex-1" />
                  ))
                : null}
            </View>
          ))}

          {/* Charts */}
          {wide ? (
            <View className="flex-row" style={{ gap: 16 }}>
              <View style={{ flex: 1 }}>
                <RevenueCard
                  bars={data.revenueByGroup}
                  title="Revenus par groupe"
                  headline={`${formatInt(data.netRevenue)} ${cur}`}
                  subtitle="Répartition de vos revenus."
                />
              </View>
              <View style={{ flex: 1 }}>
                <RevenueCard
                  bars={data.membersByGroup}
                  title="Membres par groupe"
                  headline={`${formatInt(data.activeMembers)} actifs`}
                  subtitle="Où sont vos abonnés."
                />
              </View>
            </View>
          ) : (
            <>
              <RevenueCard
                bars={data.revenueByGroup}
                title="Revenus par groupe"
                headline={`${formatInt(data.netRevenue)} ${cur}`}
                subtitle="Répartition de vos revenus."
              />
              <RevenueCard
                bars={data.membersByGroup}
                title="Membres par groupe"
                headline={`${formatInt(data.activeMembers)} actifs`}
                subtitle="Où sont vos abonnés."
              />
            </>
          )}
        </>
      ) : (
        <>
          {data.offers.length ? (
            data.offers.map((o) => <OfferStatCard key={o.id} o={o} currency={cur} />)
          ) : (
            <EmptyState
              icon="tag"
              title="Aucune offre pour l'instant"
              text="Crée une offre pour suivre ses ventes et ses membres ici."
            />
          )}
        </>
      )}
        </>
      )}
    </Screen>
  );
}
