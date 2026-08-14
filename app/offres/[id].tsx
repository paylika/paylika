import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image, Platform, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Tag, Eyebrow } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAuth } from "@/lib/auth";
import { fetchOffre, updateOffer, updateSalesPage, uploadCover, PERIODICITIES } from "@/data/queries";
import { FORMATION_IA_TEMPLATE } from "@/data/salesTemplates";

const APP_URL = "https://paylika.paylika-app.workers.dev";

export default function EditOffreScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(30);
  const [recurring, setRecurring] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page de vente (admin uniquement)
  const [cover, setCover] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [benefits, setBenefits] = useState("");
  const [description, setDescription] = useState("");
  const [guarantee, setGuarantee] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const o = await fetchOffre(String(id));
        if (o) {
          setName(o.name);
          setPrice(String(o.price));
          setDays(o.interval_days);
          setGroupId(o.groupId);
          setGroupName(o.groupName);
          setRecurring(o.deliveryType === "telegram");
          const s = o.salesPage ?? {};
          setCover(s.cover ?? null);
          setHeadline(s.headline ?? "");
          setSubheadline(s.subheadline ?? "");
          setBenefits((s.benefits ?? []).join("\n"));
          setDescription(s.description ?? "");
          setGuarantee(s.guarantee ?? "");
        } else {
          setError("Offre introuvable.");
        }
      } catch (e: any) {
        setError(e?.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const priceNum = parseInt(price.replace(/\D/g, ""), 10) || 0;
  const valid = name.trim().length > 0 && priceNum > 0;
  const showSalesEditor = isAdmin && !recurring; // réservé à l'admin, offres non-Telegram

  function loadTemplate() {
    const t = FORMATION_IA_TEMPLATE;
    setHeadline(t.headline ?? "");
    setSubheadline(t.subheadline ?? "");
    setBenefits((t.benefits ?? []).join("\n"));
    setDescription(t.description ?? "");
    setGuarantee(t.guarantee ?? "");
  }

  async function pickCover() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Autorisez l'accès aux photos.");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setCoverUploading(true);
    try {
      setCover(await uploadCover(res.assets[0].uri, res.assets[0].mimeType));
    } catch (e: any) {
      setError(e?.message ?? "Téléversement impossible.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateOffer(String(id), { name: name.trim(), price: priceNum, intervalDays: days });
      if (showSalesEditor) {
        await updateSalesPage(groupId, {
          cover,
          headline: headline.trim(),
          subheadline: subheadline.trim(),
          benefits: benefits.split("\n").map((b) => b.trim()).filter(Boolean),
          description: description.trim(),
          guarantee: guarantee.trim(),
        });
      }
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible");
      setSaving(false);
    }
  }

  function preview() {
    const url = `${APP_URL}/p/${id}`;
    if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
    else Linking.openURL(url);
  }

  return (
    <Screen>
      <PageTitle eyebrow="Vendre · Modifier" title="Modifier l'offre" />

      {loading ? (
        <Card>
          <View className="items-center py-6">
            <ActivityIndicator color={colors.bordeaux[600]} />
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ gap: 16 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text className="font-semibold text-[12px] text-ink-soft">Groupe :</Text>
                <Tag tone="bordeaux">{groupName}</Tag>
              </View>
              <Input label="Nom de l'offre" value={name} onChangeText={setName} />
              <Input label="Prix" value={price} onChangeText={setPrice} keyboardType="numeric" suffix="XOF" />
              {recurring ? (
                <View>
                  <FieldLabel>Périodicité</FieldLabel>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {PERIODICITIES.map((p) => (
                      <Chip key={p.days} label={p.label} active={days === p.days} onPress={() => setDays(p.days)} />
                    ))}
                  </View>
                </View>
              ) : (
                <Text className="font-sans text-[12px] text-ink-muted">
                  Paiement unique (pas de récurrence sur ce mode de livraison).
                </Text>
              )}
            </View>
          </Card>

          {/* Page de vente — RÉSERVÉ ADMIN */}
          {showSalesEditor ? (
            <Card>
              <View className="flex-row items-center justify-between">
                <Eyebrow>Page de vente</Eyebrow>
                <Pressable onPress={loadTemplate} className="rounded-full bg-bordeaux-50 px-3 py-1.5">
                  <Text className="font-semibold text-[11px] text-bordeaux-700">Charger le modèle optimisé</Text>
                </Pressable>
              </View>
              <View className="mt-3" style={{ gap: 12 }}>
                {cover ? (
                  <Pressable onPress={pickCover}>
                    <Image source={{ uri: cover }} style={{ width: "100%", height: 150, borderRadius: 16 }} resizeMode="cover" />
                    <Text className="mt-1 text-center font-semibold text-[12px] text-bordeaux-700">Changer l'image</Text>
                  </Pressable>
                ) : coverUploading ? (
                  <View className="items-center rounded-2xl bg-sand py-6">
                    <ActivityIndicator color={colors.bordeaux[600]} />
                  </View>
                ) : (
                  <Pressable
                    onPress={pickCover}
                    className="flex-row items-center justify-center rounded-2xl border border-dashed border-ink/20 py-5"
                  >
                    <Icon name="plus" size={16} color={colors.bordeaux[600]} strokeWidth={2} />
                    <Text className="ml-2 font-semibold text-[13px] text-bordeaux-700">Image de couverture</Text>
                  </Pressable>
                )}
                <Input label="Accroche (titre)" value={headline} onChangeText={setHeadline} />
                <Input label="Sous-titre (promesse)" value={subheadline} onChangeText={setSubheadline} multiline />
                <Input label="Bénéfices (un par ligne)" value={benefits} onChangeText={setBenefits} multiline />
                <Input label="Description" value={description} onChangeText={setDescription} multiline />
                <Input label="Garantie / réassurance" value={guarantee} onChangeText={setGuarantee} multiline />
                <Pressable onPress={preview} className="flex-row items-center justify-center rounded-2xl bg-night py-3">
                  <Icon name="arrow-up-right" size={15} color={colors.white} />
                  <Text className="ml-1.5 font-semibold text-[13px] text-white">Voir la page de vente</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

          <View className="flex-row" style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="outline" onPress={() => router.back()} />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                label={saving ? "Enregistrement…" : "Enregistrer"}
                icon="check"
                variant="accent"
                onPress={save}
              />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
