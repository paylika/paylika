import { View, Text, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/theme/colors";

/** Rounded surface card. `tone` switches light (paper) vs. dark (night) styles. */
export function Card({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const base =
    tone === "dark" ? "bg-night" : "bg-card border border-ink/[0.06]";
  return (
    <View
      className={`rounded-[28px] p-5 ${base} ${className}`}
      style={
        tone === "light"
          ? {
              shadowColor: "#211B18",
              shadowOpacity: 0.05,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }
          : undefined
      }
    >
      {children}
    </View>
  );
}

/** A little up/down triangle drawn in SVG — no emoji. */
function Triangle({ up, color }: { up: boolean; color: string }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 10 10">
      <Path
        d={up ? "M5 1 9 8 1 8 Z" : "M5 9 1 2 9 2 Z"}
        fill={color}
      />
    </Svg>
  );
}

/** Delta indicator: triangle + value, no colored pill. */
export function Delta({ text, positive }: { text: string; positive: boolean }) {
  const color = positive ? colors.forest : colors.clay;
  const up = positive;
  return (
    <View className="flex-row items-center">
      <Triangle up={up} color={color} />
      <Text className="ml-1 font-semibold text-[12px]" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

/** Monogram avatar (initials). Photos are avoided by design. */
export function Avatar({
  initials,
  size = 38,
  tone = "bordeaux",
  ring = false,
}: {
  initials: string;
  size?: number;
  tone?: "bordeaux" | "ink" | "sand";
  ring?: boolean;
}) {
  const bg =
    tone === "ink" ? "bg-night" : tone === "sand" ? "bg-sand" : "bg-bordeaux-600";
  const fg = tone === "sand" ? "text-ink" : "text-white";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring ? 2 : 0,
        borderColor: colors.card,
      }}
      className={`items-center justify-center ${bg}`}
    >
      <Text
        className={`font-semibold ${fg}`}
        style={{ fontSize: size * 0.34, letterSpacing: 0.3 }}
      >
        {initials}
      </Text>
    </View>
  );
}

/** Pill/rounded button with an optional leading SVG icon. */
export function Button({
  label,
  icon,
  variant = "dark",
  onPress,
}: {
  label: string;
  icon?: IconName;
  variant?: "accent" | "dark" | "outline";
  onPress?: () => void;
}) {
  const box =
    variant === "accent"
      ? "bg-bordeaux-600"
      : variant === "outline"
      ? "bg-card border border-ink/10"
      : "bg-night";
  const fg = variant === "outline" ? colors.ink : colors.white;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-2xl px-5 py-3.5 ${box}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {icon ? (
        <View className="mr-2">
          <Icon name={icon} size={17} color={fg} strokeWidth={2} />
        </View>
      ) : null}
      <Text
        className="font-semibold text-[14px]"
        style={{ color: fg, letterSpacing: 0.2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Small round icon button (header actions, card affordances). */
export function IconButton({
  name,
  tone = "sand",
  size = 40,
  color,
}: {
  name: IconName;
  tone?: "sand" | "night" | "outline" | "glass";
  size?: number;
  color?: string;
}) {
  const box =
    tone === "night"
      ? "bg-night"
      : tone === "outline"
      ? "bg-card border border-ink/10"
      : tone === "glass"
      ? "bg-white/10"
      : "bg-sand";
  const fg = color ?? (tone === "night" || tone === "glass" ? colors.white : colors.ink);
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center ${box}`}
    >
      <Icon name={name} size={size * 0.46} color={fg} />
    </View>
  );
}

/** Uppercase small section label. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      className="font-semibold text-[11px] text-ink-muted uppercase"
      style={{ letterSpacing: 1.2 }}
    >
      {children}
    </Text>
  );
}

/** A soft rounded tag/chip. */
export function Tag({
  children,
  tone = "sand",
}: {
  children: ReactNode;
  tone?: "sand" | "bordeaux" | "night";
}) {
  const box =
    tone === "bordeaux"
      ? "bg-bordeaux-50"
      : tone === "night"
      ? "bg-white/10"
      : "bg-sand";
  const fg =
    tone === "bordeaux"
      ? "text-bordeaux-700"
      : tone === "night"
      ? "text-white"
      : "text-ink-soft";
  return (
    <View className={`self-start rounded-full px-3 py-1 ${box}`}>
      <Text className={`font-medium text-[12px] ${fg}`}>{children}</Text>
    </View>
  );
}
