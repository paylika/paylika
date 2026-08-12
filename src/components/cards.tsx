import { View, Text } from "react-native";
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Circle,
} from "react-native-svg";
import { Card, Delta, Avatar, Button, Eyebrow, Tag, IconButton } from "./ui";
import { Icon, type IconName } from "./Icon";
import {
  renewals,
  stats,
  smallStats,
  accessGrid,
  members,
  spotlight,
  revenueBars,
  type Stat,
} from "@/data/mock";
import { colors } from "@/theme/colors";

/** Dark "upcoming renewals" card, built as a vertical timeline. */
export function RenewalsCard() {
  return (
    <Card tone="dark">
      <View className="flex-row items-center justify-between">
        <View>
          <Eyebrow>À suivre</Eyebrow>
          <Text className="mt-1 font-display text-[19px] text-white" style={{ letterSpacing: -0.3 }}>
            Renouvellements
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
          <Text className="font-medium text-[12px] text-white">Cette semaine</Text>
          <View className="ml-1.5">
            <Icon name="chevron-down" size={13} color={colors.white} strokeWidth={2} />
          </View>
        </View>
      </View>

      <View className="mt-5">
        {renewals.map((item, i) => {
          const last = i === renewals.length - 1;
          const dotColor =
            item.tone === "due" ? colors.bordeaux[400] : colors.bordeaux[300];
          return (
            <View key={item.title} className="flex-row">
              {/* time + timeline rail */}
              <View className="w-12 items-end pr-3 pt-0.5">
                <Text className="font-medium text-[12px] text-white/45">
                  {item.time}
                </Text>
              </View>
              <View className="items-center">
                <View
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    borderWidth: 2.5,
                    borderColor: dotColor,
                    backgroundColor: colors.night,
                    marginTop: 3,
                  }}
                />
                {!last && (
                  <View style={{ width: 2, flex: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />
                )}
              </View>
              {/* content */}
              <View className="flex-1 pb-5 pl-4">
                <Text className="font-semibold text-[14px] text-white">
                  {item.title}
                </Text>
                <Text className="mt-0.5 font-sans text-[12px] text-white/50">
                  {item.subtitle}
                </Text>
                {item.tone === "due" && (
                  <View className="mt-2">
                    <Tag tone="night">Paiement en retard</Tag>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Big KPI card. */
export function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card className="flex-1">
      <Eyebrow>{stat.label}</Eyebrow>
      <View className="mt-2.5 flex-row items-baseline">
        <Text className="font-display text-[30px] text-ink" style={{ letterSpacing: -1 }}>
          {stat.value}
        </Text>
        {stat.unit ? (
          <Text className="ml-1 font-medium text-[13px] text-ink-muted">{stat.unit}</Text>
        ) : null}
      </View>
      <View className="mt-2 flex-row items-center">
        <Delta text={stat.delta} positive={stat.positive} />
        {stat.caption ? (
          <Text className="ml-2 font-sans text-[11px] text-ink-muted">{stat.caption}</Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Dark dot-grid access-status card. */
export function AccessGridCard() {
  const dotColor: Record<string, string> = {
    active: colors.bordeaux[400],
    expiring: colors.bordeaux[200],
    off: "rgba(255,255,255,0.10)",
  };
  return (
    <Card tone="dark">
      <View className="flex-row items-start justify-between">
        <View>
          <Eyebrow>Temps réel</Eyebrow>
          <Text className="mt-1 font-display text-[19px] text-white" style={{ letterSpacing: -0.3 }}>
            Accès aujourd'hui
          </Text>
        </View>
        <IconButton name="arrow-up-right" tone="glass" size={36} />
      </View>

      <View className="mt-3 flex-row items-baseline">
        <Text className="font-display text-[26px] text-white" style={{ letterSpacing: -0.6 }}>
          1 128
        </Text>
        <Text className="ml-2 font-medium text-[12px] text-white/50">accès actifs</Text>
      </View>

      <View className="mt-4 flex-row flex-wrap" style={{ gap: 7, maxWidth: 224 }}>
        {accessGrid.map((d, i) => (
          <View
            key={i}
            style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: dotColor[d] }}
          />
        ))}
      </View>

      <View className="mt-5 flex-row" style={{ gap: 16 }}>
        <Legend color={colors.bordeaux[400]} label="Actif" />
        <Legend color={colors.bordeaux[200]} label="Expire bientôt" />
        <Legend color="rgba(255,255,255,0.14)" label="Inactif" />
      </View>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text className="ml-1.5 font-sans text-[11px] text-white/55">{label}</Text>
    </View>
  );
}

/** Small KPI with a leading SVG icon bubble. */
export function SmallStatCard({ stat, icon }: { stat: Stat; icon: IconName }) {
  return (
    <Card className="flex-1">
      <View className="flex-row items-center justify-between">
        <Eyebrow>{stat.label}</Eyebrow>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-bordeaux-50">
          <Icon name={icon} size={16} color={colors.bordeaux[600]} />
        </View>
      </View>
      <Text className="mt-2.5 font-display text-[24px] text-ink" style={{ letterSpacing: -0.6 }}>
        {stat.value}
      </Text>
      <View className="mt-1">
        <Delta text={stat.delta} positive={stat.positive} />
      </View>
    </Card>
  );
}

/** Featured subscriber spotlight. */
export function SpotlightCard() {
  return (
    <Card className="overflow-hidden p-0">
      <View className="h-52 items-center justify-center bg-bordeaux-50">
        {/* soft concentric rings behind the monogram */}
        <View className="absolute h-44 w-44 rounded-full border border-bordeaux-200/50" />
        <View className="absolute h-32 w-32 rounded-full border border-bordeaux-200/60" />
        <Avatar initials="ES" size={92} tone="bordeaux" />
        <View className="absolute left-4 top-4 flex-row items-center rounded-full bg-card px-3 py-1.5">
          <Icon name="spark" size={13} color={colors.bordeaux[600]} strokeWidth={2} />
          <Text className="ml-1.5 font-semibold text-[12px] text-bordeaux-700">
            {spotlight.tag}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-1">
          <Text className="font-display-semi text-[16px] text-ink">{spotlight.name}</Text>
          <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{spotlight.role}</Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <IconButton name="close" tone="outline" size={38} />
          <IconButton name="check" tone="night" size={38} color={colors.white} />
        </View>
      </View>
    </Card>
  );
}

/** Recent subscribers card. */
export function MembersCard() {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <View>
          <Eyebrow>Communauté</Eyebrow>
          <Text className="mt-1 font-display text-[18px] text-ink" style={{ letterSpacing: -0.3 }}>
            Abonnés récents
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-sand px-3 py-1">
          <Text className="font-semibold text-[12px] text-ink-soft">{members.length}</Text>
          <View className="ml-1">
            <Icon name="chevron-right" size={13} color={colors.ink} strokeWidth={2} />
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center">
        {members.map((m, i) => (
          <View key={m.name} style={{ marginLeft: i === 0 ? 0 : -12 }}>
            <Avatar
              initials={m.initials}
              size={42}
              ring
              tone={i % 3 === 0 ? "bordeaux" : i % 3 === 1 ? "ink" : "sand"}
            />
          </View>
        ))}
        <View className="ml-2 h-[42px] w-[42px] items-center justify-center rounded-full border border-dashed border-ink/20">
          <Icon name="plus" size={16} color={colors.muted} strokeWidth={2} />
        </View>
      </View>

      <View className="mt-5 flex-row" style={{ gap: 10 }}>
        <View className="flex-1">
          <Button label="Ajouter" icon="plus" variant="accent" />
        </View>
        <View className="flex-1">
          <Button label="Gérer" icon="pencil" variant="outline" />
        </View>
      </View>
    </Card>
  );
}

/** Revenue-growth SVG bar chart. */
export function RevenueCard() {
  const W = 320;
  const H = 168;
  const padX = 6;
  const yTop = 34;
  const yBase = 132;
  const maxScale = 82;
  const slot = (W - padX * 2) / revenueBars.length;
  const barW = 26;

  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View>
          <Eyebrow>Performance</Eyebrow>
          <Text className="mt-1 font-display text-[18px] text-ink" style={{ letterSpacing: -0.3 }}>
            Croissance des revenus
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-night px-3 py-1.5">
          <Text className="font-medium text-[12px] text-white">Ce semestre</Text>
          <View className="ml-1.5">
            <Icon name="chevron-down" size={13} color={colors.white} strokeWidth={2} />
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline">
        <Text className="font-display-x text-[38px] text-ink" style={{ letterSpacing: -1.4 }}>
          +43,81
        </Text>
        <Text className="ml-1 font-display text-[20px] text-bordeaux-600">%</Text>
      </View>
      <Text className="mt-1 font-sans text-[13px] text-ink-muted">
        Une meilleure rétention des abonnés fait grimper vos revenus.
      </Text>

      <View className="mt-4">
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* gridlines */}
          {[0, 0.5, 1].map((g) => {
            const y = yBase - g * (yBase - yTop);
            return (
              <Line
                key={g}
                x1={padX}
                y1={y}
                x2={W - padX}
                y2={y}
                stroke={colors.ink}
                strokeOpacity={0.07}
                strokeWidth={1}
                strokeDasharray={g === 0 ? undefined : "3 5"}
              />
            );
          })}
          {revenueBars.map((b, i) => {
            const cx = padX + slot * i + slot / 2;
            const bh = (b.value / maxScale) * (yBase - yTop);
            const y = yBase - bh;
            return (
              <Rect
                key={b.label}
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={bh}
                rx={7}
                fill={b.highlight ? colors.bordeaux[600] : colors.sand}
              />
            );
          })}
          {revenueBars.map((b, i) => {
            const cx = padX + slot * i + slot / 2;
            const bh = (b.value / maxScale) * (yBase - yTop);
            const y = yBase - bh;
            return (
              <SvgText
                key={`v-${b.label}`}
                x={cx}
                y={y - 8}
                fontSize={11}
                fontFamily="SpaceGrotesk_600SemiBold"
                fill={b.highlight ? colors.bordeaux[600] : colors.muted}
                textAnchor="middle"
              >
                {`${b.value}%`}
              </SvgText>
            );
          })}
          {revenueBars.map((b, i) => {
            const cx = padX + slot * i + slot / 2;
            return (
              <SvgText
                key={`l-${b.label}`}
                x={cx}
                y={yBase + 20}
                fontSize={11}
                fontFamily="SpaceGrotesk_500Medium"
                fill={colors.muted}
                textAnchor="middle"
              >
                {b.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
}
