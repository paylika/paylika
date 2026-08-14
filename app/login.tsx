import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Button } from "@/components/ui";
import { Input } from "@/components/form";
import { Logo } from "@/components/Icon";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const dest = typeof next === "string" && next ? next : "/";
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
        router.replace(dest as any);
      } else {
        const { needsConfirmation } = await signUpWithEmail(email.trim(), password);
        if (needsConfirmation) {
          setInfo("Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.");
          setMode("signin");
        } else {
          router.replace(dest as any);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Échec. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ width: "100%", maxWidth: 400, gap: 16 }}>
        <View className="items-center">
          <Logo size={48} />
          <Text className="mt-2 font-display text-[24px] text-ink" style={{ letterSpacing: -0.5 }}>
            Pay<Text className="text-bordeaux-600">lika</Text>
          </Text>
          <Text className="mt-1 font-sans text-[13px] text-ink-muted">
            {mode === "signin" ? "Connectez-vous à votre espace" : "Créez votre compte"}
          </Text>
        </View>

        <Card>
          <View style={{ gap: 14 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="vous@exemple.com"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? (
              <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
            ) : null}
            {info ? (
              <Text className="font-sans text-[12px] text-forest">{info}</Text>
            ) : null}

            <Button
              label={busy ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
              icon="arrow-right"
              variant="accent"
              onPress={submit}
            />
          </View>
        </Card>

        <Pressable
          onPress={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
        >
          <Text className="text-center font-sans text-[13px] text-ink-muted">
            {mode === "signin" ? (
              <>
                Pas de compte ? <Text className="font-semibold text-bordeaux-600">Créer un compte</Text>
              </>
            ) : (
              <>
                Déjà un compte ? <Text className="font-semibold text-bordeaux-600">Se connecter</Text>
              </>
            )}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
