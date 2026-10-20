"use client";

import { useEffect } from "react";
import { HomeLink, StatusLinks, StatusPage, statusPrimary } from "@/components/StatusPage";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage code="Feil" title="Noe gikk galt">
      <p>Siden kunne ikke vises akkurat nå. Prøv igjen, eller gå tilbake til forsiden.</p>
      <StatusLinks>
        <button type="button" onClick={() => retry()} className={statusPrimary}>
          Prøv igjen
        </button>
        <HomeLink />
      </StatusLinks>
    </StatusPage>
  );
}
