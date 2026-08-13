import { View, Text, ActivityIndicator } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Eyebrow } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAsync, fetchNotifications, type Notif } from "@/data/queries";

const MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
function shortDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const META: Record<Notif["kind"], { icon: IconName; bg: string; color: string }> = {
  expired: { icon: "close", bg: colors.bordeaux[50], color: colors.bordeaux[600] },
  expiring: { icon: "bell", bg: colors.sand, color: colors.ink },
  payment: { icon: "trend-up", bg: "rgba(47,107,79,0.12)", color: colors.forest },
};

function Row({ n, last }: { n: Notif; last: boolean }) {
  const m = META[n.kind];
  return (
    <View className={`flex-row items-center py-3 ${last ? "" : "border-b border-ink/[0.06]"}`}>
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: m.bg }}
      >
        <Icon name={m.icon} size={16} color={m.color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-[13px] text-ink">{n.title}</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{n.subtitle}</Text>
      </View>
      <Text className="font-medium text-[11px] text-ink-muted">{shortDate(n.date)}</Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const { data, loading, error } = useAsync(fetchNotifications);

  return (
    <Screen>
      <PageTitle
        eyebrow="Activité"
        title="Notifications"
        subtitle="Relances, expirations proches et paiements reçus."
      />

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : data && data.length ? (
        <Card>
          {data.map((n, i) => (
            <Row key={n.id} n={n} last={i === data.length - 1} />
          ))}
        </Card>
      ) : (
        <Card>
          <Eyebrow>Rien à signaler</Eyebrow>
          <Text className="mt-2 font-sans text-[13px] text-ink-muted">
            Aucune notification pour le moment.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
