import { View, Text, ActivityIndicator } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Avatar, Tag } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAsync, fetchSubscribers, type SubscriberRow } from "@/data/queries";

function statusTone(status: string): "bordeaux" | "sand" | "night" {
  if (status === "active") return "bordeaux";
  if (status === "expired") return "night";
  return "sand";
}
function statusLabel(status: string): string {
  return status === "active"
    ? "Actif"
    : status === "expired"
    ? "Expiré"
    : status === "pending"
    ? "En attente"
    : status;
}
function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function Row({ s, last }: { s: SubscriberRow; last: boolean }) {
  return (
    <View
      className={`flex-row items-center py-3 ${last ? "" : "border-b border-ink/[0.06]"}`}
    >
      <Avatar initials={initialsOf(s.name)} size={40} tone="bordeaux" />
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-[14px] text-ink">{s.name}</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
          {s.username ? `@${s.username} · ` : ""}
          {s.groupName}
        </Text>
      </View>
      <Tag tone={statusTone(s.status)}>{statusLabel(s.status)}</Tag>
    </View>
  );
}

export default function AbonnesScreen() {
  const { data, loading, error } = useAsync(fetchSubscribers);

  return (
    <Screen>
      <PageTitle
        eyebrow="Gérer"
        title="Abonnés"
        subtitle="Qui a payé, statut d'accès et historique."
      />

      <Card>
        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        ) : error ? (
          <Text className="font-sans text-[12px] text-ink-muted">{error}</Text>
        ) : data && data.length ? (
          data.map((s, i) => <Row key={s.id} s={s} last={i === data.length - 1} />)
        ) : (
          <View className="flex-row items-center py-4" style={{ gap: 8 }}>
            <Icon name="users" size={18} color={colors.muted} />
            <Text className="font-sans text-[13px] text-ink-muted">
              Aucun abonné pour le moment.
            </Text>
          </View>
        )}
      </Card>
    </Screen>
  );
}
