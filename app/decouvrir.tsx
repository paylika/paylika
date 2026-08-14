import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo, Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";

function CTA({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-2xl px-6 py-4 ${light ? "bg-white" : "bg-bordeaux-600"}`}
      style={
        light
          ? undefined
          : { shadowColor: colors.bordeaux[600], shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }
      }
    >
      <Text className={`font-display-semi text-[16px] ${light ? "text-bordeaux-700" : "text-white"}`}>{label}</Text>
      <Icon name="arrow-up-right" size={18} color={light ? colors.bordeaux[600] : colors.white} />
    </Pressable>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 12 }}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-bordeaux-600">
        <Text className="font-display-x text-[15px] text-white">{n}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-display-semi text-[15px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[13px] text-ink-soft" style={{ lineHeight: 19 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function Benefit({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View className="rounded-2xl border border-ink/[0.08] bg-card p-4" style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150 }}>
      <View className="h-9 w-9 items-center justify-center rounded-2xl bg-bordeaux-50">
        <Icon name={icon} size={18} color={colors.bordeaux[600]} />
      </View>
      <Text className="mt-2.5 font-display-semi text-[14px] text-ink">{title}</Text>
      <Text className="mt-0.5 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
        {text}
      </Text>
    </View>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View className="border-b border-ink/[0.07] py-3.5">
      <Text className="font-semibold text-[14px] text-ink">{q}</Text>
      <Text className="mt-1 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
        {a}
      </Text>
    </View>
  );
}

export default function DecouvrirScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const start = () => router.push("/login" as any);

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 40 }}>
      <View style={{ width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <View style={{ paddingTop: insets.top + 10 }} className="flex-row items-center justify-between px-5 pb-2">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Logo size={26} />
            <Text className="font-display text-[19px] text-ink" style={{ letterSpacing: -0.4 }}>
              Pay<Text className="text-bordeaux-600">lika</Text>
            </Text>
          </View>
          <Pressable onPress={start} className="rounded-full bg-sand px-4 py-2">
            <Text className="font-semibold text-[13px] text-ink">Se connecter</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View className="px-5 pt-6">
          <View className="self-start rounded-full bg-bordeaux-50 px-3 py-1">
            <Text className="font-bold text-[10px] uppercase text-bordeaux-700" style={{ letterSpacing: 0.6 }}>
              Sénégal · Côte d'Ivoire · Wave & Orange Money
            </Text>
          </View>
          <Text className="mt-3 font-display-x text-[32px] text-ink" style={{ letterSpacing: -1.4, lineHeight: 36 }}>
            Fais-toi payer par Wave et gère tes accès{" "}
            <Text className="text-bordeaux-600">automatiquement</Text>.
          </Text>
          <Text className="mt-3 font-sans text-[15px] text-ink-soft" style={{ lineHeight: 22 }}>
            L'outil des groupes payants, formations et communautés. Un lien, tes clients paient par mobile money, et
            l'accès est livré tout seul. Fini le numéro Wave partagé et les captures à valider à la main.
          </Text>
          <View className="mt-5">
            <CTA label="Commencer gratuitement" onPress={start} />
          </View>
          <View className="mt-3 flex-row flex-wrap justify-center" style={{ gap: 12 }}>
            {["Sans boutique à créer", "Argent net garanti", "Retrait instantané"].map((t) => (
              <View key={t} className="flex-row items-center" style={{ gap: 4 }}>
                <Icon name="check" size={12} color={colors.forest} strokeWidth={2.4} />
                <Text className="font-sans text-[11px] text-ink-muted">{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Problème */}
        <View className="mt-9 px-5">
          <View className="rounded-3xl bg-night p-5">
            <Text className="font-display-semi text-[17px] text-white">Aujourd'hui, tu perds du temps et de l'argent</Text>
            <View className="mt-3" style={{ gap: 8 }}>
              {[
                "Tu partages ton numéro Wave et tu valides les captures d'écran une par une.",
                "Tu envoies les accès à la main, tu relances les retards.",
                "Tu vires les non-payeurs un par un — quand tu y penses.",
              ].map((t) => (
                <View key={t} className="flex-row items-start" style={{ gap: 8 }}>
                  <Icon name="close" size={14} color={colors.bordeaux[400]} strokeWidth={2.4} />
                  <Text className="flex-1 font-sans text-[13px] text-white/75" style={{ lineHeight: 19 }}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Solution en 3 étapes */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[22px] text-ink" style={{ letterSpacing: -0.8 }}>
            Paylika le fait à ta place
          </Text>
          <View className="mt-4" style={{ gap: 16 }}>
            <Step n={1} title="Crée ton offre" text="Groupe Telegram ou WhatsApp, formation, contenu, abonnement… en 1 minute." />
            <Step n={2} title="Partage ton lien" text="Sur WhatsApp, ta bio Insta, tes pubs. Aucune boutique à monter." />
            <Step n={3} title="Encaisse et livre tout seul" text="Ton client paie par Wave, l'accès est livré et géré automatiquement." />
          </View>
        </View>

        {/* Bénéfices */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[22px] text-ink" style={{ letterSpacing: -0.8 }}>
            Tout ce qu'il te faut
          </Text>
          <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
            <Benefit icon="send" title="Accès automatique" text="Ajout au paiement, retrait à l'expiration (Telegram). Rappels inclus." />
            <Benefit icon="wallet" title="Argent net garanti" text="Tu retires 100, tu reçois 100. Retrait gratuit, instantané." />
            <Benefit icon="chart" title="Tableau de bord" text="Revenus, abonnés actifs, retards — tout est suivi." />
            <Benefit icon="users" title="Zéro boutique" text="Juste un lien à coller là où tu vends déjà." />
          </View>
        </View>

        {/* Pour qui */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[22px] text-ink" style={{ letterSpacing: -0.8 }}>
            Fait pour toi si tu vends…
          </Text>
          <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
            {["Pronostics / groupes VIP", "Formations & coaching", "Communautés privées", "Contenu & fichiers"].map((t) => (
              <View key={t} className="rounded-full bg-sand px-4 py-2">
                <Text className="font-semibold text-[13px] text-ink">{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Prix */}
        <View className="mt-9 px-5">
          <View className="rounded-3xl border border-bordeaux-600 bg-bordeaux-50 p-5">
            <Text className="font-display-semi text-[17px] text-bordeaux-700">Simple : tu ne paies que quand tu gagnes</Text>
            <View className="mt-2 flex-row items-baseline" style={{ gap: 6 }}>
              <Text className="font-display-x text-[34px] text-ink" style={{ letterSpacing: -1.4 }}>
                10%
              </Text>
              <Text className="font-medium text-[13px] text-ink-muted">par vente</Text>
            </View>
            <Text className="mt-1 font-sans text-[13px] text-ink-soft">
              Pas d'abonnement. Retrait gratuit. Aucun frais caché.
            </Text>
          </View>
        </View>

        {/* FAQ */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[22px] text-ink" style={{ letterSpacing: -0.8 }}>
            Questions fréquentes
          </Text>
          <View className="mt-2">
            <Faq q="Comment je suis payé ?" a="Par Wave ou Orange Money, directement. Tu retires ton solde quand tu veux, et tu reçois le montant net, tout de suite." />
            <Faq q="Il me faut un site ou une boutique ?" a="Non. Tu crées une offre, tu obtiens un lien, tu le partages. C'est tout." />
            <Faq q="Comment marche l'accès automatique ?" a="Sur Telegram, Paylika ajoute le membre au paiement et le retire à l'expiration. Sur WhatsApp et pour les contenus, l'accès/le fichier est livré juste après le paiement." />
            <Faq q="Combien ça coûte ?" a="10% par vente, sans abonnement ni frais de retrait. Tu ne paies que quand tu encaisses." />
          </View>
        </View>

        {/* CTA final */}
        <View className="mt-10 px-5">
          <View className="items-center rounded-3xl bg-night p-6">
            <Text className="text-center font-display-x text-[22px] text-white" style={{ letterSpacing: -0.8, lineHeight: 26 }}>
              Prêt à encaisser proprement ?
            </Text>
            <Text className="mt-2 text-center font-sans text-[13px] text-white/70">
              Crée ton compte et ton premier lien de paiement en 2 minutes.
            </Text>
            <View className="mt-5 w-full">
              <CTA label="Commencer gratuitement" onPress={start} light />
            </View>
          </View>
          <Text className="mt-6 text-center font-sans text-[11px] text-ink-muted">Paylika · Encaisse par mobile money, livre l'accès.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
