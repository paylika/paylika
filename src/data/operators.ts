// Pays & opérateurs pour les RETRAITS (payout). Réutilisé par les Réglages
// (retrait par défaut) et l'écran de retrait.

export type PayOperator = { value: string; label: string };
export type PayCountry = { code: string; label: string; operators: PayOperator[] };

export const PAYOUT_COUNTRIES: PayCountry[] = [
  {
    code: "SN",
    label: "Sénégal",
    operators: [
      { value: "wave", label: "Wave" },
      { value: "orange_money", label: "Orange Money" },
      { value: "free_money", label: "Free / Yas" },
    ],
  },
  {
    code: "CI",
    label: "Côte d'Ivoire",
    operators: [
      { value: "wave", label: "Wave" },
      { value: "orange_money", label: "Orange Money" },
      { value: "mtn_money", label: "MTN" },
      { value: "moov", label: "Moov" },
    ],
  },
  {
    code: "BF",
    label: "Burkina Faso",
    operators: [
      { value: "orange_money", label: "Orange Money" },
      { value: "moov", label: "Moov" },
    ],
  },
  {
    code: "TG",
    label: "Togo",
    operators: [
      { value: "moov", label: "Moov" },
      { value: "togocell", label: "Mixx by Yas" },
    ],
  },
  {
    code: "BJ",
    label: "Bénin",
    operators: [
      { value: "moov", label: "Moov" },
      { value: "mtn_money", label: "MTN" },
    ],
  },
];

export function operatorsFor(code: string): PayOperator[] {
  return (PAYOUT_COUNTRIES.find((c) => c.code === code) ?? PAYOUT_COUNTRIES[0]).operators;
}
