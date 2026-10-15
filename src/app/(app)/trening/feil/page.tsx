import type { Metadata } from "next";
import { Paywall } from "@/components/Access";
import { ErrorsView } from "./ErrorsView";

export const metadata: Metadata = { title: "Øv på feilene dine" };

export default function ErrorsPage() {
  return (
    <Paywall skill="skriving" feature="Øv på feilene dine">
      <ErrorsView />
    </Paywall>
  );
}
