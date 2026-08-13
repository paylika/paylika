import { View, Text, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Avatar, Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAuth, signOut } from "@/lib/auth";

function SettingRow({
  icon,
  title,
  subtitle,
  status,
  onPress,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  status: "connecté" | "à connecter" | "bientôt";
  onPress?: () => void;
  last?: boolean;
}) {
  const tone = status === "connecté" ? "bordeaux" : "sand";
  return (
    <Pressable
      onPress={onPress}
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
      <View className="ml-2">
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

export default function ReglagesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const email = session?.user?.email ?? "—";
  const initials = (email[0] ?? "P").toUpperCase();

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <Screen>
      <PageTitle
        eyebrow="Compte"
        title="Réglages"
        subtitle="Connexions, moyens de paiement et branding."
      />

      {/* Profile card */}
      <Card>
        <View className="flex-row items-center">
          <Avatar initials={initials} size={52} tone="bordeaux" />
          <View className="ml-3 flex-1">
            <Text className="font-display-semi text-[16px] text-ink">Mon compte</Text>
            <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{email}</Text>
          </View>
          <Tag tone="sand">Propriétaire</Tag>
        </View>
      </Card>

      {/* Connections */}
      <Card>
        <SettingRow
          icon="send"
          title="Bot Telegram"
          subtitle="@Paylikabot — gestion des accès"
          status="connecté"
          onPress={() => router.push("/acces" as any)}
        />
        <SettingRow
          icon="arrow-up-right"
          title="Moyen de paiement"
          subtitle="PayDunya (Wave, Orange Money…)"
          status="à connecter"
          onPress={() => Linking.openURL("https://paydunya.com")}
        />
        <SettingRow
          icon="wallet"
          title="Retraits"
          subtitle="Solde et historique des retraits"
          status="connecté"
          onPress={() => router.push("/argent" as any)}
        />
        <SettingRow
          icon="user"
          title="Profil & branding"
          subtitle="Nom, logo, page publique"
          status="bientôt"
          last
        />
      </Card>

      <Button label="Se déconnecter" icon="close" variant="outline" onPress={logout} />
    </Screen>
  );
}
