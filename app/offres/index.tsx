import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, PageHeader } from "@/components/Screen";
import { Card, Button, Tag } from "@/components/ui";
import { SkeletonList, ErrorState, EmptyState } from "@/components/States";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchOffres, deleteOffer, intervalLabel, payLinkFor, type Offre } from "@/data/queries";
import { formatInt } from "@/components/cards";
import { copyOrShare } from "@/lib/clipboard";


function OffreCard({
  offre,
  onEdit,
  onDelete,
}: {
  offre: Offre;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const payLink = payLinkFor(offre);
  const linkPreview = payLink.replace(/^https?:\/\//, "").slice(0, 28);

  async function copy() {
    const r = await copyOrShare(payLink);
    if (r !== "failed") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-display-semi text-[16px] text-ink">{offre.name}</Text>
          <View className="mt-1.5">
            <Tag tone={offre.groupKind === "telegram" ? "bordeaux" : "sand"}>
              {offre.groupName}
            </Tag>
          </View>
        </View>
        <View className="items-end">
          {offre.comparePrice ? (
            <Text
              className="font-medium text-[12px] text-ink-muted"
              style={{ textDecorationLine: "line-through" }}
            >
              {formatInt(offre.comparePrice)}
            </Text>
          ) : null}
          <Text className="font-display text-[20px] text-ink" style={{ letterSpacing: -0.5 }}>
            {formatInt(offre.price)}
          </Text>
          <Text className="font-medium text-[11px] text-ink-muted">
            {offre.currency} / {intervalLabel(offre.interval_days)}
          </Text>
        </View>
      </View>

      {/* Copyable payment link */}
      <Pressable
        onPress={copy}
        className="mt-4 flex-row items-center justify-between rounded-2xl bg-paper border border-ink/[0.07] px-3.5 py-3"
      >
        <View className="flex-1 flex-row items-center pr-2" style={{ gap: 6 }}>
          <Icon name="send" size={14} color={colors.bordeaux[600]} />
          <Text numberOfLines={1} className="flex-1 font-medium text-[12px] text-bordeaux-700">
            {linkPreview}…
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-bordeaux-600 px-3 py-1.5" style={{ gap: 4 }}>
          {copied ? <Icon name="check" size={12} color={colors.white} strokeWidth={2.6} /> : null}
          <Text className="font-semibold text-[11px] text-white">
            {copied ? "Copié" : "Copier"}
          </Text>
        </View>
      </Pressable>

      {/* Actions */}
      <View className="mt-3 flex-row items-center justify-end">
        {confirming ? (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="font-medium text-[12px] text-ink-muted">Supprimer ?</Text>
            <Pressable onPress={onDelete} className="rounded-full bg-bordeaux-600 px-3 py-1.5">
              <Text className="font-semibold text-[12px] text-white">Oui</Text>
            </Pressable>
            <Pressable onPress={() => setConfirming(false)} className="rounded-full bg-sand px-3 py-1.5">
              <Text className="font-semibold text-[12px] text-ink">Non</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Pressable onPress={onEdit} className="h-8 w-8 items-center justify-center rounded-full bg-sand">
              <Icon name="pencil" size={15} color={colors.ink} />
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

export default function OffresScreen() {
  const router = useRouter();
  const [offres, setOffres] = useState<Offre[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOffres(await fetchOffres());
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onDelete(id: string) {
    try {
      await deleteOffer(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Suppression impossible");
    }
  }

  return (
    <Screen onRefresh={load}>
      <PageHeader
        eyebrow="Vendre"
        title="Offres"
        subtitle="Vos paywalls : prix, périodicité et lien de partage."
        action={
          <Button
            label="Créer une offre"
            icon="plus"
            variant="accent"
            onPress={() => router.push("/offres/nouvelle")}
          />
        }
      />

      {offres === null && error ? (
        <ErrorState message={error} onRetry={load} />
      ) : offres === null ? (
        <SkeletonList count={3} />
      ) : offres.length ? (
        <>
          {error ? (
            <Card>
              <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
            </Card>
          ) : null}
          {offres.map((o) => (
            <OffreCard
              key={o.id}
              offre={o}
              onEdit={() => router.push(`/offres/${o.id}` as any)}
              onDelete={() => onDelete(o.id)}
            />
          ))}
        </>
      ) : (
        <EmptyState
          icon="tag"
          title="Aucune offre pour l'instant"
          text="Crée ta première offre pour générer un lien de paiement à partager."
          action={
            <Button
              label="Créer une offre"
              icon="plus"
              variant="accent"
              onPress={() => router.push("/offres/nouvelle")}
            />
          }
        />
      )}
    </Screen>
  );
}
