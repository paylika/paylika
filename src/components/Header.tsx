import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useState } from "react";
import { navItems } from "@/data/mock";
import { Avatar, IconButton } from "./ui";
import { Icon } from "./Icon";
import { colors } from "@/theme/colors";

// The official Paylika logo (exact asset provided by the brand).
const LOGO = require("../../assets/logo-trimmed.png");

export function Brand() {
  return (
    <Image
      source={LOGO}
      resizeMode="contain"
      style={{ width: 118, height: 32 }}
      accessibilityLabel="Paylika"
    />
  );
}

export function Header() {
  const [active, setActive] = useState<string>("Dashboard");
  return (
    <View className="bg-card px-5 pt-2 pb-1 border-b border-ink/[0.06]">
      {/* Brand + actions */}
      <View className="flex-row items-center justify-between">
        <Brand />
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <IconButton name="bell" tone="sand" size={40} />
          <Avatar initials="AB" size={40} tone="ink" />
        </View>
      </View>

      {/* Search field */}
      <View className="mt-4 flex-row items-center rounded-2xl bg-paper border border-ink/[0.08] px-4 py-3">
        <Icon name="search" size={18} color={colors.muted} />
        <Text className="ml-3 flex-1 font-sans text-[14px] text-ink-muted">
          Rechercher un abonné, un groupe…
        </Text>
        <View className="rounded-md bg-sand px-2 py-0.5">
          <Text className="font-medium text-[11px] text-ink-muted">⌘K</Text>
        </View>
      </View>

      {/* Underline tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-4"
        contentContainerStyle={{ gap: 22 }}
      >
        {navItems.map((item) => {
          const isActive = item === active;
          return (
            <Pressable key={item} onPress={() => setActive(item)} className="pb-2">
              <Text
                className={`font-semibold text-[14px] ${
                  isActive ? "text-ink" : "text-ink-muted"
                }`}
              >
                {item}
              </Text>
              <View
                style={{
                  height: 2.5,
                  borderRadius: 2,
                  marginTop: 6,
                  backgroundColor: isActive ? colors.bordeaux[600] : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
