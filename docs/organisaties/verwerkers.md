# Diensten die CeritaProject gebruikt (verwerkers)

Met elk van deze diensten sluit je een verwerkersovereenkomst (DPA). De meeste bieden die standaard aan in hun dashboard of op hun website.

| Dienst | Waarvoor | Welke gegevens | Waar regel je de overeenkomst? | Let op |
|---|---|---|---|---|
| Supabase | Database, inloggen, opslag van foto's en bestanden | Alles uit de app | Dashboard → Organization → Legal documents (DPA) | Kies/controleer een EU-regio (bijv. Frankfurt). Vul de regio in de privacyverklaring in. |
| Vercel | Website en server | Verzoeken, IP-adressen in logs | vercel.com/legal/dpa | Logs kort bewaren. |
| Stripe | Betalingen | Naam, e-mail, betaling | stripe.com/legal/dpa | Bestelgegevens 7 jaar bewaren (belasting). |
| Google Firebase | Pushmeldingen | Code van het apparaat | Firebase console → Project settings → Data Processing Terms | Alleen Cloud Messaging gebruiken. |
| Resend | E-mails (bevestigen, wachtwoord) | E-mailadres | resend.com/legal/dpa | Kies indien mogelijk een EU-regio. |
| OpenAI | Spraak naar tekst in het dagboek (alleen als het lid tikt) en hulp bij meldingen voor beheerders | Spraakopname, tekst van meldingen | platform.openai.com → Settings → Data controls / DPA | Verwerking in de VS. Overweeg dit uit te zetten voor leden onder 16, of te vervangen door een EU-dienst. |

Controleer ook:
- Tweestapsverificatie op alle accounts.
- Wie heeft toegang tot welk dashboard? Alleen wie het echt nodig heeft.
