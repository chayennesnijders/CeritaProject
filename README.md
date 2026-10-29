# CeritaProject

Een veilige app voor jongeren van 12 tot 27 jaar. Je kunt er verhalen delen, chatten, groepen maken, een diertje verzorgen en dingen kopen in de shop.

Gebouwd met TanStack Start, React, Tailwind CSS en Supabase.

## Wat heb je nodig?

| Dienst | Waarvoor | Verplicht? |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Database, accounts, opslag | Ja |
| [Stripe](https://stripe.com) | Betalen in de shop | Voor de shop |
| [OpenAI](https://platform.openai.com) | Spraak naar tekst, AI-hulp bij meldingen | Voor die functies |
| [Firebase](https://console.firebase.google.com) | Pushmeldingen op je telefoon | Voor meldingen |
| [Resend](https://resend.com) | Mails in Cerita-stijl | Nee |

Alle sleutels staan uitgelegd in [`.env.example`](.env.example).

## Op je eigen computer starten

```sh
bun install            # of: npm install
cp .env.example .env   # en vul je sleutels in
bun run dev            # de app draait op http://localhost:8080
```

## Supabase klaarzetten (één keer)

1. Maak een nieuw project op supabase.com.
2. Zet de sleutels in `.env` (zie `.env.example`).
3. Bouw de database op: open [`supabase/database-in-een-keer.sql`](supabase/database-in-een-keer.sql), kopieer alles en plak het in Supabase → **SQL Editor** → **New query** → **Run**. Doe dit maar één keer, op een leeg project.
   Komt er later een nieuwe migratie bij in `drizzle/migrations`? Plak dan alleen dat nieuwe bestand in de SQL Editor.
4. **Inloggen met Google:** Supabase → Authentication → Sign In / Providers → Google aanzetten (met een Client ID van Google Cloud).
5. **Adressen:** Supabase → Authentication → URL Configuration. Zet je site-adres bij *Site URL* en voeg `https://jouw-site.nl/**` en `http://localhost:8080/**` toe bij *Redirect URLs*.
6. **Wekelijks bericht "gratis Game Clicks":** voer dit één keer uit in de SQL-editor van Supabase:
   ```sql
   SELECT public.schedule_free_items_weekly('https://jouw-site.nl');
   ```
7. **Eigen mails (optioneel):** Supabase → Authentication → Hooks → *Send Email hook* → HTTPS → `https://jouw-site.nl/api/auth-email`. Zet het geheim dat je daar krijgt in `SEND_EMAIL_HOOK_SECRET`, en vul ook `RESEND_API_KEY` in.

> Was je eerst bij Lovable? Dan staan je oude gebruikers en berichten nog in de database van Lovable. Die kun je verhuizen met een database-export (`pg_dump`) naar je nieuwe Supabase-project.

## Online zetten

```sh
bun run build
```

De build werkt vanzelf op de meeste hostingdiensten: Vercel, Netlify en Cloudflare worden automatisch herkend. Op een gewone server start je de app met:

```sh
node .output/server/index.mjs
```

Wil je zelf kiezen voor welke hosting je bouwt? Zet dan bijvoorbeeld `NITRO_PRESET=vercel` of `NITRO_PRESET=cloudflare-module`. Vergeet niet om alle sleutels uit `.env` ook bij je hosting in te vullen. Let op: de sleutels die met `VITE_` beginnen worden tijdens het bouwen in de app gestopt. Zonder die sleutels laat de app alleen "Er ging iets mis" zien.

## Handige commando's

```sh
bun run test    # alle tests draaien
bun run lint    # code nakijken
bun run build   # app bouwen
```
