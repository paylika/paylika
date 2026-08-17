import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Animated, Easing, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { Input } from "@/components/form";
import { CountryPhone, countryDial } from "@/components/CountryPhone";
import { Logo, Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { signInWithEmail, signUpWithEmail, phoneTaken } from "@/lib/auth";
import { trackSignup } from "@/lib/pixel";

const WAVE = require("../assets/operators/wave.png");
const ORANGE = require("../assets/operators/orange.png");
const MTN = require("../assets/operators/mtn.png");
const MOOV = require("../assets/operators/moov.png");
const TG_BLUE = "#229ED9";
const WA_GREEN = "#25D366";
const PASTEL = ["#FCEEF1", "#F7DAE1", "#FBECEF"] as const;

/* ---------- orbite animée (branding) ---------- */

function OrbitArt({ box }: { box: number }) {
  const bubble = box * 0.155;
  const logoSize = box * 0.24;
  const C = box / 2;
  const R = box * 0.33;
  const Rin = box * 0.19;

  // rotation lente et continue des satellites autour du centre.
  // useNativeDriver:false => fiable sur le web pour l'interpolation d'angle.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 40000, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });

  const op = (img: any) => (
    <Image source={img} style={{ width: bubble * 0.56, height: bubble * 0.56, borderRadius: bubble * 0.28 }} resizeMode="contain" />
  );
  const sats: React.ReactNode[] = [
    <Icon key="tg" name="telegram" size={bubble * 0.46} color={TG_BLUE} />,
    op(WAVE),
    op(ORANGE),
    <Icon key="wa" name="whatsapp" size={bubble * 0.46} color={WA_GREEN} />,
    op(MTN),
    op(MOOV),
  ];
  const angles = [-90, -30, 30, 90, 150, 210];
  const ring = (r: number, opacity: number) => (
    <View
      className="absolute rounded-full"
      style={{ left: C - r, top: C - r, width: r * 2, height: r * 2, borderWidth: 1, borderColor: `rgba(123,17,38,${opacity})` }}
    />
  );

  return (
    <View style={{ width: box, height: box }}>
      {ring(R, 0.18)}
      {ring(Rin, 0.12)}

      {/* Rotateur : POINT (0×0) placé au centre. Pivoter autour de son coin
          haut-gauche = pivoter autour du centre → tous les satellites gravitent
          sur le même rayon, uniformément. */}
      <Animated.View style={{ position: "absolute", left: C, top: C, width: 0, height: 0, transform: [{ rotate }] }}>
        {angles.map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const ox = R * Math.cos(a);
          const oy = R * Math.sin(a);
          return (
            // point placé sur l'orbite ; la contre-rotation garde le logo droit
            <Animated.View key={i} style={{ position: "absolute", left: ox, top: oy, width: 0, height: 0, transform: [{ rotate: counter }] }}>
              <View
                className="items-center justify-center rounded-full bg-white"
                style={{
                  position: "absolute",
                  left: -bubble / 2,
                  top: -bubble / 2,
                  width: bubble,
                  height: bubble,
                  shadowColor: colors.bordeaux[900],
                  shadowOpacity: 0.14,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 7 },
                }}
              >
                {sats[i]}
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* logo central fixe */}
      <View
        className="absolute items-center justify-center rounded-full bg-white"
        style={{
          left: C - logoSize / 2,
          top: C - logoSize / 2,
          width: logoSize,
          height: logoSize,
          shadowColor: colors.bordeaux[900],
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <Logo size={logoSize * 0.55} />
      </View>
    </View>
  );
}

/** Panneau plein (split, grand écran) : titre + orbite responsive + légende. */
function OrbitPanelBig() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  // l'orbite tient dans la largeur ET la hauteur dispo (moins titre + légende)
  const box = Math.max(210, Math.min(330, (w || 420) - 96, (h || 560) - 210));
  const pad = w && w < 470 ? 22 : 36;
  const titleSize = w && w < 470 ? 21 : 26;
  return (
    <View
      className="flex-1 overflow-hidden rounded-[28px]"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <LinearGradient colors={PASTEL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="flex-1 justify-between" style={{ padding: pad }}>
        <View style={{ maxWidth: 320 }}>
          <Text className="font-display-x text-ink" style={{ fontSize: titleSize, letterSpacing: -1, lineHeight: titleSize + 4 }}>
            Encaissez et livrez l'accès, <Text className="text-bordeaux-600">automatiquement.</Text>
          </Text>
          <Text className="mt-2 font-sans text-[13px] text-ink-soft" style={{ lineHeight: 19 }}>
            Un seul outil pour vos paiements mobile money et vos accès à vos groupes.
          </Text>
        </View>
        <View className="items-center justify-center">
          <OrbitArt box={box} />
        </View>
        <Text className="font-sans text-[12px] text-ink-muted">
          Wave · Orange Money · MTN · Moov · Telegram · WhatsApp
        </Text>
      </View>
    </View>
  );
}

/** Carte compacte (petit écran) : orbite au-dessus du formulaire. */
function OrbitCardCompact() {
  return (
    <View className="w-full overflow-hidden rounded-[24px]" style={{ height: 258 }}>
      <LinearGradient colors={PASTEL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="flex-1 items-center justify-center">
        <OrbitArt box={224} />
      </View>
    </View>
  );
}

/* ---------- page ---------- */

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 560;
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(params.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("SN");
  const [wa, setWa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
        // La redirection (admin -> /admin, sinon -> /) est gérée par le layout.
      } else {
        const digits = wa.replace(/\D/g, "");
        if (digits.length < 7) {
          setError("Entre ton numéro WhatsApp.");
          setBusy(false);
          return;
        }
        const whatsapp = "+" + countryDial(country) + digits;
        // Un numéro = un seul compte.
        if (await phoneTaken(whatsapp)) {
          setError("Ce numéro WhatsApp a déjà un compte. Connecte-toi.");
          setBusy(false);
          return;
        }
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password, {
          country,
          whatsapp,
        });
        trackSignup(); // événement Meta « inscription » pour les pubs Facebook
        if (needsConfirmation) {
          setInfo("Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.");
          setMode("signin");
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Échec. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const isSignin = mode === "signin";

  const formInner = (
    <>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Logo size={30} />
        <Text className="font-display text-[20px] text-ink" style={{ letterSpacing: -0.4 }}>
          Pay<Text className="text-bordeaux-600">lika</Text>
        </Text>
      </View>

      <View style={{ marginTop: 26 }}>
        <Text className="font-display-x text-[26px] text-ink" style={{ letterSpacing: -1 }}>
          {isSignin ? "Content de vous revoir" : "Créez votre compte"}
        </Text>
        <Text className="mt-1.5 font-sans text-[13.5px] text-ink-muted" style={{ lineHeight: 20 }}>
          {isSignin
            ? "Connectez-vous pour gérer vos abonnements et vos accès."
            : "Crée ton compte en 30 secondes pour commencer à encaisser."}
        </Text>
      </View>

      <View style={{ marginTop: 22, gap: 14 }}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" />
        {!isSignin ? (
          <CountryPhone country={country} onCountry={setCountry} value={wa} onChangeText={setWa} />
        ) : null}
        <Input label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

        {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}
        {info ? <Text className="font-sans text-[12px] text-forest">{info}</Text> : null}

        <View style={{ marginTop: 4 }}>
          <Button
            label={busy ? "…" : isSignin ? "Se connecter" : "Créer mon compte"}
            icon="arrow-right"
            variant="accent"
            onPress={submit}
          />
        </View>
      </View>

      <Pressable
        style={{ marginTop: 20 }}
        onPress={() => {
          setMode(isSignin ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
      >
        <Text className="text-center font-sans text-[13px] text-ink-muted">
          {isSignin ? (
            <>
              Pas encore de compte ? <Text className="font-semibold text-bordeaux-600">Créer un compte</Text>
            </>
          ) : (
            <>
              Déjà un compte ? <Text className="font-semibold text-bordeaux-600">Se connecter</Text>
            </>
          )}
        </Text>
      </Pressable>
    </>
  );

  if (wide) {
    return (
      <View className="flex-1 flex-row bg-paper">
        <View style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 }}
          >
            <View style={{ width: "100%", maxWidth: 380 }}>{formInner}</View>
          </ScrollView>
        </View>
        <View style={{ flex: 1, padding: 12, paddingLeft: 0 }}>
          <OrbitPanelBig />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View style={{ width: "100%", maxWidth: 380, gap: 22 }}>
        <OrbitCardCompact />
        <View>{formInner}</View>
      </View>
    </ScrollView>
  );
}
