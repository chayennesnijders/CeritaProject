# Klaar voor samenwerken met organisaties

Een checklist voor CeritaProject. ✅ = zit in de app. ⬜ = moet jij nog regelen.
Dit is geen juridisch advies: laat de juridische punten nakijken door iemand die verstand heeft van privacyrecht.

## In de app (gedaan)
- ✅ Privacyverklaring, huisregels en gebruiksvoorwaarden: `/privacy`, `/huisregels`, `/voorwaarden` (openbaar, ook voor de App Store).
- ✅ Elk lid gaat akkoord voordat het de app gebruikt, en opnieuw als de teksten veranderen (`LEGAL_VERSION` in `src/lib/legal.ts`).
- ✅ Leden onder 16 bevestigen dat een ouder of verzorger het weet en goed vindt. Er is een pagina voor ouders: `/ouders`.
- ✅ Hulppagina met hulplijnen: `/hulp`. Wie over zelfmoord of zelfbeschadiging schrijft, krijgt meteen hulpnummers te zien.
- ✅ Zorgsignalen voor beheerders: Beheer → Inbox, Nieuws en een pushmelding.
- ✅ Anonieme impactcijfers: Beheer → Impact (kopiëren of printen als pdf). Aantallen onder 5 worden verborgen.
- ✅ Pagina voor organisaties: `/organisaties`.
- ✅ Account verwijderen kan zelf in de app; leeftijdsgroepen; meldknop; blokkeren; waarschuwingen en time-outs.

## Zelf regelen
- ⬜ Vul in `src/lib/legal.ts` alles tussen [haken] in: naam, adres, KvK, e-mailadres, Supabase-regio en hoe lang back-ups bewaard blijven.
- ⬜ Laat de privacyverklaring en voorwaarden nakijken (bijvoorbeeld door een privacyjurist of het Juridisch Loket).
- ⬜ Rechtsvorm (bijvoorbeeld een stichting) met KvK-nummer, en een aansprakelijkheidsverzekering.
- ⬜ DPIA afmaken: zie `dpia-concept.md`.
- ⬜ Verwerkersovereenkomsten afsluiten en de regio's controleren: zie `verwerkers.md`.
- ⬜ Veiligheidsplan afspreken met je beheerders: zie `veiligheidsplan.md`.
- ⬜ VOG voor iedereen die beheerder is.
- ⬜ Tweestapsverificatie aan op Supabase, Vercel, Google, Stripe, Firebase, Resend en OpenAI.
- ⬜ In Supabase: controleer dat er back-ups worden gemaakt.
- ⬜ Mag een ouder ook zelf om inzage of verwijdering vragen? Spreek af hoe je controleert dat het echt de ouder is.
