import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Button, Eyebrow, Tag } from "@/components/ui";
import { Input, Segmented } from "@/components/form";
import { Logo, Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { formatInt } from "@/components/cards";
import { copyOrShare } from "@/lib/clipboard";
import {
  fetchPendingConnections,
  connectGroup,
  createSimpleOffer,
  type Connection,
} from "@/data/queries";

const BOT_URL = "https://t.me/Paylikabot";
// Ouvre Telegram sur le sélecteur de groupe + ajoute le bot admin avec droits.
const CONNECT_URL =
  "https://t.me/Paylikabot?startgroup=connect&admin=invite_users+restrict_members";

function Steps({ step }: { step: number }) {
  return (
    <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={{
            width: n === step ? 26 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: n <= step ? colors.bordeaux[600] : colors.sand,
          }}
        />
      ))}
    </View>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [pending, setPending] = useState<Connection[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2
  const [offerName, setOfferName] = useState("");
  const [price, setPrice] = useState("");
  const [periodicity, setPeriodicity] = useState<"30" | "7" | "90">("30");

  // Step 3
  const [planId, setPlanId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll for a newly connected group during step 1.
  useEffect(() => {
    if (step !== 1) return;
    let alive = true;
    const tick = () =>
      fetchPendingConnections()
        .then((c) => {
          if (alive) setPending(c);
        })
        .catch(() => {});
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [step]);

  async function useThisGroup(c: Connection) {
    setBusy(true);
    setError(null);
    try {
      const gid = await connectGroup(c.chatId, c.title ?? "Mon groupe");
      setGroupId(gid);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? "Impossible de relier ce groupe.");
    } finally {
      setBusy(false);
    }
  }

  const priceNum = parseInt(price.replace(/\D/g, ""), 10) || 0;
  const canCreate = offerName.trim().length > 0 && priceNum > 0 && groupId;

  async function createOffer() {
    if (!canCreate || busy) return;
    setBusy(true);
    setError(null);
    try {
      const pid = await createSimpleOffer({
        offerName: offerName.trim(),
        groupId: groupId!,
        intervalDays: parseInt(periodicity, 10),
        price: priceNum,
      });
      setPlanId(pid);
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!planId) return;
    const r = await copyOrShare(`${BOT_URL}?start=${planId}`);
    if (r !== "failed") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
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
      <View style={{ width: "100%", maxWidth: 440, gap: 16 }}>
        <View className="items-center">
          <Logo size={40} />
          <Text className="mt-2 font-display text-[20px] text-ink" style={{ letterSpacing: -0.5 }}>
            Pay<Text className="text-bordeaux-600">lika</Text>
          </Text>
        </View>
        <Steps step={step} />

        {/* STEP 1 — connect bot */}
        {step === 1 ? (
          <Card>
            <Eyebrow>Étape 1 · Connecter un groupe</Eyebrow>
            <Text className="mt-2 font-display-semi text-[18px] text-ink">
              Choisissez votre groupe Telegram
            </Text>
            <View className="mt-3" style={{ gap: 10 }}>
              <Step n={1} text="Cliquez « Choisir mon groupe »." />
              <Step n={2} text="Telegram s'ouvre : sélectionnez le groupe à connecter." />
              <Step n={3} text="Confirmez — le bot est ajouté avec les bons droits, et le groupe apparaît ici." />
            </View>

            <View className="mt-4">
              <Button
                label="Choisir mon groupe"
                icon="send"
                variant="accent"
                onPress={() => Linking.openURL(CONNECT_URL)}
              />
            </View>

            {error ? <Text className="mt-3 font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

            <View className="mt-4 border-t border-ink/[0.06] pt-4">
              {pending.length ? (
                <>
                  <Eyebrow>Groupe(s) détecté(s)</Eyebrow>
                  <View className="mt-2" style={{ gap: 8 }}>
                    {pending.map((c) => (
                      <Pressable
                        key={c.chatId}
                        onPress={() => useThisGroup(c)}
                        disabled={busy}
                        className="flex-row items-center justify-between rounded-2xl bg-paper border border-ink/[0.08] px-4 py-3"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="font-semibold text-[14px] text-ink">
                            {c.title ?? "Groupe Telegram"}
                          </Text>
                          <Text className="font-sans text-[11px] text-ink-muted">Appuyez pour continuer</Text>
                        </View>
                        {busy ? (
                          <ActivityIndicator color={colors.bordeaux[600]} />
                        ) : (
                          <Icon name="arrow-right" size={18} color={colors.bordeaux[600]} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : (
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <ActivityIndicator color={colors.bordeaux[600]} />
                  <Text className="font-sans text-[13px] text-ink-muted">
                    En attente de votre groupe…
                  </Text>
                </View>
              )}
            </View>
          </Card>
        ) : null}

        {/* STEP 2 — create offer */}
        {step === 2 ? (
          <Card>
            <Eyebrow>Étape 2 · Votre offre</Eyebrow>
            <Text className="mt-2 font-display-semi text-[18px] text-ink">
              Fixez votre prix d'abonnement
            </Text>
            <View className="mt-4" style={{ gap: 16 }}>
              <Input
                label="Nom de l'offre"
                value={offerName}
                onChangeText={setOfferName}
                placeholder="Ex. Accès VIP"
                autoFocus
              />
              <Input
                label="Prix"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                suffix="XOF"
                placeholder="5000"
              />
              <Segmented
                label="Périodicité"
                value={periodicity}
                onChange={setPeriodicity}
                options={[
                  { label: "Hebdo", value: "7" },
                  { label: "Mensuel", value: "30" },
                  { label: "Trimestre", value: "90" },
                ]}
              />
              {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}
              <Button
                label={busy ? "Création…" : "Créer l'offre"}
                icon="check"
                variant="accent"
                onPress={createOffer}
              />
            </View>
          </Card>
        ) : null}

        {/* STEP 3 — done */}
        {step === 3 ? (
          <Card>
            <View className="items-center">
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text className="mt-1 font-display-semi text-[18px] text-ink">C'est prêt !</Text>
              <Text className="mt-1 text-center font-sans text-[13px] text-ink-muted">
                Partagez ce lien : vos abonnés paient et rejoignent le groupe automatiquement.
              </Text>
            </View>

            <Pressable
              onPress={copyLink}
              className="mt-4 flex-row items-center justify-between rounded-2xl bg-paper border border-ink/[0.08] px-4 py-3"
            >
              <Text numberOfLines={1} className="flex-1 pr-2 font-medium text-[12px] text-bordeaux-700">
                t.me/Paylikabot?start={(planId ?? "").slice(0, 10)}…
              </Text>
              <View className="flex-row items-center rounded-full bg-bordeaux-600 px-3 py-1.5" style={{ gap: 4 }}>
                {copied ? <Icon name="check" size={12} color={colors.white} strokeWidth={2.6} /> : null}
                <Text className="font-semibold text-[11px] text-white">{copied ? "Copié" : "Copier"}</Text>
              </View>
            </Pressable>

            <View className="mt-4">
              <Button label="Aller au tableau de bord" icon="arrow-right" variant="accent" onPress={() => router.replace("/")} />
            </View>
          </Card>
        ) : null}

        {step === 1 ? (
          <Pressable onPress={() => router.replace("/")}>
            <Text className="text-center font-sans text-[12px] text-ink-muted">Passer pour l'instant</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View className="flex-row items-start" style={{ gap: 10 }}>
      <View className="h-6 w-6 items-center justify-center rounded-full bg-bordeaux-50">
        <Text className="font-bold text-[12px] text-bordeaux-700">{n}</Text>
      </View>
      <Text className="flex-1 font-sans text-[13px] text-ink-soft">{text}</Text>
    </View>
  );
}
