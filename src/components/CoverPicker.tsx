import { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Card } from "./ui";
import { Icon } from "./Icon";
import { colors } from "@/theme/colors";
import { uploadCover } from "@/data/queries";

/**
 * Sélecteur d'image de couverture (carrée, optionnelle) pour une offre.
 * Recadrage carré imposé, upload dans le bucket public `covers`, renvoie l'URL.
 * Donne du peps à la page de paiement.
 */
export function CoverPicker({
  value,
  onChange,
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorise l'accès aux photos pour ajouter une image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setUploading(true);
    try {
      const url = await uploadCover(a.uri, a.mimeType);
      onChange(url);
    } catch (e: any) {
      setError(e?.message ?? "Téléversement impossible.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="font-display-semi text-[15px] text-ink">Image de l'offre</Text>
        <Text className="font-sans text-[11px] text-ink-muted">Optionnel · carré</Text>
      </View>
      <Text className="mt-1 font-sans text-[12px] text-ink-muted" style={{ lineHeight: 17 }}>
        {hint ?? "Une image rend ta page de paiement plus vivante et rassurante."}
      </Text>

      <View className="mt-3 flex-row items-center" style={{ gap: 14 }}>
        <Pressable
          onPress={pick}
          className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-sand"
        >
          {uploading ? (
            <ActivityIndicator color={colors.bordeaux[600]} />
          ) : value ? (
            <Image source={{ uri: value }} style={{ width: 80, height: 80 }} resizeMode="cover" />
          ) : (
            <Icon name="camera" size={22} color={colors.muted} />
          )}
        </Pressable>

        <View className="flex-1" style={{ gap: 8 }}>
          <Pressable onPress={pick} className="self-start rounded-full bg-bordeaux-600 px-4 py-2">
            <Text className="font-semibold text-[13px] text-white">
              {value ? "Changer l'image" : "Ajouter une image"}
            </Text>
          </Pressable>
          {value ? (
            <Pressable onPress={() => onChange(null)} className="self-start">
              <Text className="font-semibold text-[12px] text-ink-muted">Retirer l'image</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? <Text className="mt-2 font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}
    </Card>
  );
}
