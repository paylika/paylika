import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useAuth, updateWhatsApp } from "@/lib/auth";
import { CountryPhone, countryDial } from "./CountryPhone";
import { Card, Button } from "./ui";
import { Icon } from "./Icon";
import { colors } from "@/theme/colors";

/**
 * Encart (accueil) qui pousse les comptes SANS numéro à ajouter leur WhatsApp.
 * Disparaît dès que le numéro est enregistré ; réapparaît à la session suivante
 * tant que c'est vide. Écrit dans les métadonnées du compte (lu côté admin).
 */
export function WhatsAppNudge() {
  const { session } = useAuth();
  const already = !!(session?.user?.user_metadata as any)?.whatsapp;

  const [dismissed, setDismissed] = useState(false);
  const [country, setCountry] = useState("SN");
  const [wa, setWa] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (already || dismissed || done) return null;

  async function save() {
    const digits = wa.replace(/\D/g, "");
    if (digits.length < 7) {
      setError("Entre ton numéro WhatsApp.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWhatsApp(country, "+" + countryDial(country) + digits);
      setDone(true);
    } catch (e: any) {
      const msg = e?.message ?? "Impossible d'enregistrer.";
      setError(/duplicate|unique/i.test(msg) ? "Ce numéro est déjà utilisé par un autre compte." : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start pr-2" style={{ gap: 10 }}>
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.forest + "1A" }}
          >
            <Icon name="whatsapp" size={18} color={colors.forest} />
          </View>
          <View className="flex-1">
            <Text className="font-display-semi text-[15px] text-ink">Ajoute ton numéro WhatsApp</Text>
            <Text className="mt-0.5 font-sans text-[12.5px] text-ink-muted" style={{ lineHeight: 18 }}>
              Pour qu'on puisse t'aider directement et t'envoyer tes infos importantes.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-full bg-sand"
        >
          <Icon name="close" size={14} color={colors.muted} />
        </Pressable>
      </View>

      <View className="mt-3.5">
        <CountryPhone country={country} onCountry={setCountry} value={wa} onChangeText={setWa} />
      </View>

      {error ? <Text className="mt-2 font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

      <View className="mt-3.5">
        <Button
          label={saving ? "Enregistrement…" : "Enregistrer mon WhatsApp"}
          icon="check"
          variant="accent"
          onPress={save}
        />
      </View>
    </Card>
  );
}
