import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Screen, PageTitle } from "@/components/Screen";
import { Card, Tag, Avatar, Button, Eyebrow } from "@/components/ui";
import { Input, Segmented, FieldLabel } from "@/components/form";
import { Icon, type IconName } from "@/components/Icon";
import { colors } from "@/theme/colors";
import { useAuth, signOut } from "@/lib/auth";
import {
  fetchProfile,
  saveProfile,
  uploadAvatar,
  deleteAccount,
} from "@/data/queries";
import { adminWhoami } from "@/lib/admin";

function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center py-3.5 ${last ? "" : "border-b border-ink/[0.06]"}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-bordeaux-50">
        <Icon name={icon} size={17} color={colors.bordeaux[600]} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-[14px] text-ink">{title}</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-ink-muted">{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function ReglagesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const email = session?.user?.email ?? "—";

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"wave" | "orange_money" | "free_money">("wave");
  const [payoutNumber, setPayoutNumber] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    adminWhoami()
      .then((w) => setIsAdmin(w.isAdmin))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        setFullName(p.fullName);
        setBusinessName(p.businessName);
        setAvatarUrl(p.avatarUrl);
        setPayoutMethod((p.payoutMethod as any) || "wave");
        setPayoutNumber(p.payoutNumber);
      } catch (e: any) {
        setError(e?.message ?? "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials = (fullName.trim()[0] ?? email[0] ?? "P").toUpperCase();

  async function pickAvatar() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l'accès aux photos pour changer votre image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      const url = await uploadAvatar(asset.uri, asset.mimeType);
      setAvatarUrl(url);
      await saveProfile({ fullName, businessName, avatarUrl: url, payoutMethod, payoutNumber });
    } catch (e: any) {
      setError(e?.message ?? "Téléversement impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile({ fullName, businessName, payoutMethod, payoutNumber });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e: any) {
      setError(e?.message ?? "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  async function removeAccount() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      router.replace("/login");
    } catch (e: any) {
      setError(e?.message ?? "Suppression impossible.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View className="items-center py-16">
          <ActivityIndicator color={colors.bordeaux[600]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageTitle eyebrow="Compte" title="Mon profil" subtitle="Votre identité, votre photo et vos retraits." />

      {/* Identité + photo */}
      <Card>
        <View className="items-center">
          <Pressable onPress={pickAvatar} className="items-center">
            <View>
              <Avatar initials={initials} uri={avatarUrl} size={84} tone="bordeaux" />
              <View
                className="absolute h-8 w-8 items-center justify-center rounded-full bg-bordeaux-600"
                style={{ right: -2, bottom: -2, borderWidth: 2, borderColor: colors.card }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Icon name="camera" size={15} color={colors.white} />
                )}
              </View>
            </View>
            <Text className="mt-2 font-semibold text-[12px] text-bordeaux-700">
              {uploading ? "Envoi…" : "Changer la photo"}
            </Text>
          </Pressable>
        </View>

        <View className="mt-5" style={{ gap: 14 }}>
          <Input label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Ex. Awa Ndiaye" />
          <Input
            label="Nom de l'activité (optionnel)"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Ex. Crypto Signals VIP"
          />
          <View>
            <FieldLabel>Email</FieldLabel>
            <View className="rounded-2xl bg-sand px-4 py-3">
              <Text className="font-sans text-[14px] text-ink-muted">{email}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Moyen de retrait par défaut */}
      <Card>
        <Eyebrow>Retrait par défaut</Eyebrow>
        <Text className="mt-1 font-sans text-[12px] text-ink-muted">
          Pré-rempli quand vous retirez votre argent.
        </Text>
        <View className="mt-4" style={{ gap: 14 }}>
          <Segmented
            label="Moyen"
            value={payoutMethod}
            onChange={setPayoutMethod}
            options={[
              { label: "Wave", value: "wave" },
              { label: "Orange", value: "orange_money" },
              { label: "Free", value: "free_money" },
            ]}
          />
          <Input
            label="Numéro de réception"
            value={payoutNumber}
            onChangeText={setPayoutNumber}
            keyboardType="numeric"
            placeholder="77 000 00 00"
          />
        </View>
      </Card>

      {error ? <Text className="font-sans text-[12px] text-bordeaux-700">{error}</Text> : null}

      <Button
        label={saving ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        icon="check"
        variant="accent"
        onPress={save}
      />

      {/* Raccourcis */}
      <Card>
        <LinkRow
          icon="send"
          title="Bot Telegram & groupes"
          subtitle="Connecter et relier vos groupes"
          onPress={() => router.push("/acces" as any)}
        />
        <LinkRow
          icon="wallet"
          title="Argent & retraits"
          subtitle="Solde et historique"
          onPress={() => router.push("/argent" as any)}
          last
        />
      </Card>

      {isAdmin ? (
        <Pressable
          onPress={() => router.push("/admin" as any)}
          className="flex-row items-center rounded-3xl bg-night p-4"
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-bordeaux-600">
            <Icon name="chart" size={17} color={colors.white} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-display-semi text-[14px] text-white">Admin Paylika</Text>
            <Text className="mt-0.5 font-sans text-[12px] text-white/60">
              Pilotage plateforme : propriétaires, revenus, accès
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.white} />
        </Pressable>
      ) : null}

      <Button label="Se déconnecter" icon="close" variant="outline" onPress={logout} />

      {/* Zone dangereuse */}
      <Card>
        <Eyebrow>Zone sensible</Eyebrow>
        {!confirmDelete ? (
          <>
            <Text className="mt-2 font-sans text-[13px] text-ink-muted">
              Supprimer votre compte efface définitivement vos offres, abonnés, paiements et données. Irréversible.
            </Text>
            <Pressable
              onPress={() => setConfirmDelete(true)}
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-bordeaux-600 py-3"
            >
              <Icon name="trash" size={16} color={colors.bordeaux[600]} />
              <Text className="ml-2 font-semibold text-[13px] text-bordeaux-700">
                Supprimer mon compte
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mt-2 font-semibold text-[13px] text-ink">
              Confirmer la suppression définitive de votre compte ?
            </Text>
            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="Annuler" variant="outline" onPress={() => setConfirmDelete(false)} />
              </View>
              <Pressable
                onPress={removeAccount}
                disabled={deleting}
                style={{ flex: 1 }}
                className="flex-row items-center justify-center rounded-full bg-bordeaux-600 py-3"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text className="font-semibold text-[13px] text-white">Oui, supprimer</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}
