# Paylika — Edge Functions (bot Telegram)

Webhook Telegram : `telegram-webhook/`. Il gère `/start`, les demandes d'adhésion
(approuve seulement les abonnés actifs) et l'enregistrement des chats où le bot est admin.

## Prérequis (une fois)

1. **Tables Telegram** : exécuter [`../telegram_schema.sql`](../telegram_schema.sql) dans le SQL Editor.
2. **CLI Supabase** (Windows) :
   ```bash
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   ou en local : `npm install --save-dev supabase` puis préfixer par `npx`.
3. **Lier le projet** :
   ```bash
   supabase login
   supabase link --project-ref xkdiodbppotyiyldlwbg
   ```

## Secrets (jamais dans le code / le chat)

Génère un secret de webhook **localement** (ne le colle pas dans le chat) :
```bash
openssl rand -hex 32
```

Puis enregistre les secrets côté Supabase :
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=<ton_nouveau_token_botfather>
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<le_hex_généré_ci-dessus>
```
> `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement — rien à faire.

## Déploiement

```bash
supabase functions deploy telegram-webhook --no-verify-jwt
```
`--no-verify-jwt` car Telegram appelle la fonction sans JWT (on la protège via le
header secret `x-telegram-bot-api-secret-token`).

L'URL de la fonction sera :
```
https://xkdiodbppotyiyldlwbg.functions.supabase.co/telegram-webhook
```

## Brancher le webhook Telegram

Dis à Telegram d'envoyer les updates à la fonction (remplace `<TOKEN>` et `<SECRET>`) :
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xkdiodbppotyiyldlwbg.functions.supabase.co/telegram-webhook&secret_token=<SECRET>&allowed_updates=[\"message\",\"chat_join_request\",\"my_chat_member\"]"
```

Vérifier :
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Tester

1. Ouvre `t.me/Paylikabot` → **Démarrer** → tu dois recevoir le message de bienvenue,
   et une ligne apparaît dans `public.telegram_users`.
2. Ajoute le bot comme **admin** d'un groupe test → une ligne apparaît dans
   `public.telegram_connections` (status `pending`).
