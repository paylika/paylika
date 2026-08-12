import { View, Text } from "react-native";
import { Button, Eyebrow } from "@/components/ui";
import { Screen, useWide } from "@/components/Screen";
import { stats as mockStats, smallStats as mockSmallStats, type Stat } from "@/data/mock";
import { useDashboard } from "@/data/useDashboard";
import {
  RenewalsCard,
  StatCard,
  AccessGridCard,
  SmallStatCard,
  SpotlightCard,
  MembersCard,
  RevenueCard,
  formatInt,
} from "@/components/cards";

function TitleBlock() {
  return (
    <View>
      <Eyebrow>Lundi 12 août</Eyebrow>
      <Text
        className="mt-1.5 font-display-x text-[30px] text-ink"
        style={{ letterSpacing: -1.2, lineHeight: 34 }}
      >
        Vue d'ensemble
      </Text>
      <Text className="mt-1.5 font-sans text-[13px] text-ink-muted">
        Pilotez vos abonnements Telegram, groupes et paiements.
      </Text>
    </View>
  );
}

function ActionButtons() {
  return (
    <View className="flex-row" style={{ gap: 10 }}>
      <View style={{ flex: 1, minWidth: 150 }}>
        <Button label="Personnaliser" icon="sliders" variant="outline" />
      </View>
      <View style={{ flex: 1, minWidth: 150 }}>
        <Button label="Nouvel abonné" icon="plus" variant="accent" />
      </View>
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="rounded-2xl bg-bordeaux-50 border border-bordeaux-200 px-4 py-3">
      <Text className="font-semibold text-[13px] text-bordeaux-700">
        Connexion Supabase impossible
      </Text>
      <Text className="mt-0.5 font-sans text-[12px] text-bordeaux-700/80">{message}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const wide = useWide();
  const { data, error } = useDashboard();

  const stats: Stat[] = data
    ? [
        {
          label: "Membres actifs",
          value: formatInt(data.activeMembers),
          caption: `sur ${formatInt(data.totalSubscribers)} abonnés`,
        },
        {
          label: "Revenus (30 j)",
          value: formatInt(data.monthlyRevenue),
          unit: data.currency,
          caption: "encaissés",
        },
      ]
    : mockStats;

  const smallStats: Stat[] = data
    ? [
        {
          label: "Total abonnés",
          value: formatInt(data.totalSubscribers),
          caption: "au total",
        },
        {
          label: "Taux de churn",
          value: `${data.churnPct}%`,
          caption: `${data.expiredCount} expiré${data.expiredCount > 1 ? "s" : ""}`,
        },
      ]
    : mockSmallStats;

  const revenueHeadline = data
    ? `${formatInt(data.totalRevenue)} ${data.currency}`
    : undefined;
  const revenueSubtitle = data
    ? `Réparti sur ${data.revenueByGroup.length} groupe${
        data.revenueByGroup.length > 1 ? "s" : ""
      }.`
    : undefined;

  return (
    <Screen>
      {wide ? (
        <>
          <View className="flex-row items-end justify-between" style={{ gap: 16 }}>
            <TitleBlock />
            <View style={{ width: 340 }}>
              <ActionButtons />
            </View>
          </View>
          {error ? <ErrorBanner message={error} /> : null}

          <View className="flex-row" style={{ gap: 16 }}>
            <View style={{ flex: 1.5 }}>
              <RenewalsCard items={data?.renewals} />
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <StatCard stat={stats[0]} />
              <StatCard stat={stats[1]} />
            </View>
            <View style={{ flex: 1.1 }}>
              <AccessGridCard grid={data?.accessGrid} activeCount={data?.activeMembers} />
            </View>
          </View>

          <View className="flex-row" style={{ gap: 16 }}>
            <View style={{ flex: 1 }}>
              <SpotlightCard />
            </View>
            <View style={{ flex: 1.1, gap: 16 }}>
              <View className="flex-row" style={{ gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <SmallStatCard stat={smallStats[0]} icon="users" />
                </View>
                <View style={{ flex: 1 }}>
                  <SmallStatCard stat={smallStats[1]} icon="trend-down" />
                </View>
              </View>
              <MembersCard items={data?.members} />
            </View>
            <View style={{ flex: 1.5 }}>
              <RevenueCard
                bars={data?.revenueByGroup}
                headline={revenueHeadline}
                subtitle={revenueSubtitle}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <TitleBlock />
          {error ? <ErrorBanner message={error} /> : null}
          <ActionButtons />
          <RenewalsCard items={data?.renewals} />
          <View className="flex-row" style={{ gap: 14 }}>
            <StatCard stat={stats[0]} />
            <StatCard stat={stats[1]} />
          </View>
          <AccessGridCard grid={data?.accessGrid} activeCount={data?.activeMembers} />
          <SpotlightCard />
          <View className="flex-row" style={{ gap: 14 }}>
            <SmallStatCard stat={smallStats[0]} icon="users" />
            <SmallStatCard stat={smallStats[1]} icon="trend-down" />
          </View>
          <MembersCard items={data?.members} />
          <RevenueCard
            bars={data?.revenueByGroup}
            headline={revenueHeadline}
            subtitle={revenueSubtitle}
          />
        </>
      )}
    </Screen>
  );
}
