/**
 * Source unique de la logique d'argent Paylika (aucune dépendance → testable).
 *
 * Règles métier :
 *  - L'acheteur paie un frais forfaitaire de 2 % en plus du prix vendeur.
 *  - Paylika prélève une commission de 10 % sur ce que touche le vendeur.
 *  - Les retraits sont gratuits pour le vendeur.
 *
 * Ces constantes DOIVENT rester synchronisées avec les Edge Functions Deno
 * (supabase/functions/unitech-create) qui, elles, ne peuvent pas importer ce
 * module. Les tests unitaires (src/lib/__tests__/pricing.test.ts) verrouillent
 * ces valeurs pour éviter toute dérive silencieuse.
 */

/** Frais forfaitaire ajouté à la charge de l'acheteur (2 %). */
export const BUYER_FEE_RATE = 0.02;

/** Commission Paylika prélevée sur le vendeur (10 %). */
export const COMMISSION_RATE = 0.1;

/** Montant total réellement débité à l'acheteur (prix vendeur + 2 %), arrondi. */
export function buyerTotal(sellerPrice: number): number {
  return Math.round(sellerPrice * (1 + BUYER_FEE_RATE));
}

/** Frais supporté par l'acheteur, en valeur absolue. */
export function buyerFee(sellerPrice: number): number {
  return buyerTotal(sellerPrice) - Math.round(sellerPrice);
}

/** Commission Paylika sur un encaissement, arrondie. */
export function commissionOn(amount: number): number {
  return Math.round(amount * COMMISSION_RATE);
}

/** Ce que garde le vendeur après commission (net). */
export function sellerNet(amount: number): number {
  return amount - commissionOn(amount);
}
