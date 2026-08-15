import { useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Image, Animated, Easing, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo, Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";

const WAVE = require("../assets/operators/wave.png");
const ORANGE = require("../assets/operators/orange.png");
const MTN = require("../assets/operators/mtn.png");
const MOOV = require("../assets/operators/moov.png");
const HERO = require("../assets/site/hero.png");
const P_CREATEURS = require("../assets/site/p-createurs.png");
const P_FORMATEURS = require("../assets/site/p-formateurs.png");
const P_COACHS = require("../assets/site/p-coachs.png");
const TG_BLUE = "#229ED9";
const WA_GREEN = "#25D366";

/* ---------- primitives ---------- */

function Btn({ label, onPress, kind = "primary" }: { label: string; onPress: () => void; kind?: "primary" | "ghost" | "white" }) {
  const base = "flex-row items-center justify-center rounded-full px-6 py-3.5";
  if (kind === "ghost")
    return (
      <Pressable onPress={onPress} className={`${base} border border-ink/15 bg-white`}>
        <Text className="font-semibold text-[14px] text-ink">{label}</Text>
      </Pressable>
    );
  if (kind === "white")
    return (
      <Pressable onPress={onPress} className={`${base} bg-white`}>
        <Text className="font-semibold text-[14px] text-bordeaux-700">{label}</Text>
        <Icon name="arrow-up-right" size={17} color={colors.bordeaux[600]} />
      </Pressable>
    );
  return (
    <Pressable onPress={onPress} className={`${base} bg-bordeaux-600`}>
      <Text className="font-semibold text-[14px] text-white">{label}</Text>
      <Icon name="arrow-up-right" size={17} color={colors.white} />
    </Pressable>
  );
}

function Rise({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

function Float({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2200, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function Kicker({ children }: { children: string }) {
  return (
    <Text className="font-bold text-[11px] uppercase text-bordeaux-600" style={{ letterSpacing: 1 }}>
      {children}
    </Text>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-2 font-display-x text-[27px] text-ink" style={{ letterSpacing: -1, lineHeight: 31 }}>
      {children}
    </Text>
  );
}

function Notif({ icon, title, sub, color, style }: { icon: IconName; title: string; sub?: string; color: string; style?: any }) {
  return (
    <View
      className="flex-row items-center rounded-2xl border border-ink/[0.06] bg-white px-3 py-2.5"
      style={[{ gap: 8, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, style]}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: color + "1A" }}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <View>
        <Text className="font-semibold text-[12px] text-ink">{title}</Text>
        {sub ? <Text className="font-sans text-[11px] text-ink-muted">{sub}</Text> : null}
      </View>
    </View>
  );
}

/* ---------- page ---------- */

export default function DecouvrirScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const start = () => router.push("/login" as any);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 40 }}>
      <View style={{ width: "100%", maxWidth: 1040 }}>
        {/* NAVBAR */}
        <View style={{ paddingTop: insets.top + 10 }} className="flex-row items-center justify-between px-5 pb-3">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Logo size={26} />
            <Text className="font-display text-[19px] text-ink" style={{ letterSpacing: -0.4 }}>
              Paylika
            </Text>
          </View>
          {wide ? (
            <View className="flex-row items-center" style={{ gap: 26 }}>
              {["Fonctionnalités", "Comment ça marche", "Pour qui ?", "FAQ"].map((t) => (
                <Text key={t} className="font-medium text-[13px] text-ink-soft">
                  {t}
                </Text>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {wide ? (
              <Pressable onPress={start}>
                <Text className="font-semibold text-[13px] text-ink">Se connecter</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={start} className="rounded-full bg-bordeaux-600 px-4 py-2">
              <Text className="font-semibold text-[13px] text-white">Commencer</Text>
            </Pressable>
          </View>
        </View>

        {/* HERO */}
        <View className={`px-5 pt-6 ${wide ? "flex-row items-center" : ""}`} style={{ gap: wide ? 32 : 0 }}>
          <View style={{ flex: wide ? 1 : undefined }}>
            <Rise>
              <View className="self-start rounded-full bg-sand px-3 py-1">
                <Text className="font-bold text-[10px] uppercase text-ink-soft" style={{ letterSpacing: 0.6 }}>
                  Pour les créateurs & entrepreneurs africains
                </Text>
              </View>
              <Text className="mt-4 font-display-x text-[40px] text-ink" style={{ letterSpacing: -2, lineHeight: 42 }}>
                Vos abonnements.{"\n"}Vos paiements.{"\n"}Vos accès.{"\n"}
                <Text className="text-bordeaux-600">Automatisés.</Text>
              </Text>
              <Text className="mt-4 font-sans text-[15px] text-ink-soft" style={{ lineHeight: 22, maxWidth: 440 }}>
                Paylika vous permet d'encaisser vos abonnements, gérer vos membres et automatiser leurs accès à vos
                communautés et contenus.
              </Text>
              <View className="mt-6 flex-row flex-wrap" style={{ gap: 10 }}>
                <Btn label="Commencer gratuitement" onPress={start} />
                <Btn label="Comment ça marche" onPress={start} kind="ghost" />
              </View>
            </Rise>
          </View>

          {/* Visuel : vraie photo + notifications flottantes animées */}
          <Rise delay={140}>
            <View style={{ flex: wide ? 1 : undefined, marginTop: wide ? 0 : 34 }}>
              <View className="relative" style={{ alignSelf: "center", width: "100%", maxWidth: 400 }}>
                {/* halo bordeaux en arrière-plan */}
                <View
                  style={{ position: "absolute", top: 22, left: 14, right: 14, bottom: -6, borderRadius: 34, backgroundColor: colors.bordeaux[600], opacity: 0.1 }}
                />
                <Image source={HERO} style={{ width: "100%", height: wide ? 410 : 380, borderRadius: 30 }} resizeMode="cover" />

                {/* notifications flottantes */}
                <Float style={{ position: "absolute", top: 18, right: -6 }}>
                  <Notif icon="wallet" title="Paiement reçu" sub="5 000 FCFA" color={colors.forest} />
                </Float>
                <Float delay={700} style={{ position: "absolute", bottom: 72, left: -8 }}>
                  <Notif icon="telegram" title="Accès Telegram activé" color={TG_BLUE} />
                </Float>
                <Float delay={1300} style={{ position: "absolute", bottom: 16, right: 4 }}>
                  <Notif icon="bell" title="Rappel envoyé" sub="Expire dans 3 j" color={colors.clay} />
                </Float>
              </View>
            </View>
          </Rise>
        </View>

        {/* SOCIAL PROOF */}
        <View className="mt-12 items-center px-5">
          <Text className="text-center font-semibold text-[13px] text-ink-muted">Pensé pour les créateurs et entrepreneurs africains</Text>
          <View className="mt-3 flex-row flex-wrap justify-center" style={{ gap: 8 }}>
            {[
              { i: "wallet" as const, t: "Paiements locaux" },
              { i: "shield" as const, t: "Sécurité" },
              { i: "bolt" as const, t: "Automatisation" },
              { i: "users" as const, t: "Gestion des membres" },
            ].map((c) => (
              <View key={c.t} className="flex-row items-center rounded-full border border-ink/[0.08] bg-white px-3.5 py-2" style={{ gap: 6 }}>
                <Icon name={c.i} size={14} color={colors.bordeaux[600]} />
                <Text className="font-semibold text-[12px] text-ink">{c.t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PROBLÈME */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Le problème</Kicker>
            <Text className="mt-2 text-center font-display-x text-[26px] text-ink" style={{ letterSpacing: -1, lineHeight: 30, maxWidth: 420 }}>
              Vous ne devriez pas passer votre temps à gérer les paiements.
            </Text>
          </View>
          <View className={`mt-6 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            {[
              { q: "Qui a payé ?", i: "wallet" as const },
              { q: "Qui doit renouveler ?", i: "bell" as const },
              { q: "Qui retirer du groupe ?", i: "users" as const },
            ].map((c) => (
              <View key={c.q} className="flex-1 rounded-3xl border border-ink/[0.08] bg-paper p-5">
                <Icon name={c.i} size={20} color={colors.muted} />
                <Text className="mt-3 font-display-semi text-[17px] text-ink">{c.q}</Text>
              </View>
            ))}
          </View>
          <View className="mt-6 flex-row items-center justify-center" style={{ gap: 8 }}>
            <View className="h-6 w-6 items-center justify-center rounded-full bg-bordeaux-600">
              <Icon name="bolt" size={13} color="#fff" />
            </View>
            <Text className="font-display-semi text-[15px] text-bordeaux-700">Paylika s'en occupe automatiquement.</Text>
          </View>
        </View>

        {/* COMMENT ÇA MARCHE */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Comment ça marche</Kicker>
            <H2>En 4 étapes, tout est automatisé</H2>
          </View>
          <View className={`mt-6 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            {[
              { n: "01", t: "Créez votre abonnement", d: "Définissez votre prix et votre fréquence." },
              { n: "02", t: "Partagez votre lien", d: "Votre client choisit son offre et paie." },
              { n: "03", t: "Paylika vérifie", d: "Le paiement est confirmé automatiquement." },
              { n: "04", t: "L'accès est automatisé", d: "Accès donné, retiré à l'expiration, réactivé au renouvellement." },
            ].map((s) => (
              <View key={s.n} className="flex-1 rounded-3xl border border-ink/[0.08] bg-white p-5">
                <Text className="font-display-x text-[22px] text-bordeaux-600" style={{ letterSpacing: -1 }}>
                  {s.n}
                </Text>
                <Text className="mt-2 font-display-semi text-[15px] text-ink">{s.t}</Text>
                <Text className="mt-1 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
                  {s.d}
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-5 flex-row flex-wrap items-center justify-center" style={{ gap: 8 }}>
            {["Paiement", "Paylika", "Accès", "Renouvellement"].map((t, i) => (
              <View key={t} className="flex-row items-center" style={{ gap: 8 }}>
                <View className="rounded-full bg-sand px-3 py-1.5">
                  <Text className="font-semibold text-[12px] text-ink">{t}</Text>
                </View>
                {i < 3 ? <Icon name="arrow-right" size={14} color={colors.bordeaux[600]} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* AVANT / APRÈS */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>La différence</Kicker>
            <H2>Avant Paylika, après Paylika</H2>
          </View>
          <View className={`mt-6 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            <View className="flex-1 rounded-3xl border border-ink/[0.08] bg-paper p-5">
              <Text className="font-semibold text-[12px] uppercase text-ink-muted" style={{ letterSpacing: 0.6 }}>
                Avant
              </Text>
              <View className="mt-3" style={{ gap: 8 }}>
                {["Messages WhatsApp", "Captures de paiement", "Tableur Excel", "Vérification manuelle", "Retrait manuel", "Relances à la main"].map((t) => (
                  <View key={t} className="flex-row items-center" style={{ gap: 8 }}>
                    <Icon name="close" size={14} color={colors.muted} strokeWidth={2.2} />
                    <Text className="font-sans text-[13px] text-ink-soft">{t}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="flex-1 rounded-3xl border border-bordeaux-600 bg-bordeaux-50 p-5">
              <Text className="font-semibold text-[12px] uppercase text-bordeaux-700" style={{ letterSpacing: 0.6 }}>
                Avec Paylika
              </Text>
              <View className="mt-3" style={{ gap: 8 }}>
                {["Paiement", "Confirmation automatique", "Accès automatique", "Rappel automatique", "Renouvellement", "Accès prolongé"].map((t) => (
                  <View key={t} className="flex-row items-center" style={{ gap: 8 }}>
                    <Icon name="check" size={14} color={colors.bordeaux[600]} strokeWidth={2.4} />
                    <Text className="font-semibold text-[13px] text-ink">{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* INTÉGRATIONS */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Intégrations</Kicker>
            <H2>Commencez avec Telegram. Allez plus loin.</H2>
          </View>
          <View className="mt-6 rounded-3xl border border-ink/[0.08] bg-white p-5">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: TG_BLUE + "1A" }}>
                <Icon name="telegram" size={26} color={TG_BLUE} />
              </View>
              <View className="flex-1">
                <Text className="font-display-semi text-[16px] text-ink">Telegram</Text>
                <Text className="font-sans text-[12px] text-ink-muted">Ajout au paiement, retrait auto à l'expiration.</Text>
              </View>
              <View className="rounded-full bg-forest px-2.5 py-1">
                <Text className="font-bold text-[10px] uppercase text-white">Actif</Text>
              </View>
            </View>
          </View>
          <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
            {[
              { t: "WhatsApp", i: "whatsapp" as const, c: WA_GREEN },
              { t: "Discord", i: "users" as const, c: "#5865F2" },
              { t: "Espace membre", i: "shield" as const, c: colors.bordeaux[600] },
              { t: "Site web", i: "chart" as const, c: colors.ink },
              { t: "API", i: "bolt" as const, c: colors.ink },
            ].map((c) => (
              <View
                key={c.t}
                className="flex-row items-center rounded-2xl border border-ink/[0.08] bg-paper px-3.5 py-2.5"
                style={{ gap: 8, flexGrow: 1, flexBasis: "45%", minWidth: 150 }}
              >
                <Icon name={c.i} size={16} color={c.c} />
                <Text className="flex-1 font-semibold text-[13px] text-ink">{c.t}</Text>
                <View className="rounded-full bg-sand px-2 py-0.5">
                  <Text className="font-bold text-[9px] uppercase text-ink-muted">Bientôt</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* POUR QUI */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Pour qui ?</Kicker>
            <H2>Fait pour votre activité</H2>
          </View>
          <View className="mt-6 flex-row flex-wrap" style={{ gap: 12 }}>
            {[
              { img: P_CREATEURS, i: "users" as const, t: "Créateurs", d: "Monétisez votre communauté et vos contenus." },
              { img: P_FORMATEURS, i: "chart" as const, t: "Formateurs", d: "Vendez vos formations, automatisez les accès." },
              { img: P_COACHS, i: "bolt" as const, t: "Coachs", d: "Gérez vos clients et leurs renouvellements." },
              { img: HERO, i: "shield" as const, t: "Communautés", d: "Contrôlez automatiquement qui a accès." },
            ].map((c) => (
              <View
                key={c.t}
                className="overflow-hidden rounded-3xl border border-ink/[0.08] bg-white"
                style={{ flexGrow: 1, flexBasis: "45%", minWidth: 160 }}
              >
                <View className="relative">
                  <Image source={c.img} style={{ width: "100%", height: 150 }} resizeMode="cover" />
                  <View className="absolute left-3 top-3 h-9 w-9 items-center justify-center rounded-2xl bg-white/95">
                    <Icon name={c.i} size={17} color={colors.bordeaux[600]} />
                  </View>
                </View>
                <View className="p-4">
                  <Text className="font-display-semi text-[15px] text-ink">{c.t}</Text>
                  <Text className="mt-0.5 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
                    {c.d}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* DASHBOARD */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Le tableau de bord</Kicker>
            <H2>Tout votre business, en un coup d'œil</H2>
          </View>
          <View className="mt-6 rounded-3xl border border-ink/[0.08] bg-white p-5">
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {[
                { v: "12 450 FCFA", l: "Revenus ce mois" },
                { v: "132", l: "Abonnés actifs" },
                { v: "+24%", l: "Croissance" },
              ].map((k) => (
                <View key={k.l} className="rounded-2xl bg-paper p-4" style={{ flexGrow: 1, flexBasis: "30%", minWidth: 100 }}>
                  <Text className="font-display-x text-[20px] text-ink" style={{ letterSpacing: -0.6 }}>
                    {k.v}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[11px] text-ink-muted">{k.l}</Text>
                </View>
              ))}
            </View>
            <View className="mt-4" style={{ gap: 8 }}>
              {[
                { m: "Awa N.", p: "VIP · Mensuel", s: "Actif", ok: true },
                { m: "Modou D.", p: "Signaux · Mensuel", s: "Actif", ok: true },
                { m: "Fatou S.", p: "Formation", s: "Expiré", ok: false },
              ].map((r) => (
                <View key={r.m} className="flex-row items-center justify-between border-t border-ink/[0.06] pt-2.5">
                  <View>
                    <Text className="font-semibold text-[13px] text-ink">{r.m}</Text>
                    <Text className="font-sans text-[11px] text-ink-muted">{r.p}</Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${r.ok ? "bg-forest" : "bg-sand"}`}>
                    <Text className={`font-bold text-[10px] uppercase ${r.ok ? "text-white" : "text-ink-muted"}`}>{r.s}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text className="mt-3 font-sans text-[10px] text-ink-muted">Exemple d'affichage.</Text>
          </View>
        </View>

        {/* PAIEMENTS */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>Paiements</Kicker>
            <Text className="mt-2 text-center font-display-x text-[24px] text-ink" style={{ letterSpacing: -0.9, lineHeight: 28, maxWidth: 420 }}>
              Vos clients paient avec ce qu'ils utilisent déjà.
            </Text>
          </View>
          <View className="mt-6 flex-row flex-wrap justify-center" style={{ gap: 10 }}>
            {[
              { img: WAVE, t: "Wave", soon: false },
              { img: ORANGE, t: "Orange Money", soon: false },
              { img: MTN, t: "MTN", soon: false },
              { img: MOOV, t: "Moov", soon: false },
            ].map((p) => (
              <View key={p.t} className="flex-row items-center rounded-2xl border border-ink/[0.08] bg-white px-3.5 py-2.5" style={{ gap: 8 }}>
                <Image source={p.img} style={{ width: 22, height: 22, borderRadius: 11 }} resizeMode="contain" />
                <Text className="font-semibold text-[13px] text-ink">{p.t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* SÉCURITÉ */}
        <View className="mt-16 px-5">
          <View className="rounded-3xl bg-night p-6">
            <Kicker>Confiance</Kicker>
            <Text className="mt-2 font-display-x text-[22px] text-white" style={{ letterSpacing: -0.8 }}>
              Vos paiements et vos membres, sous contrôle.
            </Text>
            <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
              {["Paiements sécurisés", "Gestion des accès", "Historique des transactions", "Notifications", "Protection des données"].map((t) => (
                <View key={t} className="flex-row items-center rounded-full bg-white/10 px-3 py-2" style={{ gap: 6 }}>
                  <Icon name="check" size={13} color="#fff" strokeWidth={2.4} />
                  <Text className="font-semibold text-[12px] text-white">{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA FINAL */}
        <View className="mt-16 px-5">
          <View className="items-center rounded-[32px] bg-bordeaux-600 p-8">
            <Text className="text-center font-display-x text-[26px] text-white" style={{ letterSpacing: -1, lineHeight: 30, maxWidth: 440 }}>
              Arrêtez de gérer vos abonnements manuellement.
            </Text>
            <Text className="mt-3 text-center font-sans text-[14px] text-white/80" style={{ lineHeight: 20, maxWidth: 420 }}>
              Paylika automatise les paiements, les renouvellements et les accès — pour que vous vous concentriez sur votre
              activité.
            </Text>
            <View className="mt-6" style={{ minWidth: 260 }}>
              <Btn label="Commencer gratuitement" onPress={start} kind="white" />
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View className="mt-16 px-5">
          <View className="items-center">
            <Kicker>FAQ</Kicker>
            <H2>Questions fréquentes</H2>
          </View>
          <View className="mt-4">
            {[
              ["Qu'est-ce que Paylika ?", "Une plateforme qui automatise vos abonnements, paiements et accès à vos communautés et contenus."],
              ["Comment fonctionne un abonnement ?", "Vous fixez un prix et une fréquence. Le client paie, l'accès est donné, puis géré automatiquement."],
              ["Comment mes clients paient-ils ?", "Par mobile money (Wave, Orange Money…), via un simple lien. Aucune boutique à créer."],
              ["Comment fonctionne l'accès Telegram ?", "Le membre est ajouté au paiement et retiré automatiquement à l'expiration de son abonnement."],
              ["Que se passe-t-il à l'expiration ?", "L'accès est retiré automatiquement, et réactivé dès que le membre renouvelle."],
              ["Puis-je gérer plusieurs offres ?", "Oui, autant d'offres et de formules que vous voulez, depuis un seul tableau de bord."],
            ].map(([q, a]) => (
              <View key={q} className="border-b border-ink/[0.07] py-3.5">
                <Text className="font-semibold text-[14px] text-ink">{q}</Text>
                <Text className="mt-1 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
                  {a}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <View className="mt-16 border-t border-ink/[0.07] px-5 pt-8">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Logo size={24} />
            <Text className="font-display text-[18px] text-ink" style={{ letterSpacing: -0.4 }}>
              Paylika
            </Text>
          </View>
          <Text className="mt-2 font-sans text-[13px] text-ink-muted">Les abonnements, simplement.</Text>
          <View className="mt-4 flex-row flex-wrap" style={{ gap: 16 }}>
            {["Produit", "Fonctionnalités", "FAQ", "Contact", "Conditions", "Confidentialité"].map((t) => (
              <Text key={t} className="font-medium text-[12px] text-ink-soft">
                {t}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
