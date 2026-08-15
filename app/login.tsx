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

/* ---------- panneau orbite (branding) ---------- */

function Bubble({ left, top, size = 56, children }: { left: number; top: number; size?: number; children: React.ReactNode }) {
  return (
    <View
      className="absolute items-center justify-center rounded-full bg-white"
      style={{
        left,
        top,
        width: size,
        height: size,
        shadowColor: colors.bordeaux[900],
        shadowOpacity: 0.14,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      {children}
    </View>
  );
}

function Ring({ r, opacity }: { r: number; opacity: number }) {
  const C = 170;
  return (
    <View
      className="absolute rounded-full"
      style={{ left: C - r, top: C - r, width: r * 2, height: r * 2, borderWidth: 1, borderColor: `rgba(123,17,38,${opacity})` }}
    />
  );
}

function OrbitPanel() {
  const op = (img: any) => <Image source={img} style={{ width: 30, height: 30, borderRadius: 15 }} resizeMode="contain" />;
  return (
    <View className="flex-1 overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={["#FCEEF1", "#F7DAE1", "#FBECEF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="flex-1 justify-between p-9">
        {/* titre */}
        <View style={{ maxWidth: 320 }}>
          <Text className="font-display-x text-ink" style={{ fontSize: 26, letterSpacing: -1, lineHeight: 30 }}>
            Encaissez et livrez l'accès,{" "}
            <Text className="text-bordeaux-600">automatiquement.</Text>
          </Text>
          <Text className="mt-2 font-sans text-[13.5px] text-ink-soft" style={{ lineHeight: 20 }}>
            Un seul outil pour vos paiements mobile money et vos accès à vos groupes.
          </Text>
        </View>

        {/* orbite */}
        <View className="items-center justify-center">
          <View style={{ width: 340, height: 340 }}>
            <Ring r={120} opacity={0.18} />
            <Ring r={72} opacity={0.12} />

            {/* logo central */}
            <View
              className="absolute items-center justify-center rounded-full bg-white"
              style={{
                left: 128,
                top: 128,
                width: 84,
                height: 84,
                shadowColor: colors.bordeaux[900],
                shadowOpacity: 0.18,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 12 },
              }}
            >
              <Logo size={46} />
            </View>

            {/* satellites */}
            <Bubble left={142} top={22}>
              <Icon name="telegram" size={26} color={TG_BLUE} />
            </Bubble>
            <Bubble left={246} top={82}>{op(WAVE)}</Bubble>
            <Bubble left={246} top={202}>{op(ORANGE)}</Bubble>
            <Bubble left={142} top={262}>
              <Icon name="whatsapp" size={26} color={WA_GREEN} />
            </Bubble>
            <Bubble left={38} top={202}>{op(MTN)}</Bubble>
            <Bubble left={38} top={82}>{op(MOOV)}</Bubble>
          </View>
        </View>

        {/* légende */}
        <Text className="font-sans text-[12.5px] text-ink-muted">
          Compatible Wave, Orange Money, MTN, Moov et Telegram — WhatsApp bientôt.
        </Text>
      </View>
    </View>
  );
}

/* ---------- page ---------- */

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
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

  const form = (
    <View style={{ width: "100%", maxWidth: 380 }}>
      {/* marque */}
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Logo size={30} />
        <Text className="font-display text-[20px] text-ink" style={{ letterSpacing: -0.4 }}>
          Pay<Text className="text-bordeaux-600">lika</Text>
        </Text>
      </View>

      {/* titre */}
      <View style={{ marginTop: 30 }}>
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
      <View style={{ marginTop: 24, gap: 14 }}>
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
        style={{ marginTop: 22 }}
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
    </View>
  );

  return (
    <View className="flex-1 bg-paper">
      <View className="flex-1" style={{ flexDirection: wide ? "row" : "column" }}>
        {/* FORMULAIRE */}
        <View style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 28,
            }}
          >
            {form}
          </ScrollView>
        </View>

        {/* PANNEAU ORBITE — grands écrans */}
        {wide ? (
          <View style={{ flex: 1, padding: 12, paddingLeft: 0 }}>
            <OrbitPanel />
          </View>
        ) : null}
      </View>
    </View>
  );
}
