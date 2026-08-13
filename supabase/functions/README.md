# Paylika — Edge Functions

Déploiement : Dashboard Supabase → Edge Functions → Create/Update → coller le `index.ts`
→ **Deploy** → **Verify JWT off**. Secrets : Edge Functions → Secrets.

## Fonctions

| Fonction | Rôle | Secrets |
|---|---|---|
| `telegram-webhook` | Bot @Paylikabot : /start (+ deep-link offre → bouton Payer), approbation des adhésions, détection des groupes | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` |
| `unitech-create` | Crée un paiement UniTech (Wave/OM) → URL de paiement, mappe la référence → offre | `UNITECH_API_KEY` |
| `unitech-webhook` | Confirmation paiement (HMAC) → crée l'abonnement + paiement (commission 10 %) + envoie le lien d'accès Telegram | `UNITECH_API_KEY`, `TELEGRAM_BOT_TOKEN` |
| `paylika-cron` | Planifié : **kick-out** des expirés, **rappels** J-3, **exécution des retraits** (UniTech) | `UNITECH_API_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET` |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

## Schémas SQL (SQL Editor)
- `../schema.sql`, `../schema_v2.sql` — tables app + policies dev
- `../telegram_schema.sql` — telegram_users, telegram_connections
- `../payments_schema.sql` — colonnes provider/commission
- `../unitech_schema.sql` — payment_intents (mapping paiement→offre)
- `../cron_schedule.sql` — planifie `paylika-cron` (pg_cron)

## Webhook UniTech
Dans le dashboard UniTech → Webhooks → URL :
`https://xkdiodbppotyiyldlwbg.functions.supabase.co/unitech-webhook`
Événements : paiement réussi / échoué / expiré.

## Cron
1. Déployer `paylika-cron` (JWT off).
2. Secret `CRON_SECRET` (chaîne aléatoire).
3. Exécuter `../cron_schedule.sql` (en remplaçant `TON_CRON_SECRET`).
