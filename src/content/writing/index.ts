import type { Level } from "@/lib/types";
import { writingA1 } from "./a1";
import { writingA2 } from "./a2";
import { writingB1 } from "./b1";
import { writingB2 } from "./b2";
import { byLevel } from "../order";

export type WritingKind = "e-post" | "fortelling" | "beskrivelse" | "meningstekst";

export const WRITING_KIND_NAMES: Record<WritingKind, string> = {
  "e-post": "E-post og meldinger",
  fortelling: "Fortelling",
  beskrivelse: "Beskrivelse",
  meningstekst: "Meningstekst",
};

export interface WritingTask {
  id: string;
  level: Level;
  title: string;
  kind: WritingKind;
  /** The situation and what to write. */
  task: string;
  /** Content the text must cover. */
  points: string[];
  minWords: number;
  maxWords: number;
  minutes: number;
  /** A sample answer at the target level, shown after handing in. */
  model: string;
}

// Original prompts written in the style of Norskprøven. Not official exam material.
const baseTasks: WritingTask[] = [
  {
    id: "ny-leilighet",
    level: "A1",
    title: "E-post til en venn",
    kind: "e-post",
    task: "Du har flyttet til en ny leilighet. Skriv en e-post til en venn.",
    points: ["Fortell hvor du bor nå", "Beskriv leiligheten", "Inviter vennen på besøk"],
    minWords: 40,
    maxWords: 70,
    minutes: 15,
    model:
      "Hei Anna!\n\nNå bor jeg i en ny leilighet i Drammen. Den ligger nær sentrum og togstasjonen. Leiligheten har to rom, et lite kjøkken og en stor balkong. Jeg liker den veldig godt, fordi den er lys og fin.\n\nVil du komme på besøk på lørdag? Vi kan lage middag sammen.\n\nHilsen Maria",
  },
  {
    id: "syk-melding",
    level: "A1",
    title: "Melding til læreren",
    kind: "e-post",
    task: "Du er syk og kan ikke komme på norskkurset i morgen. Skriv en melding til læreren.",
    points: ["Si at du ikke kommer", "Fortell hva som er galt", "Spør om lekser"],
    minWords: 30,
    maxWords: 60,
    minutes: 15,
    model:
      "Hei Kari!\n\nJeg kan dessverre ikke komme på kurset i morgen. Jeg er syk og har feber og vondt i halsen. Jeg må være hjemme noen dager.\n\nHar vi lekser til neste uke? Kan du sende dem til meg?\n\nHilsen Ahmed",
  },
  {
    id: "bursdagsinvitasjon",
    level: "A2",
    title: "Invitasjon til bursdag",
    kind: "e-post",
    task: "Du skal ha bursdagsfest. Skriv en invitasjon til kollegene dine.",
    points: ["Skriv når og hvor festen er", "Fortell hva dere skal gjøre", "Be dem svare innen en dato"],
    minWords: 60,
    maxWords: 100,
    minutes: 20,
    model:
      "Hei alle sammen!\n\nPå fredag fyller jeg 35 år, og jeg vil gjerne feire med dere. Festen er hjemme hos meg i Sagveien 12 fra klokka 18.\n\nVi skal spise mat fra hjemlandet mitt, og etterpå kan vi spille spill eller bare prate. Dere trenger ikke å ta med gave, men ta gjerne med godt humør!\n\nKan dere svare meg innen onsdag, så jeg vet hvor mye mat jeg skal lage?\n\nHilsen Lina",
  },
  {
    id: "forrige-helg",
    level: "A2",
    title: "Forrige helg",
    kind: "fortelling",
    task: "Skriv om hva du gjorde forrige helg.",
    points: ["Hva gjorde du på lørdag?", "Hva gjorde du på søndag?", "Hva likte du best, og hvorfor?"],
    minWords: 60,
    maxWords: 100,
    minutes: 20,
    model:
      "Forrige helg var veldig fin. På lørdag sto jeg opp tidlig og handlet mat. Etterpå gikk jeg tur i skogen med naboen min. Om kvelden så vi en film sammen.\n\nPå søndag besøkte jeg en venninne. Vi spiste vafler og snakket lenge. Senere på dagen ringte jeg familien min i Polen.\n\nDet beste var turen i skogen, fordi været var fint og jeg fikk øve på norsk med naboen.",
  },
  {
    id: "der-jeg-bor",
    level: "A2",
    title: "Der jeg bor",
    kind: "beskrivelse",
    task: "Beskriv stedet der du bor.",
    points: ["Fortell om byen eller stedet", "Beskriv boligen din", "Skriv hva du liker og ikke liker"],
    minWords: 60,
    maxWords: 100,
    minutes: 20,
    model:
      "Jeg bor i Hamar, en liten by ved Mjøsa. Byen har et fint sentrum med butikker og kafeer, og det er kort vei til naturen.\n\nJeg bor i et rekkehus sammen med mannen min og to barn. Huset har tre soverom og en liten hage.\n\nJeg liker at det er rolig her, og at barna kan gå alene til skolen. Det jeg ikke liker, er at bussen går sjelden om kvelden. Derfor må vi ofte bruke bil.",
  },
  {
    id: "klage-nettbutikk",
    level: "B1",
    title: "Klage til en nettbutikk",
    kind: "e-post",
    task: "Du har kjøpt en jakke på nett. Den er for liten, og den har en skade. Skriv en e-post til nettbutikken.",
    points: ["Fortell hva du kjøpte og når", "Forklar hva problemet er", "Skriv hva du ønsker at butikken skal gjøre"],
    minWords: 100,
    maxWords: 160,
    minutes: 30,
    model:
      "Hei!\n\nJeg bestilte en vinterjakke i størrelse M fra nettbutikken deres 4. november, og den kom i posten i går. Ordrenummeret er 48211.\n\nDessverre er jeg ikke fornøyd med varen. For det første er jakken mye mindre enn størrelsen som står på nettsiden. For det andre er det et hull i den ene lommen, så jakken er skadet.\n\nJeg ønsker å bytte jakken i en større størrelse. Hvis dere ikke har den på lager, vil jeg gjerne få pengene tilbake. Kan dere også sende meg en returlapp, slik at jeg slipper å betale for frakten?\n\nJeg håper på svar så snart som mulig.\n\nVennlig hilsen\nTomas Berg",
  },
  {
    id: "hjemmekontor",
    level: "B1",
    title: "Hjemme eller på kontoret?",
    kind: "meningstekst",
    task: "Er det bedre å jobbe hjemme enn på kontoret? Skriv hva du mener.",
    points: ["Skriv hva du mener", "Gi minst to argumenter", "Gi et eksempel fra ditt eget liv", "Skriv en avslutning"],
    minWords: 120,
    maxWords: 180,
    minutes: 30,
    model:
      "Etter pandemien jobber mange nordmenn hjemme noen dager i uka. Jeg mener at det beste er en blanding av hjemmekontor og kontor.\n\nFor det første sparer man mye tid når man jobber hjemme. Jeg bruker vanligvis en time på bussen hver dag, og den tiden kan jeg heller bruke på familien. For det andre er det ofte lettere å konsentrere seg hjemme, fordi det er mindre støy.\n\nLikevel savner jeg kollegene mine når jeg er hjemme for lenge. På kontoret lærer jeg mye av de andre, og vi løser problemer raskere når vi kan snakke sammen. Dessuten er det viktig for meg å komme ut av leiligheten.\n\nKonklusjonen min er at både arbeidsgivere og ansatte tjener på en fleksibel ordning med to eller tre dager hjemme.",
  },
  {
    id: "vanskelig-norsk",
    level: "B1",
    title: "Da jeg ikke forsto",
    kind: "fortelling",
    task: "Fortell om en situasjon der det var vanskelig å forstå norsk.",
    points: ["Hvor og når skjedde det?", "Hva var problemet?", "Hva gjorde du?", "Hva lærte du av det?"],
    minWords: 120,
    maxWords: 180,
    minutes: 30,
    model:
      "Det første året i Norge var jeg på et foreldremøte på skolen til datteren min. Jeg hadde lært norsk i et halvt år, så jeg trodde at jeg skulle forstå det meste.\n\nProblemet var at læreren snakket fort og brukte mange ord jeg ikke kjente, for eksempel «dugnad» og «ukeplan». Etter hvert begynte de andre foreldrene å diskutere, og jeg skjønte nesten ingenting. Jeg ble flau og sa ikke et ord.\n\nEtter møtet gikk jeg likevel bort til læreren og forklarte at jeg ikke hadde forstått alt. Hun var veldig hyggelig og forklarte det viktigste en gang til, langsomt.\n\nAv dette lærte jeg at det er bedre å spørre enn å late som om man forstår. Nå spør jeg alltid når jeg ikke skjønner noe.",
  },
  {
    id: "mobil-i-skolen",
    level: "B2",
    title: "Mobilforbud i skolen?",
    kind: "meningstekst",
    task: "Bør mobiltelefoner forbys i skolen? Skriv en argumenterende tekst.",
    points: [
      "Innledning som presenterer problemstillingen",
      "Argumenter for et forbud",
      "Argumenter mot et forbud",
      "Din konklusjon",
    ],
    minWords: 180,
    maxWords: 260,
    minutes: 40,
    model:
      "De siste årene har mange skoler innført regler om at elevene ikke kan bruke mobilen i skoletiden. Spørsmålet er om et slikt forbud faktisk gjør skolen bedre, eller om det bare skjuler et større problem.\n\nTilhengerne av forbud peker på at mobilen stjeler oppmerksomhet. Selv en mobil som ligger stille på pulten, kan gjøre det vanskeligere å konsentrere seg. Mange lærere forteller dessuten at friminuttene har blitt mer sosiale etter at mobilene forsvant, og at det har blitt mindre mobbing på sosiale medier i skoletiden.\n\nPå den andre siden kan et totalforbud være lite realistisk. Mobilen er et viktig verktøy i hverdagen, og elevene må lære å bruke den på en fornuftig måte. Dersom skolen bare forbyr den, får ikke elevene øvd på nettopp dette. I tillegg kan noen elever trenge mobilen av helsemessige eller familiære grunner.\n\nEtter min mening er et forbud i undervisningen fornuftig, særlig på barneskolen. Samtidig bør skolen undervise i digital dømmekraft, slik at elevene er godt forberedt på livet etter skolen.",
  },
  {
    id: "frivillig-leksehjelp",
    level: "B2",
    title: "Søknad om frivillig arbeid",
    kind: "e-post",
    task: "Biblioteket søker frivillige leksehjelpere for barn. Skriv en søknad.",
    points: [
      "Presenter deg selv",
      "Forklar hvorfor du søker",
      "Fortell om erfaring og egenskaper",
      "Skriv når du kan begynne og hvor ofte du kan hjelpe",
    ],
    minWords: 180,
    maxWords: 260,
    minutes: 40,
    model:
      "Hei!\n\nJeg viser til annonsen deres om frivillige leksehjelpere, og jeg vil gjerne søke. Jeg heter Daniel Mekonnen, er 34 år og jobber som ingeniør i et konsulentfirma her i byen.\n\nSom barn fikk jeg selv hjelp med lekser av frivillige da familien min kom til Norge. Det betydde mye for meg, både faglig og fordi jeg følte meg sett. Nå ønsker jeg å gi noe tilbake til lokalsamfunnet.\n\nJeg har god kompetanse i matematikk og naturfag, og jeg har tidligere vært trener for et fotballag for barn. Der lærte jeg å forklare ting på en enkel måte og å være tålmodig når noe tar tid. I tillegg snakker jeg amharisk og engelsk, noe som kan være nyttig for barn som ennå ikke behersker norsk godt.\n\nJeg kan begynne i januar og har mulighet til å komme én ettermiddag i uka, gjerne tirsdager eller torsdager.\n\nJeg ser frem til å høre fra dere.\n\nVennlig hilsen\nDaniel Mekonnen",
  },
];

export const writingTasks: WritingTask[] = byLevel([...baseTasks, ...writingA1, ...writingA2, ...writingB1, ...writingB2]);

export function getWritingTask(id: string) {
  return writingTasks.find((t) => t.id === id);
}

export type WritingBand = { id: string; label: string; minutes: number; tasks: string[] };

/** Full tests are taken at a chosen level band, like the real written exam. */
export const writingTests = {
  trial: "bursdagsinvitasjon",
  bands: [
    { id: "a1-a2", label: "A1–A2", minutes: 60, tasks: ["syk-melding", "der-jeg-bor"] },
    { id: "a2-b1", label: "A2–B1", minutes: 90, tasks: ["bursdagsinvitasjon", "klage-nettbutikk"] },
    { id: "b1-b2", label: "B1–B2", minutes: 90, tasks: ["hjemmekontor", "mobil-i-skolen"] },
  ] satisfies WritingBand[],
};
