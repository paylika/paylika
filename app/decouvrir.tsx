import { useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Image, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Logo, Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";

const WAVE = require("../assets/operators/wave.png");
const ORANGE = require("../assets/operators/orange.png");
const TG_BLUE = "#229ED9";
const WA_GREEN = "#25D366";

function CTA({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-2xl px-6 py-4 ${light ? "bg-white" : "bg-bordeaux-600"}`}
      style={{
        shadowColor: light ? "#000" : colors.bordeaux[600],
        shadowOpacity: light ? 0.12 : 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <Text className={`font-display-semi text-[16px] ${light ? "text-bordeaux-700" : "text-white"}`}>{label}</Text>
      <Icon name="arrow-up-right" size={18} color={light ? colors.bordeaux[600] : colors.white} />
    </Pressable>
  );
}

function Rise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 550,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

function Step({ icon, n, title, text }: { icon: IconName; n: number; title: string; text: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 14 }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-bordeaux-600">
        <Icon name={icon} size={20} color={colors.white} />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-[11px] uppercase text-bordeaux-600" style={{ letterSpacing: 0.6 }}>
          Étape {n}
        </Text>
        <Text className="font-display-semi text-[16px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[13px] text-ink-soft" style={{ lineHeight: 19 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function Benefit({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View
      className="rounded-3xl border border-ink/[0.07] bg-card p-4"
      style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-bordeaux-50">
        <Icon name={icon} size={19} color={colors.bordeaux[600]} />
      </View>
      <Text className="mt-3 font-display-semi text-[14px] text-ink">{title}</Text>
      <Text className="mt-0.5 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
        {text}
      </Text>
    </View>
  );
}

function ChannelPill({ icon, label, color }: { icon: IconName; label: string; color: string }) {
  return (
    <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1.5" style={{ gap: 6 }}>
      <Icon name={icon} size={15} color={color} />
      <Text className="font-semibold text-[12px] text-white">{label}</Text>
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
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 44 }}>
      <View style={{ width: "100%", maxWidth: 560 }}>
        {/* HERO — dégradé bordeaux */}
        <LinearGradient
          colors={[colors.bordeaux[800], colors.bordeaux[600], colors.bordeaux[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 14, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}
        >
          <View className="px-5 pb-8">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Logo size={28} />
                <Text className="font-display text-[20px] text-white" style={{ letterSpacing: -0.4 }}>
                  Paylika
                </Text>
              </View>
              <Pressable onPress={start} className="rounded-full bg-white/15 px-4 py-2">
                <Text className="font-semibold text-[13px] text-white">Se connecter</Text>
              </Pressable>
            </View>

            <Rise>
              <View className="mt-7 self-start rounded-full bg-white/15 px-3 py-1">
                <Text className="font-bold text-[10px] uppercase text-white" style={{ letterSpacing: 0.6 }}>
                  Sénégal · Côte d'Ivoire
                </Text>
              </View>
              <Text className="mt-3 font-display-x text-[33px] text-white" style={{ letterSpacing: -1.4, lineHeight: 37 }}>
                Fais-toi payer par Wave et livre l'accès tout seul.
              </Text>
              <Text className="mt-3 font-sans text-[15px] text-white/85" style={{ lineHeight: 22 }}>
                L'outil des groupes payants, formations et communautés. Un lien, tes clients paient par mobile money,
                l'accès est livré et géré automatiquement.
              </Text>
            </Rise>

            <Rise delay={120}>
              <View className="mt-5 flex-row flex-wrap" style={{ gap: 8 }}>
                <ChannelPill icon="telegram" label="Telegram" color={TG_BLUE} />
                <ChannelPill icon="whatsapp" label="WhatsApp" color={WA_GREEN} />
                <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1.5" style={{ gap: 6 }}>
                  <Image source={WAVE} style={{ width: 15, height: 15, borderRadius: 8 }} />
                  <Image source={ORANGE} style={{ width: 15, height: 15, borderRadius: 8 }} />
                  <Text className="font-semibold text-[12px] text-white">Wave · Orange</Text>
                </View>
              </View>
              <View className="mt-6">
                <CTA label="Commencer gratuitement" onPress={start} light />
              </View>
              <View className="mt-3 flex-row flex-wrap justify-center" style={{ gap: 12 }}>
                {["Sans boutique", "Argent net", "Retrait instantané"].map((t) => (
                  <View key={t} className="flex-row items-center" style={{ gap: 4 }}>
                    <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
                    <Text className="font-sans text-[11px] text-white/80">{t}</Text>
                  </View>
                ))}
              </View>
            </Rise>
          </View>
        </LinearGradient>

        {/* PROBLÈME */}
        <View className="mt-8 px-5">
          <Rise>
            <View className="rounded-3xl bg-night p-5">
              <Text className="font-display-semi text-[17px] text-white">Aujourd'hui, tu perds temps et argent</Text>
              <View className="mt-3" style={{ gap: 9 }}>
                {[
                  "Tu partages ton numéro Wave et tu valides les captures une par une.",
                  "Tu envoies les accès à la main, tu relances les retards.",
                  "Tu vires les non-payeurs un par un — quand tu y penses.",
                ].map((t) => (
                  <View key={t} className="flex-row items-start" style={{ gap: 9 }}>
                    <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-bordeaux-600">
                      <Icon name="close" size={12} color="#fff" strokeWidth={2.6} />
                    </View>
                    <Text className="flex-1 font-sans text-[13px] text-white/75" style={{ lineHeight: 19 }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Rise>
        </View>

        {/* 3 ÉTAPES */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[23px] text-ink" style={{ letterSpacing: -0.9 }}>
            Paylika le fait à ta place
          </Text>
          <View className="mt-5" style={{ gap: 18 }}>
            <Step icon="tag" n={1} title="Crée ton offre" text="Groupe Telegram/WhatsApp, formation, contenu, abonnement — en 1 minute." />
            <Step icon="send" n={2} title="Partage ton lien" text="Sur WhatsApp, ta bio Insta, tes pubs. Aucune boutique à monter." />
            <Step icon="bolt" n={3} title="Encaisse & livre tout seul" text="Ton client paie par Wave, l'accès est livré et géré automatiquement." />
          </View>
        </View>

        {/* CANAUX */}
        <View className="mt-9 px-5">
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 items-center rounded-3xl border border-ink/[0.07] bg-card p-5">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: TG_BLUE + "1A" }}>
                <Icon name="telegram" size={30} color={TG_BLUE} />
              </View>
              <Text className="mt-3 font-display-semi text-[15px] text-ink">Telegram</Text>
              <Text className="mt-1 text-center font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
                Ajout au paiement, retrait auto à l'expiration.
              </Text>
            </View>
            <View className="flex-1 items-center rounded-3xl border border-ink/[0.07] bg-card p-5">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: WA_GREEN + "1A" }}>
                <Icon name="whatsapp" size={30} color={WA_GREEN} />
              </View>
              <Text className="mt-3 font-display-semi text-[15px] text-ink">WhatsApp</Text>
              <Text className="mt-1 text-center font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
                Lien d'accès livré juste après le paiement.
              </Text>
            </View>
          </View>
        </View>

        {/* BÉNÉFICES */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[23px] text-ink" style={{ letterSpacing: -0.9 }}>
            Tout ce qu'il te faut
          </Text>
          <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
            <Benefit icon="bolt" title="Accès automatique" text="Ajout au paiement, retrait à l'expiration. Rappels inclus." />
            <Benefit icon="wallet" title="Argent net garanti" text="Tu retires 100, tu reçois 100. Retrait gratuit, instantané." />
            <Benefit icon="chart" title="Tableau de bord" text="Revenus, abonnés actifs, retards — tout est suivi." />
            <Benefit icon="shield" title="Zéro boutique" text="Juste un lien à coller là où tu vends déjà." />
          </View>
        </View>

        {/* POUR QUI */}
        <View className="mt-9 px-5">
          <Text className="font-display-x text-[23px] text-ink" style={{ letterSpacing: -0.9 }}>
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

        {/* PRIX */}
        <View className="mt-9 px-5">
          <View className="rounded-3xl border border-bordeaux-600 bg-bordeaux-50 p-5">
            <Text className="font-display-semi text-[17px] text-bordeaux-700">Tu ne paies que quand tu gagnes</Text>
            <View className="mt-2 flex-row items-baseline" style={{ gap: 6 }}>
              <Text className="font-display-x text-[36px] text-ink" style={{ letterSpacing: -1.6 }}>
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
          <Text className="font-display-x text-[23px] text-ink" style={{ letterSpacing: -0.9 }}>
            Questions fréquentes
          </Text>
          <View className="mt-2">
            <Faq q="Comment je suis payé ?" a="Par Wave ou Orange Money, directement. Tu retires ton solde quand tu veux et tu reçois le montant net, tout de suite." />
            <Faq q="Il me faut un site ou une boutique ?" a="Non. Tu crées une offre, tu obtiens un lien, tu le partages. C'est tout." />
            <Faq q="Comment marche l'accès automatique ?" a="Sur Telegram, Paylika ajoute le membre au paiement et le retire à l'expiration. Sur WhatsApp et pour les contenus, l'accès est livré juste après le paiement." />
            <Faq q="Combien ça coûte ?" a="10% par vente, sans abonnement ni frais de retrait. Tu ne paies que quand tu encaisses." />
          </View>
        </View>

        {/* CTA FINAL */}
        <View className="mt-10 px-5">
          <LinearGradient
            colors={[colors.bordeaux[700], colors.bordeaux[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28, padding: 24, alignItems: "center" }}
          >
            <Text className="text-center font-display-x text-[23px] text-white" style={{ letterSpacing: -0.9, lineHeight: 27 }}>
              Prêt à encaisser proprement ?
            </Text>
            <Text className="mt-2 text-center font-sans text-[13px] text-white/80">
              Ton compte et ton premier lien de paiement en 2 minutes.
            </Text>
            <View className="mt-5 w-full">
              <CTA label="Commencer gratuitement" onPress={start} light />
            </View>
          </LinearGradient>
          <Text className="mt-6 text-center font-sans text-[11px] text-ink-muted">
            Paylika · Encaisse par mobile money, livre l'accès.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
