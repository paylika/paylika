/**
 * Mock data for the paylika dashboard.
 * Replaced later by real data from the Telegram bot / Supabase layer.
 */

export type Renewal = {
  time: string;
  title: string;
  subtitle: string;
  tone: "normal" | "due";
};

export const renewals: Renewal[] = [
  {
    time: "08:00",
    title: "Crypto Signals VIP",
    subtitle: "12 abonnements à renouveler",
    tone: "normal",
  },
  {
    time: "10:00",
    title: "Fitness Club Premium",
    subtitle: "Accès salle — 8 membres",
    tone: "normal",
  },
  {
    time: "11:30",
    title: "Relance — John Diallo",
    subtitle: "Abonnement expiré hier",
    tone: "due",
  },
  {
    time: "14:00",
    title: "Yoga Studio",
    subtitle: "3 nouveaux abonnés",
    tone: "normal",
  },
];

export type Stat = {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  positive: boolean;
  caption?: string;
};

export const stats: Stat[] = [
  {
    label: "Membres actifs",
    value: "1 842",
    delta: "+3,1%",
    positive: true,
    caption: "ce mois",
  },
  {
    label: "Revenus mensuels",
    value: "4,2M",
    unit: "FCFA",
    delta: "+8,4%",
    positive: true,
    caption: "ce mois",
  },
];

export const smallStats: Stat[] = [
  { label: "Total abonnés", value: "2 470", delta: "+3,1%", positive: true },
  { label: "Taux de churn", value: "4,6%", delta: "-1,4%", positive: true },
];

/** Access status dot-grid. */
export type AccessDot = "active" | "expiring" | "off";
export const accessGrid: AccessDot[] = (() => {
  const pattern: AccessDot[] = [];
  const weights: AccessDot[] = [
    "active",
    "active",
    "off",
    "expiring",
    "active",
    "off",
    "active",
    "expiring",
  ];
  for (let i = 0; i < 40; i++) pattern.push(weights[i % weights.length]);
  return pattern;
})();

export type Member = { name: string; role: string; initials: string };

export const members: Member[] = [
  { name: "Aïssatou Ba", role: "Crypto VIP", initials: "AB" },
  { name: "Moussa Diop", role: "Fitness Club", initials: "MD" },
  { name: "John Keïta", role: "Trading Room", initials: "JK" },
  { name: "Fatou Sow", role: "Yoga Studio", initials: "FS" },
  { name: "Serigne War", role: "Crypto VIP", initials: "SW" },
];

export const spotlight = {
  name: "Elisabeth Smith",
  role: "Abonnée Premium · Crypto VIP",
  tag: "Fidèle depuis 8 mois",
};

/** Revenue-growth bars. */
export type Bar = { label: string; value: number; highlight?: boolean };
export const revenueBars: Bar[] = [
  { label: "Mar", value: 47 },
  { label: "Avr", value: 71, highlight: true },
  { label: "Mai", value: 33 },
  { label: "Jun", value: 51 },
  { label: "Jui", value: 42 },
  { label: "Aoû", value: 21 },
];

export const navItems = [
  "Dashboard",
  "Abonnés",
  "Groupes",
  "Paiements",
  "Réglages",
] as const;
