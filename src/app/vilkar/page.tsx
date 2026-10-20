import type { Metadata } from "next";
import { CompanyDetails, CompanyField, LegalPage, List, Section, To } from "@/components/LegalPage";
import { FREE_ORAL_CHECKS, PLAN_ORAL_CHECKS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Salgsvilkår",
  description: "Vilkårene for abonnement på NorskprøveKlar: priser, betaling, fornyelse, oppsigelse og angrerett.",
};

const oralChecks = (n: number | null) => (n === null ? "ubegrenset" : `${n}`);

export default function TermsPage() {
  return (
    <LegalPage
      title="Salgsvilkår"
      lead={
        <p>
          Disse vilkårene gjelder når du kjøper abonnement på NorskprøveKlar. I tillegg gjelder ufravikelige regler i
          forbrukerlovgivningen, blant annet angrerettloven, som gir deg rettigheter uansett hva som står her.
        </p>
      }
    >
      <Section title="Partene">
        <p>Selger er:</p>
        <CompanyDetails />
        <p>Kjøper er personen som bestiller abonnementet, heretter «du».</p>
      </Section>

      <Section title="Tjenesten og abonnementene">
        <p>
          NorskprøveKlar er en nettjeneste med oppgaver, prøver og tilbakemelding for å forberede seg til Norskprøven.
          Abonnementene gir tilgang til dette:
        </p>
        <List>
          {PLANS.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> ({p.price} kr i måneden): {p.features.join("; ")}.
            </li>
          ))}
        </List>
        <p>
          AI-vurderingene av muntlig gjelder per kalendermåned: {oralChecks(PLAN_ORAL_CHECKS.start)} i Start,{" "}
          {oralChecks(PLAN_ORAL_CHECKS.pluss)} i Pluss og {oralChecks(PLAN_ORAL_CHECKS.premium)} i Premium. Vurderinger
          du ikke bruker, overføres ikke til neste måned. Alle med konto får {FREE_ORAL_CHECKS} gratis AI-vurdering av
          muntlig og kan ta en gratis prøvetest. For å hindre misbruk har AI-funksjonene også en daglig grense per konto.
        </p>
      </Section>

      <Section title="Priser og betaling">
        <p>
          Prisene står på <To href="/priser">prissiden</To>. De er i norske kroner og inkluderer merverdiavgift når
          denne skal betales. Du betaler med kort gjennom vår betalingsleverandør Stripe. Hver måned betales på
          forskudd.
        </p>
      </Section>

      <Section title="Fornyelse og oppsigelse">
        <p>
          Abonnementet fornyes automatisk hver måned til du sier det opp. Det er ingen bindingstid. Du kan si opp når
          som helst i kontoinnstillingene eller ved å skrive til oss på <CompanyField field="email" />. Oppsigelsen
          gjelder fra slutten av måneden du har betalt for, og du har tilgang ut den måneden. Vi betaler ikke tilbake
          for en påbegynt måned, med mindre loven gir deg rett til det.
        </p>
        <p>
          Endrer vi prisen, gir vi beskjed minst 30 dager før den nye prisen gjelder. Du kan da si opp før endringen.
        </p>
      </Section>

      <Section title="Angrerett">
        <p>
          Du har 14 dagers angrerett fra den dagen du kjøper abonnementet. Ved kjøpet kan du be om at tilgangen starter
          med en gang. Går du fra avtalen innen 14 dager, betaler vi tilbake det du har betalt, minus en forholdsmessig
          del for dagene du har hatt tilgang (angrerettloven § 26).
        </p>
        <p>
          Du går fra avtalen ved å gi oss beskjed på e-post innen fristen. Du kan bruke skjemaet nedenfor, men det er
          ikke nødvendig. Vi betaler tilbake senest 14 dager etter at vi fikk beskjeden, til det samme kortet du betalte
          med.
        </p>
        <div className="rounded-xl bg-surface p-5 text-[15px] ring-1 ring-ice">
          <p className="font-semibold">Angreskjema</p>
          <p className="mt-2 text-granite">
            Til <CompanyField field="name" />, <CompanyField field="email" />: Jeg melder herved at jeg går fra avtalen
            om abonnement på NorskprøveKlar. Avtalen ble inngått den (dato): … Navn: … E-postadressen kontoen er
            registrert med: … Dato: …
          </p>
        </div>
      </Section>

      <Section title="Nivåvurderinger og AI">
        <p>
          Nivåene du får i tjenesten, er veiledende anslag laget ut fra svarene dine, med automatiske sjekker og AI.
          De er ikke offisielle resultater, og AI kan ta feil. Vi kan ikke love at du består Norskprøven.
        </p>
        <p>
          NorskprøveKlar er en uavhengig tjeneste og er ikke tilknyttet Direktoratet for høyere utdanning og
          kompetanse (HK-dir). Oppgavene er laget av oss i samme stil som prøven og er ikke ekte prøveoppgaver.
        </p>
      </Section>

      <Section title="Bruk av tjenesten">
        <p>
          Kontoen er personlig. Du kan ikke dele innloggingen med andre, kopiere eller videreselge innholdet, eller
          bruke AI-funksjonene til noe annet enn egen øving. Bryter du dette vesentlig, kan vi stenge kontoen.
        </p>
      </Section>

      <Section title="Feil og mangler">
        <p>
          Virker ikke tjenesten slik den skal, gi oss beskjed innen rimelig tid etter at du oppdaget feilen. Vi retter
          feilen så raskt vi kan. Er det ikke mulig, har du rett til prisavslag eller tilbakebetaling etter reglene i
          forbrukerlovgivningen. Tjenesten kan være utilgjengelig en kort tid ved vedlikehold.
        </p>
      </Section>

      <Section title="Personvern">
        <p>
          Hvordan vi behandler personopplysninger, står i <To href="/personvern">personvernerklæringen</To>.
        </p>
      </Section>

      <Section title="Klage og tvister">
        <p>
          Har du en klage, skriv til oss først, så prøver vi å finne en løsning. Kommer vi ikke til enighet, kan du
          kontakte <To href="https://www.forbrukerradet.no">Forbrukerrådet</To> for mekling. Saken kan deretter
          bringes inn for Forbrukerklageutvalget. Avtalen følger norsk rett.
        </p>
      </Section>
    </LegalPage>
  );
}
