import type { Metadata } from "next";
import { CompanyDetails, LegalPage, List, Section, To } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Personvernerklæring",
  description: "Hvilke personopplysninger NorskprøveKlar behandler, hvorfor, hvem vi deler dem med og hvilke rettigheter du har.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Personvernerklæring"
      lead={
        <p>
          NorskprøveKlar er en nettjeneste for å forberede seg til Norskprøven. Her forklarer vi hvilke
          personopplysninger vi behandler, hvorfor vi gjør det, hvem vi deler dem med og hvilke rettigheter du har.
        </p>
      }
    >
      <Section title="Hvem er ansvarlig">
        <p>Behandlingsansvarlig for personopplysningene i NorskprøveKlar er:</p>
        <CompanyDetails />
        <p>Skriv til oss på e-post hvis du har spørsmål om personvern eller vil bruke rettighetene dine.</p>
      </Section>

      <Section title="Hva vi behandler, og hvorfor">
        <List>
          <li>
            <strong>Konto.</strong> Når du lager konto, får vi navn, e-postadresse og eventuelt profilbilde fra Google
            eller fra e-postinnloggingen. Vi bruker dem til innlogging og til å holde orden på kontoen din. Grunnlaget
            er avtalen med deg (personvernforordningen artikkel 6 nr. 1 bokstav b).
          </li>
          <li>
            <strong>Fremgang og det du lager.</strong> Svarene dine på oppgaver, resultater, tekstene du skriver, det du
            sier i muntlige oppgaver (som tekst), ordene du lagrer, og målet ditt for prøven: nivå, prøvedato og hvorfor
            du tar prøven, for eksempel statsborgerskap, hvis du oppgir det. I tillegg lagrer vi morsmålet du velger for
            oversettelser. Dette lagres i nettleseren din, og når du er logget inn, også i databasen vår, slik at du har
            det på alle enhetene dine. Grunnlaget er avtalen med deg.
          </li>
          <li>
            <strong>Lydopptak i muntlige oppgaver.</strong> Opptakene ligger bare i nettleseren mens du øver, og blir
            borte når du lukker siden. Når du ber om AI-vurdering av muntlig, sendes opptakene via serveren vår til
            Google, som lager vurderingen. Vi lagrer ikke opptakene. Google bruker dem bare til vurderingen og kan
            beholde dem en kort tid for drift og for å hindre misbruk. Det vi lagrer, er teksten av det du sa og
            vurderingen. Grunnlaget er avtalen med deg.
          </li>
          <li>
            <strong>Tekster til AI.</strong> Når du ber om tilbakemelding på skriving, slår opp et ord eller oversetter
            et avsnitt, sendes teksten til Anthropic, som lager svaret. Anthropic kan beholde forespørselen en kort tid
            for å hindre misbruk. Grunnlaget er avtalen med deg.
          </li>
          <li>
            <strong>Betaling.</strong> Når du kjøper et abonnement, behandler Stripe kortopplysningene. Vi ser aldri
            kortnummeret ditt. Vi lagrer hvilket abonnement du har, når det gjelder til, og en kunde-ID hos Stripe.
            Grunnlaget er avtalen med deg og plikten vi har til å føre regnskap (artikkel 6 nr. 1 bokstav c).
          </li>
          <li>
            <strong>Bruk av AI.</strong> Vi teller hvor mange AI-forespørsler hver konto gjør per dag, og hvor mange
            muntlige vurderinger du har brukt, for å holde kostnadene nede og hindre misbruk. Tellingen inneholder ikke
            det du skrev eller sa. Grunnlaget er vår berettigede interesse (artikkel 6 nr. 1 bokstav f).
          </li>
          <li>
            <strong>Tekniske data.</strong> Serverne registrerer IP-adresse og nettleser når du bruker tjenesten, for
            drift, feilsøking og sikkerhet. Grunnlaget er vår berettigede interesse.
          </li>
          <li>
            <strong>Besøksstatistikk.</strong> Vi teller hvilke sider som blir besøkt, og hvor besøkende kommer fra
            (land, enhetstype, nettleser og nettstedet som lenket hit), med Vercel Web Analytics. Statistikken bruker
            ingen informasjonskapsler og kan ikke knyttes til deg eller kontoen din. Vi bruker den til å se hvilke deler
            av tjenesten som er nyttige. Grunnlaget er vår berettigede interesse.
          </li>
        </List>
        <p>
          Vi bruker ikke opplysningene dine til reklame, og vi selger dem aldri. AI-leverandørene bruker ikke det du
          sender, til å trene modellene sine.
        </p>
      </Section>

      <Section title="Informasjonskapsler og lagring i nettleseren">
        <p>
          Vi bruker bare informasjonskapsler som trengs for innloggingen. Fremgangen din og innstillinger som fargetema
          og morsmål lagres i nettleserens lokale lagring. Besøksstatistikken bruker ingen informasjonskapsler. Vi bruker
          ingen informasjonskapsler til reklame eller sporing, og derfor ber vi ikke om samtykke til dem.
        </p>
      </Section>

      <Section title="Hvem vi deler opplysningene med">
        <p>Vi bruker disse leverandørene, som behandler opplysninger på våre vegne etter avtale med oss:</p>
        <List>
          <li>
            <strong>Vercel</strong> (USA): drift av nettstedet og serverne, og besøksstatistikken.
          </li>
          <li>
            <strong>Neon</strong> (USA): databasen med konto-ID, fremgang og abonnement.
          </li>
          <li>
            <strong>Clerk</strong> (USA): innlogging og brukerkontoer.
          </li>
          <li>
            <strong>Anthropic</strong> (USA): AI-tilbakemelding på skriving, ordoppslag og oversettelse, og vurdering av
            muntlig når Google ikke er tilgjengelig.
          </li>
          <li>
            <strong>Google Cloud</strong> (behandling i EU, i Finland): AI-vurdering av muntlige opptak og uttale.
          </li>
          <li>
            <strong>Stripe</strong> (Irland og USA): betaling.
          </li>
        </List>
      </Section>

      <Section title="Overføring til land utenfor EØS">
        <p>
          Flere av leverandørene holder til i USA, og opplysningene lagres der. Overføringen skjer på grunnlag av EUs
          standard personvernbestemmelser og, for leverandører som er sertifisert, EU–US Data Privacy Framework. Du
          kan be om en kopi av grunnlaget for overføringen.
        </p>
      </Section>

      <Section title="Hvor lenge vi lagrer">
        <List>
          <li>Konto og fremgang: så lenge du har konto. Sletter du kontoen, sletter vi fremgangen innen 30 dager.</li>
          <li>Lydopptak: lagres ikke hos oss.</li>
          <li>Tellingen av AI-bruk: som statistikk uten innholdet i forespørslene.</li>
          <li>Opplysninger om betaling: i fem år, slik bokføringsloven krever.</li>
          <li>Serverlogger: i kort tid, for drift og sikkerhet.</li>
        </List>
      </Section>

      <Section title="Rettighetene dine">
        <p>
          Du har rett til innsyn i opplysningene vi har om deg, og til å få dem rettet, slettet eller utlevert i et
          maskinlesbart format. Du kan også be oss begrense behandlingen eller protestere mot den. Skriv til oss på
          e-post, så svarer vi innen 30 dager.
        </p>
        <p>
          Fremgangen kan du slette selv under Oversikt. For å slette hele kontoen, skriv til oss.
        </p>
        <p>
          Mener du at vi behandler opplysningene dine i strid med regelverket, kan du klage til{" "}
          <To href="https://www.datatilsynet.no">Datatilsynet</To>.
        </p>
      </Section>

      <Section title="Barn">
        <p>Tjenesten er laget for voksne som skal ta Norskprøven, og er ikke rettet mot barn under 16 år.</p>
      </Section>

      <Section title="Endringer">
        <p>
          Vi oppdaterer erklæringen når vi endrer hvordan vi behandler personopplysninger. Ved større endringer gir vi
          beskjed på nettstedet eller på e-post. Se også <To href="/vilkar">salgsvilkårene</To>.
        </p>
      </Section>
    </LegalPage>
  );
}
