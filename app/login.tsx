import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { Input } from "@/components/form";
import { Logo, Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";

const WAVE = require("../assets/operators/wave.png");
const ORANGE = require("../assets/operators/orange.png");
const MTN = require("../assets/operators/mtn.png");
const MOOV = require("../assets/operators/moov.png");
const TG_BLUE = "#229ED9";
const WA_GREEN = "#25D366";

/* ---------- orbite (branding) ---------- */

function OrbitArt({ box, bubble, logoSize }: { box: number; bubble: number; logoSize: number }) {
  const C = box / 2;
  const R = box * 0.353;
  const Rin = box * 0.212;
  const op = (img: any) => (
    <Image source={img} style={{ width: bubble * 0.56, height: bubble * 0.56, borderRadius: bubble * 0.28 }} resizeMode="contain" />
  );
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { left: C + R * Math.cos(a) - bubble / 2, top: C + R * Math.sin(a) - bubble / 2 };
  };
  const sats: { deg: number; node: React.ReactNode }[] = [
    { deg: -90, node: <Icon name="telegram" size={bubble * 0.46} color={TG_BLUE} /> },
    { deg: -30, node: op(WAVE) },
    { deg: 30, node: op(ORANGE) },
    { deg: 90, node: <Icon name="whatsapp" size={bubble * 0.46} color={WA_GREEN} /> },
    { deg: 150, node: op(MTN) },
    { deg: 210, node: op(MOOV) },
  ];
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

      {/* logo central */}
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

      {/* satellites */}
      {sats.map((s, i) => {
        const p = at(s.deg);
        return (
          <View
            key={i}
            className="absolute items-center justify-center rounded-full bg-white"
            style={{
              left: p.left,
              top: p.top,
              width: bubble,
              height: bubble,
              shadowColor: colors.bordeaux[900],
              shadowOpacity: 0.14,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 7 },
            }}
          >
            {s.node}
          </View>
        );
      })}
    </View>
  );
}

/** Panneau plein (grand écran) : titre + orbite + légende. */
function OrbitPanelBig() {
  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#FCEEF1", "#F7DAE1", "#FBECEF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="flex-1 justify-between p-9">
        <View style={{ maxWidth: 320 }}>
          <Text className="font-display-x text-ink" style={{ fontSize: 26, letterSpacing: -1, lineHeight: 30 }}>
            Encaissez et livrez l'accès, <Text className="text-bordeaux-600">automatiquement.</Text>
          </Text>
          <Text className="mt-2 font-sans text-[13.5px] text-ink-soft" style={{ lineHeight: 20 }}>
            Un seul outil pour vos paiements mobile money et vos accès à vos groupes.
          </Text>
        </View>
        <View className="items-center justify-center">
          <OrbitArt box={340} bubble={56} logoSize={84} />
        </View>
        <Text className="font-sans text-[12.5px] text-ink-muted">
          Compatible Wave, Orange Money, MTN, Moov et Telegram — WhatsApp bientôt.
        </Text>
      </View>
    </View>
  );
}

/** Carte compacte (écran étroit) : orbite au-dessus du formulaire. */
function OrbitCardCompact() {
  return (
    <View className="w-full overflow-hidden rounded-[24px]" style={{ height: 262 }}>
      <LinearGradient
        colors={["#FCEEF1", "#F7DAE1", "#FBECEF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="flex-1 items-center justify-center">
        <OrbitArt box={224} bubble={46} logoSize={64} />
      </View>
    </View>
  );
}

/* ---------- page ---------- */

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password);
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
      {/* marque */}
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Logo size={30} />
        <Text className="font-display text-[20px] text-ink" style={{ letterSpacing: -0.4 }}>
          Pay<Text className="text-bordeaux-600">lika</Text>
        </Text>
      </View>

      {/* titre */}
      <View style={{ marginTop: 26 }}>
        <Text className="font-display-x text-[26px] text-ink" style={{ letterSpacing: -1 }}>
          {isSignin ? "Content de vous revoir" : "Créez votre compte"}
        </Text>
        <Text className="mt-1.5 font-sans text-[13.5px] text-ink-muted" style={{ lineHeight: 20 }}>
          {isSignin
            ? "Connectez-vous pour gérer vos abonnements et vos accès."
            : "Il vous faut juste un email et un mot de passe pour démarrer."}
        </Text>
      </View>

      {/* champs */}
      <View style={{ marginTop: 22, gap: 14 }}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="vous@exemple.com" />
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

      {/* bascule */}
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
