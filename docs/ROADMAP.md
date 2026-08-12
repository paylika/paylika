# Paylika — Référence produit & roadmap

> Dernière mise à jour : 2026-08-12. Document de référence pour ne pas reperdre le contexte.

## 1. En une phrase

**Paylika = la caisse automatique des vendeurs de groupes Telegram payants en Afrique francophone.**
Un vendeur crée une offre, partage un lien, encaisse en mobile money, et l'accès au groupe se gère tout seul (ajout au paiement, kick à l'expiration).

## 2. Wedge (champ d'application n°1)

**Groupes/canaux Telegram payants** : tipsters (pronostics sportifs), signaux crypto/forex, formateurs, coaching, communautés VIP.
- Douleur max : ils gèrent aujourd'hui 100–1000 abonnés **à la main** (Wave/OM + carnet), ajouts et kicks manuels.
- Volume max + récurrence mensuelle.
- **Salles de sport = phase 2** (contrôle d'accès physique + QR, produit différent). Pas le wedge.

## 3. Modèle économique

- **Commission de 10 % sur chaque paiement** encaissé.
- **Décaissement (retrait) GRATUIT** pour le proprio.
- Implication structurelle : **l'argent transite par Paylika** (on encaisse → on reverse moins 10 %). Paylika n'est pas un simple tableur de suivi, c'est un **paywall + caisse**.

## 4. Principe clé

- **App = 100 % côté proprio.** L'abonné n'installe rien : il paie via un **lien** et interagit avec le **bot Telegram**.
- **Connexion bot simple et rapide** : ajouter `@PaylikaBot` comme admin du groupe (droits : inviter via lien + bannir). Tout groupe Telegram accepté.

## 5. Le moteur (kick-in / kick-out)

1. Abonné paie (mobile money / carte).
2. Paylika crée l'abonnement → le bot **ajoute** l'abonné (lien à usage unique ou approbation de demande d'adhésion).
3. Rappels **J-3 / J-1** avant échéance.
4. À l'expiration sans renouvellement → le bot **kick** l'abonné (il peut re-payer pour revenir).

## 6. Structure de l'app (validée)

3 piliers : **Vendre · Gérer · Encaisser**. Objet central = **l'Offre (paywall)**.

| Onglet | Contenu |
|---|---|
| **Accueil** | KPIs argent + membres + actions requises (impayés, expirations, kicks) |
| **Offres** | Paywalls : prix, périodicité, groupe lié, lien de partage, codes promo — *objet central* |
| **Abonnés** | Fiches, statut actif/expiré, historique, add/kick manuel |
| **Accès / Bot** | Groupes Telegram connectés, santé du bot (salles de sport plus tard) |
| **Argent** | Transactions, **solde disponible**, **retraits (gratuits)**, commission 10 % |
| **Réglages** | Compte, connexion bot, connexion provider de paiement, branding |

## 7. Modèle de données

Déjà en place (Supabase) : `groups`, `plans`, `subscribers`, `subscriptions`, `payments` + RLS (lecture anon dev).

À ajouter pour le modèle « caisse » :
- `payments`: `provider`, `provider_ref`, `commission` (10 %), `net_amount`, `status`.
- `wallets` (solde par proprio) + `payouts` (retraits).
- `subscriptions`: `grace_until` (période de grâce avant kick).
- `access_events` (log join/kick) et `reminders` (rappels programmés).
- `telegram_connections` (groupe ↔ bot, chat_id, droits vérifiés).

## 8. Pièces techniques à construire

- **Bot Telegram** `@PaylikaBot` + **webhook** (adhésions, /start, add/kick) — via **Edge Function Supabase**.
- **Provider de paiement** mobile money : Wave / Orange Money ou agrégateur (PayDunya, CinetPay, Kkiapay, Bictorys) + **webhook de confirmation**.
- **Cron Supabase** : détecter expirations → kick + rappels.
- **Auth** propriétaire (Supabase Auth, email déjà activé).

## 9. Roadmap

**Phase 1 — MVP vendable (Telegram, bout en bout)**
1. Auth propriétaire.
2. Connecter **1 groupe Telegram** (bot admin, connexion simple).
3. Créer **1 offre mensuelle** (onglet Offres).
4. **Page/lien de paiement** hébergée + **1 moyen** mobile money.
5. **Add auto** au paiement + **kick auto** à l'expiration.
6. **Argent** : solde + retrait gratuit + commission 10 %.
7. Dashboard + Abonnés + **rappels J-3/J-1**.

**Phase 2** : codes promo, salle de sport + QR, diffusion/broadcast, multi-groupes, analytics.

**Phase 3** : white-label, équipe & rôles, autres providers, dunning avancé.

## 10. État actuel (fait)

- Design system (bordeaux #7B1126, logo officiel, typo Bricolage/Space Grotesk, 0 emoji, SVG only).
- Dashboard responsive web + mobile.
- Supabase branché : le dashboard lit de vraies données (membres actifs, churn, renouvellements, revenus par groupe).
