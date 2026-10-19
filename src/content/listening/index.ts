import type { ListeningTask } from "@/lib/types";
import { listeningA1 } from "./a1";
import { listeningA2 } from "./a2";
import { listeningB1 } from "./b1";
import { listeningB2 } from "./b2";
import { byLevel } from "../order";

// Original scripts written in the style of Norskprøven. Read aloud by the browser's Norwegian voice.
const baseTasks: ListeningTask[] = [
  {
    id: "pa-kafeen",
    level: "A1",
    title: "På kafeen",
    genre: "Samtale",
    situation: "Du hører en samtale på en kafé mellom en ansatt og Mina.",
    speakers: { A: "Ansatt", B: "Mina" },
    maxPlays: 2,
    lines: [
      { speaker: "A", text: "Hei! Hva skal det være?" },
      { speaker: "B", text: "Hei. Jeg vil gjerne ha en kaffe og en kanelbolle." },
      { speaker: "A", text: "Liten eller stor kaffe?" },
      { speaker: "B", text: "Stor, takk. Med melk." },
      { speaker: "A", text: "Skal du spise her eller ta med?" },
      { speaker: "B", text: "Jeg tar det med. Hva koster det?" },
      { speaker: "A", text: "Det blir åtti kroner." },
      { speaker: "B", text: "Kan jeg betale med kort?" },
      { speaker: "A", text: "Ja, selvfølgelig." },
    ],
    glossary: [
      ["kanelbolle", "en søt bolle med kanel"],
      ["ta med", "ta maten med seg ut"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva kjøper Mina?",
        options: ["En te og en kanelbolle", "En stor kaffe og en kanelbolle", "En liten kaffe og en vaffel"],
        answer: 1,
        explanation: "Mina vil ha «en kaffe og en kanelbolle», og hun velger stor kaffe.",
      },
      {
        kind: "choice",
        prompt: "Hvor mye koster det?",
        options: ["18 kroner", "80 kroner", "88 kroner"],
        answer: 1,
        explanation: "Den ansatte sier: «Det blir åtti kroner.»",
      },
      {
        kind: "truefalse",
        prompt: "Mina spiser på kafeen.",
        answer: false,
        explanation: "Mina sier: «Jeg tar det med.»",
      },
    ],
  },
  {
    id: "beskjed-fra-tannlegen",
    level: "A1",
    title: "Beskjed fra tannlegen",
    genre: "Telefonbeskjed",
    situation: "Du hører en beskjed på telefonsvareren.",
    speakers: { A: "Tannlegekontoret", B: "" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Hei, dette er Smil tannlegekontor. Vi ringer til Daniel. Du har time hos oss onsdag klokka ti. Dessverre er tannlegen syk den dagen. Kan du komme torsdag klokka ti i stedet? Send oss en SMS hvis torsdag passer. Takk, og ha en fin dag.",
      },
    ],
    glossary: [
      ["time", "en avtale hos tannlege eller lege"],
      ["i stedet", "som erstatning for noe annet"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvorfor ringer tannlegekontoret?",
        options: ["Daniel må betale", "Timen må flyttes", "Daniel har glemt timen"],
        answer: 1,
        explanation: "Tannlegen er syk på onsdag, så timen flyttes til torsdag.",
      },
      {
        kind: "choice",
        prompt: "Når er den nye timen?",
        options: ["Onsdag klokka ti", "Torsdag klokka ti", "Torsdag klokka to"],
        answer: 1,
        explanation: "De spør: «Kan du komme torsdag klokka ti i stedet?»",
      },
      {
        kind: "truefalse",
        prompt: "Tannlegen er syk på onsdag.",
        answer: true,
        explanation: "Beskjeden sier at tannlegen er syk den dagen Daniel har time, altså onsdag.",
      },
    ],
  },
  {
    id: "hos-legen",
    level: "A2",
    title: "Hos legen",
    genre: "Samtale",
    situation: "Du hører en samtale mellom en lege og Olga.",
    speakers: { A: "Legen", B: "Olga" },
    maxPlays: 2,
    lines: [
      { speaker: "A", text: "Hei, Olga. Hva kan jeg hjelpe deg med i dag?" },
      { speaker: "B", text: "Jeg har hatt vondt i halsen i fire dager, og i går fikk jeg feber." },
      { speaker: "A", text: "Har du hoste også?" },
      { speaker: "B", text: "Ja, litt. Og jeg er veldig trøtt." },
      { speaker: "A", text: "La meg se. Halsen er rød, men det ser ut som et virus. Du trenger ikke antibiotika." },
      { speaker: "B", text: "Hva skal jeg gjøre da?" },
      {
        speaker: "A",
        text: "Hvil og drikk mye vann. Du kan ta paracet mot feberen. Hvis du ikke er bedre om en uke, må du komme tilbake.",
      },
      { speaker: "B", text: "Kan jeg gå på jobb i morgen?" },
      { speaker: "A", text: "Nei, bli hjemme til feberen er borte." },
    ],
    glossary: [
      ["hoste", "når du hoster, kommer det luft hardt ut av halsen"],
      ["hvil", "slapp av, ikke gjør noe anstrengende"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvor lenge har Olga hatt vondt i halsen?",
        options: ["I to dager", "I fire dager", "I en uke"],
        answer: 1,
        explanation: "Olga sier: «Jeg har hatt vondt i halsen i fire dager.»",
      },
      {
        kind: "truefalse",
        prompt: "Legen gir Olga antibiotika.",
        answer: false,
        explanation: "Legen sier: «Du trenger ikke antibiotika.»",
      },
      {
        kind: "choice",
        prompt: "Hva sier legen at Olga skal gjøre?",
        options: ["Hvile og drikke mye vann", "Gå på jobb som vanlig", "Komme tilbake i morgen"],
        answer: 0,
        explanation: "Legen sier: «Hvil og drikk mye vann.»",
      },
      {
        kind: "truefalse",
        prompt: "Olga skal være hjemme til hun ikke har feber lenger.",
        answer: true,
        explanation: "Legen sier: «Bli hjemme til feberen er borte.»",
      },
    ],
  },
  {
    id: "melding-pa-togstasjonen",
    level: "A2",
    title: "Melding på togstasjonen",
    genre: "Høyttalermelding",
    situation: "Du er på togstasjonen og hører en melding fra høyttaleren.",
    speakers: { A: "Høyttaler", B: "" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Informasjon til reisende med toget til Bergen, med planlagt avgang klokka fjorten tjuefem. Toget er dessverre forsinket på grunn av snø på sporet. Ny avgangstid er klokka femten ti. Toget går fra spor fire, ikke fra spor to. Vi beklager forsinkelsen. Kiosken i hall B er åpen hvis du vil kjøpe mat og drikke mens du venter.",
      },
    ],
    glossary: [
      ["avgang", "når toget kjører fra stasjonen"],
      ["forsinket", "kommer senere enn planlagt"],
      ["spor", "der toget står på stasjonen"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hvorfor er toget forsinket?",
        options: ["Det er snø på sporet", "Toget er ødelagt", "Det mangler en sjåfør"],
        answer: 0,
        explanation: "Toget er forsinket «på grunn av snø på sporet».",
      },
      {
        kind: "choice",
        prompt: "Når går toget nå?",
        options: ["Klokka 14.25", "Klokka 15.10", "Klokka 15.25"],
        answer: 1,
        explanation: "Ny avgangstid er «klokka femten ti», altså 15.10.",
      },
      {
        kind: "choice",
        prompt: "Hvilket spor går toget fra?",
        options: ["Spor 2", "Spor 4", "Spor 14"],
        answer: 1,
        explanation: "Toget går «fra spor fire, ikke fra spor to».",
      },
      {
        kind: "truefalse",
        prompt: "Kiosken er stengt.",
        answer: false,
        explanation: "Kiosken i hall B er åpen.",
      },
    ],
  },
  {
    id: "planer-for-helgen",
    level: "A2",
    title: "Planer for helgen",
    genre: "Samtale",
    situation: "Sara og Erik planlegger helgen.",
    speakers: { A: "Sara", B: "Erik" },
    maxPlays: 2,
    lines: [
      { speaker: "A", text: "Hva skal vi gjøre i helgen? Værmeldingen sier sol på lørdag." },
      { speaker: "B", text: "Da kan vi gå tur i Nordmarka på lørdag formiddag." },
      { speaker: "A", text: "God idé. Men først må jeg handle mat. Butikken åpner klokka ni." },
      { speaker: "B", text: "Greit, du handler først, og så drar vi på tur etterpå." },
      { speaker: "A", text: "Og på lørdag kveld har jeg lyst til å se en film." },
      { speaker: "B", text: "Ja! Og søndag er det bursdagen til mamma. Vi skal på middag hos henne klokka fem." },
      { speaker: "A", text: "Da kan vi sove lenge på søndag morgen." },
    ],
    glossary: [
      ["værmeldingen", "informasjon om hvordan været blir"],
      ["formiddag", "tiden mellom morgen og klokka tolv"],
    ],
    questions: [
      {
        kind: "order",
        prompt: "Sett planene i riktig rekkefølge.",
        items: [
          "Sara handler mat.",
          "De går tur i Nordmarka.",
          "De ser film.",
          "De sover lenge.",
          "De spiser middag hos moren til Erik.",
        ],
        explanation:
          "Lørdag: først handler Sara, så går de tur, og om kvelden ser de film. Søndag sover de lenge og spiser middag klokka fem.",
      },
      {
        kind: "choice",
        prompt: "Hvorfor vil de gå tur på lørdag?",
        options: ["Det blir sol", "Butikken er stengt", "Moren til Erik vil det"],
        answer: 0,
        explanation: "Værmeldingen sier sol på lørdag.",
      },
    ],
  },
  {
    id: "jobbintervju",
    level: "B1",
    title: "Jobbintervju",
    genre: "Intervju",
    situation: "Du hører et jobbintervju. Linda intervjuer Yusuf.",
    speakers: { A: "Linda", B: "Yusuf" },
    maxPlays: 2,
    lines: [
      { speaker: "A", text: "Velkommen, Yusuf. Kan du fortelle litt om deg selv?" },
      {
        speaker: "B",
        text: "Ja. Jeg kommer fra Syria og har bodd i Norge i fem år. Jeg er utdannet elektriker, og de siste to årene har jeg jobbet i et firma som installerer solcellepaneler.",
      },
      { speaker: "A", text: "Hvorfor søker du denne jobben?" },
      {
        speaker: "B",
        text: "Jeg vil gjerne jobbe mer med kunder. I jobben jeg har nå, er jeg mest på byggeplasser, og jeg savner å forklare og hjelpe folk direkte.",
      },
      { speaker: "A", text: "Hva er dine sterke sider?" },
      { speaker: "B", text: "Jeg er nøyaktig og liker å løse problemer. Kollegene mine sier også at jeg er tålmodig." },
      { speaker: "A", text: "Og hva synes du er vanskelig?" },
      {
        speaker: "B",
        text: "Å skrive lange rapporter på norsk tar fortsatt litt tid, men jeg tar et kurs i yrkesnorsk nå.",
      },
      { speaker: "A", text: "Det er bra. Når kan du eventuelt begynne?" },
      { speaker: "B", text: "Jeg har én måneds oppsigelsestid, så fra første mars." },
    ],
    glossary: [
      ["solcellepaneler", "plater som lager strøm av sollys"],
      ["nøyaktig", "gjør ting riktig og grundig"],
      ["oppsigelsestid", "tiden du må jobbe etter at du har sagt opp"],
    ],
    questions: [
      {
        kind: "truefalse",
        prompt: "Yusuf har jobbet med solcellepaneler i fem år.",
        answer: false,
        explanation: "Han har bodd i Norge i fem år, men jobbet med solcellepaneler i to år.",
      },
      {
        kind: "choice",
        prompt: "Hvorfor søker Yusuf jobben?",
        options: ["Han vil tjene mer", "Han vil jobbe mer med kunder", "Han vil slutte som elektriker"],
        answer: 1,
        explanation: "Yusuf sier: «Jeg vil gjerne jobbe mer med kunder.»",
      },
      {
        kind: "choice",
        prompt: "Hva synes Yusuf er vanskelig?",
        options: ["Å forklare ting til kunder", "Å skrive lange rapporter på norsk", "Å jobbe på byggeplasser"],
        answer: 1,
        explanation: "Han sier at lange rapporter på norsk «tar fortsatt litt tid».",
      },
      {
        kind: "truefalse",
        prompt: "Yusuf kan begynne i den nye jobben om omtrent en måned.",
        answer: true,
        explanation: "Han har én måneds oppsigelsestid og kan begynne første mars.",
      },
    ],
  },
  {
    id: "foreldremote",
    level: "B1",
    title: "Foreldremøte",
    genre: "Informasjon",
    situation: "En kontaktlærer snakker på et foreldremøte.",
    speakers: { A: "Kontaktlæreren", B: "" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Velkommen til foreldremøte. Jeg vil først si litt om høsten. I september begynner vi med et nytt prosjekt om miljø, der elevene skal jobbe i grupper og presentere for klassen i oktober.",
      },
      {
        speaker: "A",
        text: "Vi har merket at mange elever er trøtte om morgenen, og vi ber dere passe på at barna legger seg i rimelig tid. Når det gjelder lekser, får elevene en ukeplan hver mandag. Leksene skal være levert innen fredag.",
      },
      {
        speaker: "A",
        text: "Til slutt: Skolen ønsker at mobilen ligger i sekken hele skoledagen, også i friminuttene. Har dere spørsmål, er det best å sende melding gjennom skoleappen.",
      },
    ],
    glossary: [
      ["i rimelig tid", "ikke for sent"],
      ["friminuttene", "pausene mellom timene på skolen"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva skal elevene gjøre i miljøprosjektet?",
        options: ["Skrive en lang rapport alene", "Jobbe i grupper og presentere", "Reise på tur"],
        answer: 1,
        explanation: "Elevene skal «jobbe i grupper og presentere for klassen».",
      },
      {
        kind: "choice",
        prompt: "Hva ber læreren foreldrene om?",
        options: ["Å hjelpe med leksene hver dag", "At barna legger seg tidlig nok", "Å komme på skolen i friminuttene"],
        answer: 1,
        explanation: "Læreren ber foreldrene passe på at barna «legger seg i rimelig tid».",
      },
      {
        kind: "truefalse",
        prompt: "Elevene kan bruke mobilen i friminuttene.",
        answer: false,
        explanation: "Mobilen skal ligge i sekken hele dagen, «også i friminuttene».",
      },
      {
        kind: "choice",
        prompt: "Hvordan bør foreldrene kontakte læreren?",
        options: ["Ringe skolen", "Sende melding i skoleappen", "Skrive i ukeplanen"],
        answer: 1,
        explanation: "Det er best å «sende melding gjennom skoleappen».",
      },
    ],
  },
  {
    id: "bilfritt-sentrum",
    level: "B1",
    title: "Bilfritt sentrum?",
    genre: "Diskusjon",
    situation: "Kari og Jonas diskuterer om sentrum i byen deres bør bli bilfritt.",
    speakers: { A: "Kari", B: "Jonas" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Jeg synes det er en fantastisk idé å stenge sentrum for biler. Luften blir renere, og det blir tryggere for barna.",
      },
      { speaker: "B", text: "Jeg er ikke så sikker. Jeg har en liten butikk i sentrum, og mange kunder kommer med bil." },
      { speaker: "A", text: "Men undersøkelser viser at folk som går eller sykler, handler oftere." },
      { speaker: "B", text: "Kanskje i store byer. Her hos oss går bussene sjelden, og om vinteren er det vanskelig å sykle." },
      { speaker: "A", text: "Da må kommunen satse mer på kollektivtrafikk. Det er en del av løsningen." },
      { speaker: "B", text: "Det er jeg enig i. Hvis bussene går oftere, kan jeg kanskje bli med på det." },
    ],
    glossary: [
      ["satse på", "bruke penger og krefter på"],
      ["kollektivtrafikk", "busser, trikker og tog"],
    ],
    questions: [
      {
        kind: "match",
        prompt: "Hvem sier hva?",
        left: [
          "Mener at sentrum blir tryggere for barn",
          "Er bekymret for kundene sine",
          "Sier at det er vanskelig å sykle om vinteren",
          "Foreslår at kommunen satser på kollektivtrafikk",
        ],
        right: ["Kari", "Jonas"],
        answer: [0, 1, 1, 0],
        explanation:
          "Kari snakker om tryggere gater og foreslår mer kollektivtrafikk. Jonas er bekymret for butikken sin og nevner at det er vanskelig å sykle om vinteren.",
      },
      {
        kind: "truefalse",
        prompt: "Til slutt er Jonas litt mer positiv til forslaget.",
        answer: true,
        explanation: "Jonas sier at han kanskje kan «bli med på det» hvis bussene går oftere.",
      },
    ],
  },
  {
    id: "skjermtid",
    level: "B2",
    title: "Radiodebatt om skjermtid",
    genre: "Radiointervju",
    situation: "En programleder snakker med en forsker om barn og skjermtid.",
    speakers: { A: "Programlederen", B: "Forskeren" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Mange foreldre er bekymret for hvor mye tid barna bruker på skjerm. Du har forsket på dette i ti år. Bør vi være bekymret?",
      },
      {
        speaker: "B",
        text: "Både ja og nei. Det er for enkelt å bare telle timer. Det viktigste er hva barna gjør på skjermen, og hva skjermtiden går ut over.",
      },
      { speaker: "A", text: "Hva mener du med det?" },
      {
        speaker: "B",
        text: "Hvis et barn sitter to timer og lager musikk eller snakker med besteforeldrene på video, er det noe helt annet enn to timer med korte videoer som spilles av automatisk. Problemet oppstår når skjermen tar plassen til søvn, fysisk aktivitet og tid med venner.",
      },
      { speaker: "A", text: "Så du ville ikke innført en fast grense?" },
      {
        speaker: "B",
        text: "Faste grenser kan være nyttige for de minste. Men for ungdom tror jeg det fungerer bedre å lage avtaler sammen, og at foreldrene selv er gode forbilder. Det hjelper lite å forby mobil ved middagsbordet hvis de voksne sjekker e-post hele tiden.",
      },
    ],
    glossary: [
      ["går ut over", "gjør at det blir mindre tid til noe annet"],
      ["forbilder", "personer andre vil ligne på"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva er forskerens hovedpoeng?",
        options: [
          "Barn bør ikke ha mobil før de er tolv år",
          "Det er viktigere hva skjermtiden brukes til enn hvor lang den er",
          "Korte videoer er like nyttige som å lage musikk",
        ],
        answer: 1,
        explanation: "Forskeren sier at det er for enkelt å telle timer, og at det viktigste er hva barna gjør.",
      },
      {
        kind: "choice",
        prompt: "Når blir skjermtid et problem, ifølge forskeren?",
        options: [
          "Når den går ut over søvn, aktivitet og venner",
          "Når barna snakker med besteforeldrene",
          "Når den varer mer enn en time",
        ],
        answer: 0,
        explanation: "Problemet oppstår «når skjermen tar plassen til søvn, fysisk aktivitet og tid med venner».",
      },
      {
        kind: "truefalse",
        prompt: "Forskeren mener at faste grenser aldri er nyttige.",
        answer: false,
        explanation: "Forskeren sier at faste grenser kan være nyttige for de minste.",
      },
      {
        kind: "choice",
        prompt: "Hva mener forskeren med at foreldrene skal være «gode forbilder»?",
        options: [
          "De skal selv bruke mobilen på en fornuftig måte",
          "De skal lære barna å lage musikk",
          "De skal bestemme alt for barna",
        ],
        answer: 0,
        explanation: "Eksempelet viser at det hjelper lite å forby mobil hvis de voksne selv sjekker e-post hele tiden.",
      },
    ],
  },
  {
    id: "eldre-arbeidstakere",
    level: "B2",
    title: "Flere eldre i arbeid",
    genre: "Nyhetsinnslag",
    situation: "Du hører et nyhetsinnslag i radio.",
    speakers: { A: "Nyhetsoppleseren", B: "" },
    maxPlays: 2,
    lines: [
      {
        speaker: "A",
        text: "Stadig flere nordmenn fortsetter å jobbe etter at de har fylt sekstisju år. Ekspertene peker på flere årsaker: Folk er friskere enn før, mange jobber er mindre fysisk krevende, og pensjonssystemet gjør det lønnsomt å stå lenger i jobb.",
      },
      {
        speaker: "A",
        text: "Samtidig advarer fagforeninger mot at presset om å jobbe lenger kan bli for stort for dem som har tunge yrker, som sykepleiere og bygningsarbeidere. De mener at arbeidsgiverne må tilrettelegge bedre, for eksempel med kortere arbeidsdager eller mindre nattarbeid for eldre ansatte.",
      },
    ],
    glossary: [
      ["lønnsomt", "gir mer penger"],
      ["fagforeninger", "organisasjoner som jobber for arbeidstakernes rettigheter"],
      ["tilrettelegge", "gjøre det lettere å klare jobben"],
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Hva handler nyhetsinnslaget om?",
        options: ["At flere jobber etter fylte 67 år", "At pensjonsalderen blir senket", "At det mangler sykepleiere"],
        answer: 0,
        explanation: "Innslaget handler om at flere fortsetter å jobbe etter at de har fylt 67 år.",
      },
      {
        kind: "choice",
        prompt: "Hvilken årsak blir ikke nevnt?",
        options: ["Folk er friskere enn før", "Mange jobber er mindre fysisk krevende", "Lønningene har økt mye"],
        answer: 2,
        explanation: "Innslaget nevner helse, mindre fysisk krevende jobber og pensjonssystemet, men ikke høyere lønn.",
      },
      {
        kind: "truefalse",
        prompt: "Fagforeningene mener at alle bør jobbe lenger.",
        answer: false,
        explanation: "Fagforeningene advarer mot at presset kan bli for stort for dem med tunge yrker.",
      },
      {
        kind: "choice",
        prompt: "Hva mener fagforeningene at arbeidsgiverne bør gjøre?",
        options: [
          "Tilrettelegge, for eksempel med kortere arbeidsdager",
          "Senke lønnen for eldre ansatte",
          "Ansette flere unge",
        ],
        answer: 0,
        explanation: "De vil at arbeidsgiverne skal tilrettelegge med kortere dager eller mindre nattarbeid.",
      },
    ],
  },
];

export const listeningTasks: ListeningTask[] = byLevel([...baseTasks, ...listeningA1, ...listeningA2, ...listeningB1, ...listeningB2]);

/** Task ids for the free trial. */
export const listeningTests = {
  trial: ["hos-legen", "melding-pa-togstasjonen", "bilfritt-sentrum"],
};
