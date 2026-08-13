import { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { fetchOffres, deleteOffer, intervalLabel, type Offre } from "@/data/queries";
import { formatInt } from "@/components/cards";
import { copyOrShare } from "@/lib/clipboard";

const BOT = "https://t.me/Paylikabot";

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
  const payLink = `${BOT}?start=${offre.id}`;

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
            t.me/Paylikabot?start={offre.id.slice(0, 8)}…
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
    <Screen>
      <View className="flex-row items-end justify-between" style={{ gap: 12 }}>
        <PageTitle
          eyebrow="Vendre"
          title="Offres"
          subtitle="Vos paywalls : prix, périodicité et lien de partage."
        />
        <View style={{ minWidth: 150 }}>
          <Button
            label="Créer une offre"
            icon="plus"
            variant="accent"
            onPress={() => router.push("/offres/nouvelle")}
          />
        </View>
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {offres === null ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : offres.length ? (
        offres.map((o) => (
          <OffreCard
            key={o.id}
            offre={o}
            onEdit={() => router.push(`/offres/${o.id}` as any)}
            onDelete={() => onDelete(o.id)}
          />
        ))
      ) : (
        <Card>
          <Eyebrow>Aucune offre</Eyebrow>
          <Text className="mt-2 font-sans text-[13px] text-ink-muted">
            Créez votre première offre pour générer un lien de paiement.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
