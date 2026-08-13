import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Screen, useWide } from "@/components/Screen";
import { useDashboard } from "@/data/useDashboard";
import { useAsync, fetchMoney, countOffers } from "@/data/queries";
import {
  RenewalsCard,
  StatCard,
  SmallStatCard,
  RevenueCard,
  formatInt,
} from "@/components/cards";
import type { Stat } from "@/data/mock";

function BalanceHero({
  available,
  currency,
}: {
  available: number | null;
  currency: string;
}) {
  const router = useRouter();
  return (
    <Card tone="dark">
      <Eyebrow>Solde disponible</Eyebrow>
      <View className="mt-2 flex-row items-baseline">
        <Text
          className="font-display-x text-[38px] text-white"
          style={{ letterSpacing: -1.4 }}
        >
          {available != null ? formatInt(available) : "—"}
        </Text>
        <Text className="ml-2 font-medium text-[14px] text-white/60">{currency}</Text>
      </View>
      <Text className="mt-1 font-sans text-[12px] text-white/50">
        Après commission · retrait gratuit
      </Text>
      <View className="mt-4" style={{ maxWidth: 200 }}>
        <Button
          label="Retirer"
          icon="arrow-up-right"
          variant="accent"
          onPress={() => router.push("/argent" as any)}
        />
      </View>
    </Card>
  );
}

export function DashboardScreen() {
  const wide = useWide();
  const router = useRouter();
  const { data } = useDashboard();
  const { data: money } = useAsync(fetchMoney);

  // Onboarding : un nouveau compte (aucune offre) est orienté vers la création.
  useEffect(() => {
    let alive = true;
    countOffers()
      .then((n) => {
        if (alive && n === 0) router.replace("/offres/nouvelle?first=1");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);

  const kpis: Stat[] = [
    {
      label: "Membres actifs",
      value: data ? formatInt(data.activeMembers) : "—",
      caption: data ? `sur ${formatInt(data.totalSubscribers)}` : "",
    },
    {
      label: "Total abonnés",
      value: data ? formatInt(data.totalSubscribers) : "—",
      caption: "au total",
    },
    {
      label: "Revenus (30 j)",
      value: data ? formatInt(data.monthlyRevenue) : "—",
      unit: data?.currency,
      caption: "encaissés",
    },
    {
      label: "Taux de churn",
      value: data ? `${data.churnPct}%` : "—",
      caption: data ? `${data.expiredCount} expiré${data.expiredCount > 1 ? "s" : ""}` : "",
    },
  ];

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
      <View className="flex-row items-end justify-between" style={{ gap: 12 }}>
        <View>
          <Eyebrow>Tableau de bord</Eyebrow>
          <Text
            className="mt-1.5 font-display-x text-[30px] text-ink"
            style={{ letterSpacing: -1.2, lineHeight: 34 }}
          >
            Vue d'ensemble
          </Text>
        </View>
        <View style={{ minWidth: 150 }}>
          <Button
            label="Nouvelle offre"
            icon="plus"
            variant="accent"
            onPress={() => router.push("/offres/nouvelle" as any)}
          />
        </View>
      </View>

      {/* Balance + KPIs */}
      {wide ? (
        <View className="flex-row" style={{ gap: 16 }}>
          <View style={{ flex: 1.2 }}>
            <BalanceHero available={money?.available ?? null} currency={money?.currency ?? "XOF"} />
          </View>
          <View style={{ flex: 2, gap: 16 }}>
            <View className="flex-row" style={{ gap: 16 }}>
              <StatCard stat={kpis[0]} />
              <StatCard stat={kpis[1]} />
            </View>
            <View className="flex-row" style={{ gap: 16 }}>
              <SmallStatCard stat={kpis[2]} icon="wallet" />
              <SmallStatCard stat={kpis[3]} icon="trend-down" />
            </View>
          </View>
        </View>
      ) : (
        <>
          <BalanceHero available={money?.available ?? null} currency={money?.currency ?? "XOF"} />
          <View className="flex-row" style={{ gap: 14 }}>
            <StatCard stat={kpis[0]} />
            <StatCard stat={kpis[1]} />
          </View>
          <View className="flex-row" style={{ gap: 14 }}>
            <SmallStatCard stat={kpis[2]} icon="wallet" />
            <SmallStatCard stat={kpis[3]} icon="trend-down" />
          </View>
        </>
      )}

      {/* Renewals + revenue */}
      {wide ? (
        <View className="flex-row" style={{ gap: 16 }}>
          <View style={{ flex: 1 }}>
            <RenewalsCard items={data?.renewals} />
          </View>
          <View style={{ flex: 1 }}>
            <RevenueCard
              bars={data?.revenueByGroup}
              headline={revenueHeadline}
              subtitle={revenueSubtitle}
            />
          </View>
        </View>
      ) : (
        <>
          <RenewalsCard items={data?.renewals} />
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
