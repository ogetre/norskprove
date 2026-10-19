import type { Level, ListeningTask, SpeakerId, VoiceGender } from "./types";

/*
 * Who speaks with which voice in a listening task. Used both by the script that records the
 * tasks (scripts/generate-audio.ts) and by the player, so a recording always matches its text.
 */

/** Speaking speed per level: slow and clear at A1, everyday speed at B2, as in the exam. */
export const LEVEL_RATE: Record<Level, number> = { A1: 0.85, A2: 0.92, B1: 1.02, B2: 1.1 };

const FEMALE = new Set(
  "Aisha Ana Anna Anne Bente Camilla Daria Elena Elif Elin Ella Eva Ewa Fatima Grete Gro Gunn Gunvor Halima Hanne Heidi Hilde Ida Ingrid Iselin Kari Kristin Leila Lena Lene Leyla Lina Linda Linn Lisa Lise Maja Mari Marianne Marit Marte Mei Mia Mina Mona Monika Nina Nora Nour Olga Petra Rita Sara Siri Sofie Sunniva Tone Trine Turid Zainab".split(" "),
);
const MALE = new Set(
  "Abdi Ahmed Ali Amir Arne Bilal Bjørn Erik Fredrik Hamid Jan Jonas Joseph Karim Kim Kjetil Kofi Kristoffer Lars Leo Luis Martin Mohammed Morten Nikolai Olav Ola Omar Pavel Per Rashid Robert Rune Samir Tariq Thomas Tor Trond Viktor Yousef Yusuf".split(" "),
);
const FEMALE_ROLES = new Set(["kassadame", "mor", "mamma", "kvinne", "bestemor"]);
const MALE_ROLES = new Set(["far", "pappa", "mann", "bestefar"]);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Voice type from a name or role like «Kari», «Mor» or «Kristoffer»; undefined for «Lege». */
function genderOfName(name: string): VoiceGender | undefined {
  const first = name.trim().split(/[\s,(]/)[0];
  const lower = first.toLowerCase();
  if (FEMALE.has(first) || FEMALE_ROLES.has(lower)) return "kvinne";
  if (MALE.has(first) || MALE_ROLES.has(lower)) return "mann";
  return undefined;
}

/** A speaker who says who they are: «Solsikken barnehage, dette er Tone.» */
function introducedAs(lines: string[]): VoiceGender | undefined {
  for (const text of lines) {
    const m = text.match(/(?:[Dd]ette er|[Dd]u snakker med|[Jj]eg heter|[Dd]et er)\s+([A-ZÆØÅ][a-zæøå]+|mamma|pappa)/);
    const g = m ? genderOfName(m[1]) : undefined;
    if (g) return g;
  }
  return undefined;
}

export type CastVoice = {
  gender: VoiceGender;
  /** Picks a voice among those of the same type, so different tasks use different voices. */
  index: number;
  /** Which speaker of this voice type it is in the task, from 0. */
  nth: number;
  /** A small personal speed variation on top of the level speed. */
  rate: number;
};

export type Cast = Partial<Record<SpeakerId, CastVoice>>;

/** The speakers in the order they first speak. */
export function speakerOrder(task: ListeningTask): SpeakerId[] {
  return [...new Set(task.lines.map((l) => l.speaker))];
}

/** The voices for a task. The same task always gets the same cast. */
export function castVoices(task: ListeningTask): Cast {
  const order = speakerOrder(task);
  const seed = hash(task.id);
  const genders = new Map<SpeakerId, VoiceGender>();
  for (const id of order) {
    const g =
      task.voices?.[id] ??
      genderOfName(task.speakers[id] ?? "") ??
      introducedAs(task.lines.filter((l) => l.speaker === id).map((l) => l.text));
    if (g) genders.set(id, g);
  }
  // Unknown speakers get the voice type there are fewest of, so dialogues are easy to follow.
  // On a tie in a group, a woman's voice: there are more of them to choose from.
  order.forEach((id, i) => {
    if (genders.has(id)) return;
    const women = [...genders.values()].filter((g) => g === "kvinne").length;
    const men = genders.size - women;
    const tie = genders.size ? "kvinne" : (seed + i) % 2 ? "kvinne" : "mann";
    genders.set(id, women < men ? "kvinne" : men < women ? "mann" : tie);
  });

  const cast: Cast = {};
  const used = { kvinne: 0, mann: 0 };
  for (const id of order) {
    const gender = genders.get(id)!;
    const nth = used[gender]++;
    cast[id] = {
      gender,
      index: (seed >>> 3) + nth,
      nth,
      rate: 1 + (((hash(task.id + id) % 7) - 3) * 0.015),
    };
  }
  return cast;
}

export type Effect = "phone" | "pa" | "radio";

const RADIO = new Set([
  "Nyhetsinnslag",
  "Nyheter",
  "Radio",
  "Radioreklame",
  "Radiointervju",
  "Radioprogram",
  "Radiodebatt",
  "Radiodokumentar",
  "Værmelding",
  "Podkast",
  "Forbrukerprogram",
  "Kulturprogram",
]);

/** How a speaker should sound: through a phone, a loudspeaker or the radio. */
export function effectFor(task: ListeningTask, speaker: SpeakerId): Effect | undefined {
  if (task.genre.startsWith("Telefonbeskjed")) return "phone";
  // In a phone call we hear the caller in the room and the other end through the phone.
  if (task.genre === "Telefonsamtale") return speaker === "A" ? "phone" : undefined;
  if (task.genre === "Høyttalermelding") return "pa";
  if (RADIO.has(task.genre)) return "radio";
  return undefined;
}

/** Changes whenever the text, the speakers or the speed changes, so old recordings are not used. */
export function audioKey(task: ListeningTask): string {
  const cast = castVoices(task);
  return hash(JSON.stringify(["v1", task.level, task.lines, cast])).toString(36);
}
