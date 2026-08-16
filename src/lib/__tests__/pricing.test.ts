/// <reference types="jest" />
import {
  BUYER_FEE_RATE,
  COMMISSION_RATE,
  buyerTotal,
  buyerFee,
  commissionOn,
  sellerNet,
} from "../pricing";

describe("pricing — taux verrouillés", () => {
  it("le frais acheteur est de 2 %", () => {
    expect(BUYER_FEE_RATE).toBe(0.02);
  });
  it("la commission Paylika est de 10 %", () => {
    expect(COMMISSION_RATE).toBe(0.1);
  });
});

describe("buyerTotal — total débité à l'acheteur (prix + 2 %)", () => {
  it("ajoute 2 % sur un prix rond", () => {
    expect(buyerTotal(5000)).toBe(5100);
    expect(buyerTotal(10000)).toBe(10200);
    expect(buyerTotal(1000)).toBe(1020);
  });
  it("arrondit à l'entier le plus proche", () => {
    // 2500 * 1.02 = 2550 (rond) ; 2450 * 1.02 = 2499 (arrondi depuis 2499.0)
    expect(buyerTotal(2500)).toBe(2550);
    expect(buyerTotal(999)).toBe(Math.round(999 * 1.02)); // 1018.98 -> 1019
  });
  it("gère le prix zéro", () => {
    expect(buyerTotal(0)).toBe(0);
  });
});

describe("buyerFee — frais absolu supporté par l'acheteur", () => {
  it("vaut la différence entre le total et le prix", () => {
    expect(buyerFee(5000)).toBe(100);
    expect(buyerFee(10000)).toBe(200);
  });
  it("est cohérent avec buyerTotal", () => {
    for (const p of [0, 500, 1000, 2500, 5000, 12345]) {
      expect(buyerFee(p)).toBe(buyerTotal(p) - p);
    }
  });
});

describe("commissionOn / sellerNet — répartition vendeur", () => {
  it("prélève 10 % arrondi", () => {
    expect(commissionOn(5000)).toBe(500);
    expect(commissionOn(10000)).toBe(1000);
    expect(commissionOn(4990)).toBe(499);
  });
  it("net + commission = montant (invariant clé)", () => {
    for (const amt of [0, 100, 999, 5000, 5001, 12345, 999999]) {
      expect(sellerNet(amt) + commissionOn(amt)).toBe(amt);
    }
  });
  it("le vendeur garde ~90 %", () => {
    expect(sellerNet(5000)).toBe(4500);
    expect(sellerNet(10000)).toBe(9000);
  });
});

describe("scénario complet — vente à 5000 XOF", () => {
  it("acheteur paie 5100, vendeur net 4500, Paylika 500", () => {
    const price = 5000;
    expect(buyerTotal(price)).toBe(5100); // ce que débite UniTech à l'acheteur
    expect(sellerNet(price)).toBe(4500); // ce que touche le vendeur
    expect(commissionOn(price)).toBe(500); // marge Paylika sur le vendeur
  });
});
