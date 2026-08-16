import { test, expect } from "@playwright/test";

/**
 * Parcours public bout-en-bout : un visiteur venu d'une pub Facebook doit
 * pouvoir (1) comprendre l'offre sur la landing, (2) atteindre la connexion et
 * (3) voir le formulaire de création de compte. C'est le tout début du tunnel
 * d'acquisition — s'il casse, aucune inscription n'entre.
 *
 * NB : on attend le rendu CLIENT (React), pas "networkidle" — le serveur de dev
 * Expo garde un websocket HMR ouvert, donc le réseau n'est jamais « idle ».
 */

const NAV = { waitUntil: "domcontentloaded" as const, timeout: 120_000 };
const VISIBLE = { timeout: 60_000 };

test("la landing charge et vend Paylika (accroche + CTA)", async ({ page }) => {
  await page.goto("/decouvrir", NAV);

  // Accroche principale visible (rendue côté client).
  await expect(page.getByText(/Il est temps de la monétiser/i).first()).toBeVisible(VISIBLE);

  // La marque est présente.
  await expect(page.getByText("Paylika").first()).toBeVisible();

  // Un appel à l'action vers l'inscription existe.
  await expect(page.getByText(/Créer mon compte/i).first()).toBeVisible();
});

test("la page de connexion affiche le formulaire (email + mot de passe + inscription)", async ({
  page,
}) => {
  await page.goto("/login", NAV);

  // Champ email (placeholder stable).
  await expect(page.getByPlaceholder("vous@exemple.com")).toBeVisible(VISIBLE);

  // Champ mot de passe.
  await expect(page.getByText(/Mot de passe/i).first()).toBeVisible();

  // Bascule vers la création de compte.
  await expect(page.getByText(/Créer un compte/i).first()).toBeVisible();
});
