import type { ReadingTask } from "@/lib/types";
import { readingA1 } from "./a1";
import { readingA2 } from "./a2";
import { readingB1 } from "./b1";
import { readingB2 } from "./b2";
import { byLevel } from "../order";

// Original texts written in the style of Norskprøven. Not official exam material.
const baseTasks: ReadingTask[] = [
  {
    id: "beskjed-fra-laereren",
    level: "A1",
    title: "Beskjed fra læreren",
    genre: "Melding",
    paragraphs: [
      "Hei alle sammen!",
      "I morgen har vi ikke norskkurs klokka 9. Kurset begynner klokka 11 i stedet. Vi er i rom 204 i andre etasje. Husk å ta med boka.",
    ],
    signature: "Hilsen Marit",
    glossary: [
      ["i stedet", "som erstatning for noe annet"],
      ["etasje", "et plan i et hus, for eksempel første eller andre"],
      ["husk", "ikke glem"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Når begynner kurset i morgen?",
        options: ["Klokka 9", "Klokka 11", "Klokka 14"],
        answer: 1,
        explanation: "Det står: «Kurset begynner klokka 11 i stedet.» «I stedet» betyr at klokka 11 erstatter klokka 9.",
      },
      {
        kind: "truefalse",
        prompt: "Kurset er i første etasje.",
        answer: false,
        explanation: "Rom 204 er i andre etasje.",
      },
      {
        kind: "choice",
        prompt: "Hva skal elevene ta med?",
        options: ["Boka", "En penn", "Mat"],
        answer: 0,
        explanation: "Marit skriver: «Husk å ta med boka.»",
      },
    ],
  },
  {
    id: "sykkel-til-salgs",
    level: "A1",
    title: "Sykkel til salgs",
    genre: "Annonse",
    paragraphs: [
      "Rød damesykkel til salgs. Sykkelen er tre år gammel og i god stand.",
      "Pris: 1500 kroner. Sykkelen står i Bergen sentrum. Send melding til Jonas etter klokka 16.",
    ],
    glossary: [
      ["til salgs", "noen vil selge det"],
      ["i god stand", "ikke ødelagt, fungerer bra"],
      ["sentrum", "midten av byen"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvor mye koster sykkelen?",
        options: ["150 kroner", "1500 kroner", "15 000 kroner"],
        answer: 1,
        explanation: "Det står «Pris: 1500 kroner».",
      },
      {
        kind: "truefalse",
        prompt: "Sykkelen er ny.",
        answer: false,
        explanation: "Sykkelen er tre år gammel, så den er ikke ny.",
      },
      {
        kind: "choice",
        prompt: "Når kan du kontakte Jonas?",
        options: ["Om morgenen", "Før klokka 16", "Etter klokka 16"],
        answer: 2,
        explanation: "Annonsen sier: «Send melding til Jonas etter klokka 16.»",
      },
    ],
  },
  {
    id: "nye-apningstider",
    level: "A2",
    title: "Nye åpningstider på legesenteret",
    genre: "Oppslag",
    paragraphs: [
      "Fra 1. desember har legesenteret nye åpningstider. Vi er åpne mandag til torsdag fra klokka 8 til 16, og fredag fra klokka 8 til 14. Legesenteret er stengt i helgene.",
      "Hvis du blir akutt syk når vi er stengt, må du ringe legevakten på 116 117. Du kan bestille time på nettsiden vår, eller ringe oss mellom klokka 8 og 10.",
    ],
    signature: "Frisk legesenter",
    glossary: [
      ["åpningstider", "når et sted er åpent"],
      ["akutt", "plutselig og alvorlig, må få hjelp med en gang"],
      ["legevakten", "et sted du kan få hjelp av lege når legekontoret er stengt"],
      ["bestille time", "avtale et tidspunkt hos legen"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Når stenger legesenteret på fredager?",
        options: ["Klokka 14", "Klokka 16", "Klokka 10"],
        answer: 0,
        explanation: "På fredag er legesenteret åpent «fra klokka 8 til 14».",
      },
      {
        kind: "truefalse",
        prompt: "Legesenteret er åpent på lørdager.",
        answer: false,
        explanation: "Legesenteret «er stengt i helgene», og lørdag er en del av helgen.",
      },
      {
        kind: "choice",
        prompt: "Hva skal du gjøre hvis du blir akutt syk på en søndag?",
        options: ["Ringe legesenteret", "Ringe legevakten", "Bestille time på nettsiden"],
        answer: 1,
        explanation: "Når legesenteret er stengt og du blir akutt syk, skal du ringe legevakten på 116 117.",
      },
      {
        kind: "truefalse",
        prompt: "Du kan ringe og bestille time klokka 9.",
        answer: true,
        explanation: "Du kan ringe «mellom klokka 8 og 10», og klokka 9 er innenfor den tiden.",
      },
    ],
  },
  {
    id: "e-post-fra-kollega",
    level: "A2",
    title: "E-post fra en kollega",
    genre: "E-post",
    paragraphs: [
      "Hei Samira!",
      "Takk for hjelpen i går. Jeg er syk i dag, så jeg kan dessverre ikke komme på møtet klokka 13. Kan du ta notater for meg?",
      "Jeg har lagt rapporten på skrivebordet ditt. Les gjerne gjennom den før møtet. Jeg tror jeg er tilbake på jobb på torsdag.",
    ],
    signature: "Hilsen Per",
    glossary: [
      ["dessverre", "brukes når man sier noe som er synd"],
      ["ta notater", "skrive ned det viktigste som blir sagt"],
      ["les gjerne", "en høflig måte å be noen om å lese"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvorfor kommer ikke Per på møtet?",
        options: ["Han er på ferie", "Han er syk", "Han har et annet møte"],
        answer: 1,
        explanation: "Per skriver: «Jeg er syk i dag.»",
      },
      {
        kind: "choice",
        prompt: "Hva ber Per Samira om?",
        options: ["Å ta notater på møtet", "Å skrive rapporten", "Å avlyse møtet"],
        answer: 0,
        explanation: "Per spør: «Kan du ta notater for meg?»",
      },
      {
        kind: "truefalse",
        prompt: "Rapporten ligger på skrivebordet til Per.",
        answer: false,
        explanation: "Per har lagt rapporten på «skrivebordet ditt», altså på skrivebordet til Samira.",
      },
      {
        kind: "truefalse",
        prompt: "Per regner med å være tilbake på torsdag.",
        answer: true,
        explanation: "Han skriver: «Jeg tror jeg er tilbake på jobb på torsdag.»",
      },
    ],
  },
  {
    id: "flere-sykler-til-jobben",
    level: "B1",
    title: "Flere sykler til jobben",
    genre: "Artikkel",
    paragraphs: [
      "Antallet som sykler til jobben i norske byer, har økt de siste årene. I Oslo har kommunen bygget mange nye sykkelveier, og det har blitt lettere å leie elsykkel. Mange sier at de sparer tid fordi de slipper å stå i kø. Andre forteller at de får mer energi og sover bedre.",
      "Likevel er ikke alle fornøyde. Noen bilister mener at sykkelveiene tar for mye plass, og at det har blitt vanskeligere å finne parkering i sentrum. Om vinteren er det dessuten mange som synes det er for kaldt og glatt til å sykle.",
      "Kommunen håper at enda flere skal begynne å sykle. Målet er at færre biler i sentrum skal gi renere luft og mindre støy.",
    ],
    glossary: [
      ["antallet", "hvor mange det er"],
      ["slipper å", "trenger ikke å"],
      ["likevel", "selv om det som ble sagt før, er sant"],
      ["dessuten", "i tillegg"],
      ["støy", "høy og ubehagelig lyd"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvorfor har det blitt lettere å sykle i Oslo?",
        options: [
          "Det har blitt varmere om vinteren",
          "Det finnes flere sykkelveier og elsykler til leie",
          "Det er blitt billigere å kjøpe sykkel",
        ],
        answer: 1,
        explanation: "Teksten sier at kommunen har bygget nye sykkelveier, og at det er lettere å leie elsykkel.",
      },
      {
        kind: "choice",
        prompt: "Hva er en ulempe ifølge noen bilister?",
        options: [
          "Sykkelveiene tar mye plass",
          "Syklistene kjører for fort",
          "Elsyklene er for dyre",
        ],
        answer: 0,
        explanation: "Noen bilister «mener at sykkelveiene tar for mye plass».",
      },
      {
        kind: "truefalse",
        prompt: "Alle som sykler til jobben, gjør det hele året.",
        answer: false,
        explanation: "Teksten sier at mange synes det er for kaldt og glatt til å sykle om vinteren.",
      },
      {
        kind: "choice",
        prompt: "Hva er målet til kommunen?",
        options: ["Flere parkeringsplasser", "Renere luft og mindre støy", "Billigere elsykler"],
        answer: 1,
        explanation: "Målet er at færre biler skal gi «renere luft og mindre støy».",
      },
    ],
  },
  {
    id: "tur-med-barnehagen",
    level: "B1",
    title: "Tur med barnehagen",
    genre: "Informasjon",
    paragraphs: [
      "Kjære foreldre!",
      "Neste fredag skal vi på tur til Sognsvann. Vi går fra barnehagen klokka 9 og er tilbake rundt klokka 15. Barna må ha med seg matpakke, drikkeflaske og ekstra klær, fordi det kan bli kaldt ved vannet. Vi anbefaler gode sko, ettersom vi skal gå ganske langt.",
      "Hvis barnet ditt ikke kan være med på turen, må du gi beskjed til de ansatte innen onsdag. Barn som ikke skal på tur, kan være i barnehagen sammen med en av de ansatte.",
      "Dersom det regner kraftig, blir turen utsatt til uka etter. Vi sender en melding i appen torsdag kveld hvis det blir endringer.",
    ],
    signature: "Hilsen alle oss på Solsikken avdeling",
    glossary: [
      ["ettersom", "fordi"],
      ["innen", "senest, før et tidspunkt"],
      ["dersom", "hvis"],
      ["utsatt", "flyttet til et senere tidspunkt"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvorfor skal barna ha med ekstra klær?",
        options: ["Fordi de skal bade", "Fordi det kan bli kaldt", "Fordi de skal sove ute"],
        answer: 1,
        explanation: "Barna trenger ekstra klær «fordi det kan bli kaldt ved vannet».",
      },
      {
        kind: "choice",
        prompt: "Hva må foreldrene gjøre hvis barnet ikke skal være med?",
        options: ["Ringe på fredag", "Gi beskjed innen onsdag", "Hente barnet klokka 9"],
        answer: 1,
        explanation: "Foreldrene «må gi beskjed til de ansatte innen onsdag».",
      },
      {
        kind: "truefalse",
        prompt: "Hvis det regner mye, blir turen avlyst for godt.",
        answer: false,
        explanation: "Turen blir ikke avlyst. Den blir «utsatt til uka etter».",
      },
      {
        kind: "choice",
        prompt: "Hvordan får foreldrene vite om endringer?",
        options: [
          "På en lapp i barnehagen",
          "Gjennom en melding i appen",
          "På e-post fredag morgen",
        ],
        answer: 1,
        explanation: "Barnehagen sender «en melding i appen torsdag kveld».",
      },
    ],
  },
  {
    id: "hjemmekontor-som-rettighet",
    level: "B2",
    title: "Bør hjemmekontor bli en rettighet?",
    genre: "Debattinnlegg",
    paragraphs: [
      "Under pandemien ble hjemmekontor plutselig hverdagen for svært mange nordmenn. Mange oppdaget at de jobbet mer effektivt uten avbrytelser, og at de fikk bedre tid til familien når de slapp å pendle. Det er derfor ikke rart at flere nå krever at hjemmekontor skal bli en lovfestet rettighet.",
      "Jeg mener likevel at et slikt krav går for langt. For det første er ikke alle yrker egnet for hjemmekontor, og en rettighet for noen kan oppleves som urettferdig for andre. For det andre lærer nyansatte ofte mindre når de sjelden møter kollegene sine. Uformelle samtaler ved kaffemaskinen er ofte viktigere enn vi tror.",
      "En bedre løsning er at arbeidsgiver og ansatte blir enige om en fleksibel ordning som passer den enkelte arbeidsplassen. Da kan vi ta vare på fordelene ved hjemmekontor uten å miste fellesskapet.",
    ],
    glossary: [
      ["avbrytelser", "når noe stopper det du holder på med"],
      ["pendle", "reise frem og tilbake mellom hjem og jobb"],
      ["lovfestet", "bestemt i en lov"],
      ["egnet for", "passende for"],
      ["fellesskapet", "følelsen av å høre sammen med andre"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva er skribentens hovedsyn?",
        options: [
          "Hjemmekontor bør bli en lovfestet rettighet",
          "Hjemmekontor bør forbys",
          "Hver arbeidsplass bør finne en fleksibel ordning",
        ],
        answer: 2,
        explanation: "Skribenten mener at «en bedre løsning» er en fleksibel ordning for hver arbeidsplass.",
      },
      {
        kind: "choice",
        prompt: "Hvilket argument bruker skribenten mot en rettighet?",
        options: [
          "Nyansatte lærer mindre når de sjelden møter kolleger",
          "Hjemmekontor er dårlig for miljøet",
          "Folk jobber mindre når de er hjemme",
        ],
        answer: 0,
        explanation: "Det andre argumentet er at nyansatte «lærer mindre når de sjelden møter kollegene sine».",
      },
      {
        kind: "truefalse",
        prompt: "Skribenten mener at hjemmekontor ikke har noen fordeler.",
        answer: false,
        explanation: "Skribenten vil «ta vare på fordelene ved hjemmekontor», så hen ser fordeler.",
      },
      {
        kind: "choice",
        prompt: "Hva betyr «egnet for» i teksten?",
        options: ["Passende for", "Betalt for", "Forbudt for"],
        answer: 0,
        explanation: "Et yrke som er «egnet for» hjemmekontor, passer til å gjøres hjemmefra.",
      },
    ],
  },
  {
    id: "abonnementsfellen",
    level: "B2",
    title: "Abonnementsfellen",
    genre: "Artikkel",
    paragraphs: [
      "Stadig flere forbrukere oppdager at de betaler for abonnementer de knapt bruker. Strømmetjenester, treningsapper og matkasser blir ofte trukket automatisk fra kontoen hver måned, og mange mister oversikten. Når folk blir spurt, tror de gjerne at de bruker noen hundrelapper i måneden, mens det reelle beløpet ofte er dobbelt så høyt.",
      "Problemet forsterkes av at det som regel er enkelt å melde seg på, men tungvint å si opp. Noen selskaper krever at kunden ringer kundeservice, eller de skjuler oppsigelsesknappen langt nede i innstillingene. Flere mener derfor at det bør være like lett å avslutte et abonnement som å starte det.",
      "Eksperter anbefaler å gå gjennom kontoutskriften minst to ganger i året og si opp tjenester man ikke har brukt den siste måneden.",
    ],
    glossary: [
      ["knapt", "nesten ikke"],
      ["oversikten", "å vite hvordan alt henger sammen"],
      ["det reelle beløpet", "hvor mye det faktisk er"],
      ["tungvint", "vanskelig og tar lang tid"],
      ["si opp", "avslutte en avtale"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva er hovedproblemet teksten beskriver?",
        options: [
          "Det er for dyrt å starte et abonnement",
          "Folk mister oversikten over hva de betaler for",
          "Strømmetjenester har for lite innhold",
        ],
        answer: 1,
        explanation: "Teksten handler om at mange «mister oversikten» over abonnementene sine.",
      },
      {
        kind: "choice",
        prompt: "Hva sier teksten om hvor mye folk bruker?",
        options: [
          "Folk bruker ofte mer enn de tror",
          "Folk bruker mindre enn de tror",
          "Folk vet nøyaktig hvor mye de bruker",
        ],
        answer: 0,
        explanation: "Det reelle beløpet er ofte «dobbelt så høyt» som det folk tror.",
      },
      {
        kind: "truefalse",
        prompt: "Det er som regel like lett å si opp som å melde seg på.",
        answer: false,
        explanation: "Teksten sier at det er «enkelt å melde seg på, men tungvint å si opp».",
      },
      {
        kind: "choice",
        prompt: "Hva anbefaler ekspertene?",
        options: [
          "Å betale med kort i stedet for faktura",
          "Å gå gjennom kontoutskriften jevnlig",
          "Å bare ha ett abonnement",
        ],
        answer: 1,
        explanation: "Ekspertene anbefaler å gå gjennom kontoutskriften «minst to ganger i året».",
      },
    ],
  },
  {
    id: "hvor-skal-de-ga",
    level: "A1",
    title: "Hvor skal de gå?",
    genre: "Koble sammen",
    paragraphs: ["Les om personene. Hvilket sted passer for hver person? Ett sted passer ikke for noen."],
    glossary: [
      ["medisin", "noe du tar når du er syk"],
      ["låne", "få noe og levere det tilbake senere"],
    ],
    questions: [
      {
        kind: "match",
        prompt: "Hvilket sted passer for hver person?",
        left: [
          "Amir trenger medisin mot hodepine.",
          "Lena vil kjøpe brød og melk.",
          "Tomas skal sende en pakke til mora si.",
          "Sara vil låne en bok.",
        ],
        right: ["Bibliotek", "Apotek", "Frisør", "Postkontor", "Matbutikk"],
        answer: [1, 4, 3, 0],
        explanation:
          "Medisin kjøper man på apotek, brød og melk i matbutikken, pakker sendes fra posten, og bøker låner man på biblioteket. Frisøren passer ikke for noen.",
      },
    ],
  },
  {
    id: "kveldskurs",
    level: "A2",
    title: "Kveldskurs i kommunen",
    genre: "Koble sammen",
    paragraphs: [
      "Kommunen har kveldskurs denne høsten. Les annonsene og finn det kurset som passer best for hver person. Ett kurs passer ikke for noen.",
    ],
    glossary: [
      ["nybegynnere", "folk som akkurat har begynt å lære noe"],
      ["inkludert", "med i prisen"],
      ["uttale", "hvordan man sier ordene"],
    ],
    questions: [
      {
        kind: "match",
        prompt: "Hvilket kurs passer for hver person?",
        left: [
          "Jamila vil bli flinkere til å snakke norsk, men hun har ikke mye penger.",
          "Henrik synes det er vanskelig å fylle ut skjemaer på nettet.",
          "Ana liker å lage mat og vil prøve retter fra andre land.",
          "Mohammed har vondt i ryggen og vil trene, men ikke for hardt.",
        ],
        right: [
          "Strikkekurs for nybegynnere. Vi lærer å strikke lue og votter. Garn er inkludert. Tirsdager kl. 18.",
          "Norsk samtalegruppe. Vi snakker om hverdagen og øver på uttale. Gratis. Torsdager kl. 19.",
          "Matlaging fra hele verden. Hver uke lager vi en ny rett sammen og spiser etterpå. Mandager kl. 17.",
          "Bli kjent med PC-en. Lær å bruke e-post, nettbank og digitale skjemaer. Onsdager kl. 18.",
          "Yoga for alle. Rolig trening for kropp og pust. Ta med egen matte. Fredager kl. 16.",
        ],
        answer: [1, 3, 2, 4],
        explanation:
          "Jamila passer til den gratis samtalegruppen (B), Henrik til PC-kurset med digitale skjemaer (D), Ana til matlaging fra hele verden (C) og Mohammed til rolig yoga (E). Strikkekurset passer ingen.",
      },
    ],
  },
  {
    id: "dugnad",
    level: "B1",
    title: "Dugnad",
    genre: "Overskrifter",
    paragraphs: [
      "1. I Norge er dugnad en gammel tradisjon. Naboer, foreldre eller medlemmer i et lag jobber gratis sammen for å gjøre noe for fellesskapet, for eksempel å rydde en lekeplass eller male et klubbhus.",
      "2. Mange som er nye i Norge, blir overrasket første gang de blir invitert. Ofte står det bare et tidspunkt og et sted i invitasjonen, og det kan være vanskelig å forstå at alle faktisk forventes å komme.",
      "3. Selv om arbeidet er viktig, handler dugnaden like mye om det sosiale. Etter jobben samles folk gjerne rundt kaffe og vafler, og mange blir kjent med naboene sine på denne måten.",
      "4. Det er likevel ikke alle som liker dugnad. Noen synes det er urettferdig at de samme personene alltid gjør mest, og flere borettslag velger nå heller å betale et firma for å gjøre jobben.",
    ],
    glossary: [
      ["fellesskapet", "alle som hører sammen, for eksempel i et nabolag"],
      ["forventes", "andre regner med at du gjør det"],
      ["borettslag", "en gruppe leiligheter som eies sammen"],
    ],
    questions: [
      {
        kind: "match",
        prompt: "Hvilken overskrift passer til hvert avsnitt? Én overskrift passer ikke.",
        left: ["Avsnitt 1", "Avsnitt 2", "Avsnitt 3", "Avsnitt 4"],
        right: [
          "Vafler og nye vennskap",
          "Når ikke alle vil være med",
          "Hva er dugnad?",
          "God lønn for arbeidet",
          "En invitasjon som kan misforstås",
        ],
        answer: [2, 4, 0, 1],
        explanation:
          "Avsnitt 1 forklarer hva dugnad er, avsnitt 2 handler om invitasjonen, avsnitt 3 om det sosiale med kaffe og vafler, og avsnitt 4 om dem som ikke liker dugnad. Dugnad er gratis, så «God lønn for arbeidet» passer ikke.",
      },
    ],
  },
  {
    id: "bestille-time",
    level: "A2",
    title: "Slik bestiller du time hos fastlegen",
    genre: "Rekkefølge",
    paragraphs: ["Du vil bestille time hos fastlegen på nettet. Sett stegene i riktig rekkefølge."],
    glossary: [
      ["fastlegen", "legen du alltid går til"],
      ["bekreftelse", "en melding som viser at noe er i orden"],
    ],
    questions: [
      {
        kind: "order",
        prompt: "Sett stegene i riktig rekkefølge.",
        items: [
          "Gå inn på nettsiden til legekontoret.",
          "Logg inn med BankID.",
          "Velg «Bestill time» og skriv kort hvorfor du trenger time.",
          "Velg en dag og et klokkeslett som passer.",
          "Vent på bekreftelsen på SMS.",
        ],
        explanation:
          "Først går du inn på nettsiden og logger inn. Så skriver du hvorfor du trenger time, velger tidspunkt og får til slutt en bekreftelse.",
      },
    ],
  },
  {
    id: "en-uvanlig-morgen",
    level: "B1",
    title: "En uvanlig morgen",
    genre: "Rekkefølge",
    paragraphs: ["Setningene under er fra en kort fortelling. Sett dem i riktig rekkefølge."],
    glossary: [
      ["i full fart", "veldig raskt"],
      ["oppdaget", "fant ut"],
    ],
    questions: [
      {
        kind: "order",
        prompt: "Sett setningene i riktig rekkefølge.",
        items: [
          "Da Leila våknet, var det helt stille i leiligheten.",
          "Hun så på mobilen og skjønte at alarmen ikke hadde ringt.",
          "Klokka var allerede halv ni, og møtet på jobben begynte klokka ni.",
          "Hun kledde på seg i full fart og løp ut døra uten frokost.",
          "Først på bussen oppdaget hun at det var lørdag.",
        ],
        explanation:
          "Fortellingen følger tiden: Leila våkner, ser at alarmen ikke har ringt, skynder seg ut, og til slutt forstår hun at det er lørdag. Ord som «da», «allerede» og «først» hjelper deg med rekkefølgen.",
      },
    ],
  },
  {
    id: "klagebrev",
    level: "B2",
    title: "Et klagebrev",
    genre: "Rekkefølge",
    paragraphs: ["Avsnittene under er fra et formelt klagebrev. Sett dem i riktig rekkefølge."],
    glossary: [
      ["sentrifugere", "når vaskemaskinen snurrer fort for å få ut vannet"],
      ["innen", "senest"],
    ],
    questions: [
      {
        kind: "order",
        prompt: "Sett avsnittene i riktig rekkefølge.",
        items: [
          "Jeg skriver for å klage på en vaskemaskin jeg kjøpte i butikken deres 3. mars.",
          "Etter bare to uker sluttet maskinen å sentrifugere, og nå lekker den vann på gulvet.",
          "Jeg tok kontakt med kundeservice for ti dager siden, men har fortsatt ikke fått svar.",
          "Jeg ber derfor om at dere enten reparerer maskinen eller gir meg en ny innen 14 dager.",
          "Jeg ser frem til å høre fra dere.",
        ],
        explanation:
          "Et formelt klagebrev begynner med hva klagen gjelder, beskriver problemet, forteller hva du har gjort, sier hva du krever og avslutter høflig.",
      },
    ],
  },
  {
    id: "hilsen-fra-tromso",
    level: "A1",
    title: "Hilsen fra Tromsø",
    genre: "Fyll inn",
    paragraphs: ["Sofia skriver en melding til venninnen sin. Velg riktig ord i hvert hull."],
    glossary: [
      ["nordlyset", "farget lys på himmelen om natta i nord"],
      ["hundespann", "en slede som blir trukket av hunder"],
    ],
    questions: [
      {
        kind: "gap",
        prompt: "Velg riktig ord.",
        segments: [
          "Hei Anna! Nå er jeg i Tromsø. Det er veldig ",
          { options: ["kald", "kaldt", "kalde"], answer: 1 },
          " her, men byen er fin. I går ",
          { options: ["ser", "så", "sett"], answer: 1 },
          " jeg nordlyset for første gang! I morgen skal vi ",
          { options: ["på", "til", "i"], answer: 0 },
          " tur med hundespann. Jeg kommer hjem ",
          { options: ["på", "i", "om"], answer: 0 },
          " søndag. Klem fra Sofia",
        ],
        explanation:
          "«Det er kaldt» (t-form etter «det er»), «i går så jeg» (fortid av «se»), «på tur» og «på søndag».",
      },
    ],
  },
  {
    id: "til-utleieren",
    level: "A2",
    title: "E-post til utleieren",
    genre: "Fyll inn",
    paragraphs: ["Ali skriver til utleieren sin. Velg riktig ord i hvert hull."],
    glossary: [
      ["utleieren", "personen som eier leiligheten du leier"],
      ["tett", "vannet renner ikke ut"],
    ],
    questions: [
      {
        kind: "gap",
        prompt: "Velg riktig ord.",
        segments: [
          "Hei Kari! Jeg ",
          { options: ["bor", "bodde", "bo"], answer: 0 },
          " i leiligheten i Storgata 5. Vasken på badet har vært tett ",
          { options: ["siden", "for", "i"], answer: 0 },
          " fredag. Kan du sende noen ",
          { options: ["som", "hvem", "hva"], answer: 0 },
          " kan fikse den? Jeg er hjemme ",
          { options: ["hver", "alle", "noen"], answer: 0 },
          " dag etter klokka 16. ",
          { options: ["Vennlig hilsen", "Ha det bra", "Klem"], answer: 0 },
          " Ali",
        ],
        explanation:
          "«Jeg bor» (nåtid), «siden fredag» (fra et tidspunkt i fortiden til nå), «noen som kan», «hver dag», og «Vennlig hilsen» passer i en litt formell e-post.",
      },
    ],
  },
  {
    id: "fire-dager-i-uka",
    level: "B2",
    title: "Fire dager i uka?",
    genre: "Fyll inn",
    paragraphs: ["Velg ordet som binder teksten best sammen."],
    glossary: [
      ["overbevist", "sikker på at noe er riktig"],
      ["innføres", "begynne å brukes"],
      ["bransjene", "de ulike typene arbeidsplasser"],
    ],
    questions: [
      {
        kind: "gap",
        prompt: "Velg riktig ord eller uttrykk.",
        segments: [
          "Flere bedrifter i Europa har testet firedagersuke. ",
          { options: ["Ifølge", "Derfor", "Selv om"], answer: 0 },
          " forsøkene ble de ansatte mindre stresset, og mange jobbet like effektivt som før. ",
          { options: ["Likevel", "Dessuten", "Fordi"], answer: 0 },
          " er ikke alle overbevist. Kritikere peker på at ordningen passer dårlig i yrker der noen må være til stede hele tiden, ",
          { options: ["for eksempel", "i motsetning til", "dermed"], answer: 0 },
          " på sykehus og i barnehager. ",
          { options: ["Dersom", "Mens", "Ettersom"], answer: 0 },
          " ordningen skal innføres i Norge, må den ",
          { options: ["derfor", "imidlertid", "for eksempel"], answer: 0 },
          " tilpasses de ulike bransjene.",
        ],
        explanation:
          "«Ifølge forsøkene» viser til hva forsøkene fant, «Likevel» viser kontrast, «for eksempel» innleder eksempler, «Dersom» er en betingelse og «derfor» en konsekvens.",
      },
    ],
  },
];

export const readingTasks: ReadingTask[] = byLevel([...baseTasks, ...readingA1, ...readingA2, ...readingB1, ...readingB2]);

export function getReadingTask(id: string) {
  return readingTasks.find((t) => t.id === id);
}

/** Task ids for the free trial, and how many tasks per level the adaptive full test draws (two stages like the real exam). */
export const readingTests = {
  trial: ["nye-apningstider", "kveldskurs", "en-uvanlig-morgen"],
  full: {
    minutes: 60,
    stage1: { A2: 2, B1: 2 },
    easy: { A1: 3, A2: 3 },
    hard: { B1: 3, B2: 4 },
  },
};
