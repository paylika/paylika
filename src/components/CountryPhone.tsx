import { useState } from "react";
import { View, Text, TextInput, Pressable, Image } from "react-native";
import { colors } from "@/theme/colors";
import { Icon } from "./Icon";
import { FieldLabel } from "./form";

export type Country = { code: string; label: string; dial: string; ex: string };

// Pays cibles + indicatif + exemple de numéro ADAPTÉ à chaque pays.
export const COUNTRIES: Country[] = [
  { code: "SN", label: "Sénégal", dial: "221", ex: "77 123 45 67" },
  { code: "CI", label: "Côte d'Ivoire", dial: "225", ex: "07 12 34 56 78" },
  { code: "BF", label: "Burkina Faso", dial: "226", ex: "70 12 34 56" },
  { code: "TG", label: "Togo", dial: "228", ex: "90 12 34 56" },
  { code: "BJ", label: "Bénin", dial: "229", ex: "01 23 45 67" },
];

const FLAGS: Record<string, any> = {
  SN: require("../../assets/flags/sn.png"),
  CI: require("../../assets/flags/ci.png"),
  BF: require("../../assets/flags/bf.png"),
  TG: require("../../assets/flags/tg.png"),
  BJ: require("../../assets/flags/bj.png"),
};

export function countryDial(code: string): string {
  return (COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]).dial;
}

function FlagImg({ code, w = 24 }: { code: string; w?: number }) {
  return (
    <Image
      source={FLAGS[code]}
      style={{
        width: w,
        height: Math.round(w * 0.68),
        borderRadius: 3,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
      }}
      resizeMode="cover"
    />
  );
}

/**
 * Sélecteur pays (déroulant, style Telegram) + champ numéro avec drapeau et
 * indicatif collés devant. L'exemple de numéro s'adapte au pays choisi.
 */
export function CountryPhone({
  country,
  onCountry,
  value,
  onChangeText,
  label = "Numéro WhatsApp",
}: {
  country: string;
  onCountry: (code: string) => void;
  value: string;
  onChangeText: (v: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const c = COUNTRIES.find((x) => x.code === country) ?? COUNTRIES[0];

  return (
    <View style={{ gap: 12 }}>
      {/* Pays — déroulant */}
      <View>
        <FieldLabel>Pays</FieldLabel>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          className="flex-row items-center rounded-2xl bg-card border border-ink/[0.1] px-4 py-3"
          style={{ gap: 10 }}
        >
          <FlagImg code={c.code} />
          <Text className="flex-1 font-semibold text-[15px] text-ink">{c.label}</Text>
          <Text className="font-medium text-[13px] text-ink-muted">+{c.dial}</Text>
          <Icon name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        {open ? (
          <View className="mt-1.5 overflow-hidden rounded-2xl border border-ink/[0.1] bg-card">
            {COUNTRIES.map((x, i) => (
              <Pressable
                key={x.code}
                onPress={() => {
                  onCountry(x.code);
                  setOpen(false);
                }}
                className={`flex-row items-center px-4 py-3 ${i === 0 ? "" : "border-t border-ink/[0.06]"}`}
                style={{ gap: 10, backgroundColor: x.code === country ? colors.bordeaux[50] : "transparent" }}
              >
                <FlagImg code={x.code} />
                <Text className="flex-1 font-semibold text-[15px] text-ink">{x.label}</Text>
                <Text className="font-medium text-[13px] text-ink-muted">+{x.dial}</Text>
                {x.code === country ? (
                  <Icon name="check" size={16} color={colors.bordeaux[600]} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Numéro — drapeau + indicatif devant, exemple adapté au pays */}
      <View>
        <FieldLabel>{label}</FieldLabel>
        <View className="flex-row items-center rounded-2xl bg-card border border-ink/[0.1] px-4 py-3">
          <FlagImg code={c.code} w={22} />
          <Text className="ml-2 font-bold text-[15px] text-ink">+{c.dial}</Text>
          <View style={{ width: 1, height: 20, backgroundColor: "rgba(0,0,0,0.10)", marginHorizontal: 10 }} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={c.ex}
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            className="flex-1 font-sans text-[15px] text-ink"
            // @ts-expect-error web-only: remove focus outline (RN Web)
            style={{ paddingVertical: 0, outlineStyle: "none" }}
          />
        </View>
      </View>
    </View>
  );
}
