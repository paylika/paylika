import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Screen, PageHeader, useWide } from "@/components/Screen";
import { SkeletonCard, SkeletonStatsGrid, SkeletonList, ErrorState } from "@/components/States";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useDashboard } from "@/data/useDashboard";
import { useAsync, fetchMoney, countOffers } from "@/data/queries";
import { openSupport } from "@/lib/support";
import {
  RenewalsCard,
  StatCard,
  SmallStatCard,
  RevenueCard,
  formatInt,
} from "@/components/cards";
import type { Stat } from "@/data/mock";

/** Étape numérotée de l'onboarding (accueil compte vide). */
function OnbStep({ n, title, text, last }: { n: number; title: string; text: string; last?: boolean }) {
  return (
    <View className={`flex-row ${last ? "" : "border-b border-ink/[0.06] pb-3.5 mb-3.5"}`} style={{ gap: 12 }}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-bordeaux-600">
        <Text className="font-display-x text-[13px] text-white">{n}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-display-semi text-[14px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Carte de contact support WhatsApp (dispo pour tout le monde). */
function SupportCard() {
  return (
    <Pressable
      onPress={() => openSupport()}
      className="flex-row items-center rounded-3xl border border-ink/[0.08] bg-card p-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.forest + "1A" }}>
        <Icon name="whatsapp" size={20} color={colors.forest} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-display-semi text-[14px] text-ink">Besoin d'aide ?</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">Écris-nous sur WhatsApp, on te guide.</Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.muted} />
    </Pressable>
  );
}

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
  const { data, error: dashError, reload: reloadDash } = useDashboard();
  const { data: money, reload: reloadMoney } = useAsync(fetchMoney);

  // Onboarding NON bloquant : on détecte un compte vide pour proposer un accueil.
  const [empty, setEmpty] = useState<boolean | null>(null);
  const checkEmpty = useCallback(async () => {
    try {
      const n = await countOffers();
      setEmpty(n === 0);
    } catch {
      setEmpty(false);
    }
  }, []);
  useEffect(() => {
    checkEmpty();
  }, [checkEmpty]);

  const refresh = useCallback(async () => {
    await Promise.all([checkEmpty(), reloadDash(), reloadMoney()]);
  }, [checkEmpty, reloadDash, reloadMoney]);

  if (empty) {
    return (
      <Screen onRefresh={refresh}>
        <View style={{ paddingTop: 24 }}>
          <Eyebrow>Bienvenue 👋</Eyebrow>
          <Text
            className="mt-1.5 font-display-x text-[30px] text-ink"
            style={{ letterSpacing: -1.2, lineHeight: 34 }}
          >
            Commençons
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] text-ink-muted">
            Créez votre première offre pour commencer à encaisser. La connexion
            d'un groupe Telegram est optionnelle — vous pourrez la faire plus tard.
          </Text>
        </View>

        <Card>
          <OnbStep
            n={1}
            title="Crée ton offre"
            text="Un prix, une périodicité. Connecter un groupe Telegram est optionnel — tu pourras le faire après."
          />
          <OnbStep n={2} title="Partage ton lien" text="Colle-le dans ta bio, tes stories, ton groupe gratuit." />
          <OnbStep
            n={3}
            title="Encaisse"
            text="Ton client paie par mobile money, et l'accès se donne (et se retire) tout seul."
            last
          />
        </Card>

        <View className="flex-row" style={{ gap: 10 }}>
          <View style={{ flex: 1.5 }}>
            <Button
              label="Créer mon offre"
              icon="plus"
              variant="accent"
              onPress={() => router.push("/offres/nouvelle" as any)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Guide pas à pas"
              icon="arrow-right"
              variant="outline"
              onPress={() => router.push("/onboarding" as any)}
            />
          </View>
        </View>

        <SupportCard />
      </Screen>
    );
  }

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
    <Screen onRefresh={refresh}>
      <PageHeader
        eyebrow="Tableau de bord"
        title="Vue d'ensemble"
        action={
          <Button
            label="Nouvelle offre"
            icon="plus"
            variant="accent"
            onPress={() => router.push("/offres/nouvelle" as any)}
          />
        }
      />

      {dashError && !data ? (
        <ErrorState message={dashError} onRetry={refresh} />
      ) : !data ? (
        <>
          <SkeletonCard lines={2} />
          <SkeletonStatsGrid count={4} />
          <SkeletonList count={1} lines={4} />
        </>
      ) : (
        <>
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
        </>
      )}

      <SupportCard />
    </Screen>
  );
}
