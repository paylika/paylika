import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/Header";
import { Button, Eyebrow } from "@/components/ui";
import { stats, smallStats } from "@/data/mock";
import {
  RenewalsCard,
  StatCard,
  AccessGridCard,
  SmallStatCard,
  SpotlightCard,
  MembersCard,
  RevenueCard,
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

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900; // desktop / large tablet → multi-column grid
  const maxW = wide ? 1180 : 520;

  return (
    <View className="flex-1 bg-paper">
      {/* Sticky header, content centered on wide screens */}
      <View style={{ paddingTop: insets.top }} className="bg-paper items-center">
        <View style={{ width: "100%", maxWidth: maxW }}>
          <Header />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <View
            style={{
              width: "100%",
              maxWidth: maxW,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: insets.bottom + 40,
              gap: 16,
            }}
          >
            {wide ? (
              /* ---------- WEB / DESKTOP: multi-column dashboard ---------- */
              <>
                <View className="flex-row items-end justify-between" style={{ gap: 16 }}>
                  <TitleBlock />
                  <View style={{ width: 340 }}>
                    <ActionButtons />
                  </View>
                </View>

                {/* Row 1 */}
                <View className="flex-row" style={{ gap: 16 }}>
                  <View style={{ flex: 1.5 }}>
                    <RenewalsCard />
                  </View>
                  <View style={{ flex: 1, gap: 16 }}>
                    <StatCard stat={stats[0]} />
                    <StatCard stat={stats[1]} />
                  </View>
                  <View style={{ flex: 1.1 }}>
                    <AccessGridCard />
                  </View>
                </View>

                {/* Row 2 */}
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
                    <MembersCard />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <RevenueCard />
                  </View>
                </View>
              </>
            ) : (
              /* ---------- MOBILE: single column ---------- */
              <>
                <TitleBlock />
                <ActionButtons />
                <RenewalsCard />
                <View className="flex-row" style={{ gap: 14 }}>
                  <StatCard stat={stats[0]} />
                  <StatCard stat={stats[1]} />
                </View>
                <AccessGridCard />
                <SpotlightCard />
                <View className="flex-row" style={{ gap: 14 }}>
                  <SmallStatCard stat={smallStats[0]} icon="users" />
                  <SmallStatCard stat={smallStats[1]} icon="trend-down" />
                </View>
                <MembersCard />
                <RevenueCard />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
