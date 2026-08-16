import { useEffect, useRef, type ReactNode } from "react";
import { View, Text, Animated, Easing, type DimensionValue } from "react-native";
import { Card, Button } from "./ui";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/theme/colors";

/**
 * Bloc gris animé (shimmer) qui matérialise l'emplacement d'un contenu en cours
 * de chargement — on montre la *forme* de la page au lieu d'un écran vide ou d'un
 * spinner aveugle. C'est le socle des squelettes ci-dessous.
 */
export function Skeleton({
  h = 14,
  w = "100%",
  radius = 8,
  style,
}: {
  h?: number;
  w?: DimensionValue;
  radius?: number;
  style?: any;
}) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { height: h, width: w, borderRadius: radius, backgroundColor: colors.ink + "10", opacity: pulse },
        style,
      ]}
    />
  );
}

/** Squelette d'une carte texte (titre + quelques lignes). */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <Skeleton h={16} w="58%" />
      <View style={{ height: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={{ marginTop: i === 0 ? 0 : 9 }}>
          <Skeleton h={12} w={i === lines - 1 ? "68%" : "100%"} />
        </View>
      ))}
    </Card>
  );
}

/** Liste de cartes-squelettes (offres, abonnés, transactions…). */
export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </>
  );
}

/** Squelette d'une grille de KPI (dashboard, stats). */
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="rounded-2xl border border-ink/[0.07] bg-card p-4"
          style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150 }}
        >
          <Skeleton h={10} w="55%" radius={5} />
          <View style={{ height: 12 }} />
          <Skeleton h={22} w="70%" />
        </View>
      ))}
    </View>
  );
}

/**
 * Erreur de chargement avec bouton « Réessayer ». À utiliser dès qu'un fetch
 * échoue : l'utilisateur n'est jamais bloqué sur un écran mort.
 */
export function ErrorState({
  message,
  onRetry,
  retrying,
  compact,
}: {
  message?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}) {
  return (
    <Card>
      <View className={`items-center ${compact ? "py-2" : "py-4"}`}>
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.bordeaux[600] + "14" }}
        >
          <Icon name="alert" size={22} color={colors.bordeaux[600]} strokeWidth={2} />
        </View>
        <Text className="mt-3 font-display-semi text-[15px] text-ink">Ça n'a pas chargé</Text>
        <Text
          className="mt-1 text-center font-sans text-[12.5px] text-ink-muted"
          style={{ lineHeight: 18, maxWidth: 280 }}
        >
          {message || "Vérifie ta connexion internet et réessaie."}
        </Text>
        {onRetry ? (
          <View className="mt-4" style={{ minWidth: 170 }}>
            <Button
              label={retrying ? "Nouvelle tentative…" : "Réessayer"}
              icon="refresh"
              variant="accent"
              onPress={onRetry}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** État vide illustré (aucune donnée), avec action optionnelle. */
export function EmptyState({
  icon = "inbox",
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <View className="items-center py-5">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-bordeaux-50">
          <Icon name={icon} size={22} color={colors.bordeaux[600]} />
        </View>
        <Text className="mt-3 text-center font-display-semi text-[15px] text-ink">{title}</Text>
        <Text
          className="mt-1 text-center font-sans text-[12.5px] text-ink-muted"
          style={{ lineHeight: 18, maxWidth: 300 }}
        >
          {text}
        </Text>
        {action ? (
          <View className="mt-4" style={{ minWidth: 180 }}>
            {action}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/**
 * Aiguillage standard chargement / erreur / succès pour les écrans branchés sur
 * `useAsync`. Montre le squelette pendant le 1er chargement, l'erreur+retry si
 * échec, sinon le contenu. Les rechargements silencieux (pull-to-refresh)
 * gardent le contenu déjà affiché.
 */
export function AsyncBoundary<T>({
  state,
  skeleton,
  onRetry,
  children,
}: {
  state: { data: T | null; loading: boolean; error: string | null };
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}) {
  if (state.data == null && state.error) {
    return <ErrorState message={state.error} onRetry={onRetry} />;
  }
  if (state.data == null) {
    return <>{skeleton ?? <SkeletonList />}</>;
  }
  return <>{children(state.data)}</>;
}
