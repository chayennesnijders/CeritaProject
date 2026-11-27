# iPhone-app (App Store)

De iPhone-app opent app.ceritaproject.nl in een eigen app-venster (Capacitor). Hij wordt gebouwd,
ondertekend en naar App Store Connect (TestFlight) gestuurd door `apple/build.sh` op een Mac van
**Codemagic** (`codemagic.yaml`; GitHub geeft dit account geen Mac). Je hebt zelf geen Mac nodig.

In Codemagic staan de vier geheimen in de omgevingsgroep **apple** (allemaal *Secure*).

Nodig (in Codemagic, en ook als GitHub-secrets voor als GitHub later wel een Mac geeft):

| Secret | Waar vind je het |
| --- | --- |
| `APPLE_TEAM_ID` | developer.apple.com → Account → Membership details → Team ID |
| `APPSTORE_ISSUER_ID` | App Store Connect → Gebruikers en toegang → Integraties → App Store Connect API |
| `APPSTORE_KEY_ID` | dezelfde pagina, bij de sleutel die je maakt (rol: Admin) |
| `APPSTORE_KEY_P8` | de inhoud van het gedownloade `AuthKey_XXXX.p8`-bestand |

Zonder deze secrets maakt de workflow alleen een testbouw (niet ondertekend), zodat je ziet dat alles werkt.
Bundle ID: `com.ceritaproject.mijnapp` (zelfde als Android). Het buildnummer is het nummer van de run.
