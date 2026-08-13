import { View, Text, TextInput, Pressable } from "react-native";
import type { ReactNode } from "react";
import { colors } from "@/theme/colors";

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-1.5 font-semibold text-[12px] text-ink-soft">{children}</Text>
  );
}

/** Labelled text input with optional prefix/suffix. */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  suffix,
  autoFocus,
  secureTextEntry,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  suffix?: string;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View className="flex-row items-center rounded-2xl bg-card border border-ink/[0.1] px-4 py-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          className="flex-1 font-sans text-[15px] text-ink"
          // @ts-expect-error web-only: remove the focus outline (RN Web)
          style={{ paddingVertical: 0, outlineStyle: "none" }}
        />
        {suffix ? (
          <Text className="ml-2 font-medium text-[13px] text-ink-muted">{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Segmented control (single choice). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View className="flex-row rounded-2xl bg-sand p-1" style={{ gap: 4 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              className={`flex-1 items-center rounded-xl py-2.5 ${active ? "bg-card" : ""}`}
              style={
                active
                  ? {
                      shadowColor: "#211B18",
                      shadowOpacity: 0.06,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                    }
                  : undefined
              }
            >
              <Text
                className={`font-semibold text-[13px] ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Selectable chip (used for picking a group). */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${
        active ? "bg-bordeaux-600 border-bordeaux-600" : "bg-card border-ink/10"
      }`}
    >
      <Text
        className={`font-medium text-[13px] ${active ? "text-white" : "text-ink-soft"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
