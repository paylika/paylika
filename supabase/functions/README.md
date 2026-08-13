# Paylika — Edge Function bot Telegram

Webhook Telegram : [`telegram-webhook/index.ts`](telegram-webhook/index.ts) (fichier autonome).
Gère `/start`, les demandes d'adhésion (approuve seulement les abonnés actifs) et
l'enregistrement des chats où le bot est admin.

## Voie recommandée : tout depuis le dashboard (sans terminal)

### 1. Tables Telegram
SQL Editor → exécuter [`../telegram_schema.sql`](../telegram_schema.sql).

### 2. Créer la fonction
Dashboard → **Edge Functions** → **Create function** → nom `telegram-webhook` →
coller tout le contenu de [`telegram-webhook/index.ts`](telegram-webhook/index.ts) → **Deploy**.

### 3. Secrets
Dashboard → **Edge Functions** → **Secrets** (ou Project Settings → Edge Functions) :
- `TELEGRAM_BOT_TOKEN` = le token BotFather (le nouveau, régénéré)
- `TELEGRAM_WEBHOOK_SECRET` = une chaîne aléatoire que tu choisis (ex. 32 caractères)

> `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement.

### 4. Brancher le webhook Telegram (dans le navigateur)
Colle cette URL dans la barre d'adresse (remplace `<TOKEN>` et `<SECRET>`) :
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xkdiodbppotyiyldlwbg.functions.supabase.co/telegram-webhook&secret_token=<SECRET>&allowed_updates=["message","chat_join_request","my_chat_member"]
```
Réponse attendue : `{"ok":true,"result":true,...}`.

Vérifier : `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### 5. Tester
- `t.me/Paylikabot` → **Démarrer** → message de bienvenue + 1 ligne dans `telegram_users`.
- Ajouter le bot comme **admin** d'un groupe test → 1 ligne dans `telegram_connections`.

---

## Alternative : CLI (si tu préfères le terminal)
```bash
supabase login
supabase link --project-ref xkdiodbppotyiyldlwbg
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=...
supabase functions deploy telegram-webhook --no-verify-jwt
```
