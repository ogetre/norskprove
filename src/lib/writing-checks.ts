import type { WritingTask } from "@/content/writing";
import { levelIndex } from "./levels";

export type Check = { id: string; label: string; ok: boolean; detail: string };

const CONNECTORS = [
  "men",
  "fordi",
  "derfor",
  "så",
  "også",
  "først",
  "etterpå",
  "til slutt",
  "dessuten",
  "likevel",
  "for eksempel",
  "i tillegg",
  "når",
  "hvis",
  "dersom",
  "selv om",
  "mens",
  "ettersom",
  "dermed",
  "på den ene siden",
  "på den andre siden",
  "for det første",
  "for det andre",
  "samtidig",
  "altså",
  "etter min mening",
  "jeg mener",
  "konklusjonen",
];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) > 0);
}

export function usedConnectors(text: string): string[] {
  const lower = ` ${text.toLowerCase().replace(/[.,!?;:«»"()]/g, " ")} `;
  return CONNECTORS.filter((c) => lower.includes(` ${c} `));
}

/** Rule-based checks of a written answer. AI feedback on language comes later. */
export function checkWriting(task: WritingTask, text: string): Check[] {
  const words = countWords(text);
  const lvl = levelIndex(task.level);
  const checks: Check[] = [];

  checks.push({
    id: "length",
    label: "Lengde",
    ok: words >= task.minWords && words <= task.maxWords,
    detail:
      words < task.minWords
        ? `${words} ord. Teksten er for kort, skriv minst ${task.minWords} ord.`
        : words > task.maxWords
          ? `${words} ord. Teksten er litt lang, prøv å holde deg under ${task.maxWords} ord.`
          : `${words} ord. Lengden er innenfor ${task.minWords}–${task.maxWords} ord.`,
  });

  const lines = text.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);

  if (task.kind === "e-post") {
    const greeting = /^(hei|hallo|kjære|god (morgen|dag|kveld)|til )/i.test(lines[0] ?? "");
    checks.push({
      id: "greeting",
      label: "Hilsen i starten",
      ok: greeting,
      detail: greeting ? "Du starter med en hilsen." : "Start med en hilsen, for eksempel «Hei Kari!» eller «Hei!».",
    });
    const end = lines.slice(-3).join(" ");
    const closing = /(hilsen|mvh|ha det|klem|ser frem til)/i.test(end);
    checks.push({
      id: "closing",
      label: "Avslutning og navn",
      ok: closing,
      detail: closing
        ? "Du avslutter med en hilsen."
        : `Avslutt med en hilsen og navnet ditt, for eksempel «${lvl >= 2 ? "Vennlig hilsen" : "Hilsen"} Ali».`,
    });
  }

  const paragraphs = text.trim().split(/\n\s*\n/).filter((p) => countWords(p) > 0).length;
  const needParagraphs = lvl >= 2 ? 3 : lvl === 1 ? 2 : 1;
  if (needParagraphs > 1) {
    checks.push({
      id: "paragraphs",
      label: "Avsnitt",
      ok: paragraphs >= needParagraphs,
      detail:
        paragraphs >= needParagraphs
          ? `${paragraphs} avsnitt. Teksten er delt opp på en ryddig måte.`
          : `${paragraphs} avsnitt. Del teksten i minst ${needParagraphs} avsnitt med en tom linje mellom.`,
    });
  }

  const conn = usedConnectors(text);
  const needConn = [1, 2, 4, 6][lvl];
  checks.push({
    id: "connectors",
    label: "Bindeord",
    ok: conn.length >= needConn,
    detail:
      conn.length >= needConn
        ? `Du bruker ${conn.length} ulike bindeord: ${conn.slice(0, 6).join(", ")}.`
        : `Du bruker ${conn.length} ulike bindeord${conn.length ? ` (${conn.join(", ")})` : ""}. Bruk minst ${needConn}, for eksempel «fordi», «derfor», «men» eller «etterpå».`,
  });

  const sents = sentences(text);
  const lowerStart = sents.filter((s) => /^[a-zæøå]/.test(s)).length;
  checks.push({
    id: "capitals",
    label: "Stor forbokstav",
    ok: lowerStart === 0,
    detail: lowerStart === 0 ? "Alle setninger starter med stor bokstav." : `${lowerStart} setninger starter med liten bokstav.`,
  });

  if (sents.length >= 3) {
    const avg = words / sents.length;
    const ok = avg >= 5 && avg <= 24;
    checks.push({
      id: "sentences",
      label: "Setningslengde",
      ok,
      detail: ok
        ? `I snitt ${Math.round(avg)} ord per setning. Fin variasjon.`
        : avg < 5
          ? "Setningene er veldig korte. Prøv å binde dem sammen med «og», «men» eller «fordi»."
          : "Setningene er veldig lange. Del noen av dem opp med punktum.",
    });
  }

  return checks;
}
