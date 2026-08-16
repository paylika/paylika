import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, Linking, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { adminGetSettings, adminSetSettings } from "@/lib/admin";

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <View className="flex-row" style={{ gap: 12 }}>
      <View className="h-7 w-7 items-center justify-center rounded-full bg-bordeaux-600">
        <Text className="font-display-x text-[13px] text-white">{n}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-display-semi text-[14px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

export default function AdminMarketing() {
  const [pixelId, setPixelId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const s = await adminGetSettings();
      setPixelId(s.metaPixelId ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Chargement impossible.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await adminSetSettings(pixelId.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function openEventsManager() {
    const url = "https://business.facebook.com/events_manager2";
    if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
    else Linking.openURL(url);
  }

  const configured = pixelId.trim().length > 0;

  return (
    <Screen onRefresh={load}>
      <View>
        <Eyebrow>Console · Marketing</Eyebrow>
        <Text className="mt-1 font-display-x text-[28px] text-ink" style={{ letterSpacing: -1 }}>
          Pixel & publicité
        </Text>
        <Text className="mt-1 font-sans text-[13px] text-ink-muted" style={{ lineHeight: 19 }}>
          Trackez les inscriptions depuis vos pubs Facebook pour optimiser vos campagnes.
        </Text>
      </View>

      {error ? (
        <Card>
          <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text>
        </Card>
      ) : null}

      {!loaded ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          {/* Statut */}
          <Card>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: (configured ? colors.forest : colors.muted) + "1A" }}
              >
                <Icon
                  name={configured ? "check" : "bolt"}
                  size={22}
                  color={configured ? colors.forest : colors.muted}
                  strokeWidth={2.4}
                />
              </View>
              <View className="flex-1">
                <Text className="font-display-semi text-[15px] text-ink">
                  {configured ? "Pixel actif" : "Pixel non configuré"}
                </Text>
                <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">
                  {configured ? `ID : ${pixelId.trim()}` : "Ajoutez votre ID pour commencer à tracker."}
                </Text>
              </View>
            </View>
          </Card>

          {/* Champ + enregistrement */}
          <Card>
            <Eyebrow>ID du Pixel Meta</Eyebrow>
            <Text className="mt-1 mb-3 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
              Meta Events Manager → votre Pixel → copiez l'ID (16 chiffres).
            </Text>
            <Input
              label="ID du Pixel"
              value={pixelId}
              onChangeText={setPixelId}
              placeholder="Ex. 1234567890123456"
              keyboardType="numeric"
            />
            <View className="mt-4">
              <Button
                label={saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer le pixel"}
                icon="check"
                variant="accent"
                onPress={save}
              />
            </View>
          </Card>

          {/* Comment ça marche */}
          <Card>
            <Eyebrow>Comment ça marche</Eyebrow>
            <View className="mt-3" style={{ gap: 14 }}>
              <Step
                n={1}
                title="PageView sur toutes les pages"
                text="Le pixel se déclenche dès qu'un visiteur arrive — dont votre landing /decouvrir, la destination de vos pubs."
              />
              <Step
                n={2}
                title="Inscription = « CompleteRegistration »"
                text="À chaque création de compte, l'événement « inscription » part vers Meta. C'est ça que vos pubs vont chercher."
              />
              <Step
                n={3}
                title="Campagne « Ventes / Conversions »"
                text="Dans Meta Ads : objectif « Ventes », optimisé sur l'événement CompleteRegistration. Ciblage : pronostiqueurs, formateurs, coachs (Sénégal / Côte d'Ivoire)."
              />
            </View>
          </Card>

          {/* Vérifier */}
          <Card>
            <Eyebrow>Vérifier que ça marche</Eyebrow>
            <Text className="mt-1 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
              Installez l'extension Chrome « Meta Pixel Helper », ouvrez votre landing → le pixel doit s'activer (PageView).
              Faites une inscription test → vous verrez « CompleteRegistration ».
            </Text>
            <View className="mt-3 self-start">
              <Button label="Ouvrir Meta Events Manager" icon="arrow-up-right" variant="outline" onPress={openEventsManager} />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
