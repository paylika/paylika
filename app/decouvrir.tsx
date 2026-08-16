import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Animated, Easing, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect, Polygon, G } from "react-native-svg";
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

function Btn({
  label,
  onPress,
  kind = "primary",
  icon = "arrow-up-right",
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "ghost" | "white";
  icon?: IconName | null;
}) {
  const base = "flex-row items-center justify-center rounded-full px-6 py-3.5";
  if (kind === "ghost")
    return (
      <Pressable onPress={onPress} className={`${base} border border-ink/15 bg-white/80`} style={{ gap: 6 }}>
        <Text className="font-semibold text-[14px] text-ink">{label}</Text>
      </Pressable>
    );
  if (kind === "white")
    return (
      <Pressable onPress={onPress} className={`${base} bg-white`} style={{ gap: 6 }}>
        <Text className="font-semibold text-[14px] text-bordeaux-700">{label}</Text>
        {icon ? <Icon name={icon} size={17} color={colors.bordeaux[600]} /> : null}
      </Pressable>
    );
  return (
    <Pressable onPress={onPress} className={`${base} bg-bordeaux-600`} style={{ gap: 6 }}>
      <Text className="font-semibold text-[14px] text-white">{label}</Text>
      {icon ? <Icon name={icon} size={17} color={colors.white} /> : null}
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

function Kicker({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <Text className={`font-bold text-[11px] uppercase ${light ? "text-white/70" : "text-bordeaux-600"}`} style={{ letterSpacing: 1 }}>
      {children}
    </Text>
  );
}

function H2({ children, center = true }: { children: React.ReactNode; center?: boolean }) {
  return (
    <Text
      className={`mt-2 font-display-x text-[27px] text-ink ${center ? "text-center" : ""}`}
      style={{ letterSpacing: -1, lineHeight: 31, maxWidth: 560 }}
    >
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

/** Bandeau photo plein écran avec voile bordeaux et texte blanc par-dessus. */
function PhotoBand({ img, height, children }: { img: any; height: number; children: React.ReactNode }) {
  return (
    <View style={{ width: "100%", height }}>
      <Image source={img} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(51,6,15,0.95)", "rgba(51,6,15,0.8)", "rgba(123,17,38,0.45)"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: "100%", maxWidth: 1040 }} className="px-6">
          {children}
        </View>
      </View>
    </View>
  );
}

// petite étoile 5 branches centrée en (0,0)
const STAR = "0,-3.2 0.75,-1.04 3.04,-0.99 1.22,0.4 1.88,2.59 0,1.28 -1.88,2.59 -1.22,0.4 -3.04,-0.99 -0.75,-1.04";

/** Drapeaux SVG (pas d'emoji) — SN, CI, BF, TG, BJ. */
function Flag({ c }: { c: "SN" | "CI" | "BF" | "TG" | "BJ" }) {
  return (
    <View style={{ width: 26, height: 18, borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
      <Svg width={26} height={18} viewBox="0 0 30 20">
        {c === "SN" && (
          <>
            <Rect x={0} y={0} width={10} height={20} fill="#00853F" />
            <Rect x={10} y={0} width={10} height={20} fill="#FDEF42" />
            <Rect x={20} y={0} width={10} height={20} fill="#E31B23" />
            <G transform="translate(15,10)">
              <Polygon points={STAR} fill="#00853F" />
            </G>
          </>
        )}
        {c === "CI" && (
          <>
            <Rect x={0} y={0} width={10} height={20} fill="#FF8200" />
            <Rect x={10} y={0} width={10} height={20} fill="#FFFFFF" />
            <Rect x={20} y={0} width={10} height={20} fill="#009A44" />
          </>
        )}
        {c === "BF" && (
          <>
            <Rect x={0} y={0} width={30} height={10} fill="#EF2B2D" />
            <Rect x={0} y={10} width={30} height={10} fill="#009E49" />
            <G transform="translate(15,10)">
              <Polygon points={STAR} fill="#FCD116" />
            </G>
          </>
        )}
        {c === "TG" && (
          <>
            <Rect x={0} y={0} width={30} height={20} fill="#006A4E" />
            <Rect x={0} y={4} width={30} height={4} fill="#FFCE00" />
            <Rect x={0} y={12} width={30} height={4} fill="#FFCE00" />
            <Rect x={0} y={0} width={12} height={12} fill="#D21034" />
            <G transform="translate(6,6)">
              <Polygon points={STAR} fill="#FFFFFF" />
            </G>
          </>
        )}
        {c === "BJ" && (
          <>
            <Rect x={0} y={0} width={12} height={20} fill="#008751" />
            <Rect x={12} y={0} width={18} height={10} fill="#FCD116" />
            <Rect x={12} y={10} width={18} height={10} fill="#E8112D" />
          </>
        )}
      </Svg>
    </View>
  );
}

/** Ruban qui défile tout seul (marquee), en boucle continue. */
function Marquee({ renderRow, gap = 10, speed = 30 }: { renderRow: () => React.ReactNode; gap?: number; speed?: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -w, duration: (w / speed) * 1000, easing: Easing.linear, useNativeDriver: false }),
    );
    anim.start();
    return () => anim.stop();
  }, [w, speed, x]);
  return (
    <View style={{ width: "100%", overflow: "hidden" }}>
      <Animated.View style={{ flexDirection: "row", gap, transform: [{ translateX: x }] }}>
        <View style={{ flexDirection: "row", gap }} onLayout={(e) => setW(e.nativeEvent.layout.width + gap)}>
          {renderRow()}
        </View>
        <View style={{ flexDirection: "row", gap }}>{renderRow()}</View>
        <View style={{ flexDirection: "row", gap }}>{renderRow()}</View>
      </Animated.View>
    </View>
  );
}

/* ---------- page ---------- */

export default function DecouvrirScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const start = () => router.push("/login" as any); // connexion
  const signup = () => router.push("/login?mode=signup" as any); // inscription

  const [menuOpen, setMenuOpen] = useState(false);
  const NAV = [
    { label: "Comment ça marche", id: "comment" },
    { label: "Pour qui", id: "pourqui" },
    { label: "Tarifs", id: "tarifs" },
    { label: "FAQ", id: "faq" },
  ];
  const goTo = (id: string) => {
    setMenuOpen(false);
    if (typeof document !== "undefined") {
      (document.getElementById(id) as any)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // CTA sticky : apparaît dès qu'on a dépassé le hero (plus besoin de remonter
  // en haut pour s'inscrire → moins d'abandons).
  const [showCta, setShowCta] = useState(false);
  const ctaV = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ctaV, {
      toValue: showCta ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showCta, ctaV]);
  const onScroll = (e: any) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const next = y > 560;
    setShowCta((prev) => (prev === next ? prev : next));
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      className="flex-1 bg-white"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + (wide ? 24 : 96) }}
    >
      {/* NAVBAR — superposée sur le hero */}
      <View className="w-full items-center" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, paddingTop: insets.top + 10 }}>
        <View style={{ width: "100%", maxWidth: 1040 }} className="flex-row items-center justify-between px-5 pb-3">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Logo size={26} />
            <Text className="font-display text-[19px] text-ink" style={{ letterSpacing: -0.4 }}>
              Paylika
            </Text>
          </View>
          {wide ? (
            <View className="flex-row items-center" style={{ gap: 26 }}>
              {NAV.map((n) => (
                <Pressable key={n.id} onPress={() => goTo(n.id)}>
                  <Text className="font-medium text-[13px] text-ink-soft">{n.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center" style={{ gap: 10 }}>
            {wide ? (
              <Pressable onPress={start}>
                <Text className="font-semibold text-[13px] text-ink">Se connecter</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={signup} className="rounded-full bg-bordeaux-600 px-4 py-2">
              <Text className="font-semibold text-[13px] text-white">Commencer</Text>
            </Pressable>
            {!wide ? (
              <Pressable
                onPress={() => setMenuOpen((o) => !o)}
                className="h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white/90"
              >
                <Icon name={menuOpen ? "close" : "menu"} size={18} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* menu déroulant mobile */}
        {!wide && menuOpen ? (
          <View style={{ width: "100%", maxWidth: 1040 }} className="px-5 pt-1">
            <View
              className="rounded-2xl border border-ink/[0.08] bg-white p-2"
              style={{ shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } }}
            >
              {NAV.map((n) => (
                <Pressable key={n.id} onPress={() => goTo(n.id)} className="rounded-xl px-3 py-3">
                  <Text className="font-semibold text-[14px] text-ink">{n.label}</Text>
                </Pressable>
              ))}
              <View className="my-1 h-px bg-ink/[0.06]" />
              <Pressable onPress={start} className="rounded-xl px-3 py-3">
                <Text className="font-semibold text-[14px] text-bordeaux-700">Se connecter</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* HERO — image plein écran, sans bordure, texte par-dessus */}
      <View style={{ width: "100%", height: wide ? 620 : 660 }}>
        <Image
          source={HERO}
          style={
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              // sur mobile, on décale le cadrage vers la droite pour garder le téléphone visible
              objectPosition: wide ? "center" : "72% 42%",
            } as any
          }
          resizeMode="cover"
        />
        <LinearGradient
          colors={["#FFFFFF", "rgba(255,255,255,0.92)", "rgba(255,255,255,0.4)", "rgba(255,255,255,0)"]}
          locations={[0, 0.36, 0.64, 0.92]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#FFFFFF"]}
          locations={[0.55, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140 }}
        />
        {/* léger voile en haut pour la lisibilité de la navbar superposée */}
        <LinearGradient
          colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 92 }}
        />

        {/* Texte du hero, ancré en bas */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: 1040, flex: 1, justifyContent: "flex-end" }} className="px-5 pb-12">
            <Rise>
              <View style={{ maxWidth: 580 }}>
                <Text
                  className="font-display-x text-ink"
                  style={{ fontSize: wide ? 44 : 32, letterSpacing: -1.8, lineHeight: wide ? 47 : 36 }}
                >
                  Une communauté, une audience sur les réseaux ?{" "}
                  <Text className="text-bordeaux-600">Il est temps de la monétiser.</Text>
                </Text>
                <Text className="mt-3 font-sans text-ink-soft" style={{ fontSize: 15.5, lineHeight: 23, maxWidth: 490 }}>
                  Paylika transforme vos abonnés en revenus : faites payer l'accès à vos groupes Telegram privés par mobile
                  money, et donnez l'accès automatiquement à chaque paiement.
                </Text>
                <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 10 }}>
                  <Btn label="Créer mon lien de paiement" onPress={signup} />
                  <Btn label="Voir comment ça marche" onPress={start} kind="ghost" icon={null} />
                </View>
                <Text className="mt-3 font-sans text-[12px] text-ink-muted">
                  Gratuit à l'inscription · 10% par vente · retraits sans frais
                </Text>
              </View>
            </Rise>
          </View>
        </View>

        {/* notifications flottantes — racontent le cycle complet */}
        {wide ? (
          <>
            <Float style={{ position: "absolute", top: 96, right: 40 }}>
              <Notif icon="wallet" title="Paiement reçu" sub="5 000 FCFA · Wave" color={colors.forest} />
            </Float>
            <Float delay={700} style={{ position: "absolute", top: 188, right: 92 }}>
              <Notif icon="telegram" title="Membre ajouté" sub="Groupe VIP" color={TG_BLUE} />
            </Float>
            <Float delay={1300} style={{ position: "absolute", top: 280, right: 52 }}>
              <Notif icon="close" title="Abonnement expiré" sub="Accès retiré" color={colors.bordeaux[600]} />
            </Float>
          </>
        ) : null}
      </View>

      {/* CONTENU */}
      <View style={{ width: "100%", maxWidth: 1040 }}>
        {/* BANDE PAIEMENTS ACCEPTÉS — scroll horizontal */}
        <View className="items-center">
          <Text className="px-5 text-center font-semibold text-[12px] uppercase text-ink-muted" style={{ letterSpacing: 0.8 }}>
            Vos clients paient avec ce qu'ils ont déjà
          </Text>
          <View style={{ width: "100%", marginTop: 16 }}>
            <Marquee
              gap={10}
              speed={28}
              renderRow={() => (
                <>
                  {[
                    { img: WAVE, t: "Wave" },
                    { img: ORANGE, t: "Orange Money" },
                    { img: MTN, t: "MTN" },
                    { img: MOOV, t: "Moov" },
                  ].map((p) => (
                    <View key={p.t} className="flex-row items-center rounded-2xl border border-ink/[0.08] bg-white px-3.5 py-2.5" style={{ gap: 8 }}>
                      <Image source={p.img} style={{ width: 22, height: 22, borderRadius: 11 }} resizeMode="contain" />
                      <Text className="font-semibold text-[13px] text-ink">{p.t}</Text>
                    </View>
                  ))}
                  <View key="card" className="flex-row items-center rounded-2xl border border-ink/[0.08] bg-paper px-3.5 py-2.5" style={{ gap: 8 }}>
                    <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-sand">
                      <Icon name="wallet" size={13} color={colors.muted} />
                    </View>
                    <Text className="font-semibold text-[13px] text-ink-soft">Carte bancaire</Text>
                    <View className="rounded-full bg-sand px-2 py-0.5">
                      <Text className="font-bold text-[9px] uppercase text-ink-muted">Bientôt</Text>
                    </View>
                  </View>
                </>
              )}
            />
          </View>

          {/* pays disponibles — marquee auto avec drapeaux */}
          <Text className="mt-8 px-5 text-center font-semibold text-[12px] uppercase text-ink-muted" style={{ letterSpacing: 0.8 }}>
            Disponible dans 5 pays
          </Text>
          <View style={{ width: "100%", marginTop: 12 }}>
            <Marquee
              gap={8}
              speed={24}
              renderRow={() => (
                <>
                  {([
                    { code: "SN", name: "Sénégal" },
                    { code: "CI", name: "Côte d'Ivoire" },
                    { code: "BF", name: "Burkina Faso" },
                    { code: "TG", name: "Togo" },
                    { code: "BJ", name: "Bénin" },
                  ] as const).map((c) => (
                    <View key={c.code} className="flex-row items-center rounded-full border border-ink/[0.06] bg-sand px-2.5 py-1.5" style={{ gap: 7 }}>
                      <Flag c={c.code} />
                      <Text className="font-semibold text-[12px] text-ink">{c.name}</Text>
                    </View>
                  ))}
                </>
              )}
            />
          </View>
        </View>

        {/* CANAUX DISPONIBLES */}
        <View className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Disponible sur</Kicker>
            <H2>Livrez l'accès là où est votre communauté.</H2>
          </View>
          <View className="mt-7 flex-row flex-wrap" style={{ gap: 10 }}>
            {[
              { i: "telegram" as const, c: TG_BLUE, t: "Telegram", d: "Ajout & retrait automatiques des membres.", soon: false },
              { i: "whatsapp" as const, c: WA_GREEN, t: "WhatsApp", d: "Lien du groupe envoyé après paiement.", soon: false },
              { i: "tag" as const, c: colors.bordeaux[600], t: "Lien ou contenu", d: "Fichier, vidéo, formation, PDF…", soon: false },
              { i: "wallet" as const, c: colors.forest, t: "Simple encaissement", d: "Recevez un paiement, sans groupe.", soon: false },
            ].map((c) => (
              <View
                key={c.t}
                className="flex-row items-center rounded-2xl border border-ink/[0.08] bg-white px-4 py-3.5"
                style={{ gap: 12, flexGrow: 1, flexBasis: "45%", minWidth: 240 }}
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: c.c + "1A" }}>
                  <Icon name={c.i} size={22} color={c.c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-display-semi text-[15px] text-ink">{c.t}</Text>
                  <Text className="font-sans text-[12px] text-ink-muted" style={{ lineHeight: 16 }}>
                    {c.d}
                  </Text>
                </View>
                <View className={`rounded-full px-2.5 py-1 ${c.soon ? "bg-sand" : "bg-forest"}`}>
                  <Text className={`font-bold text-[9px] uppercase ${c.soon ? "text-ink-muted" : "text-white"}`}>
                    {c.soon ? "Bientôt" : "Actif"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PROBLÈME */}
        <View className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Le vrai problème</Kicker>
            <H2>Vendre l'accès à un groupe, c'est facile. Le gérer à la main, c'est l'enfer.</H2>
          </View>
          <View className="mt-7 flex-row flex-wrap" style={{ gap: 12 }}>
            {[
              { i: "wallet" as const, t: "« Envoie la capture Wave »", d: "Vous vérifiez chaque paiement à la main, un client après l'autre." },
              { i: "users" as const, t: "Ajouts et retraits manuels", d: "Vous ajoutez et sortez chaque membre du groupe vous-même, tous les jours." },
              { i: "bell" as const, t: "Abonnements oubliés", d: "Personne ne pense à renouveler, et vous perdez de l'argent chaque mois." },
              { i: "chart" as const, t: "Aucune visibilité", d: "Qui a payé ? Qui a expiré ? Combien vous avez gagné ? Vous ne savez jamais." },
            ].map((c) => (
              <View key={c.t} className="rounded-3xl border border-ink/[0.08] bg-paper p-5" style={{ flexGrow: 1, flexBasis: "45%", minWidth: 220 }}>
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
                  <Icon name={c.i} size={19} color={colors.muted} />
                </View>
                <Text className="mt-3 font-display-semi text-[16px] text-ink">{c.t}</Text>
                <Text className="mt-1 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
                  {c.d}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* SOLUTION — ce que fait Paylika, clairement */}
        <View className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Ce que fait Paylika</Kicker>
            <H2>Un outil qui automatise tout, du paiement à l'accès.</H2>
            <Text className="mt-3 text-center font-sans text-[14px] text-ink-soft" style={{ lineHeight: 21, maxWidth: 500 }}>
              Vous vendez l'accès. Paylika encaisse, ajoute le membre, le relance et le retire — sans que vous touchiez à
              quoi que ce soit.
            </Text>
          </View>
          <View className={`mt-7 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            {[
              {
                i: "wallet" as const,
                c: colors.bordeaux[600],
                t: "Encaissez en un lien",
                d: "Partagez votre lien de paiement. Vos clients paient par mobile money en 30 secondes, sans app à installer.",
              },
              {
                i: "telegram" as const,
                c: TG_BLUE,
                t: "Livrez l'accès tout seul",
                d: "Dès le paiement confirmé, le membre rejoint automatiquement votre groupe Telegram privé.",
              },
              {
                i: "bolt" as const,
                c: colors.forest,
                t: "Gérez sans y penser",
                d: "Retrait à l'expiration, rappel avant l'échéance, réactivation dès le renouvellement. En pilote automatique.",
              },
            ].map((c) => (
              <View key={c.t} className="flex-1 rounded-3xl border border-ink/[0.08] bg-white p-6" style={{ minWidth: 220 }}>
                <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: c.c + "1A" }}>
                  <Icon name={c.i} size={24} color={c.c} />
                </View>
                <Text className="mt-4 font-display-semi text-[17px] text-ink">{c.t}</Text>
                <Text className="mt-1.5 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
                  {c.d}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* COMMENT ÇA MARCHE */}
        <View nativeID="comment" className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Comment ça marche</Kicker>
            <H2>De l'inscription au premier paiement, en quelques minutes.</H2>
          </View>
          <View className={`mt-7 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            {[
              { n: "01", t: "Créez votre offre", d: "Un prix, une durée. Mensuel, hebdomadaire ou paiement unique." },
              { n: "02", t: "Partagez votre lien", d: "Dans votre bio, vos stories, ou votre groupe gratuit." },
              { n: "03", t: "Votre client paie", d: "Wave, Orange Money, MTN — directement depuis son téléphone." },
              { n: "04", t: "L'accès se gère seul", d: "Ajouté au paiement, retiré à l'expiration, réactivé au renouvellement." },
            ].map((s) => (
              <View key={s.n} className="flex-1 rounded-3xl border border-ink/[0.08] bg-white p-5" style={{ minWidth: 200 }}>
                <Text className="font-display-x text-[24px] text-bordeaux-600" style={{ letterSpacing: -1 }}>
                  {s.n}
                </Text>
                <Text className="mt-2 font-display-semi text-[15px] text-ink">{s.t}</Text>
                <Text className="mt-1 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
                  {s.d}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* BANDEAU PHOTO #1 — manifeste */}
      <View className="mt-20 w-full">
        <PhotoBand img={P_FORMATEURS} height={wide ? 340 : 420}>
          <Rise>
            <View style={{ maxWidth: 560 }}>
              <Kicker light>Reprenez votre temps</Kicker>
              <Text className="mt-2 font-display-x text-white" style={{ fontSize: wide ? 32 : 27, letterSpacing: -1, lineHeight: wide ? 36 : 31 }}>
                Vous créez le contenu. Paylika encaisse et gère l'accès.
              </Text>
              <Text className="mt-3 font-sans text-white/75" style={{ fontSize: 14.5, lineHeight: 21, maxWidth: 470 }}>
                Fini les captures Wave à vérifier et les membres à ajouter un par un. Concentrez-vous sur votre
                communauté — on s'occupe des paiements et des accès.
              </Text>
              <View className="mt-6 self-start">
                <Btn label="Créer mon compte gratuitement" onPress={signup} kind="white" />
              </View>
            </View>
          </Rise>
        </PhotoBand>
      </View>

      <View style={{ width: "100%", maxWidth: 1040 }}>
        {/* POUR QUI */}
        <View nativeID="pourqui" className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Pour qui ?</Kicker>
            <H2>Pensé pour tous ceux qui vendent l'accès.</H2>
          </View>
          <View className="mt-7 flex-row flex-wrap" style={{ gap: 12 }}>
            {[
              { img: HERO, i: "chart" as const, t: "Pronostiqueurs sportifs", d: "Vos pronostics VIP dans un canal Telegram privé, payés chaque mois." },
              { img: P_FORMATEURS, i: "tag" as const, t: "Formateurs & infopreneurs", d: "Vos formations en accès par abonnement, sans plateforme compliquée." },
              { img: P_COACHS, i: "bolt" as const, t: "Coachs", d: "Un espace privé et payant pour accompagner vos clients suivis." },
              { img: P_CREATEURS, i: "users" as const, t: "Créateurs & communautés", d: "Monétisez votre communauté Telegram ou WhatsApp en quelques minutes." },
            ].map((c) => (
              <View key={c.t} className="overflow-hidden rounded-3xl border border-ink/[0.08] bg-white" style={{ flexGrow: 1, flexBasis: "45%", minWidth: 220 }}>
                <View className="relative">
                  <Image source={c.img} style={{ width: "100%", height: 150 }} resizeMode="cover" />
                  <View className="absolute left-3 top-3 h-9 w-9 items-center justify-center rounded-2xl bg-white/95">
                    <Icon name={c.i} size={17} color={colors.bordeaux[600]} />
                  </View>
                </View>
                <View className="p-4">
                  <Text className="font-display-semi text-[15px] text-ink">{c.t}</Text>
                  <Text className="mt-0.5 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
                    {c.d}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* POURQUOI PAYLIKA — comparaison (concurrents non nommés) */}
        <View className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Pourquoi Paylika</Kicker>
            <H2>Plus simple, et plus juste pour vous.</H2>
          </View>
          <View className={`mt-7 ${wide ? "flex-row" : ""}`} style={{ gap: 12 }}>
            {/* Ailleurs */}
            <View className="flex-1 rounded-3xl border border-ink/[0.08] bg-paper p-6">
              <Text className="font-semibold text-[12px] uppercase text-ink-muted" style={{ letterSpacing: 0.6 }}>
                Ailleurs
              </Text>
              <View className="mt-4" style={{ gap: 12 }}>
                {[
                  "Un abonnement mensuel à payer",
                  "Jusqu'à 15% de commission",
                  "Des frais sur vos retraits",
                  "Un nombre d'offres limité par forfait",
                ].map((t) => (
                  <View key={t} className="flex-row items-start" style={{ gap: 10 }}>
                    <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-sand">
                      <Icon name="close" size={12} color={colors.muted} strokeWidth={2.4} />
                    </View>
                    <Text className="flex-1 font-sans text-[13.5px] text-ink-soft" style={{ lineHeight: 19 }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {/* Avec Paylika */}
            <View className="flex-1 rounded-3xl border border-bordeaux-600 bg-bordeaux-50 p-6">
              <Text className="font-semibold text-[12px] uppercase text-bordeaux-700" style={{ letterSpacing: 0.6 }}>
                Avec Paylika
              </Text>
              <View className="mt-4" style={{ gap: 12 }}>
                {[
                  "Aucun abonnement, jamais",
                  "10% par vente — tout compris",
                  "Retraits 100% gratuits, vous recevez net",
                  "Offres illimitées dès le premier jour",
                ].map((t) => (
                  <View key={t} className="flex-row items-start" style={{ gap: 10 }}>
                    <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-bordeaux-600">
                      <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
                    </View>
                    <Text className="flex-1 font-semibold text-[13.5px] text-ink" style={{ lineHeight: 19 }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* TARIFS */}
        <View nativeID="tarifs" className="mt-20 px-5">
          <View className="items-center">
            <Kicker>Tarifs</Kicker>
            <H2>Simple, sans surprise.</H2>
          </View>
          <View className={`mt-7 ${wide ? "flex-row items-stretch" : ""}`} style={{ gap: 12 }}>
            <View className="rounded-3xl bg-bordeaux-600 p-6" style={{ flex: wide ? 1 : undefined, justifyContent: "center" }}>
              <Text className="font-display-x text-white" style={{ fontSize: 54, letterSpacing: -2, lineHeight: 56 }}>
                10<Text style={{ fontSize: 26 }}>%</Text>
              </Text>
              <Text className="mt-1 font-semibold text-[14px] text-white">par transaction</Text>
              <Text className="mt-2 font-sans text-[13px] text-white/75" style={{ lineHeight: 19 }}>
                Rien d'autre. Pas d'abonnement, pas de frais cachés. Vous ne payez que quand vous encaissez.
              </Text>
            </View>
            <View className="rounded-3xl border border-ink/[0.08] bg-white p-6" style={{ flex: wide ? 1.4 : undefined, gap: 12 }}>
              {[
                { t: "Aucun abonnement mensuel", d: "Créez votre compte et vos offres gratuitement." },
                { t: "Retraits 100% gratuits", d: "Retirez vos gains vers Wave ou Orange Money, quand vous voulez, sans frais." },
                { t: "Vous gardez le contrôle", d: "Un client paie 5 000 FCFA → vous touchez 4 500 FCFA. Clair, à chaque vente." },
              ].map((r) => (
                <View key={r.t} className="flex-row" style={{ gap: 12 }}>
                  <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-forest">
                    <Icon name="check" size={13} color="#fff" strokeWidth={2.6} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="font-display-semi text-[15px] text-ink">{r.t}</Text>
                    <Text className="mt-0.5 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
                      {r.d}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SÉCURITÉ / CONFIANCE */}
        <View className="mt-20 px-5">
          <View className="rounded-3xl bg-night p-6">
            <Kicker light>En confiance</Kicker>
            <Text className="mt-2 font-display-x text-[22px] text-white" style={{ letterSpacing: -0.8, lineHeight: 26 }}>
              Vos paiements et vos membres, toujours sous contrôle.
            </Text>
            <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
              {[
                "Paiements mobile money sécurisés",
                "Historique de chaque transaction",
                "Ajout & retrait automatiques",
                "Rappels de renouvellement",
                "Vos données protégées",
              ].map((t) => (
                <View key={t} className="flex-row items-center rounded-full bg-white/10 px-3 py-2" style={{ gap: 6 }}>
                  <Icon name="check" size={13} color="#fff" strokeWidth={2.4} />
                  <Text className="font-semibold text-[12px] text-white">{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View nativeID="faq" className="mt-20 px-5">
          <View className="items-center">
            <Kicker>FAQ</Kicker>
            <H2>Les questions qu'on nous pose.</H2>
          </View>
          <View className="mt-5">
            {[
              [
                "C'est quoi Paylika, concrètement ?",
                "Un outil pour faire payer l'accès à vos groupes privés Telegram et WhatsApp. Sur Telegram, l'ajout et le retrait des membres sont automatiques ; sur WhatsApp, le lien du groupe est envoyé automatiquement après le paiement.",
              ],
              [
                "Comment mes clients paient-ils ?",
                "Par mobile money : Wave, Orange Money, MTN, Moov. Un simple lien, aucune application à installer, aucune carte bancaire.",
              ],
              [
                "Comment le membre rejoint mon groupe ?",
                "Dès que le paiement est confirmé, Paylika ajoute automatiquement le membre à votre groupe privé. Vous ne faites rien.",
              ],
              [
                "Que se passe-t-il à l'expiration ?",
                "Le membre est retiré automatiquement du groupe, puis réintégré dès qu'il renouvelle son abonnement.",
              ],
              [
                "Combien ça coûte ?",
                "10% par transaction, sans abonnement mensuel. Les retraits de vos gains sont gratuits.",
              ],
              [
                "Il me faut quoi pour démarrer ?",
                "Un compte Paylika et votre groupe. Vous créez votre première offre et votre lien de paiement en 2 minutes.",
              ],
            ].map(([q, a]) => (
              <View key={q} className="border-b border-ink/[0.07] py-4">
                <Text className="font-display-semi text-[15px] text-ink">{q}</Text>
                <Text className="mt-1.5 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 20 }}>
                  {a}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* CTA FINAL — bandeau photo */}
      <View className="mt-20 w-full">
        <PhotoBand img={P_COACHS} height={wide ? 360 : 440}>
          <Rise>
            <View style={{ maxWidth: 560 }}>
              <Text className="font-display-x text-white" style={{ fontSize: wide ? 34 : 28, letterSpacing: -1, lineHeight: wide ? 38 : 32 }}>
                Prêt à faire payer votre groupe ?
              </Text>
              <Text className="mt-3 font-sans text-white/75" style={{ fontSize: 14.5, lineHeight: 21, maxWidth: 460 }}>
                Créez votre compte, votre première offre et votre lien de paiement en quelques minutes. C'est gratuit — vous
                ne payez que lorsque vous encaissez.
              </Text>
              <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 10 }}>
                <Btn label="Créer mon compte gratuitement" onPress={signup} kind="white" />
              </View>
              <Text className="mt-3 font-sans text-[12px] text-white/60">10% par vente · retraits sans frais · sans engagement</Text>
            </View>
          </Rise>
        </PhotoBand>
      </View>

      {/* FOOTER */}
      <View style={{ width: "100%", maxWidth: 1040 }} className="px-5 pt-14">
        <View className={`${wide ? "flex-row justify-between" : ""}`} style={{ gap: 28 }}>
          <View style={{ maxWidth: 300 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Logo size={26} />
              <Text className="font-display text-[19px] text-ink" style={{ letterSpacing: -0.4 }}>
                Paylika
              </Text>
            </View>
            <Text className="mt-3 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 20 }}>
              L'accès payant, automatisé. Encaissez vos abonnements et gérez vos membres, pour les créateurs d'Afrique de
              l'Ouest.
            </Text>
            <View className="mt-4 flex-row" style={{ gap: 8 }}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-sand">
                <Icon name="telegram" size={17} color={TG_BLUE} />
              </View>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-sand">
                <Icon name="whatsapp" size={17} color={WA_GREEN} />
              </View>
            </View>
          </View>

          <View className={`${wide ? "flex-row" : "flex-row flex-wrap"}`} style={{ gap: wide ? 56 : 32 }}>
            {[
              { h: "Produit", items: ["Comment ça marche", "Pour qui", "Tarifs", "FAQ"] },
              { h: "Compte", items: ["Se connecter", "Créer un compte"] },
              { h: "Légal", items: ["Conditions", "Confidentialité", "Contact"] },
            ].map((col) => (
              <View key={col.h} style={{ gap: 10 }}>
                <Text className="font-bold text-[11px] uppercase text-ink-muted" style={{ letterSpacing: 0.6 }}>
                  {col.h}
                </Text>
                {col.items.map((it) => (
                  <Pressable key={it} onPress={it === "Créer un compte" ? signup : start}>
                    <Text className="font-medium text-[13px] text-ink-soft">{it}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-10 flex-row flex-wrap items-center justify-between border-t border-ink/[0.07] pt-5" style={{ gap: 8 }}>
          <Text className="font-sans text-[12px] text-ink-muted">© 2026 Paylika. Tous droits réservés.</Text>
          <Text className="font-sans text-[12px] text-ink-muted">Sénégal · Côte d'Ivoire · Burkina Faso · Togo · Bénin</Text>
        </View>
      </View>
    </ScrollView>

      {/* CTA sticky — visible dès qu'on scrolle, pour s'inscrire sans remonter */}
      <Animated.View
        pointerEvents={showCta ? "auto" : "none"}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          opacity: ctaV,
          transform: [{ translateY: ctaV.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }],
          backgroundColor: "rgba(255,255,255,0.97)",
          borderTopWidth: 1,
          borderTopColor: "rgba(24,24,27,0.08)",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
        }}
      >
        <View style={{ width: "100%", maxWidth: 1040 }} className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-display-semi text-[14.5px] text-ink" style={{ letterSpacing: -0.2 }}>
              Prêt à monétiser ta communauté ?
            </Text>
            <Text className="mt-0.5 font-sans text-[11.5px] text-ink-muted">
              Gratuit · sans carte · prêt en 2 minutes
            </Text>
          </View>
          <Pressable
            onPress={signup}
            className="flex-row items-center rounded-full bg-bordeaux-600 px-5 py-3"
            style={{ gap: 6 }}
          >
            <Text className="font-semibold text-[14px] text-white">
              {wide ? "Créer mon compte gratuitement" : "Créer mon compte"}
            </Text>
            <Icon name="arrow-up-right" size={16} color={colors.white} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
