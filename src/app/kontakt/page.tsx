import type { Metadata } from "next";
import { CompanyDetails, CompanyField, LegalPage, Section, To } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Kontakt og om oss",
  description: "Hvem som står bak NorskprøveKlar, og hvordan du kommer i kontakt med oss.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Kontakt og om oss"
      lead={
        <p>
          NorskprøveKlar hjelper voksne innvandrere å forberede seg til Norskprøven i lesing, lytting, skriving og
          muntlig, med oppgaver i samme stil som prøven og tilbakemelding fra AI.
        </p>
      }
    >
      <Section title="Kontakt oss">
        <p>
          Har du et spørsmål, en feil du vil melde eller en idé til tjenesten? Skriv til{" "}
          <CompanyField field="email" />. Vi svarer så raskt vi kan, vanligvis innen noen dager.
        </p>
      </Section>

      <Section title="Hvem står bak">
        <CompanyDetails />
      </Section>

      <Section title="Uavhengig tjeneste">
        <p>
          NorskprøveKlar er ikke tilknyttet Direktoratet for høyere utdanning og kompetanse (HK-dir), som lager og
          gjennomfører Norskprøven. Oppgavene er laget av oss i samme stil som prøven. Offisiell informasjon om prøven
          og påmelding finner du hos <To href="https://hkdir.no">HK-dir</To>.
        </p>
      </Section>

      <Section title="Vilkår og personvern">
        <p>
          Les <To href="/vilkar">salgsvilkårene</To> og <To href="/personvern">personvernerklæringen</To>.
        </p>
      </Section>
    </LegalPage>
  );
}
