import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag, Eyebrow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAsync, fetchOffres, type Offre } from "@/data/queries";
import { formatInt } from "@/components/cards";

function intervalLabel(days: number): string {
  if (days >= 360) return "an";
  if (days >= 85 && days <= 95) return "trimestre";
  if (days >= 28 && days <= 31) return "mois";
  return `${days} j`;
}

function OffreCard({ offre }: { offre: Offre }) {
  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-display-semi text-[16px] text-ink">{offre.name}</Text>
          <View className="mt-1.5 flex-row items-center" style={{ gap: 8 }}>
            <Tag tone={offre.groupKind === "telegram" ? "bordeaux" : "sand"}>
              {offre.groupName}
            </Tag>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-display text-[20px] text-ink" style={{ letterSpacing: -0.5 }}>
            {formatInt(offre.price)}
          </Text>
          <Text className="font-medium text-[11px] text-ink-muted">
            {offre.currency} / {intervalLabel(offre.interval_days)}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-ink/[0.06] pt-3">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Icon name="send" size={15} color={colors.bordeaux[600]} />
          <Text className="font-medium text-[12px] text-bordeaux-700">
            paylika.me/{offre.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 18)}
          </Text>
        </View>
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
    </Card>
  );
}

export default function OffresScreen() {
  const router = useRouter();
  const { data, loading, error } = useAsync(fetchOffres);

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

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : error ? (
        <Card>
          <Text className="font-semibold text-[13px] text-bordeaux-700">Erreur</Text>
          <Text className="mt-1 font-sans text-[12px] text-ink-muted">{error}</Text>
        </Card>
      ) : data && data.length ? (
        data.map((o) => <OffreCard key={o.id} offre={o} />)
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
