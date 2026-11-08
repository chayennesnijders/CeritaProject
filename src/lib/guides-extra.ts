import type { Guide } from "./guides";

/** The guides after the first one. General guidance, never medical advice; each points to real help. */
export const EXTRA_GUIDES: Guide[] = [
  {
    slug: "schermtijd",
    emoji: "📱",
    title: "Schermtijd zonder ruzie",
    summary:
      "Elke avond hetzelfde gevecht over de telefoon? Je leert waarom ‘leg dat ding weg’ zelden werkt, en hoe je samen afspraken maakt die jullie allebei volhouden.",
    minutes: 15,
    forWho: "Ouders en verzorgers van kinderen van 10 tot 18 jaar",
    outcomes: [
      "Je begrijpt wat de telefoon voor je kind betekent, en waarom afpakken vaak averechts werkt",
      "Je maakt samen met je kind afspraken in plaats van regels opleggen",
      "Je weet welke signalen echt reden tot zorg zijn",
      "Je hebt een eerlijk plan voor de avond en de nacht",
    ],
    steps: [
      {
        kind: "uitleg",
        title: "Wat de telefoon voor je kind is",
        text: [
          "Voor jongeren is de telefoon niet ‘een scherm’. Het is hun vriendengroep, hun muziek, hun manier om op de hoogte te blijven. Wie offline is, mist gesprekken en grapjes, en dat voelt als buitengesloten worden.",
          "Daarom voelt ‘leg dat ding weg’ voor je kind vaak als ‘je mag niet bij je vrienden zijn’. Dat verklaart de felle reactie. Het gaat zelden over de telefoon zelf.",
        ],
        tip: "Vraag eens oprecht: ‘Wat doe je eigenlijk het liefst op je telefoon?’ en laat het je echt laten zien.",
      },
      {
        kind: "keuze",
        title: "De avond",
        situation: "Het is 22:30 op een doordeweekse avond. Je ziet licht onder de deur van je kind en hoort zacht gelach.",
        question: "Wat doe je?",
        options: [
          {
            text: "Naar binnen lopen en de telefoon direct afpakken",
            verdict: "liever niet",
            feedback: "Je kind voelt zich overvallen en vernederd. De kans is groot dat het gaat stiekemen, bijvoorbeeld met een oude telefoon. En je mist de kans om samen een afspraak te maken.",
          },
          {
            text: "Even kloppen: ‘Hé, het is half elf. Nog vijf minuten, dan gaat hij aan de lader in de gang, oké?’",
            verdict: "goed",
            feedback: "Je geeft een korte afrondtijd, zodat je kind het gesprek netjes kan afsluiten. Duidelijk en respectvol. Bespreek morgen, op een rustig moment, een vaste afspraak voor doordeweeks.",
          },
          {
            text: "Niets zeggen, het is toch al laat en je wilt geen ruzie",
            verdict: "kan beter",
            feedback: "Ruzie vermijden is begrijpelijk, maar slaap is echt belangrijk voor de stemming en de schoolprestaties van je kind. Een rustige, vriendelijke grens helpt meer dan wegkijken.",
          },
        ],
      },
      {
        kind: "uitleg",
        title: "Samen afspraken maken",
        text: [
          "Afspraken die je samen maakt, worden veel beter nagekomen dan regels die je oplegt. Plan er een rustig moment voor, niet midden in een ruzie.",
          "Laat je kind eerst zelf een voorstel doen: ‘Hoe laat vind jij redelijk om de telefoon weg te leggen op een schooldag?’ Jongeren zijn vaak strenger voor zichzelf dan je denkt.",
          "Spreek ook af wat er gebeurt als het niet lukt, en wanneer jullie de afspraak samen evalueren, bijvoorbeeld over twee weken.",
        ],
        tip: "Spreek af dat de afspraken voor iedereen in huis gelden. Ook voor jou: geen telefoon aan tafel betekent ook jouw telefoon niet.",
      },
      {
        kind: "gesprek",
        title: "Zo kan het klinken",
        text: "Een voorbeeld van een gesprek op zaterdagochtend. Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Ik wil het met je hebben over de telefoon ’s avonds. Niet om je iets af te pakken, maar omdat ik zie dat je ’s ochtends kapot bent.", why: "Je noemt het doel én neemt de grootste angst (afpakken) meteen weg." },
          { who: "kind", text: "Iedereen is gewoon ’s avonds online. Dan mis ik alles." },
          { who: "ouder", text: "Dat snap ik. Wat zou je dan missen, als je om half elf offline gaat?", why: "Je erkent het en vraagt door. Je leert wat er echt speelt." },
          { who: "kind", text: "Weet ik niet. De groepsapp en zo." },
          { who: "ouder", text: "Wat zou voor jou een eerlijke tijd zijn op een schooldag?", why: "Je kind doet zelf een voorstel. Dan voelt de afspraak als iets van jullie samen." },
          { who: "kind", text: "Elf uur?" },
          { who: "ouder", text: "Half elf vind ik beter met school, maar in het weekend mag het elf uur zijn. Zullen we het twee weken proberen en dan kijken hoe het gaat?", why: "Je onderhandelt, maar houdt de grens die je belangrijk vindt. En je spreekt een evaluatie af." },
        ],
      },
      {
        kind: "zinnen",
        title: "Zinnen die helpen",
        text: "Kies een zin die bij jou past voor als het lastig wordt.",
        sentences: [
          "Ik zie dat het moeilijk is om te stoppen. Dat snap ik, apps zijn gemaakt om je vast te houden.",
          "Het gaat me niet om de telefoon. Het gaat me erom dat je genoeg slaapt.",
          "We hadden half elf afgesproken. Rond je het nu af?",
          "Laat eens zien wat je zo leuk vindt. Ik ben benieuwd.",
        ],
        avoid: [
          "Je zit ook altijd op dat ding!",
          "Vroeger hadden wij dat ook niet en wij leefden ook.",
          "Als je zo doorgaat, gooi ik hem weg.",
        ],
      },
      {
        kind: "checklist",
        title: "Wanneer is het meer dan gewoon veel?",
        text: "Veel schermtijd is vaak niet het probleem zelf. Vink aan wat je herkent bij je kind.",
        items: [
          "Mijn kind slaapt structureel te weinig door de telefoon",
          "Mijn kind wordt erg angstig of agressief als de telefoon er niet is",
          "Mijn kind stopt met dingen die het eerst leuk vond, zoals sport of vrienden zien",
          "Mijn kind lijkt somber of onzeker na het scrollen",
          "Mijn kind krijgt berichten van mensen die het niet kent, of doet geheimzinnig",
          "Mijn kind wordt online gepest, of er gaan foto’s rond",
        ],
        after:
          "Herken je meerdere signalen? Praat erover met je kind, en eventueel met de huisarts, het CJG of de mentor. Gaan er naaktfoto’s rond, of wordt je kind online onder druk gezet? Dan kun je samen terecht bij Helpwanted (helpwanted.nl) en kun je aangifte doen bij de politie. Je kind kan zelf anoniem praten met de Kindertelefoon (0800-0432).",
      },
      {
        kind: "keuze",
        title: "Als het misgaat",
        situation: "Je ontdekt dat je kind stiekem tot 2 uur ’s nachts online was, terwijl jullie half elf hadden afgesproken.",
        question: "Wat doe je?",
        options: [
          {
            text: "Een week geen telefoon, punt",
            verdict: "kan beter",
            feedback: "Een gevolg mag, maar een zware straf zonder gesprek leert je kind vooral om beter te verstoppen. Een gevolg werkt beter als je het samen vooraf hebt afgesproken.",
          },
          {
            text: "Rustig bespreken wat er gebeurde, en samen bekijken hoe de afspraak wél lukt, bijvoorbeeld met de lader in de gang",
            verdict: "goed",
            feedback: "Je blijft bij de afspraak, maar zoekt samen naar wat helpt. Een telefoon ’s nachts buiten de slaapkamer is voor veel jongeren een opluchting: dan hoeven ze zichzelf niet te stoppen.",
          },
          {
            text: "Doen alsof je het niet weet",
            verdict: "liever niet",
            feedback: "Dan wordt de afspraak waardeloos, en dat weet je kind ook. Benoem het rustig. Dat laat zien dat afspraken iets betekenen.",
          },
        ],
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week proberen?",
        text: "Kies één ding om mee te beginnen.",
        actions: [
          "Mijn kind vragen wat het het liefst doet op de telefoon, en echt kijken",
          "Een rustig moment plannen om samen een avondafspraak te maken",
          "Een vaste laadplek buiten de slaapkamers maken, voor iedereen",
          "Zelf geen telefoon aan tafel",
          "Over twee weken samen evalueren hoe het gaat",
        ],
      },
    ],
    cheatsheet: [
      "De telefoon is de vriendengroep van je kind. Afpakken voelt als buitensluiten.",
      "Maak afspraken samen, op een rustig moment. Laat je kind eerst een voorstel doen.",
      "Geef een afrondtijd: ‘Nog vijf minuten, dan gaat hij aan de lader.’",
      "Afspraken gelden voor iedereen in huis, ook voor jou.",
      "Let op signalen zoals slaaptekort, somberheid of geheimzinnig contact. Bij online druk of rondgaande foto’s: Helpwanted.",
    ],
    followUp: {
      goed: "Fijn dat het werkt. Vergeet de evaluatie niet: vraag over twee weken samen wat er goed gaat en wat lastig is. Geef ook complimenten als je ziet dat je kind zich aan de afspraak houdt. Dat werkt beter dan alleen corrigeren.",
      lastig: "Afspraken over schermtijd lopen bijna altijd een paar keer mis. Dat is geen falen. Kijk samen welk moment het lastigst is, vaak de laatste tien minuten, en wat daar helpt: een wekker, de lader in de gang, of een vast ritueel zoals samen thee drinken.",
      niet: "Begin klein: alleen de laadplek buiten de slaapkamer, voor iedereen in huis. Dat is één concrete verandering die vaak al veel ruzie scheelt.",
    },
  },
  {
    slug: "gepest",
    emoji: "😔",
    title: "Als je kind gepest wordt",
    summary:
      "Je vermoedt of hoort dat je kind gepest wordt. Je leert hoe je het herkent, wat je zegt als je kind het vertelt, en hoe je samen met school in actie komt zonder het erger te maken.",
    minutes: 15,
    forWho: "Ouders en verzorgers van kinderen van 8 tot 18 jaar",
    outcomes: [
      "Je herkent signalen van pesten, ook als je kind er niets over zegt",
      "Je weet hoe je reageert als je kind het vertelt, zodat het blijft praten",
      "Je weet hoe je school erbij betrekt, en wat je van school mag verwachten",
      "Je weet wat je doet bij online pesten",
    ],
    steps: [
      {
        kind: "uitleg",
        title: "Waarom kinderen het vaak niet vertellen",
        text: [
          "Veel kinderen die gepest worden, vertellen het niet thuis. Ze schamen zich, denken dat het hun eigen schuld is, of zijn bang dat jij naar school stapt en het daardoor erger wordt.",
          "Daarom is het belangrijk om te letten op signalen, en om je kind vooral te laten merken: als je het vertelt, doe ik niets zonder jou.",
        ],
        tip: "Beloof je kind dat je geen stappen zet zonder het eerst samen te bespreken. Die belofte maakt vertellen veel makkelijker.",
      },
      {
        kind: "checklist",
        title: "Signalen die je kunt zien",
        text: "Vink aan wat je herkent. Eén signaal zegt niet alles, meerdere samen zijn een reden om voorzichtig te vragen.",
        items: [
          "Mijn kind wil vaak niet naar school, of heeft ’s ochtends buik- of hoofdpijn",
          "Mijn kind komt thuis met kapotte spullen of zonder spullen",
          "Mijn kind heeft weinig of geen vrienden meer, en wordt niet meer uitgenodigd",
          "Mijn kind schrikt van berichten op de telefoon, of wil de telefoon ineens niet meer gebruiken",
          "Mijn kind is na school stil, prikkelbaar of verdrietig",
          "Mijn kind praat negatief over zichzelf, bijvoorbeeld ‘ik ben stom’ of ‘niemand vindt me leuk’",
        ],
        after:
          "Je kind kan ook zelf anoniem praten met de Kindertelefoon (0800-0432). Elke school moet een aanspreekpunt voor pesten hebben; vraag gerust wie dat is.",
      },
      {
        kind: "keuze",
        title: "Als je kind het vertelt",
        situation: "Je kind vertelt huilend dat een paar klasgenoten al weken gemene dingen zeggen en het buitensluiten.",
        question: "Wat zeg je als eerste?",
        options: [
          {
            text: "‘Ik bel morgen meteen school, dit pikken we niet!’",
            verdict: "kan beter",
            feedback: "Je boosheid is begrijpelijk en laat zien dat je achter je kind staat. Maar als je meteen in actie komt zonder overleg, raakt je kind de regie kwijt. Veel kinderen vertellen daarna minder.",
          },
          {
            text: "‘Wat goed dat je het me vertelt. Dit is niet jouw schuld. Vertel eens, wat gebeurt er precies?’",
            verdict: "goed",
            feedback: "Je bedankt je kind, haalt de schuld weg en luistert eerst. Daarna kun je samen bespreken wat de volgende stap is, en wat je kind wel en niet wil.",
          },
          {
            text: "‘Trek je er niets van aan, negeer ze gewoon.’",
            verdict: "liever niet",
            feedback: "Bij echt pesten werkt negeren meestal niet, en je kind kan zich niet serieus genomen voelen. Pesten is iets wat volwassenen samen moeten oplossen, niet iets wat je kind alleen moet uitzitten.",
          },
        ],
      },
      {
        kind: "gesprek",
        title: "Zo kan het klinken",
        text: "Een vervolg van dat gesprek. Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Dank je dat je het me vertelt. Dat was vast niet makkelijk.", why: "Je erkent hoeveel moed het kostte. Dat maakt de volgende keer vertellen makkelijker." },
          { who: "kind", text: "Je mag niks tegen school zeggen. Dan wordt het alleen maar erger." },
          { who: "ouder", text: "Ik ga niks doen zonder dat we het samen hebben besproken. Beloofd.", why: "Je neemt de grootste angst weg. Je kind houdt de regie." },
          { who: "ouder", text: "Wie op school zou jij het meest vertrouwen? Je mentor, of iemand anders?", why: "Je zoekt samen naar een veilige volwassene op school, in plaats van boven het hoofd van je kind te beslissen." },
          { who: "kind", text: "Meneer Jansen is wel aardig." },
          { who: "ouder", text: "Zullen we samen bedenken wat we hem vertellen? En wat jij wilt dat hij wel en niet doet?", why: "Samen voorbereiden geeft je kind grip. School kan dan beter aansluiten bij wat je kind nodig heeft." },
        ],
      },
      {
        kind: "uitleg",
        title: "School erbij betrekken",
        text: [
          "Scholen zijn verplicht om te zorgen voor een veilige school, en hebben een aanspreekpunt voor pesten. Maak een afspraak met de mentor, bij voorkeur samen met je kind of in elk geval met zijn of haar instemming.",
          "Schrijf vooraf op wat er gebeurd is: wanneer, wie, wat. Vraag school wat ze gaan doen, wie het aanspreekpunt is, en spreek af wanneer jullie elkaar weer spreken, bijvoorbeeld over twee weken.",
          "Ga liever niet zelf naar de pesters of hun ouders. Dat escaleert vaak, en dan is je kind degene die het op school moet opvangen.",
        ],
        tip: "Houd een kort logboek bij met data en wat er gebeurde. Dat helpt in gesprekken met school, en laat zien of het beter wordt.",
      },
      {
        kind: "keuze",
        title: "Online pesten",
        situation: "Je kind laat je een groepsapp zien waarin klasgenoten gemene berichten en een bewerkte foto van je kind delen.",
        question: "Wat doe je eerst?",
        options: [
          {
            text: "De telefoon afpakken, dan ziet je kind het tenminste niet meer",
            verdict: "liever niet",
            feedback: "Dan voelt je kind zich gestraft omdat het iets vertelde, en vertelt het de volgende keer niets. Het pesten stopt er ook niet door.",
          },
          {
            text: "Screenshots maken, de afzenders blokkeren en melden, en daarna samen naar school stappen",
            verdict: "goed",
            feedback: "Bewijs vastleggen is belangrijk. Daarna blokkeren, melden bij de app, en school inschakelen; online pesten tussen klasgenoten is ook een zaak voor school. Gaat het om naaktfoto’s of bedreiging? Neem contact op met Helpwanted en de politie.",
          },
          {
            text: "Zelf in de groepsapp reageren en de pesters aanspreken",
            verdict: "liever niet",
            feedback: "Begrijpelijk, maar een volwassene in de app maakt het voor je kind vaak nog pijnlijker. Laat het oplossen via school.",
          },
        ],
      },
      {
        kind: "zinnen",
        title: "Zinnen die je kind sterker maken",
        text: "Pesten tast het zelfbeeld aan. Kies een zin die je deze week tegen je kind zegt.",
        sentences: [
          "Het ligt niet aan jou. Niemand verdient het om zo behandeld te worden.",
          "Je bent niet alleen. We lossen dit samen op.",
          "Ik ben trots dat je het durfde te vertellen.",
          "Wat vind jij fijn om te doen? Laten we daar deze week tijd voor maken.",
        ],
        avoid: ["Wat heb je zelf gedaan dat ze zo doen?", "Je moet je gewoon niet zo aanstellen.", "Sla gewoon terug."],
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week doen?",
        text: "Kies één concrete stap.",
        actions: [
          "Voorzichtig vragen hoe het op school gaat, en vooral luisteren",
          "Mijn kind beloven dat ik niets doe zonder overleg",
          "Samen een gesprek met de mentor voorbereiden",
          "Een logboek beginnen met wat er gebeurt",
          "Iets leuks plannen waar mijn kind zich goed bij voelt, zoals een club of sport",
        ],
      },
    ],
    cheatsheet: [
      "Let op signalen: buikpijn voor school, kapotte spullen, minder vrienden, schrikken van de telefoon.",
      "Als je kind het vertelt: bedanken, ‘het is niet jouw schuld’, eerst luisteren.",
      "Beloof: ik doe niets zonder dat we het samen bespreken.",
      "Betrek school via de mentor of het aanspreekpunt pesten. Ga niet zelf naar de pesters.",
      "Online pesten: screenshots, blokkeren, melden, school inschakelen. Bij naaktfoto’s of bedreiging: Helpwanted en politie.",
    ],
    followUp: {
      goed: "Fijn dat er beweging in zit. Blijf regelmatig vragen hoe het gaat, ook als het beter lijkt; pesten komt soms terug als niemand meer kijkt. Spreek met school een vast moment af om te evalueren.",
      lastig: "Het is zwaar om je kind te zien lijden en het niet zelf te kunnen oplossen. Gebeurt er te weinig op school? Vraag om een gesprek met het aanspreekpunt pesten of de directie, en neem je logboek mee. Zorg ook goed voor jezelf: praat erover met iemand die je vertrouwt.",
      niet: "Wil je kind (nog) niet praten? Dat is oké. Blijf in de buurt, doe samen dingen waarbij je naast elkaar zit, en zeg één keer: ‘Als er ooit iets is op school, kun je het me vertellen. Ik doe niets zonder jou.’",
    },
  },
  {
    slug: "niet-naar-school",
    emoji: "🏫",
    title: "Je kind wil niet naar school",
    summary:
      "Elke ochtend buikpijn, tranen of een kind dat niet uit bed komt. Je leert wat erachter kan zitten, hoe je de ochtend aanpakt, en met wie je samen werkt om je kind weer op school te krijgen.",
    minutes: 15,
    forWho: "Ouders en verzorgers van kinderen van 10 tot 18 jaar",
    outcomes: [
      "Je begrijpt dat schoolweigering bijna altijd een signaal is, geen luiheid",
      "Je weet hoe je de ochtend minder zwaar maakt",
      "Je weet wie je kunnen helpen: mentor, jeugdarts, huisarts",
      "Je kunt samen met school een plan maken om stap voor stap terug te gaan",
    ],
    steps: [
      {
        kind: "uitleg",
        title: "Wat erachter kan zitten",
        text: [
          "Een kind dat niet naar school wil, is zelden lui. Vaak zit er iets onder: angst, pesten, somberheid, overprikkeling, problemen met leren, of zorgen over iets thuis.",
          "Hoe langer een kind thuisblijft, hoe moeilijker teruggaan wordt. Daarom is het belangrijk om snel te handelen, maar wel met begrip voor wat er speelt.",
        ],
        tip: "Ga samen met school en eventueel de jeugdarts op zoek naar de oorzaak. Jij hoeft dat niet alleen uit te zoeken.",
      },
      {
        kind: "keuze",
        title: "De ochtend",
        situation: "Het is maandagochtend. Je kind ligt nog in bed en zegt: ‘Ik voel me ziek, ik kan echt niet.’ Het is de derde keer in twee weken.",
        question: "Wat doe je?",
        options: [
          {
            text: "‘Je gaat gewoon, en anders sleep ik je erheen.’",
            verdict: "liever niet",
            feedback: "Dwang verhoogt de angst en maakt de volgende ochtend nog zwaarder. Je kind voelt zich bovendien niet begrepen.",
          },
          {
            text: "‘Ik zie dat je je echt rot voelt. Laten we kijken wat wél lukt: misschien het eerste uur, of ik breng je.’",
            verdict: "goed",
            feedback: "Je erkent het gevoel, maar houdt school als verwachting. Een kleine stap, zoals alleen het eerste uur of samen naar school rijden, maakt het haalbaar. Neem dezelfde week contact op met de mentor.",
          },
          {
            text: "‘Oké, blijf maar thuis. Morgen beter.’",
            verdict: "kan beter",
            feedback: "Eén keer thuisblijven kan, maar als het vaker gebeurt, wordt teruggaan steeds moeilijker. Dan is het belangrijk om samen met school te kijken wat er aan de hand is.",
          },
        ],
      },
      {
        kind: "gesprek",
        title: "Zo kan het klinken",
        text: "Een gesprek op een rustige avond, niet ’s ochtends. Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Ik merk dat de ochtenden heel zwaar voor je zijn. Ik ben niet boos, ik wil het begrijpen.", why: "Je kiest een rustig moment en neemt de angst voor straf weg." },
          { who: "kind", text: "Ik weet het zelf ook niet. Ik krijg gewoon buikpijn als ik eraan denk." },
          { who: "ouder", text: "Waar denk je dan aan, als je aan school denkt?", why: "Je vraagt naar het beeld in het hoofd van je kind. Dat levert vaak meer op dan ‘waarom?’." },
          { who: "kind", text: "Aan de pauze. Dan sta ik altijd alleen." },
          { who: "ouder", text: "Dus vooral de pauzes zijn moeilijk. Dat is fijn om te weten, daar kunnen we iets mee.", why: "Samenvatten maakt het probleem concreet en kleiner. Je geeft hoop zonder het te bagatelliseren." },
          { who: "ouder", text: "Mag ik dit met je mentor bespreken? Dan bedenken we samen iets voor de pauzes.", why: "Je vraagt toestemming en betrekt school als hulp, niet als straf." },
        ],
      },
      {
        kind: "checklist",
        title: "Wanneer schakel je hulp in?",
        text: "Vink aan wat je herkent. Bij een of meer signalen is het tijd om school en eventueel de jeugdarts of huisarts erbij te halen.",
        items: [
          "Mijn kind heeft de afgelopen weken meerdere dagen gemist",
          "Mijn kind heeft vaak lichamelijke klachten zonder duidelijke oorzaak",
          "Mijn kind is angstig of in paniek bij de gedachte aan school",
          "Mijn kind is somber, slaapt slecht of trekt zich terug",
          "Mijn kind vertelt over pesten of problemen met een leraar",
          "Mijn kind loopt erg achter met schoolwerk",
        ],
        after:
          "Neem contact op met de mentor of de zorgcoördinator van school. De jeugdarts van de GGD kan meekijken naar de oorzaak, ook bij lichamelijke klachten en verzuim. Je huisarts en het CJG of wijkteam kunnen ook helpen. Merk je dat je kind somber is of aan de dood denkt? Bel de huisarts of 113 (0800-0113).",
      },
      {
        kind: "uitleg",
        title: "Stap voor stap terug",
        text: [
          "Samen met school kun je een opbouwplan maken: bijvoorbeeld eerst een paar uur, dan halve dagen, dan weer volledig. Een vast aanspreekpunt op school en een rustige plek om even naartoe te gaan helpen veel kinderen.",
          "Maak de ochtend zo voorspelbaar mogelijk: vaste tijden, de tas de avond ervoor klaar, en een rustig ontbijt. Prijs elke stap, ook kleine.",
          "Maak thuisblijven niet te gezellig: geen hele dag gamen of series. Thuis moet geen beloning worden voor wegblijven.",
        ],
        tip: "Spreek met school af wie je kind ’s ochtends opvangt bij de ingang. Een vertrouwd gezicht maakt de drempel een stuk lager.",
      },
      {
        kind: "zinnen",
        title: "Zinnen voor de ochtend",
        text: "Kies een zin die je kunt gebruiken als het moeilijk is.",
        sentences: [
          "Ik zie dat het moeilijk is. Wat is één ding dat wél lukt vandaag?",
          "Je hoeft het niet perfect te doen. Alleen het eerste uur is al knap.",
          "Ik breng je, en meneer of mevrouw … vangt je op.",
          "Wat je voelt is echt. En ik weet dat je dit stap voor stap kunt.",
        ],
        avoid: ["Stel je niet aan.", "Andere kinderen kunnen het ook.", "Als je niet gaat, krijg je straf."],
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week doen?",
        text: "Kies één stap.",
        actions: [
          "Op een rustig moment vragen wat school zo moeilijk maakt",
          "Contact opnemen met de mentor of zorgcoördinator",
          "De ochtend voorspelbaarder maken: tas klaar, vaste tijden",
          "Vragen om een gesprek met de jeugdarts van de GGD",
          "Afspreken wie mijn kind ’s ochtends opvangt op school",
        ],
      },
    ],
    cheatsheet: [
      "Niet naar school willen is een signaal, geen luiheid. Zoek samen de oorzaak.",
      "Handel snel: hoe langer thuis, hoe moeilijker terug.",
      "’s Ochtends: erken het gevoel, zoek de kleine stap die wél lukt.",
      "Werk samen met mentor, zorgcoördinator en jeugdarts aan een opbouwplan.",
      "Thuis geen beloning: geen hele dag gamen. Prijs elke stap terug naar school.",
    ],
    followUp: {
      goed: "Wat fijn dat er een stap gezet is. Terugval is normaal, bijvoorbeeld na een vakantie of een zieke week. Houd contact met school en bespreek vooraf wat jullie doen als het weer lastig wordt.",
      lastig: "Schoolweigering kan lang duren en vraagt veel van jou als ouder. Blijf niet alleen aanmodderen: vraag school om een zorgoverleg met de jeugdarts erbij. Je hebt recht op meedenken en hulp.",
      niet: "Het kwam er nog niet van, en dat is begrijpelijk als de ochtenden zo zwaar zijn. Kies alleen één ding: een mailtje naar de mentor met de vraag om een gesprek. Dat is genoeg voor deze week.",
    },
  },
  {
    slug: "coming-out",
    emoji: "🌈",
    title: "Als je kind vertelt dat het lhbtiq+ is",
    summary:
      "Je kind vertelt dat het op jongens, meisjes of allebei valt, of zich geen jongen of meisje voelt. Je leert wat je kind op zo’n moment het meest nodig heeft, en hoe je omgaat met je eigen vragen en gevoelens.",
    minutes: 12,
    forWho: "Ouders en verzorgers van kinderen en jongeren van alle leeftijden",
    outcomes: [
      "Je weet wat je zegt op het moment dat je kind het vertelt",
      "Je kunt je eigen gevoelens en vragen een plek geven, zonder dat je kind ze moet dragen",
      "Je weet hoe je je kind steunt tegenover familie, school en de buitenwereld",
      "Je weet waar je zelf en je kind terechtkunnen met vragen",
    ],
    steps: [
      {
        kind: "uitleg",
        title: "Waarom dit moment zo belangrijk is",
        text: [
          "Voor veel jongeren is het vertellen aan hun ouders een van de spannendste momenten uit hun leven. Vaak hebben ze er maanden of jaren over nagedacht.",
          "Jongeren die zich door hun ouders geaccepteerd voelen, gaat het duidelijk beter: ze voelen zich minder somber en angstig. Jouw reactie maakt dus echt verschil, ook als je zelf nog vragen hebt.",
        ],
        tip: "Je hoeft niet alles meteen te begrijpen. Laten merken dat je van je kind houdt, is wat nu het meest telt.",
      },
      {
        kind: "keuze",
        title: "Het moment zelf",
        situation: "Je kind zegt zenuwachtig aan tafel: ‘Ik moet je iets vertellen. Ik val op meisjes.’ Je dochter is 15.",
        question: "Wat zeg je?",
        options: [
          {
            text: "‘Weet je dat zeker? Het is vast een fase.’",
            verdict: "liever niet",
            feedback: "Ook al bedoel je het niet zo, je kind hoort: ik geloof je niet. Jongeren weten dit vaak al lang. Twijfel kun je later met iemand anders bespreken.",
          },
          {
            text: "‘Dank je dat je me dit vertelt. Ik hou van je, en dat verandert hier niet door.’",
            verdict: "goed",
            feedback: "Je bedankt je kind voor het vertrouwen en maakt duidelijk dat je liefde onvoorwaardelijk is. Dat is precies wat je kind op dit moment nodig heeft.",
          },
          {
            text: "‘Oké.’ en dan doorgaan met eten",
            verdict: "kan beter",
            feedback: "Misschien bedoel je het als ‘geen probleem’, maar voor je kind kan het voelen alsof het er niet toe doet. Laat merken dat je het hebt gehoord en dat je het waardeert.",
          },
        ],
      },
      {
        kind: "gesprek",
        title: "Zo kan het klinken",
        text: "Een vervolg op dat moment. Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Dank je dat je het me vertelt. Ik hou van je, precies zoals je bent.", why: "Het allerbelangrijkste eerst: dankbaarheid en liefde." },
          { who: "kind", text: "Ben je niet boos?" },
          { who: "ouder", text: "Nee, helemaal niet. Hoe lang weet je het al?", why: "Je stelt gerust en toont oprechte interesse in het verhaal van je kind." },
          { who: "kind", text: "Al een tijdje. Ik durfde het niet te zeggen." },
          { who: "ouder", text: "Dat moet zwaar zijn geweest, om het zo lang alleen te dragen. Fijn dat dat nu niet meer hoeft.", why: "Je erkent wat je kind heeft doorgemaakt." },
          { who: "ouder", text: "Wie weet het al? En wil je dat ik het voorlopig voor me houd?", why: "Het is het verhaal van je kind. Jij vertelt het niet verder zonder toestemming." },
        ],
      },
      {
        kind: "uitleg",
        title: "Jouw eigen gevoelens",
        text: [
          "Misschien voel je verrassing, zorgen over de toekomst, of zelfs verdriet om een beeld dat je had. Dat is menselijk, en het mag er zijn.",
          "Bespreek die gevoelens vooral met andere volwassenen, zoals je partner, een vriend of andere ouders, en niet met je kind. Je kind moet niet het gevoel krijgen dat het jou moet troosten.",
          "Zorgen over pesten of discriminatie zijn begrijpelijk. Vaak helpt het om die zorgen om te zetten in steun: ‘Als iemand je ooit lastigvalt, wil ik dat je het me vertelt.’",
        ],
        tip: "Bij COC Nederland vind je informatie en contact met andere ouders van lhbtiq+ kinderen.",
      },
      {
        kind: "zinnen",
        title: "Zinnen die steunen",
        text: "Kies een zin die bij jou past.",
        sentences: [
          "Ik ben trots dat je jezelf durft te zijn.",
          "Wil je me erover vertellen als je eraan toe bent? Ik wil het graag begrijpen.",
          "Welke naam of welk woord wil je dat ik gebruik?",
          "Als iemand moeilijk doet, sta ik naast je.",
        ],
        avoid: ["Het is vast een fase.", "Hoe weet je dat nou, je bent nog zo jong?", "Vertel het maar niet aan oma."],
      },
      {
        kind: "keuze",
        title: "Familie en buitenwereld",
        situation: "Een familielid maakt op een verjaardag een kwetsende grap over homo’s, terwijl je kind erbij is.",
        question: "Wat doe je?",
        options: [
          {
            text: "Niets zeggen om de sfeer niet te verpesten",
            verdict: "liever niet",
            feedback: "Je kind ziet dat je zwijgt, en kan dat opvatten als: mijn ouder vindt het eigenlijk ook. Juist zulke momenten tellen.",
          },
          {
            text: "Rustig zeggen: ‘Die grap vind ik niet oké.’ en later met je kind checken hoe het was",
            verdict: "goed",
            feedback: "Je laat zien dat je achter je kind staat, zonder er een scène van te maken en zonder je kind te outen. En je vraagt achteraf hoe het voor je kind was.",
          },
          {
            text: "Meteen vertellen dat je eigen kind lesbisch is, zodat het familielid zich schaamt",
            verdict: "liever niet",
            feedback: "Dan out je je kind zonder toestemming. Het is aan je kind wie het wanneer vertelt.",
          },
        ],
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week doen?",
        text: "Kies één ding.",
        actions: [
          "Mijn kind (nog een keer) zeggen dat ik van hem, haar of hen hou",
          "Vragen wie het al weet, en wat mijn kind wil dat ik wel of niet vertel",
          "Mijn eigen vragen bespreken met een andere volwassene",
          "Informatie lezen bij COC Nederland",
          "Vragen welke naam of welk woord mijn kind fijn vindt",
        ],
      },
    ],
    cheatsheet: [
      "Eerst: ‘Dank je dat je het me vertelt. Ik hou van je.’",
      "Geen ‘het is een fase’. Je kind weet dit vaak al lang.",
      "Jouw gevoelens zijn oké. Bespreek ze met volwassenen, niet met je kind.",
      "Het is het verhaal van je kind: vertel het niet verder zonder toestemming.",
      "Spreek kwetsende grappen aan. Zo weet je kind dat je naast hem, haar of hen staat.",
    ],
    followUp: {
      goed: "Wat mooi. Blijf het onderwerp gewoon maken: vraag naar vrienden, een eventuele vriend of vriendin, en wat je kind bezighoudt. Juist het ‘gewone’ laat zien dat je het accepteert.",
      lastig: "Het kan tijd kosten om aan een nieuw beeld te wennen, voor jou én voor je kind. Zoek steun bij andere ouders, bijvoorbeeld via COC Nederland. En zeg het gerust tegen je kind als je iets onhandig deed: ‘Ik leer nog, help me als ik iets verkeerd zeg.’",
      niet: "Kies één klein moment om je kind te laten merken dat je het hebt onthouden en dat het er mag zijn, bijvoorbeeld door te vragen hoe het met een vriend of vriendin gaat. Meer hoeft niet.",
    },
  },
  {
    slug: "codewoord",
    emoji: "🔑",
    title: "Een geheim codewoord afspreken met je kind",
    summary:
      "Een gewone zin die je kind je kan appen als het ergens weg wil, zonder uitleg en zonder gezichtsverlies. Je spreekt samen een codewoord af en weet precies wat je doet als het binnenkomt.",
    minutes: 8,
    forWho: "Ouders en verzorgers van kinderen van 10 tot 18 jaar",
    outcomes: [
      "Je hebt samen met je kind een codewoord gekozen",
      "Je weet precies wat je doet als het binnenkomt",
      "Je kind weet dat het je altijd kan bereiken, ook voor een vriend(in)",
      "Je weet wanneer je toch meteen 112 belt",
    ],
    steps: [
      {
        kind: "uitleg",
        title: "Waarom een codewoord?",
        text: [
          "Soms zit je kind ergens waar het weg wil: een feestje dat uit de hand loopt, een afspraak die niet goed voelt, iemand die drinkt en wil rijden. Hardop zeggen ‘ik wil naar huis’ voelt dan vaak onmogelijk, bang voor wat anderen denken.",
          "Een codewoord lost dat op. Je kind appt een zin die heel gewoon klinkt. Jij weet: ik moet mijn kind hier weghalen. Niemand die meekijkt, snapt het.",
        ],
        tip: "Het werkt alleen als je kind erop kan vertrouwen dat er geen preek of straf volgt. Die belofte is het belangrijkste deel van de afspraak.",
      },
      {
        kind: "keuze",
        title: "Een goed codewoord",
        situation: "Je wilt samen een codewoord kiezen.",
        question: "Welk codewoord werkt het best?",
        options: [
          {
            text: "‘HELP, kom me halen!’",
            verdict: "liever niet",
            feedback: "Iedereen die meekijkt, snapt het meteen. Dan durft je kind het juist niet te sturen.",
          },
          {
            text: "Een gewone zin die je kind zelf kiest, zoals ‘Heb jij de vuilnis buitengezet?’",
            verdict: "goed",
            feedback: "Het klinkt doodnormaal en je kind heeft het zelf bedacht, dus het onthoudt het en voelt zich er eigenaar van.",
          },
          {
            text: "Een moeilijke code met cijfers die jij bedenkt",
            verdict: "kan beter",
            feedback: "Op een spannend moment vergeet je kind een ingewikkelde code. Kies iets simpels dat je kind zelf bedenkt.",
          },
        ],
      },
      {
        kind: "checklist",
        title: "De afspraak",
        text: "Spreek samen deze dingen af. Vink aan wat jullie hebben besproken.",
        items: [
          "We hebben een codewoord gekozen dat normaal klinkt",
          "Als het binnenkomt, bel ik meteen en verzin ik een reden om mijn kind op te halen",
          "Onderweg stel ik geen vragen, tenzij mijn kind zelf wil praten",
          "Er volgt geen straf en geen preek voor het gebruiken van het codewoord",
          "Het codewoord mag ook gebruikt worden om een vriend(in) te helpen",
          "We weten wie we bellen als ik niet bereikbaar ben (een ander vertrouwd persoon)",
        ],
        after: "Sla het codewoord op in je telefoon, zodat je het herkent als het binnenkomt.",
      },
      {
        kind: "gesprek",
        title: "Zo kun je het voorstellen",
        text: "Tik op een zin van de ouder om te zien waarom die werkt.",
        lines: [
          { who: "ouder", text: "Ik wil iets met je afspreken, gewoon voor de zekerheid. Geen zorgen, er is niks aan de hand.", why: "Je maakt meteen duidelijk dat het geen verhoor is." },
          { who: "kind", text: "Oké… wat dan?" },
          { who: "ouder", text: "Als je ooit ergens bent waar je weg wil, app je me een zin die heel gewoon klinkt. Dan bel ik je en verzin ik een reden om je op te halen.", why: "Je legt het simpel uit, zonder voorbeelden die eng klinken." },
          { who: "kind", text: "En dan ga je me de hele weg uithoren." },
          { who: "ouder", text: "Nee. Onderweg vraag ik niks. Alleen als jij wilt praten. En je krijgt er nooit straf voor.", why: "Dit is de belofte die het codewoord laat werken." },
          { who: "ouder", text: "Welke zin wil jij? Kies maar iets wat niemand zou snappen.", why: "Je kind kiest zelf, dus het onthoudt het en voelt zich er eigenaar van." },
        ],
      },
      {
        kind: "keuze",
        title: "Het codewoord komt binnen",
        situation: "Het is zaterdagavond. Je kind appt: ‘Heb jij de vuilnis buitengezet?’",
        question: "Wat doe je?",
        options: [
          {
            text: "Terugappen: ‘Huh? Waarom vraag je dat?’",
            verdict: "liever niet",
            feedback: "Je kind heeft je nu nodig, zonder uitleg. Bel meteen.",
          },
          {
            text: "Meteen bellen: ‘Je moet nu naar huis komen, oma is ziek. Ik kom je halen.’",
            verdict: "goed",
            feedback: "Je geeft je kind een reden om weg te gaan zonder gezichtsverlies. Precies zoals afgesproken.",
          },
          {
            text: "Ophalen, en in de auto meteen vragen wat er aan de hand was",
            verdict: "kan beter",
            feedback: "Ophalen is goed, maar je had beloofd geen vragen te stellen. Laat je kind zelf kiezen of en wanneer het erover wil praten.",
          },
        ],
      },
      {
        kind: "uitleg",
        title: "Wanneer je wél meteen hulp inschakelt",
        text: [
          "Is er direct gevaar, is iemand gewond of heeft iemand te veel gedronken of gebruikt? Bel dan meteen 112, ook als je kind het codewoord stuurde.",
          "Wil je kind later toch praten over wat er gebeurde, en maak je je zorgen? Je kunt anoniem advies vragen bij de Kindertelefoon (0800-0432, voor je kind) of bij 113 (0800-0113) als het gaat om gedachten aan de dood.",
          "Soms gebruikt een kind het codewoord niet voor zichzelf, maar voor een vriend(in) die niemand heeft om te bellen. Zeg dat dat altijd mag.",
        ],
        tip: "Vertel je kind dat het codewoord ook werkt als het zelf iets doms heeft gedaan. Juist dan is het belangrijk dat je kind belt.",
      },
      {
        kind: "plan",
        title: "Wat ga jij deze week doen?",
        text: "Kies één ding.",
        actions: [
          "Vandaag het codewoord voorstellen, bijvoorbeeld in de auto of tijdens het koken",
          "Samen een zin kiezen en die opslaan in mijn telefoon",
          "Afspreken wie we bellen als ik niet bereikbaar ben",
          "Mijn kind vertellen dat het codewoord ook voor een vriend(in) mag",
        ],
      },
    ],
    cheatsheet: [
      "Een gewone zin die je kind zelf kiest, bijvoorbeeld ‘Heb jij de vuilnis buitengezet?’",
      "Komt het binnen: meteen bellen, een reden verzinnen en je kind ophalen.",
      "Onderweg geen vragen, en nooit straf voor het gebruiken.",
      "Het mag ook voor een vriend(in).",
      "Bij direct gevaar of als iemand gewond is: altijd 112.",
    ],
    followUp: {
      goed: "Fijn dat jullie een codewoord hebben. Noem het af en toe nog eens terloops, bijvoorbeeld voor een feestje: ‘Je weet ons woord nog, hè?’ Dan blijft het vers.",
      lastig: "Misschien vond je kind het ongemakkelijk of kinderachtig. Dat is normaal. Laat het even rusten en zeg alleen: ‘Het aanbod staat. Als je ooit wilt, app me gewoon iets geks.’ Ook dat werkt.",
      niet: "Het kwam er nog niet van. Kies één rustig moment deze week, bijvoorbeeld samen in de auto, en zeg alleen de eerste zin uit het voorbeeldgesprek. Meer hoeft niet.",
    },
  },
];
