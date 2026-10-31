# CeritaProject in de Google Play Store

Alles wat je nodig hebt om de app in de Play Store te zetten, op één plek.

**In deze map:**
- `screenshots/`: 8 screenshots (1080 × 1920) om te uploaden bij *Telefoon-screenshots*
- `feature-graphic.png`: de banner (1024 × 500) bij *Feature graphic*
- `raw/`: de schermafbeeldingen zonder tekst eromheen, voor als je zelf iets wilt maken
- App-icoon (512 × 512): `public/icon-512.png`

---

## 1. Gegevens van de app

| Veld | Wat je invult |
|---|---|
| App-naam (max. 30 tekens) | **CeritaProject** |
| Pakketnaam (bij PWABuilder) | **nl.ceritaproject.app** |
| Standaardtaal | Nederlands (nl-NL) |
| App of game | App |
| Gratis of betaald | Gratis |
| Categorie | **Sociaal** (de kern is verhalen en contact met leeftijdsgenoten) |
| E-mailadres (contact) | ceritaproject@outlook.com |
| Website | https://app.ceritaproject.nl |
| Privacybeleid | https://app.ceritaproject.nl/privacy |
| Account verwijderen | https://app.ceritaproject.nl/account-verwijderen |

---

## 2. Korte beschrijving (max. 80 tekens)

> Jouw verhaal mag er zijn. Een veilige plek voor jongeren van 13 tot 27.

*(71 tekens)*

---

## 3. Volledige beschrijving (max. 4000 tekens)

> **Jouw verhaal mag er zijn.**
>
> CeritaProject is een veilige plek voor jongeren van 13 tot 27 jaar. Lees echte verhalen van leeftijdsgenoten, deel wat jij meemaakt en ontdek dat je niet de enige bent. Zonder oordeel, in je eigen tempo.
>
> **📖 Verhalen die herkenbaar zijn**
> Lees verhalen van jongeren over wat er in je hoofd gebeurt, over vriendschap, familie, school en het leven daarna. Elke dag is er een verhaal van de dag. Wil je zelf iets delen? Stuur je verhaal in, anoniem als je wilt.
>
> **💬 Kletsen met leeftijdsgenoten**
> Praat in groepen met jongeren van jouw leeftijd. Iedere leeftijdsgroep (13–15, 16–25 en 26–27) heeft een eigen, veilige omgeving. Maak een peiling, stuur een Riti-sticker of speel samen een spelletje, zoals vier op een rij, schaken of darten.
>
> **🎓 Altijd een coach in de buurt**
> Onze coaches hebben ervaring en luisteren naar je, zonder oordeel. Chat met een coach of stel anoniem een vraag. Niemand ziet van wie je vraag komt, ook de coach niet.
>
> **🌱 Goed voor jezelf zorgen**
> • Houd een privé dagboek bij en kleur je stemmingskalender
> • Maak een veiligheidsplan voor moeilijke momenten
> • Vul je dankbaarheidspotje met lichtpuntjes
> • Doe een rustmoment met ademhalingsoefeningen
> • Schrijf een brief aan jezelf voor later
> • Verzorg je eigen diertje en vink samen je taken af
>
> **📅 Samen online meetups**
> Doe mee aan online meetups met leden van jouw leeftijd, begeleid door CeritaProject.
>
> **🛡️ Veilig en vriendelijk**
> • Aparte leeftijdsgroepen: jongere leden komen niet in contact met volwassen leden
> • Een meldknop bij elk bericht, en beheerders die meekijken
> • Gemene woorden worden automatisch verborgen
> • Je dagboek, stemmingen en veiligheidsplan zijn alleen van jou
> • Stille uren: geen meldingen wanneer jij dat niet wilt
> • Hulplijnen altijd binnen handbereik
>
> **Heb je nu meteen hulp nodig?**
> Bel 113 (0800-0113) als je aan zelfmoord denkt, of de Kindertelefoon (0800-0432) als je onder de 18 bent. Bij direct gevaar: bel 112. CeritaProject is geen vervanging voor professionele hulp.
>
> CeritaProject is gratis, zonder advertenties.

*(ongeveer 2.000 tekens)*

---

## 4. Doelgroep en inhoud

**Doelgroep (Target audience):**
- Vink aan: **13–15**, **16–17** en **18 en ouder**
- Vink **niet** aan: alles onder de 13

**"Kan de app ook kinderen aanspreken?"** Google kan dit vragen, omdat Riti een schattig beertje is. Antwoord: **Nee, de app is niet voor kinderen onder de 13.** Leg uit: *"Bij het aanmelden vragen we de geboortedatum; jonger dan 13 kan geen account maken."*

**Advertenties:** Nee, de app bevat geen advertenties.

**Toegang tot de app (App access):** Google wil kunnen inloggen om de app te controleren.
- Maak een **testaccount** aan in de app, bijvoorbeeld *googletest@…* met een geboortedatum van **18+**.
- Vul bij Google het e-mailadres en wachtwoord van dat account in.
- Geef dat account een gebruikersnaam en zet het in een groep, zodat Google iets ziet.

---

## 5. Leeftijdsclassificatie (IARC-vragenlijst)

Kies als categorie **Sociaal / Communicatie**. Beantwoord de vragen eerlijk. Dit zijn de belangrijkste:

| Vraag | Antwoord |
|---|---|
| Geweld, seks, grof taalgebruik, drugs, gokken in de app zelf? | **Nee** |
| Kunnen gebruikers met elkaar communiceren (chatten)? | **Ja** |
| Kunnen gebruikers inhoud delen (berichten, foto's)? | **Ja** |
| Wordt de locatie van gebruikers gedeeld? | **Nee** |
| Kunnen gebruikers digitale aankopen doen? | **Nee** *(de shop verkoopt alleen fysieke producten, en is nog dicht)* |
| Gaat het over gevoelige onderwerpen? | Verhalen kunnen gaan over moeilijke dingen (zoals pesten, angst of verlies), maar zonder heftige beschrijvingen. Zeg dit eerlijk als het gevraagd wordt. |

---

## 6. Gegevensveiligheid (Data safety)

**Algemene vragen:**

| Vraag | Antwoord |
|---|---|
| Verzamelt of deelt de app gegevens? | **Ja** |
| Worden alle gegevens versleuteld verstuurd? | **Ja** (alles gaat via https) |
| Kunnen gebruikers vragen om hun gegevens te verwijderen? | **Ja**, in de app en via https://app.ceritaproject.nl/account-verwijderen |

**Wat de app verzamelt.** Voor elk soort gegevens geldt: **niet gedeeld** met anderen voor hun eigen doelen. Supabase, Vercel, Firebase, Resend, Stripe en OpenAI werken alleen in opdracht van CeritaProject; Google telt dat niet als "delen". En: **niet verwerkt voor advertenties**.

| Soort (zoals Google het noemt) | Verzamelen? | Verplicht of optioneel | Waarvoor (doel) |
|---|---|---|---|
| **Persoonlijke info → Naam** | Ja | Verplicht | App-functionaliteit, accountbeheer |
| **Persoonlijke info → E-mailadres** | Ja | Verplicht | Accountbeheer, communicatie met de ontwikkelaar |
| **Persoonlijke info → Gebruikers-ID's** | Ja | Verplicht | App-functionaliteit, accountbeheer |
| **Persoonlijke info → Adres** | Ja | Optioneel | App-functionaliteit (bezorgen van bestellingen) |
| **Persoonlijke info → Andere info** (geboortedatum) | Ja | Verplicht | App-functionaliteit (leeftijdsgroep), veiligheid |
| **Financiële info → Aankoopgeschiedenis** | Ja | Optioneel | App-functionaliteit (bestellingen) |
| **Financiële info → Betaalgegevens** | Ja (via Stripe) | Optioneel | App-functionaliteit (betalen) |
| **Gezondheid en fitness → Gezondheidsinfo** (stemmingen, veiligheidsplan) | Ja | Optioneel | App-functionaliteit |
| **Berichten → Andere berichten in de app** | Ja | Optioneel | App-functionaliteit |
| **Foto's en video's → Foto's** | Ja | Optioneel | App-functionaliteit |
| **Audio → Spraak- of geluidsopnamen** | Ja | Optioneel | App-functionaliteit |
| **Bestanden en documenten** | Ja | Optioneel | App-functionaliteit |
| **App-activiteit → App-interacties** (diertje, spelletjes, badges) | Ja | Optioneel | App-functionaliteit |
| **App-activiteit → Andere door gebruikers gemaakte inhoud** (verhalen, dagboek, groepsberichten) | Ja | Optioneel | App-functionaliteit |
| **Apparaat-ID's of andere ID's** (code voor pushmeldingen) | Ja | Optioneel | App-functionaliteit (meldingen) |

**Niet verzameld:** locatie, contacten, agenda, browsegeschiedenis, crashlogs, advertentie-ID.

> 💡 **Gezondheidsinfo:** de app vraagt niets medisch, maar stemmingen en het veiligheidsplan gaan over hoe je je voelt. Het is veiliger om ze hier aan te geven dan om ze weg te laten.

**Verklaring gezondheidsapps (Health apps declaration):** kies **"Geestelijke gezondheid en welzijn"** (mental health and wellness). De app geeft geen medische diagnoses of behandelingen.

---

## 7. Volgorde van de stappen

1. ✅ Ontwikkelaarsaccount aangevraagd (wacht op goedkeuring)
2. App inpakken met **pwabuilder.com** → je krijgt een `.aab`-bestand
3. In Play Console: **Een app maken** → naam *CeritaProject*, Nederlands, App, Gratis
4. Alle punten hierboven invullen (*Store-vermelding*, *Inhoud van de app*)
5. **Testen → Interne test** → `.aab` uploaden → jezelf als tester toevoegen
6. In Play Console bij **Instellingen → App-ondertekening** de **SHA-256-vingerafdruk** kopiëren → in Vercel zetten als `ANDROID_SHA256_FINGERPRINTS` → Redeploy
7. **Gesloten test** met minstens **12 testers, 14 dagen**
8. Daarna: **Productie** aanvragen → de app staat voor iedereen in de Play Store 🎉
