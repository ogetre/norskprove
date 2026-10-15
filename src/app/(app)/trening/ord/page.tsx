import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { WordsView } from "./WordsView";

export const metadata: Metadata = { title: "Mine ord" };

export default function WordsPage() {
  return (
    <Paywall skill="lesing" feature="Mine ord">
      <WordsView />
    </Paywall>
  );
}
