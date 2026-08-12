import { View, Text } from "react-native";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";

export default function AccesScreen() {
  return (
    <Screen>
      <PageTitle
        eyebrow="Gérer"
        title="Accès & Bot"
        subtitle="Connectez vos groupes Telegram au bot Paylika."
      />

      <Card tone="dark">
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-bordeaux-600">
            <Icon name="send" size={22} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="font-display-semi text-[16px] text-white">
              Connecter un groupe Telegram
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-white/55">
              Ajoutez @PaylikaBot comme admin — connexion en 30 s.
            </Text>
          </View>
        </View>
        <View className="mt-4" style={{ maxWidth: 220 }}>
          <Button label="Connecter (bientôt)" icon="plus" variant="accent" />
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="font-display-semi text-[15px] text-ink">Groupes connectés</Text>
          <Tag tone="sand">Bientôt</Tag>
        </View>
        <Text className="mt-2 font-sans text-[13px] text-ink-muted">
          La connexion du bot et le kick automatique arrivent à la prochaine étape.
        </Text>
      </Card>
    </Screen>
  );
}
