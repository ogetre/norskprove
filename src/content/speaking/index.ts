import type { Level } from "@/lib/types";
import { speakingA1 } from "./a1";
import { speakingA2 } from "./a2";
import { speakingB1 } from "./b1";
import { speakingB2 } from "./b2";
import { byLevel } from "../order";

export type SpeakingKind = "presentasjon" | "samtale" | "mening";

export const SPEAKING_KIND_NAMES: Record<SpeakingKind, string> = {
  presentasjon: "Fortell om noe",
  samtale: "Rollespill",
  mening: "Si hva du mener",
};

export interface SpeakingTask {
  id: string;
  level: Level;
  title: string;
  kind: SpeakingKind;
  /** The situation, shown before the examiner speaks. */
  intro: string;
  /** What the examiner says, one answer per line. */
  questions: string[];
  prepSeconds: number;
  /** Speaking time per question. */
  speakSeconds: number;
  points: string[];
  phrases: string[];
  /** A sample answer to the first question. */
  model: string;
}

// Original prompts written in the style of the oral Norskprøven. Not official exam material.
const baseTasks: SpeakingTask[] = [
  {
    id: "om-deg-selv",
    level: "A1",
    title: "Om deg selv",
    kind: "presentasjon",
    intro: "Sensoren ber deg fortelle om deg selv.",
    questions: ["Kan du fortelle litt om deg selv?", "Hva liker du å gjøre i fritiden?"],
    prepSeconds: 20,
    speakSeconds: 60,
    points: ["Navn og hvor du kommer fra", "Hvor du bor og hvem du bor med", "Jobb eller skole", "Hva du liker å gjøre"],
    phrases: ["Jeg heter …", "Jeg kommer fra …", "Jeg har bodd i Norge i …", "På fritiden liker jeg å …"],
    model:
      "Jeg heter Marta, og jeg kommer fra Polen. Jeg har bodd i Norge i to år. Nå bor jeg i Bergen sammen med mannen min og datteren vår. Jeg jobber på et hotell i sentrum. På fritiden liker jeg å gå tur i fjellet og lage mat.",
  },
  {
    id: "pa-kafeen-muntlig",
    level: "A1",
    title: "På kafeen",
    kind: "samtale",
    intro: "Du er på en kafé og skal bestille. Sensoren er den ansatte bak disken.",
    questions: ["Hei! Hva vil du ha?", "Vil du ha noe å spise også?", "Det blir nittifem kroner. Hvordan vil du betale?"],
    prepSeconds: 10,
    speakSeconds: 25,
    points: ["Si hva du vil drikke", "Svar på spørsmålet om mat", "Si hvordan du vil betale"],
    phrases: ["Jeg vil gjerne ha …", "Ja, takk. / Nei, takk.", "Kan jeg betale med kort?"],
    model: "Hei! Jeg vil gjerne ha en kopp te, takk.",
  },
  {
    id: "en-vanlig-dag",
    level: "A2",
    title: "En vanlig dag",
    kind: "presentasjon",
    intro: "Sensoren vil høre om hverdagen din.",
    questions: ["Fortell om en vanlig dag for deg.", "Hva gjør du vanligvis i helgene?"],
    prepSeconds: 30,
    speakSeconds: 75,
    points: ["Om morgenen", "Jobb, skole eller kurs", "Ettermiddag og kveld", "Helgene"],
    phrases: ["Først …", "Etterpå …", "Om kvelden …", "Vanligvis …", "Noen ganger …"],
    model:
      "Jeg står vanligvis opp klokka seks. Først drikker jeg kaffe og lager frokost til barna. Etterpå tar jeg bussen til jobben. Jeg jobber på en barnehage fra åtte til fire. Om ettermiddagen henter jeg barna og lager middag. Om kvelden ser vi ofte på TV eller går en tur. Jeg legger meg rundt klokka elleve.",
  },
  {
    id: "ring-legekontoret",
    level: "A2",
    title: "Ring legekontoret",
    kind: "samtale",
    intro: "Du er syk og ringer legekontoret for å bestille time. Sensoren er sekretæren.",
    questions: [
      "Legekontoret, god morgen. Hva kan jeg hjelpe deg med?",
      "Hvor lenge har du hatt disse plagene?",
      "Vi har en ledig time i morgen klokka ti. Passer det?",
      "Er det noe mer jeg kan hjelpe deg med?",
    ],
    prepSeconds: 15,
    speakSeconds: 30,
    points: ["Si hva som er galt", "Si hvor lenge du har vært syk", "Avtal en time", "Avslutt samtalen høflig"],
    phrases: ["Jeg vil gjerne bestille time.", "Jeg har vondt i …", "Det passer fint.", "Nei, takk. Ha en fin dag!"],
    model: "God morgen. Jeg har feber og vondt i halsen, og jeg vil gjerne bestille time hos legen.",
  },
  {
    id: "hjemlandet",
    level: "B1",
    title: "Et sted du er glad i",
    kind: "presentasjon",
    intro: "Sensoren vil høre om et sted du er glad i.",
    questions: [
      "Fortell om et sted i hjemlandet ditt som du liker godt.",
      "Hva er de største forskjellene mellom dette stedet og stedet der du bor nå?",
    ],
    prepSeconds: 45,
    speakSeconds: 90,
    points: ["Hvor stedet er og hvordan det ser ut", "Hvorfor du liker det", "Et minne fra stedet", "Sammenligning med Norge"],
    phrases: ["Det stedet jeg liker best, er …", "Det som gjør stedet spesielt, er …", "Jeg husker at …", "I motsetning til …"],
    model:
      "Det stedet jeg liker best i hjemlandet mitt, er en liten fiskerlandsby ved kysten i Chile. Husene er malt i sterke farger, og det lukter alltid hav og grillet fisk. Jeg liker stedet fordi besteforeldrene mine bodde der, og jeg tilbrakte alle sommerferiene hos dem. Jeg husker at bestefar tok meg med ut med båten tidlig om morgenen. Stedet minner faktisk litt om Lofoten, men det er mye varmere, og folk er ute på gatene hele kvelden.",
  },
  {
    id: "bytte-en-vare",
    level: "B1",
    title: "Bytte en vare",
    kind: "samtale",
    intro: "Du har kjøpt en kaffetrakter som ikke virker. Du går tilbake til butikken. Sensoren er butikkansatt.",
    questions: [
      "Hei, hva kan jeg hjelpe deg med?",
      "Har du med kvitteringen?",
      "Vi har dessverre ikke flere av den modellen. Vil du ha en annen modell eller pengene tilbake?",
      "Den nye modellen koster to hundre kroner mer. Hva tenker du om det?",
    ],
    prepSeconds: 15,
    speakSeconds: 40,
    points: ["Forklar problemet", "Svar på spørsmålet om kvittering", "Velg en løsning og begrunn den", "Forhandle om prisen"],
    phrases: ["Jeg kjøpte … for … siden.", "Den virker ikke fordi …", "Jeg vil heller …", "Er det mulig å …?"],
    model:
      "Hei. Jeg kjøpte denne kaffetrakteren her for en uke siden, men den virker ikke. Den blir ikke varm, så kaffen blir kald. Jeg vil gjerne bytte den.",
  },
  {
    id: "by-eller-land",
    level: "B1",
    title: "By eller land?",
    kind: "mening",
    intro: "Sensoren vil høre hva du mener.",
    questions: ["Er det bedre å bo i en by eller på landet? Hva mener du?", "Hvor vil du helst bo om ti år, og hvorfor?"],
    prepSeconds: 45,
    speakSeconds: 90,
    points: ["Si hva du mener", "Gi minst to argumenter", "Nevn noe som taler for den andre siden", "Gi et eksempel fra ditt liv"],
    phrases: ["Jeg mener at …", "For det første …", "På den andre siden …", "Et eksempel er …", "Derfor …"],
    model:
      "Jeg mener at det er bedre å bo i en by, i alle fall når man er ny i Norge. For det første er det lettere å finne jobb, og for det andre er det flere norskkurs og aktiviteter. På den andre siden er det dyrt å bo i byen, og det er mye støy. Et eksempel fra mitt liv er at vi bodde i en liten bygd det første året. Det var fint og rolig, men det var vanskelig å bli kjent med folk. Derfor flyttet vi til Trondheim.",
  },
  {
    id: "sondagsapent",
    level: "B2",
    title: "Søndagsåpne butikker",
    kind: "mening",
    intro: "Sensoren vil diskutere et samfunnsspørsmål med deg.",
    questions: [
      "Bør butikkene i Norge være åpne på søndager? Begrunn svaret ditt.",
      "Hvilke konsekvenser tror du det ville fått for dem som jobber i butikk?",
    ],
    prepSeconds: 60,
    speakSeconds: 120,
    points: ["Ta et tydelig standpunkt", "Argumenter for og imot", "Vurder konsekvenser for ulike grupper", "Avslutt med en konklusjon"],
    phrases: ["Etter min mening …", "Et viktig argument er …", "Samtidig må vi ta hensyn til …", "Det kan føre til at …", "Alt i alt …"],
    model:
      "Etter min mening bør de fleste butikkene fortsatt holde stengt på søndager. Et viktig argument for søndagsåpne butikker er at det gir mer fleksibilitet for folk som jobber mye i ukedagene. Samtidig må vi ta hensyn til dem som jobber i butikk. Søndagen er for mange den eneste dagen familien har fri sammen, og hvis butikkene åpner, kan det føre til at flere må jobbe i helgene. I tillegg tror jeg det er verdifullt for samfunnet å ha én dag som er roligere enn de andre. Alt i alt synes jeg ordningen vi har i dag, med noen små butikker åpne, er en god balanse.",
  },
  {
    id: "digital-skole",
    level: "B2",
    title: "Den digitale skolen",
    kind: "mening",
    intro: "Sensoren vil høre hva du mener om skolen.",
    questions: [
      "Mange skoler bruker nettbrett og PC i stedet for bøker. Hva er fordelene og ulempene?",
      "Hvordan tror du skolen vil se ut om tjue år?",
    ],
    prepSeconds: 60,
    speakSeconds: 120,
    points: ["Fordeler med digitale verktøy", "Ulemper", "Din egen vurdering", "En tanke om framtiden"],
    phrases: ["En stor fordel er …", "Ulempen er imidlertid …", "Forskning tyder på …", "Jeg tror at …", "Det avhenger av …"],
    model:
      "En stor fordel med nettbrett og PC er at elevene får tilgang til oppdatert informasjon og kan jobbe i sitt eget tempo. Lærerne kan også gi raskere tilbakemelding. Ulempen er imidlertid at skjermen lett blir en kilde til forstyrrelser, og mange mener at man husker bedre når man leser på papir. Jeg tror løsningen er en kombinasjon: bøker når elevene skal lese lange tekster, og digitale verktøy til oppgaver og samarbeid. Om tjue år tror jeg skolen er enda mer digital, men at det sosiale fellesskapet i klasserommet fortsatt er like viktig.",
  },
];

export const speakingTasks: SpeakingTask[] = byLevel([...baseTasks, ...speakingA1, ...speakingA2, ...speakingB1, ...speakingB2]);

export function getSpeakingTask(id: string) {
  return speakingTasks.find((t) => t.id === id);
}

export const speakingTests = {
  trial: "om-deg-selv",
  bands: [
    { id: "a1-a2", label: "A1–A2", tasks: ["om-deg-selv", "pa-kafeen-muntlig", "en-vanlig-dag"] },
    { id: "a2-b1", label: "A2–B1", tasks: ["en-vanlig-dag", "ring-legekontoret", "by-eller-land"] },
    { id: "b1-b2", label: "B1–B2", tasks: ["hjemlandet", "bytte-en-vare", "sondagsapent"] },
  ],
};
