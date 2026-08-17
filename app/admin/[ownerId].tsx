import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Linking, Platform } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import {
  adminOwnerDetail,
  adminResendLink,
  adminGroupLink,
  adminDeleteOwner,
  type AdminOwnerDetail,
} from "@/lib/admin";

function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
  else Linking.openURL(url).catch(() => {});
}
function openWa(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits) openUrl(`https://wa.me/${digits}`);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 120 }}>
      <Text className="font-sans text-[11px] uppercase text-ink-muted" style={{ letterSpacing: 0.3 }}>
        {label}
      </Text>
      <Text className="mt-0.5 font-display-x text-[18px] text-ink" style={{ letterSpacing: -0.6 }}>
        {value}
      </Text>
    </View>
  );
}

export default function AdminOwnerScreen() {
  const router = useRouter();
  const { ownerId } = useLocalSearchParams<{ ownerId: string }>();
  const id = String(ownerId ?? "");

  const [data, setData] = useState<AdminOwnerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [genLinks, setGenLinks] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function removeOwner() {
    setDeleting(true);
    setError(null);
    try {
      await adminDeleteOwner(id);
      router.replace("/admin/owners");
    } catch (e: any) {
      setError(e?.message ?? "Suppression impossible.");
      setDeleting(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await adminOwnerDetail(id));
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groupName = (gid: string | null) => data?.groups.find((g) => g.id === gid)?.name ?? "—";

  async function resend(subId: string, groupId: string | null, tgId: number | null) {
    if (!groupId || !tgId) {
      setError("Impossible : abonné sans groupe ou sans Telegram.");
      return;
    }
    setBusy(subId);
    setError(null);
    try {
      await adminResendLink(groupId, tgId);
      setSent(subId);
      setTimeout(() => setSent(null), 2000);
    } catch (e: any) {
      setError(e?.message ?? "Envoi impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function genLink(groupId: string) {
    setLinkBusy(groupId);
    setError(null);
    try {
      const r = await adminGroupLink(groupId);
      if (r.link) {
        setGenLinks((prev) => ({ ...prev, [groupId]: r.link }));
        openUrl(r.link);
      }
    } catch (e: any) {
      setError(e?.message ?? "Lien impossible.");
    } finally {
      setLinkBusy(null);
    }
  }

  return (
    <Screen onRefresh={load}>
      <PageTitle eyebrow="Super-admin · Propriétaire" title="Détails" subtitle="Contact, gains, groupes et abonnés." />

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {data === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          {/* Contact + gains */}
          <Card>
            <Text className="font-display-semi text-[16px] text-ink">{data.owner.email}</Text>
            <View className="mt-2 flex-row flex-wrap items-center" style={{ gap: 8 }}>
              {data.owner.whatsapp ? (
                <Pressable
                  onPress={() => openWa(data.owner.whatsapp!)}
                  className="flex-row items-center rounded-full px-2.5 py-1"
                  style={{ gap: 5, backgroundColor: colors.forest + "14" }}
                >
                  <Icon name="whatsapp" size={13} color={colors.forest} />
                  <Text className="font-semibold text-[12px]" style={{ color: colors.forest }}>
                    {data.owner.whatsapp}
                    {data.owner.country ? ` · ${data.owner.country}` : ""}
                  </Text>
                </Pressable>
              ) : (
                <Text className="font-sans text-[12px] text-ink-muted">Pas de WhatsApp renseigné</Text>
              )}
              {data.owner.createdAt ? (
                <Text className="font-sans text-[11px] text-ink-muted">
                  Inscrit le {new Date(data.owner.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              ) : null}
            </View>

            <View className="mt-3 flex-row flex-wrap border-t border-ink/[0.06] pt-3" style={{ gap: 18 }}>
              <Stat label="Encaissé" value={`${formatInt(data.owner.revenue)} XOF`} />
              <Stat label="Comm. Paylika" value={`${formatInt(data.owner.commission)} XOF`} />
              <Stat label="Groupes" value={`${data.owner.groups}`} />
              <Stat label="Abonnés actifs" value={`${data.owner.activeSubscribers}`} />
            </View>
          </Card>

          {/* Groupes + liens */}
          <Card>
            <Eyebrow>Groupes ({data.groups.length})</Eyebrow>
            <View className="mt-2" style={{ gap: 4 }}>
              {data.groups.length ? (
                data.groups.map((g, i) => {
                  const link = genLinks[g.id] ?? g.inviteLink;
                  return (
                    <View key={g.id} className={i === 0 ? "" : "border-t border-ink/[0.06] pt-3 mt-3"}>
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 font-semibold text-[13px] text-ink">{g.name}</Text>
                        <Tag tone="sand">{g.kind}</Tag>
                      </View>
                      {g.chatConnected ? (
                        link ? (
                          <Pressable
                            onPress={() => openUrl(link)}
                            className="mt-2 flex-row items-center self-start rounded-full bg-bordeaux-50 px-3 py-1.5"
                            style={{ gap: 5 }}
                          >
                            <Icon name="send" size={13} color={colors.bordeaux[600]} />
                            <Text className="font-semibold text-[12px] text-bordeaux-700">Ouvrir le groupe</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => genLink(g.id)}
                            disabled={linkBusy === g.id}
                            className="mt-2 flex-row items-center self-start rounded-full bg-sand px-3 py-1.5"
                            style={{ gap: 5 }}
                          >
                            {linkBusy === g.id ? (
                              <ActivityIndicator size="small" color={colors.bordeaux[600]} />
                            ) : (
                              <Icon name="plus" size={13} color={colors.ink} />
                            )}
                            <Text className="font-semibold text-[12px] text-ink">Générer un lien</Text>
                          </Pressable>
                        )
                      ) : (
                        <Text className="mt-1 font-sans text-[11px] text-ink-muted">Non connecté à Telegram</Text>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text className="font-sans text-[12px] text-ink-muted">Aucun groupe.</Text>
              )}
            </View>
          </Card>

          <View className="mt-1">
            <Eyebrow>Abonnés ({data.subscriptions.length})</Eyebrow>
          </View>

          {data.subscriptions.map((s) => {
            const tgId = s.subscribers?.telegram_user_id ?? null;
            const active = s.status === "active";
            const isBusy = busy === s.id;
            const isSent = sent === s.id;
            return (
              <Card key={s.id}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-display-semi text-[14px] text-ink">
                      {s.subscribers?.full_name ?? "Abonné"}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                      {groupName(s.group_id)}
                      {s.expires_at ? ` · expire le ${new Date(s.expires_at).toLocaleDateString("fr-FR")}` : ""}
                    </Text>
                  </View>
                  <Tag tone={active ? "bordeaux" : "sand"}>{active ? "Actif" : s.status}</Tag>
                </View>

                <View className="mt-3 border-t border-ink/[0.06] pt-3">
                  {isBusy ? (
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  ) : (
                    <Pressable
                      onPress={() => resend(s.id, s.group_id, tgId)}
                      disabled={!tgId}
                      className="flex-row items-center self-start rounded-full bg-sand px-3.5 py-2"
                      style={{ opacity: tgId ? 1 : 0.5 }}
                    >
                      <Icon name={isSent ? "check" : "send"} size={14} color={colors.bordeaux[600]} />
                      <Text className="ml-1.5 font-semibold text-[12px] text-bordeaux-700">
                        {isSent ? "Lien envoyé" : "Renvoyer le lien"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}

          {/* Zone sensible — suppression définitive */}
          <Card>
            <Eyebrow>Zone sensible</Eyebrow>
            {!confirmDel ? (
              <>
                <Text className="mt-2 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
                  Supprimer définitivement ce propriétaire : ses offres, abonnés, paiements et son compte.
                  Irréversible. (Pour un blocage réversible, utilise « Exclure » dans la liste.)
                </Text>
                <Pressable
                  onPress={() => setConfirmDel(true)}
                  className="mt-3 flex-row items-center justify-center rounded-2xl border border-bordeaux-600 py-3"
                  style={{ gap: 6 }}
                >
                  <Icon name="trash" size={15} color={colors.bordeaux[600]} />
                  <Text className="font-semibold text-[13px] text-bordeaux-700">Supprimer ce compte</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="mt-2 font-semibold text-[13px] text-ink">
                  Confirmer la suppression définitive de ce compte ?
                </Text>
                <View className="mt-3 flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => setConfirmDel(false)}
                    className="flex-1 items-center rounded-full border border-ink/15 py-3"
                  >
                    <Text className="font-semibold text-[13px] text-ink">Annuler</Text>
                  </Pressable>
                  <Pressable
                    onPress={removeOwner}
                    disabled={deleting}
                    className="flex-1 items-center rounded-full bg-bordeaux-600 py-3"
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text className="font-semibold text-[13px] text-white">Oui, supprimer</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
