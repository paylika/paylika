import { useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Button, Eyebrow } from "@/components/ui";
import { Input, Chip, FieldLabel } from "@/components/form";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAuth } from "@/lib/auth";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  useAsync,
  fetchGroups,
  createOffer,
  uploadContent,
  uploadCover,
  PERIODICITIES,
  DELIVERY_TYPES,
  type DeliveryType,
} from "@/data/queries";

const NEW = "__new__";

type TierForm = { days: number; price: string; compare: string };

function TierCard({
  index,
  tier,
  onChange,
  onRemove,
  removable,
}: {
  index: number;
  tier: TierForm;
  onChange: (t: TierForm) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Eyebrow>{index === 0 ? "Formule principale" : `Formule ${index + 1} (optionnelle)`}</Eyebrow>
        {removable ? (
          <Pressable onPress={onRemove} className="h-7 w-7 items-center justify-center rounded-full bg-bordeaux-50">
            <Icon name="close" size={14} color={colors.bordeaux[600]} />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3" style={{ gap: 12 }}>
        <View>
          <FieldLabel>Périodicité</FieldLabel>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {PERIODICITIES.map((p) => (
              <Chip
                key={p.days}
                label={p.label}
                active={tier.days === p.days}
                onPress={() => onChange({ ...tier, days: p.days })}
              />
            ))}
          </View>
        </View>
        <View className="flex-row" style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix"
              value={tier.price}
              onChangeText={(v) => onChange({ ...tier, price: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="10000"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Prix barré (option)"
              value={tier.compare}
              onChangeText={(v) => onChange({ ...tier, compare: v })}
              keyboardType="numeric"
              suffix="XOF"
              placeholder="15000"
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function NouvelleOffreScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const onboarding = first === "1";
  const { data: groups, loading: groupsLoading } = useAsync(fetchGroups);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("telegram");
  const [groupChoice, setGroupChoice] = useState<string>(NEW);
  const [name, setName] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState("");
  const [linkMode, setLinkMode] = useState<"url" | "file">("url");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tiers, setTiers] = useState<TierForm[]>([{ days: 30, price: "", compare: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page de vente (offres non-Telegram)
  const [cover, setCover] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [benefits, setBenefits] = useState("");
  const [description, setDescription] = useState("");

  async function pickCover() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l'accès aux photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setCoverUploading(true);
    try {
      const url = await uploadCover(res.assets[0].uri, res.assets[0].mimeType);
      setCover(url);
    } catch (e: any) {
      setError(e?.message ?? "Téléversement impossible.");
    } finally {
      setCoverUploading(false);
    }
  }

  async function pickFile() {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setUploading(true);
      const target = await uploadContent(a.uri, a.name, a.mimeType);
      setDeliveryTarget(target);
      setFileName(a.name);
    } catch (e: any) {
      setError(e?.message ?? "Téléversement impossible.");
    } finally {
      setUploading(false);
    }
  }

  const isTelegram = deliveryType === "telegram";
  const needsTarget = deliveryType === "whatsapp" || deliveryType === "link";
  // Telegram : on peut relier un groupe déjà connecté ; sinon on nomme l'offre.
  const usingExisting = isTelegram && groupChoice !== NEW;
  const selectedGroupName = groups?.find((g) => g.id === groupChoice)?.name ?? "";
  const offerName = usingExisting ? selectedGroupName : name.trim();

  const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
  // Seul Telegram gère la récurrence ; les autres = paiement unique (1 prix).
  const validTiers = (isTelegram ? tiers : tiers.slice(0, 1)).filter((t) => num(t.price) > 0);
  const valid =
    offerName.length > 0 &&
    validTiers.length > 0 &&
    (needsTarget ? deliveryTarget.trim().length > 0 : true);


  function updateTier(i: number, t: TierForm) {
    setTiers((prev) => prev.map((x, idx) => (idx === i ? t : x)));
  }
  function addTier() {
    if (tiers.length >= 3) return;
    // pick a periodicity not already used
    const used = new Set(tiers.map((t) => t.days));
    const next = PERIODICITIES.find((p) => !used.has(p.days))?.days ?? 30;
    setTiers((prev) => [...prev, { days: next, price: "", compare: "" }]);
  }
  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createOffer({
        offerName: offerName || "Offre",
        currency: "XOF",
        deliveryType,
        deliveryTarget: needsTarget ? deliveryTarget.trim() : null,
        salesPage: isTelegram
          ? null
          : {
              cover,
              headline: headline.trim(),
              subheadline: subheadline.trim(),
              benefits: benefits
                .split("\n")
                .map((b) => b.trim())
                .filter(Boolean),
              description: description.trim(),
            },
        groupId: usingExisting ? groupChoice : undefined,
        newGroupName: usingExisting ? undefined : offerName,
        tiers: validTiers.map((t) => ({
          intervalDays: isTelegram ? t.days : 0, // 0 = paiement unique
          price: num(t.price),
          comparePrice: num(t.compare) > 0 ? num(t.compare) : null,
        })),
      });
      router.replace("/offres");
    } catch (e: any) {
      setError(e?.message ?? "Création impossible.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <PageTitle
        eyebrow={onboarding ? "Bienvenue 👋" : "Vendre · Nouvelle offre"}
        title={onboarding ? "Créez votre première offre" : "Créer une offre"}
        subtitle={
          onboarding
            ? "En 1 minute : nommez votre offre, choisissez le groupe, fixez vos prix."
            : "Nom, groupe et jusqu'à 3 formules (périodicités au choix)."
        }
      />

      {/* Type de livraison */}
      <Card>
        <View style={{ gap: 12 }}>
          <View>
            <FieldLabel>Que reçoit l'acheteur après paiement ?</FieldLabel>
            <View className="mt-1 flex-row flex-wrap" style={{ gap: 8 }}>
              {DELIVERY_TYPES.map((d) => (
                <Chip
                  key={d.value}
                  label={d.label}
                  active={deliveryType === d.value}
                  onPress={() => setDeliveryType(d.value)}
                />
              ))}
            </View>
            <Text className="mt-2 font-sans text-[11px] text-ink-muted">
              {DELIVERY_TYPES.find((d) => d.value === deliveryType)?.hint}
            </Text>
          </View>
        </View>
      </Card>

      {/* Cible / nom selon le type */}
      <Card>
        <View style={{ gap: 16 }}>
          {isTelegram ? (
            <View>
              <FieldLabel>Groupe / canal Telegram</FieldLabel>
              <Text className="mb-2 font-sans text-[11px] text-ink-muted">
                Reliez un groupe déjà connecté, ou nommez-en un nouveau.
              </Text>
              {groupsLoading ? (
                <ActivityIndicator color={colors.bordeaux[600]} />
              ) : (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {(groups ?? []).map((g) => (
                    <Chip key={g.id} label={g.name} active={groupChoice === g.id} onPress={() => setGroupChoice(g.id)} />
                  ))}
                  <Chip label="+ Nouveau" active={groupChoice === NEW} onPress={() => setGroupChoice(NEW)} />
                </View>
              )}
            </View>
          ) : null}

          {!usingExisting ? (
            <Input
              label="Nom de l'offre"
              value={name}
              onChangeText={setName}
              placeholder="Ex. Accès VIP Crypto"
            />
          ) : null}

          {deliveryType === "whatsapp" ? (
            <View>
              <Input
                label="Lien d'invitation du groupe WhatsApp"
                value={deliveryTarget}
                onChangeText={setDeliveryTarget}
                placeholder="https://chat.whatsapp.com/…"
              />
              <Text className="mt-1.5 font-sans text-[11px] text-ink-muted">
                Livré après paiement via un bouton (jamais affiché en clair).
              </Text>
            </View>
          ) : deliveryType === "link" ? (
            <View style={{ gap: 12 }}>
              <View>
                <FieldLabel>Que livrer ?</FieldLabel>
                <View className="mt-1 flex-row" style={{ gap: 8 }}>
                  <Chip
                    label="Un lien (URL)"
                    active={linkMode === "url"}
                    onPress={() => {
                      setLinkMode("url");
                      setDeliveryTarget("");
                      setFileName("");
                    }}
                  />
                  <Chip
                    label="Un fichier"
                    active={linkMode === "file"}
                    onPress={() => {
                      setLinkMode("file");
                      setDeliveryTarget("");
                      setFileName("");
                    }}
                  />
                </View>
              </View>

              {linkMode === "url" ? (
                <Input
                  label="Lien à livrer (URL)"
                  value={deliveryTarget}
                  onChangeText={setDeliveryTarget}
                  placeholder="https://… (formation, page privée)"
                />
              ) : uploading ? (
                <View className="flex-row items-center rounded-2xl bg-sand px-4 py-3" style={{ gap: 10 }}>
                  <ActivityIndicator color={colors.bordeaux[600]} />
                  <Text className="font-sans text-[13px] text-ink-muted">Téléversement…</Text>
                </View>
              ) : fileName ? (
                <Pressable
                  onPress={pickFile}
                  className="flex-row items-center justify-between rounded-2xl bg-sand px-4 py-3"
                >
                  <View className="flex-1 flex-row items-center pr-2" style={{ gap: 8 }}>
                    <Icon name="check" size={16} color={colors.forest} strokeWidth={2.4} />
                    <Text numberOfLines={1} className="flex-1 font-semibold text-[13px] text-ink">
                      {fileName}
                    </Text>
                  </View>
                  <Text className="font-semibold text-[12px] text-bordeaux-700">Changer</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={pickFile}
                  className="flex-row items-center justify-center rounded-2xl border border-dashed border-ink/20 py-4"
                >
                  <Icon name="plus" size={16} color={colors.bordeaux[600]} strokeWidth={2} />
                  <Text className="ml-2 font-semibold text-[13px] text-bordeaux-700">Téléverser un fichier</Text>
                </Pressable>
              )}

              <Text className="font-sans text-[11px] text-ink-muted">
                {linkMode === "file"
                  ? "Le fichier reste privé : livré via un lien de téléchargement temporaire après paiement."
                  : "Ce lien reste secret : livré uniquement après paiement, via un bouton."}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Prix : récurrence (Telegram) OU paiement unique (autres) */}
      {isTelegram ? (
        <>
          {tiers.map((t, i) => (
            <TierCard
              key={i}
              index={i}
              tier={t}
              onChange={(nt) => updateTier(i, nt)}
              onRemove={() => removeTier(i)}
              removable={i > 0}
            />
          ))}
          {tiers.length < 3 ? (
            <Pressable
              onPress={addTier}
              className="flex-row items-center justify-center rounded-2xl border border-dashed border-ink/20 py-3.5"
            >
              <Icon name="plus" size={16} color={colors.bordeaux[600]} strokeWidth={2} />
              <Text className="ml-2 font-semibold text-[13px] text-bordeaux-700">Ajouter une formule</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Card>
          <Eyebrow>Prix · paiement unique</Eyebrow>
          <Text className="mt-1 font-sans text-[11px] text-ink-muted">
            Pas de récurrence sur ce mode (le retrait automatique n'existe que sur Telegram).
          </Text>
          <View className="mt-3 flex-row" style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Prix"
                value={tiers[0].price}
                onChangeText={(v) => updateTier(0, { ...tiers[0], price: v })}
                keyboardType="numeric"
                suffix="XOF"
                placeholder="5000"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Prix barré (option)"
                value={tiers[0].compare}
                onChangeText={(v) => updateTier(0, { ...tiers[0], compare: v })}
                keyboardType="numeric"
                suffix="XOF"
                placeholder="8000"
              />
            </View>
          </View>
        </Card>
      )}

      {/* Page de vente (offres non-Telegram) — réservé admin */}
      {!isTelegram && isAdmin ? (
        <Card>
          <Eyebrow>Page de vente (optionnel)</Eyebrow>
          <Text className="mt-1 font-sans text-[11px] text-ink-muted">
            Ce que voient les visiteurs avant de payer — idéal pour les pubs. Laisse vide pour une page minimale.
          </Text>
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
            <Input
              label="Accroche (titre)"
              value={headline}
              onChangeText={setHeadline}
              placeholder="Ex. Maîtrise ChatGPT en 7 jours"
            />
            <Input
              label="Sous-titre (promesse)"
              value={subheadline}
              onChangeText={setSubheadline}
              placeholder="Le bénéfice principal en une phrase"
            />
            <Input
              label="Bénéfices (un par ligne)"
              value={benefits}
              onChangeText={setBenefits}
              placeholder={"Accès à vie\n30 prompts prêts à l'emploi\nMises à jour offertes"}
              multiline
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Décris ton produit et pour qui c'est…"
              multiline
            />
          </View>
        </Card>
      ) : null}

      {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

      <View className="flex-row" style={{ gap: 10 }}>
        {!onboarding ? (
          <View style={{ flex: 1 }}>
            <Button label="Annuler" variant="outline" onPress={() => router.back()} />
          </View>
        ) : null}
        <View style={{ flex: 1.4 }}>
          <Button
            label={saving ? "Création…" : "Créer l'offre"}
            icon="check"
            variant="accent"
            onPress={save}
          />
        </View>
      </View>

      {!valid ? (
        <Text className="text-center font-sans text-[11px] text-ink-muted">
          Renseignez un nom, un groupe et au moins un prix.
        </Text>
      ) : null}
    </Screen>
  );
}
