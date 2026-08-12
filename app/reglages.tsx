import { View, Text } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";

function SettingRow({
  icon,
  title,
  subtitle,
  status,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  status: "connecté" | "à connecter" | "bientôt";
  last?: boolean;
}) {
  const tone = status === "connecté" ? "bordeaux" : "sand";
  return (
    <View
      className={`flex-row items-center py-3.5 ${last ? "" : "border-b border-ink/[0.06]"}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-bordeaux-50">
        <Icon name={icon} size={17} color={colors.bordeaux[600]} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-[14px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{subtitle}</Text>
      </View>
      <Tag tone={tone as "bordeaux" | "sand"}>{status}</Tag>
    </View>
  );
}

export default function ReglagesScreen() {
  return (
    <Screen>
      <PageTitle
        eyebrow="Compte"
        title="Réglages"
        subtitle="Connexions, moyens de paiement et branding."
      />

      <Card>
        <SettingRow
          icon="send"
          title="Bot Telegram"
          subtitle="@PaylikaBot — gestion des accès"
          status="à connecter"
        />
        <SettingRow
          icon="arrow-up-right"
          title="Moyen de paiement"
          subtitle="Wave, Orange Money, PayDunya…"
          status="à connecter"
        />
        <SettingRow
          icon="user"
          title="Profil & branding"
          subtitle="Nom, logo, page publique"
          status="bientôt"
          last
        />
      </Card>
    </Screen>
  );
}
