import type { SpeakingTask } from ".";

/*
 * The fixed parts of the oral Norskprøven: it always starts with «Fortell kort om deg selv», the
 * same task at every level, and at A1–A2 and A2–B1 the candidate describes a picture with several
 * people doing different things. The pictures are drawn by scripts/generate-pictures.ts, and each
 * text below says what its picture really shows.
 */

const intro = (level: SpeakingTask["level"], points: string[], phrases: string[], model: string): SpeakingTask => ({
  id: `kort-om-deg-selv-${level.toLowerCase()}`,
  level,
  title: "Fortell kort om deg selv",
  kind: "om-deg-selv",
  intro: "Prøven begynner alltid slik: Sensoren ber deg fortelle kort om deg selv. Du snakker i ett til to minutter.",
  questions: ["Kan du fortelle kort om deg selv?"],
  prepSeconds: 15,
  speakSeconds: 90,
  points,
  phrases,
  model,
});

const A1_PHRASES = ["På bildet ser jeg …", "Til venstre / til høyre …", "I midten …", "Bak / foran …", "Han / hun …"];
const B1_PHRASES = ["Bildet viser …", "I forgrunnen / i bakgrunnen …", "Det ser ut som om …", "Jeg tror at …", "Kanskje …"];

const picture = (
  id: string,
  level: SpeakingTask["level"],
  title: string,
  alt: string,
  question: string,
  points: string[],
  model: string,
): SpeakingTask => ({
  id: `bilde-${id}`,
  level,
  title,
  kind: "bilde",
  intro: "Se på bildet. Sensoren ber deg beskrive det du ser og stiller spørsmål om det.",
  image: { src: `/images/muntlig/${id}.webp`, alt },
  questions: [level === "A1" ? "Se på bildet. Hva ser du?" : "Kan du beskrive bildet? Hvor er vi, og hva skjer?", question],
  prepSeconds: 30,
  speakSeconds: level === "A1" ? 60 : 75,
  points,
  phrases: level === "A1" ? A1_PHRASES : B1_PHRASES,
  model,
});

export const examTasks: SpeakingTask[] = [
  intro(
    "A1",
    ["Navn og hvor du kommer fra", "Hvor du bor, og hvem du bor med", "Jobb eller skole", "Hva du liker å gjøre"],
    ["Jeg heter …", "Jeg kommer fra …", "Jeg bor i …", "Jeg jobber som … / Jeg går på …", "Jeg liker å …"],
    "Jeg heter Amir, og jeg kommer fra Syria. Jeg er trettifire år. Nå bor jeg i Drammen sammen med kona mi og to barn. Om formiddagen går jeg på norskkurs, og om ettermiddagen jobber jeg i en butikk. Jeg liker å spille fotball og lage mat. I helgene går vi ofte tur.",
  ),
  intro(
    "A2",
    ["Navn og hvor du kommer fra", "Hvor lenge du har bodd i Norge", "Familie og bolig", "Jobb, skole eller hva du gjorde før", "Fritid"],
    ["Jeg har bodd i Norge i …", "Før jobbet jeg som …", "Nå bor jeg …", "På fritiden pleier jeg å …"],
    "Jeg heter Lina, og jeg kommer fra Filippinene. Jeg har bodd i Norge i tre år. Først bodde jeg i Oslo, men nå bor jeg i Hamar sammen med mannen min. I hjemlandet mitt jobbet jeg som lærer. Nå jobber jeg på en barnehage, og jeg trives veldig godt der. På fritiden pleier jeg å trene, og om sommeren liker jeg å gå i skogen.",
  ),
  intro(
    "B1",
    ["Hvem du er, og hvor du kommer fra", "Utdanning og arbeidserfaring", "Livet ditt i Norge nå", "Hvorfor du lærer norsk, og planer for framtiden"],
    ["Opprinnelig kommer jeg fra …", "Jeg er utdannet …", "Det jeg liker best med …", "Planen min er å …"],
    "Jeg heter Daniel, og opprinnelig kommer jeg fra Eritrea. Jeg kom til Norge for fem år siden. Jeg er utdannet elektriker, men det tok tid å få godkjent utdanningen her, så de første årene jobbet jeg på et lager. Nå har jeg endelig fått jobb som elektriker i Trondheim. Jeg bor sammen med samboeren min, og vi har en datter på to år. Jeg lærer norsk fordi jeg vil klare meg på jobben og bli bedre kjent med folk. Planen min er å ta fagbrev i løpet av de neste årene.",
  ),

  picture(
    "parken",
    "A1",
    "I parken",
    "En park en solrik sommerdag, med åser, et vann og røde hus i bakgrunnen. En mann med hodetelefoner jogger på stien. En kvinne i stripete kjole og stråhatt går tur med en gul hund. En gammel kvinne sitter på en benk og gir mat til duene. En familie med mor, far og to små barn har piknik på et rutete teppe. To barn spiller fotball. En rød drage flyr på himmelen.",
    "Liker du å være i parken? Hva gjør du der?",
    ["Hvor personene er, og hvordan været er", "Familien på teppet", "Mannen som jogger, og kvinnen med hunden", "Den gamle kvinnen og barna"],
    "På bildet ser jeg en park. Det er sommer, og sola skinner. I midten har en familie piknik. De sitter på et rødt og hvitt teppe og spiser. Bak dem løper en mann med hodetelefoner. Til høyre går en kvinne tur med hunden sin, og en gammel dame sitter på en benk og gir mat til fuglene. Til venstre spiller to barn fotball. Høyt oppe ser jeg en rød drage.",
  ),
  picture(
    "kjokkenet",
    "A1",
    "På kjøkkenet",
    "Et kjøkken i et hjem. En kvinne med forkle står ved bordet og rører i en kjele. En mann har tallerkener i hendene og dekker bordet. En liten jente sitter ved bordet og tegner med fargeblyanter. En gammel mann med briller sitter i en lenestol og leser avisen. En katt sover i vinduet. En kjele koker på komfyren.",
    "Hvem lager mat hjemme hos deg?",
    ["Hvilket rom det er", "Kvinnen og mannen ved bordet", "Jenta", "Den gamle mannen og katten"],
    "Dette er et kjøkken. Jeg tror det er middagstid. En kvinne lager mat. Hun har et forkle og en kjele. En mann dekker bordet. Han har tallerkener i hendene. Ved bordet sitter en liten jente. Hun tegner. Til venstre sitter en gammel mann i en stol. Han leser avisen. I vinduet sover en katt.",
  ),
  picture(
    "butikken",
    "A1",
    "I butikken",
    "En liten matbutikk. Ved kassen betaler en kvinne med kort, og en smilende kassadame holder betalingsterminalen. Til venstre legger en ansatt med caps brød i hyllene. Til høyre plukker en mann med skjegg epler fra en kasse. En gutt i grønn genser holder en kartong melk.",
    "Hvor handler du mat? Hva kjøper du?",
    ["Hvor personene er", "Kvinnen som betaler, og kassadamen", "Mannen og gutten", "Den ansatte ved brødhyllene"],
    "På bildet ser jeg en butikk. I midten står to kvinner ved kassen. Den ene jobber i butikken, og den andre betaler med kort. Til venstre er det en mann som jobber i butikken. Han legger brød i hyllen. Til høyre står en mann med skjegg. Han kjøper epler. Ved siden av ham står en gutt med en melkekartong. Kanskje det er sønnen hans.",
  ),
  picture(
    "stranden",
    "A1",
    "På stranden",
    "En strand ved en fjord en varm sommerdag, med høye fjell bak. To personer bader i vannet. En mann sitter i en stol under en parasoll og leser en bok. En liten jente lager et sandslott med en rød bøtte. En kvinne med stråhatt smører solkrem på et lite barn på et håndkle. To ungdommer spiller volleyball.",
    "Liker du å bade? Hvor bader du om sommeren?",
    ["Hvor de er, og hvordan været er", "Personene i vannet", "Mannen, jenta og kvinnen med barnet", "Ungdommene som spiller"],
    "Bildet viser en strand. Det er sommer og varmt. Bak stranden er det vann og høye fjell. To personer bader i vannet. Til venstre sitter en mann i en stol under en parasoll. Han leser en bok. Foran ham lager en liten jente et sandslott. I midten sitter en kvinne med et lite barn. Hun smører solkrem på barnet. Til høyre spiller to ungdommer volleyball.",
  ),
  picture(
    "vinter",
    "A1",
    "En vinterdag",
    "En gate med fargerike trehus en vinterdag med mye snø. En mann i brun jakke måker snø. En kvinne går på ski. To barn sitter på en kjelke og aker. Lenger bak lager to personer en snømann. En gutt i grønn jakke kaster en snøball.",
    "Hva liker du å gjøre om vinteren?",
    ["Årstiden og været", "Mannen og kvinnen på ski", "Barna på kjelken og gutten", "Snømannen"],
    "På bildet er det vinter, og det er mye snø. Jeg ser en gate med hus i mange farger. Til venstre måker en mann snø. Han har lue og skjerf. I midten går en kvinne på ski. Foran henne aker to barn på en kjelke. De ler. Lenger bak lager to personer en snømann. Til høyre kaster en gutt en snøball. Det ser kaldt ut, men alle er glade.",
  ),
  picture(
    "bussholdeplassen",
    "A1",
    "På bussholdeplassen",
    "En regnværsdag om høsten ved en bussholdeplass i en liten by. En gammel mann med lue sitter på benken under taket. En kvinne med paraply står med en barnevogn. En mann i frakk og slips ser på mobilen sin og har en veske. En ungdom med ryggsekk løper gjennom en vannpytt mot en rød buss som kommer.",
    "Hvordan kommer du deg til jobb eller skole?",
    ["Årstiden og været", "Den gamle mannen og kvinnen med barnevognen", "Mannen med mobilen", "Ungdommen som løper, og bussen"],
    "Bildet viser en bussholdeplass. Det er høst, og det regner. En gammel mann sitter på en benk. Ved siden av ham står en kvinne med en paraply og en barnevogn. En mann i frakk ser på mobilen. Han skal kanskje på jobb. Til høyre kommer en rød buss. En ungdom med ryggsekk løper til bussen. Han løper gjennom en vannpytt.",
  ),

  picture(
    "venterommet",
    "B1",
    "På legekontoret",
    "Et venterom på et legekontor. En mann sitter med armen i fatle. En kvinne holder en baby som gråter. En eldre mann leser et blad. En ungdom med hodetelefoner ser kjedelig ut og ser på mobilen. Bak skranken snakker en sekretær i telefonen. Det henger en klokke på veggen.",
    "Hva tror du personene tenker mens de venter?",
    ["Hvor vi er, og hvem som venter", "Hvorfor personene kanskje er der", "Hvordan de har det", "Sekretæren"],
    "Bildet viser et venterom, sannsynligvis på et legekontor. Fire personer sitter og venter. Lengst til venstre sitter en mann med armen i fatle. Kanskje han har falt og brukket armen. Ved siden av ham sitter en kvinne med en liten baby som gråter. Hun smiler, men jeg tror hun er litt sliten. Til høyre leser en eldre mann et blad, og en ungdom med hodetelefoner ser på mobilen. Han ser ut som han kjeder seg. Bak skranken står en sekretær og snakker i telefonen. Kanskje hun bestiller en time for en pasient.",
  ),
  picture(
    "kontoret",
    "B1",
    "På kontoret",
    "Et åpent kontorlandskap. Ved et vindu snakker en mann i telefonen. Ved et rundt bord sitter en kvinne som har sølt kaffe på papirene sine, og hun ser overrasket ut. En mann med en bærbar PC sitter ved samme bord. Til høyre gir to kolleger en bursdagskake med lys til en smilende kvinne.",
    "Hva er viktig for at man skal trives på en arbeidsplass?",
    ["Hvor vi er", "Uhellet ved bordet", "Feiringen til høyre", "Stemningen på arbeidsplassen"],
    "Dette er et kontor, og jeg tror det er en vanlig arbeidsdag. Ved vinduet står en mann og snakker i telefonen. Kanskje han snakker med en kunde. Ved bordet i midten har det skjedd et lite uhell. En kvinne har sølt kaffe på papirene sine, og hun ser overrasket ut. Kollegaen hennes har en PC foran seg og prøver å berolige henne. Til høyre feirer de en bursdag. To kolleger gir en kake med lys til en kvinne som smiler. Det ser ut som en hyggelig arbeidsplass.",
  ),
  picture(
    "flytting",
    "B1",
    "Flyttedag",
    "En flyttedag utenfor en boligblokk, med fjell og en fjord i bakgrunnen. En varebil står med åpne dører og esker inni. To unge menn bærer en grå sofa. En mann med skjegg og lue bærer to esker. En liten jente i gul jakke bærer en potteplante. En eldre kvinne står på balkongen med en kopp og ser på.",
    "Har du flyttet mange ganger? Hvordan var det?",
    ["Hva som skjer", "Hvem som hjelper til, og hva de bærer", "Kvinnen på balkongen", "Hvordan personene har det"],
    "Bildet viser en flyttedag. En familie flytter inn i en leilighet, eller kanskje ut. Til venstre står en varebil med åpne dører, og inni er det mange esker. To unge menn bærer en stor sofa. Det ser tungt ut, men de smiler. En mann med skjegg bærer to esker, og en liten jente hjelper til med en plante. Oppe på balkongen står en eldre kvinne med en kopp. Hun følger med på det som skjer. Kanskje hun er nysgjerrig på de nye naboene.",
  ),
  picture(
    "kafeen",
    "B1",
    "På kafeen",
    "En travel kafé med planter og lamper. Bak disken lager en barista kaffe. Ved et bord ler to venner og drikker kaffe. En servitør har mistet et brett, og koppene ligger på gulvet. En mann jobber på en bærbar PC, og en kvinne sitter ved vinduet og leser en bok.",
    "Hva tror du servitøren gjør nå?",
    ["Hvor vi er, og hvem som er der", "Uhellet med brettet", "Hva gjestene gjør", "Stemningen på kafeen"],
    "Bildet er fra en koselig kafé. Bak disken står en barista og lager kaffe. I midten har det skjedd et uhell. En servitør har mistet brettet, og koppene ligger på gulvet. Hun ser lei seg ut. Til venstre sitter to venner og ler. Det virker ikke som de har sett uhellet. Til høyre sitter en mann som jobber på PC-en, og en kvinne som leser en bok ved vinduet. Det ser ut som et rolig sted der man kan slappe av.",
  ),
  picture(
    "togstasjonen",
    "B1",
    "På togstasjonen",
    "En perrong på en togstasjon. Et tog står inne. En mann i frakk løper med en koffert mot toget. En ung kvinne med ryggsekk står med et stort kart og ser forvirret ut. En familie klemmer hverandre og sier ha det. Flere personer venter med kofferter. Det henger en stor klokke på perrongen.",
    "Hva ville du gjort hvis du var kvinnen med kartet?",
    ["Hvor vi er", "Mannen som løper", "Kvinnen med kartet", "Familien og de som venter"],
    "Bildet viser en perrong på en togstasjon. Til venstre står et tog. En mann med koffert løper mot toget. Jeg tror han er sent ute og er redd for å miste toget. I midten står en ung kvinne med ryggsekk og et stort kart. Hun ser forvirret ut. Kanskje hun er turist og ikke vet hvilket tog hun skal ta. Til høyre klemmer en familie hverandre. Det kan være at noen skal reise bort, eller at noen har kommet hjem. Bak dem venter flere personer med kofferter.",
  ),
  picture(
    "dugnad",
    "B1",
    "Dugnad",
    "Dugnad i hagen utenfor en boligblokk om våren. Trærne blomstrer. En kvinne med hansker raker løv. En mann maler gjerdet hvitt. To barn plukker søppel og flasker i sekker. En kvinne serverer kaffe og vafler fra et bord. En eldre mann med hatt planter blomster.",
    "Har du vært med på dugnad? Hva synes du om det?",
    ["Hva dugnad er, og hvor vi er", "Hva de voksne gjør", "Barna", "Kaffe og vafler"],
    "Bildet viser en dugnad utenfor en boligblokk. Det er vår, og trærne blomstrer. Naboene jobber sammen for å gjøre det fint ute. Til venstre raker en kvinne løv, og en mann maler gjerdet. I midten plukker to barn søppel og legger det i sekker. De ser ut som de synes det er gøy. Til høyre har en kvinne laget kaffe og vafler til alle, og en eldre mann planter blomster. Jeg synes dugnad er en fin tradisjon, fordi man blir kjent med naboene.",
  ),
];
