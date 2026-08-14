import { useCallback, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { Input } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import {
  adminUsers,
  adminRemoveMember,
  adminResendLink,
  type AdminUser,
} from "@/lib/admin";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setUsers(await adminUsers());
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q) ||
        String(u.telegramUserId).includes(q) ||
        u.group.toLowerCase().includes(q),
    );
  }, [users, query]);

  const key = (u: AdminUser) => `${u.groupId}:${u.telegramUserId}`;

  async function eject(u: AdminUser) {
    setBusy(key(u));
    setError(null);
    try {
      await adminRemoveMember(u.groupId, u.telegramUserId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Éjection impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function sendLink(u: AdminUser) {
    setBusy(key(u));
    setError(null);
    try {
      await adminResendLink(u.groupId, u.telegramUserId);
      setSent(key(u));
      setTimeout(() => setSent(null), 2000);
    } catch (e: any) {
      setError(e?.message ?? "Envoi impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen onRefresh={load}>
      <View>
        <Eyebrow>Console · Annuaire</Eyebrow>
        <Text className="mt-1 font-display-x text-[28px] text-ink" style={{ letterSpacing: -1 }}>
          Utilisateurs
        </Text>
        <Text className="mt-1 font-sans text-[13px] text-ink-muted">
          Tous les membres, tous groupes confondus.
        </Text>
      </View>

      <Input
        label=""
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher : nom, @pseudo, numéro Telegram, groupe…"
      />

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {users === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          <Text className="font-sans text-[12px] text-ink-muted">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </Text>
          {filtered.map((u) => {
            const k = key(u);
            const isBusy = busy === k;
            const isSent = sent === k;
            return (
              <Card key={k}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-display-semi text-[15px] text-ink">{u.name}</Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                      {u.username ? `@${u.username} · ` : ""}#{u.telegramUserId}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                      {u.group} · {u.ownerEmail}
                    </Text>
                  </View>
                  <View className="items-end" style={{ gap: 4 }}>
                    <Tag tone={u.paid ? "bordeaux" : "sand"}>{u.paid ? "Payé" : "Non payé"}</Tag>
                    {!u.inGroup ? <Tag tone="sand">Retiré</Tag> : null}
                  </View>
                </View>

                <View className="mt-3 flex-row items-center border-t border-ink/[0.06] pt-3" style={{ gap: 8 }}>
                  {isBusy ? (
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  ) : (
                    <>
                      <Pressable
                        onPress={() => sendLink(u)}
                        className="flex-row items-center rounded-full bg-bordeaux-600 px-3.5 py-2"
                      >
                        <Icon name={isSent ? "check" : "send"} size={14} color={colors.white} />
                        <Text className="ml-1.5 font-semibold text-[12px] text-white">
                          {isSent ? "Envoyé" : "Envoyer lien"}
                        </Text>
                      </Pressable>
                      {u.inGroup ? (
                        <Pressable
                          onPress={() => eject(u)}
                          className="flex-row items-center rounded-full bg-sand px-3.5 py-2"
                        >
                          <Icon name="trash" size={14} color={colors.ink} />
                          <Text className="ml-1.5 font-semibold text-[12px] text-ink">Éjecter</Text>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
