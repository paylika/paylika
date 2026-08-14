import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, PageHeader } from "@/components/Screen";
import { Card, Avatar, Tag, Button } from "@/components/ui";
import { Chip } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import {
  fetchSubscribers,
  extendSubscription,
  cancelSubscription,
  deleteSubscriber,
  type SubscriberRow,
} from "@/data/queries";

type Filter = "all" | "active" | "expired";

const MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
function shortDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function statusTone(s: string): "bordeaux" | "sand" | "night" {
  return s === "active" ? "bordeaux" : s === "expired" ? "night" : "sand";
}
function statusLabel(s: string) {
  return s === "active" ? "Actif" : s === "expired" ? "Expiré" : s === "pending" ? "En attente" : "Aucun";
}

function Row({
  s,
  onRenew,
  onExpire,
  onDelete,
  busy,
}: {
  s: SubscriberRow;
  onRenew: () => void;
  onExpire: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const hasSub = !!s.subscriptionId;
  return (
    <Card>
      <View className="flex-row items-center">
        <Avatar initials={initials(s.name)} size={42} tone="bordeaux" />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-[15px] text-ink">{s.name}</Text>
          <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
            {s.username ? `@${s.username} · ` : ""}
            {s.groupName}
          </Text>
        </View>
        <View className="items-end">
          <Tag tone={statusTone(s.status)}>{statusLabel(s.status)}</Tag>
          {s.expiresAt ? (
            <Text className="mt-1 font-medium text-[11px] text-ink-muted">
              exp. {shortDate(s.expiresAt)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-ink/[0.06] pt-3">
        {busy ? (
          <ActivityIndicator color={colors.bordeaux[600]} />
        ) : confirming ? (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="font-medium text-[12px] text-ink-muted">Supprimer l'abonné ?</Text>
            <Pressable onPress={onDelete} className="rounded-full bg-bordeaux-600 px-3 py-1.5">
              <Text className="font-semibold text-[12px] text-white">Oui</Text>
            </Pressable>
            <Pressable onPress={() => setConfirming(false)} className="rounded-full bg-sand px-3 py-1.5">
              <Text className="font-semibold text-[12px] text-ink">Non</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={onRenew}
              disabled={!hasSub}
              className="flex-row items-center rounded-full bg-bordeaux-600 px-3 py-1.5"
              style={{ opacity: hasSub ? 1 : 0.4 }}
            >
              <Icon name="check" size={13} color={colors.white} strokeWidth={2.4} />
              <Text className="ml-1 font-semibold text-[12px] text-white">+30 j</Text>
            </Pressable>
            <Pressable
              onPress={onExpire}
              disabled={!hasSub || s.status === "expired"}
              className="rounded-full bg-sand px-3 py-1.5"
              style={{ opacity: hasSub && s.status !== "expired" ? 1 : 0.4 }}
            >
              <Text className="font-semibold text-[12px] text-ink">Expirer</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirming(true)}
              className="h-8 w-8 items-center justify-center rounded-full bg-bordeaux-50"
            >
              <Icon name="close" size={15} color={colors.bordeaux[600]} />
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function AbonnesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<SubscriberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await fetchSubscribers());
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Action impossible");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = (rows ?? []).filter((r) =>
    filter === "all" ? true : r.status === filter,
  );
  const counts = {
    all: rows?.length ?? 0,
    active: rows?.filter((r) => r.status === "active").length ?? 0,
    expired: rows?.filter((r) => r.status === "expired").length ?? 0,
  };

  return (
    <Screen onRefresh={load}>
      <PageHeader
        eyebrow="Gérer"
        title="Abonnés"
        subtitle="Renouvelez, expirez ou retirez un accès."
        action={
          <Button
            label="Ajouter"
            icon="plus"
            variant="accent"
            onPress={() => router.push("/abonnes/nouveau" as any)}
          />
        }
      />

      <View className="flex-row" style={{ gap: 8 }}>
        <Chip label={`Tous (${counts.all})`} active={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label={`Actifs (${counts.active})`} active={filter === "active"} onPress={() => setFilter("active")} />
        <Chip label={`Expirés (${counts.expired})`} active={filter === "expired"} onPress={() => setFilter("expired")} />
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {rows === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : filtered.length ? (
        filtered.map((s) => (
          <Row
            key={s.id}
            s={s}
            busy={busyId === s.id}
            onRenew={() =>
              s.subscriptionId &&
              act(s.id, () => extendSubscription(s.subscriptionId!, s.expiresAt, 30))
            }
            onExpire={() =>
              s.subscriptionId && act(s.id, () => cancelSubscription(s.subscriptionId!))
            }
            onDelete={() => act(s.id, () => deleteSubscriber(s.id))}
          />
        ))
      ) : (
        <Card>
          <Text className="font-sans text-[13px] text-ink-muted">Aucun abonné dans ce filtre.</Text>
        </Card>
      )}
    </Screen>
  );
}
