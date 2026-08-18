# Matchpoint Tournament — optimalisatiebacklog

**Analysebasis:** implementatieplan en codebase op 18 augustus 2026

**Doel:** mogelijke verbeteringen voor snelheid, dataverbruik, betrouwbaarheid en beheerbaarheid lokaliseren. Dit is een backlog, geen lijst die volledig vóór productie moet worden uitgevoerd.

## Samenvatting

De applicatie heeft bewust een begrensde schaal: maximaal 256 spelers en 255 wedstrijden per editie. Daardoor zijn algemene micro-optimalisaties en vroege paginering minder belangrijk dan efficiënt verversen, korte transacties en wedstrijddagbestendigheid.

De grootste concrete kansen in de huidige implementatie zijn:

1. De publieke toernooipagina haalt elke 10 seconden de volledige loting, planning en sponsorlijst op; de presentatie haalt elke 5 seconden opnieuw alle livegegevens en slides op.
2. Iedere beheerroute laadt na het inloggen de volledige deelnemerslijst en voor Administrators ook alle sponsors, ook wanneer het geopende scherm die gegevens niet gebruikt.
3. Elke geautoriseerde API-aanroep schrijft `last_seen_at` naar MySQL.
4. Iedere wijziging van één lotingspositie verstuurt alle 32–256 posities, herschrijft alle lotingsregels en spelersnummers, verwijdert alle wedstrijden en stuurt daarna de volledige loting terug.
5. De betaalbevestigingspagina vraagt iedere 3 seconden de status op en iedere aanvraag doet daarbij ook een externe Mollie-call.
6. Handmatige e-mail wordt synchroon en één ontvanger tegelijk naar maximaal 300 ontvangers verstuurd.
7. Presentatieafbeeldingen mogen 10 MB groot zijn en worden niet automatisch verkleind of in varianten opgeslagen.
8. De huidige offline fallback bewaart alleen de laatst geladen React-state; na herladen zonder netwerk is er geen lokale kopie en beheeracties hebben geen offline wachtrij.

## Prioriteiten

| Prioriteit | Onderwerp                                                                                          | Verwachte winst                                                            | Inspanning  | Eerst bewijzen met                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| P0         | Registratiecapaciteit atomair reserveren en externe betaling buiten de database-transactie brengen | Voorkomt overboeking, lange locks en half afgemaakte registraties          | Hoog        | Gelijktijdigheidstest met de laatste vrije plek en een trage/falende betaalprovider |
| P0         | Publieke polling conditioneel en adaptief maken                                                    | Veel minder API-, database- en dataverkeer tijdens het evenement           | Middel      | Payloadgrootte en requests per minuut bij 1, 10 en 50 schermen                      |
| P0         | `last_seen_at`-writes beperken                                                                     | Minder databasewrites op ieder beheerscherm                                | Laag        | Writes per beheeraanvraag vóór en na de wijziging                                   |
| P0         | Event-day offline/read-only cache en herstelgedrag                                                 | Betere continuïteit bij instabiel wifi of hosting                          | Middel/hoog | Netwerkverlies-, refresh- en reconnect-test op telefoon en presentatiescherm        |
| P1         | Beheerdata alleen per scherm laden en bundles per domein splitsen                                  | Snellere eerste beheerweergave en minder persoonsgegevens over de lijn     | Middel      | JS- en JSON-bytes bij openen van elk beheerscherm                                   |
| P1         | Loting incrementeel en met versiecontrole opslaan                                                  | Veel minder writes/data; voorkomt dat twee beheerders elkaar overschrijven | Middel/hoog | 20 snelle wijzigingen en een gelijktijdige-edit-test                                |
| P1         | E-mailverzending via een duurzame wachtrij uitvoeren                                               | Geen time-outs; hervatbaar en controleerbaar verzenden                     | Hoog        | Test met 300 ontvangers, providerfouten en retries                                  |
| P1         | Afbeeldingen valideren, verkleinen en lang cachen                                                  | Snellere presentatie en veel minder mediadata                              | Middel      | Upload van een 10 MB foto en cold-cache weergave                                    |
| P2         | Query-indexen op werkelijk productiegebruik afstemmen                                              | Lagere querytijd wanneer audit/e-mailhistorie groeit                       | Laag/middel | `EXPLAIN ANALYZE` met realistische testdata                                         |
| P2         | Grote API-responses incrementeel bijwerken                                                         | Snellere winnaar-, planning- en slideacties                                | Middel      | Responsebytes en UI-latency per mutatie                                             |

P0 betekent hier: vóór of tijdens productiegereed maken expliciet beoordelen. P1 is de eerstvolgende optimalisatieronde. P2 pas uitvoeren wanneer metingen de noodzaak bevestigen.

## 1. Meten en budgetten

### Wat al goed is

- De domeinschaal is hard begrensd en veel query's filteren al op `tournament_id`.
- Er zijn indexen voor onder meer spelersstatus, wedstrijdstatus, wedstrijdplanning, actieve slides en auditdatums.
- Spotify zoeken is in de frontend al 450 ms gedebounced en annuleert achterhaalde requests.
- Auditlog heeft server-side paginering en de frontend annuleert een achterhaalde fetch.

### Mogelijke verbeteringen

- Voeg gestructureerde requestlogging toe met route, status, duur, responsebytes en een correlation ID. Log geen tokens, cookies of volledige persoonsgegevens.
- Meet afzonderlijk database-, Mollie-, Spotify- en Brevo-tijd. Een trage externe dienst is anders niet van een trage applicatie te onderscheiden.
- Activeer MySQL slow-query logging op staging en gebruik `EXPLAIN ANALYZE` voor de publieke feeds, auditlog en e-mailhistorie.
- Leg eenvoudige budgetten vast, bijvoorbeeld voor p95 API-latency, eerste beheerweergave, maximale JSON-respons en maximale presentatieafbeelding na verwerking. Kies de waarden pas na een staging-baseline.
- Maak een 256-speler/255-wedstrijden dataset en een korte loadtest voor registratie, winnaar invoeren, `/api/public/live` en `/api/public/tournament-page`.

**Lokalisatie:** `backend/public/index.php`, `backend/src/Http.php`, `backend/src/Database.php`, nieuwe integratie-/loadtests onder `tests/`.

## 2. Frontend, navigatie en initiële data

### Huidige situatie

`TournamentApp` importeert alle beheerdomeinen statisch. Na authenticatie worden op iedere beheerroute alle spelers geladen; voor een Administrator worden ook alle sponsors geladen. Dit gebeurt dus ook op bijvoorbeeld Auditlog, Wedstrijden en Instellingen. De inschrijfroute gebruikt eveneens `TournamentApp`, waardoor die architectuur ook publieke code aan beheercomponenten koppelt.

### Mogelijke verbeteringen

- Laad spelers en sponsors alleen voor schermen die ze echt nodig hebben. Overzicht kan een kleine samenvattingsendpoint gebruiken in plaats van de volledige CRM-lijst.
- Gebruik dynamische imports per beheerdomein. Houd desgewenst de persistente shell, maar laad Loting, Planning, Presentatiebeheer, Auditlog en CRM pas wanneer de gebruiker ze opent.
- Maak de publieke inschrijfpagina rechtstreeks van `Registration` afhankelijk in plaats van van de volledige beheerapp.
- Voeg één gedeelde request/cachelaag toe voor deduplicatie, annuleren, foutafhandeling en gerichte invalidatie. Voorkom dat ieder hookbestand eigen, net afwijkende laadlogica onderhoudt.
- Prefetch alleen het meest waarschijnlijke volgende scherm wanneer de browser idle is en de verbinding dat toelaat (`saveData`/`effectiveType`).
- Voeg een foutgrens per domein toe, zodat een fout in één zwaar beheerscherm niet de volledige beheeromgeving onbruikbaar maakt.
- Analyseer na een productiebuild de routechunks en de circa 95 kB bron-CSS. Splits of verwijder CSS pas wanneer de gegenereerde assets aantonen dat dit betekenisvol is.

**Lokalisatie:** `app/components/TournamentApp/TournamentApp.tsx`, `TournamentApp.hooks.ts`, `app/inschrijven/page.tsx`, domeinhooks in `app/components/`, `app/globals.css`.

## 3. Publieke toernooipagina en livepresentatie

### Huidige situatie

- `/toernooi` haalt iedere 10 seconden alle publieke wedstrijden, programmaonderdelen, sponsors en capaciteit opnieuw op.
- `/presentatie` haalt iedere 5 seconden alle komende wedstrijden, uitgelichte ronde en actieve slides opnieuw op.
- De API zet voor alle routes globaal `Cache-Control: no-store`.
- `setInterval` start een nieuwe fetch zonder te controleren of de vorige afgerond is en polling loopt ook door in een verborgen tab.

### Aanbevolen volgorde

1. Geef de feeds een goedkope wijzigingsversie of ETag, afgeleid van relevante `updated_at`-waarden. Ondersteun `If-None-Match` en antwoord met `304` wanneer niets veranderde.
2. Pauzeer of vertraag polling wanneer `document.visibilityState !== "visible"`; hervat direct bij terugkeer.
3. Plan de volgende poll pas na afronding van de vorige, annuleer bij unmount en gebruik bij fouten exponential backoff met een maximum en een kleine jitter.
4. Splits stabiele en vluchtige data. Toernooi-instellingen, sponsors en slideconfiguratie veranderen zelden; wedstrijdstatus en planning veranderen wel vaak.
5. Overweeg daarna een `version`/`since`-contract dat alleen gewijzigde wedstrijden of onderdelen terugstuurt. SSE is pas zinvol als hosting en reconnectgedrag op TransIP bewezen zijn; efficiënte conditionele polling blijft een goede en simpele basis.
6. Gebruik gerichte cacheheaders: dynamische JSON conditioneel hervalideren, content-addressed uploads lang en `immutable` cachen. Laat privébeheerdata `no-store` houden.

Een volle bracket van 256 spelers blijft klein genoeg om in eerste instantie als geheel te renderen. De winst zit vooral in niet opnieuw versturen en niet opnieuw bevragen wanneer niets gewijzigd is.

**Lokalisatie:** `app/components/PublicTournament/PublicTournament.hooks.ts`, `app/components/LivePresentation/LivePresentation.hooks.ts`, `publicTournamentPagePayload()`, `/api/public/live` en de globale headers in `backend/public/index.php`.

## 4. Registratie, capaciteit en betaling

### Betrouwbaarheid vóór snelheid

De beschikbaarheidscontrole gebeurt nu vóór de transactie die de speler aanmaakt. Twee gelijktijdige aanvragen voor de laatste plek kunnen daardoor allebei een vrije plek zien. Daarnaast blijft de database-transactie open terwijl Mollie via het netwerk wordt aangeroepen. Een trage of falende provider verlengt locks en kan de flow halverwege onderbreken.

### Mogelijke verbeteringen

- Reserveer capaciteit atomair. Mogelijkheden zijn een gelockte toernooiregel (`SELECT ... FOR UPDATE`) met telling binnen dezelfde korte transactie, of een expliciete inventory/reservation-tabel met een databaseconstraint.
- Leg binnen die korte transactie de speler/reservering en een `payment_creation_pending`-toestand vast, commit, en roep Mollie daarna aan. Werk vervolgens het paymentrecord bij. Voeg een herstelpad toe voor een providerfout.
- Gebruik een stabiele idempotency key per betaalpoging, zodat retries niet onbedoeld meerdere Mollie-betalingen creëren.
- Leg de regel “één actieve inschrijving per e-mailadres per editie” waar mogelijk ook in het datamodel vast; alleen een voorafgaande `SELECT` is bij concurrency niet voldoende.
- Laat `/api/payments/status` primair de opgeslagen status retourneren. Vertrouw op de webhook voor de normale update en reconcilieer met Mollie alleen wanneer de status nog open én oud genoeg is, bij expliciete refresh, of via een achtergrondtaak.
- Gebruik op de bevestigingspagina oplopende pollingintervallen, stop bij verborgen tab en geef een handmatige vernieuwknop. De huidige 3-secondenpoll kan anders veel externe Mollie-calls veroorzaken.
- Ruim verlopen betaalreserveringen en ongebruikte retrytokens periodiek op of markeer ze expliciet, zodat operationele overzichten kloppen.

**Lokalisatie:** registratie- en betaalroutes in `backend/public/index.php`, `backend/src/PaymentGateway.php`, `app/components/PaymentConfirmation/PaymentConfirmation.hooks.ts`, tabellen `players`, `payments` en `player_access_tokens`.

## 5. Deelnemers, sponsors, wachtlijst en auditlog

### Huidige situatie

De deelnemerslijst is niet gepagineerd, maar door de huidige capaciteit van maximaal 256 is dat op zichzelf acceptabel. De belangrijkste verspilling is dat de lijst op elk beheerscherm geladen wordt en dat kleine mutaties zoals inchecken daarna spelers én sponsors volledig herladen.

### Mogelijke verbeteringen

- Werk inchecken optimistisch of met de geretourneerde spelerstatus lokaal bij; herlaad niet de volledige CRM en sponsorlijst.
- Laat speler- en sponsormutaties het gewijzigde record teruggeven en invalideer alleen afhankelijke samenvattingen.
- Voeg een lichte `/api/admin/overview`-response toe met aantallen voor het dashboard, in plaats van alle spelers te downloaden om tellingen in React te maken.
- Stuur bij sponsorbeheer alleen de velden die het scherm gebruikt. Laad persoonlijk identificeerbare spelerdetails pas bij openen van CRM of een detailmodal.
- Houd client-side zoeken voor maximaal 256 spelers. Voeg pas server-side zoeken/paginering toe wanneer meerdere edities tegelijk zichtbaar worden of de limiet verdwijnt.
- Scheid auditfilteropties van de paginadata en cache die opties kort; nu worden twee `DISTINCT`-query's bij iedere paginawissel herhaald.
- Stap voor diepe auditpagina's later over van `OFFSET` naar cursor/keyset-paginering op `(created_at, id)`.
- Verplaats het “verlopen” markeren van wachtlijstuitnodigingen uit de GET-route naar een periodieke opruimtaak of behandel verlopen status bij het lezen zonder schrijfactie.

**Lokalisatie:** `TournamentApp.hooks.ts`, `Players.hooks.ts`, `Overview.tsx`, adminroutes voor spelers, sponsors, wachtlijst en auditlog in `backend/public/index.php`.

## 6. Loting, wedstrijden en planning

### Loting

Eén slotwijziging verstuurt momenteel de volledige loting. De backend verwijdert alle opgeslagen slots, zet alle spelersnummers opnieuw, verwijdert alle wedstrijden en stuurt het volledige resultaat terug. De frontend zet snelle saves wel netjes in volgorde, maar coalescet ze niet en heeft geen versieconflictcontrole.

Verbeteringen:

- Introduceer `PATCH /draw/slots/{position}` of een batch van alleen gewijzigde posities.
- Debounce en coalesce snelle wijzigingen, zodat alleen de nieuwste toestand per positie wordt opgeslagen.
- Gebruik `updated_at` of een oplopende `version` als optimistic concurrency token en geef `409` bij een verouderde edit.
- Verwijder wedstrijden alleen bij de eerste echte overgang van gepubliceerd naar concept, niet opnieuw bij iedere volgende conceptwijziging.
- Werk alleen gewijzigde spelersnummers bij. Behoud de volledige servervalidatie bij publiceren.
- Maak “alles als bye” en “loting wissen” expliciete bulkacties; daarvoor is een volledige batch wel passend.

### Wedstrijden en planning

Na één winnaar of planningsmutatie wordt de volledige wedstrijden-/planningpayload opnieuw opgebouwd. Dat is bij 255 wedstrijden nog werkbaar, maar op event-day is een kleinere respons merkbaar en robuuster.

- Laat winnaarselectie alleen de gewijzigde wedstrijd, de volgende wedstrijd en eventueel gewiste vervolgresultaten teruggeven. Pas die records lokaal toe.
- Voeg een idempotency/version-veld toe aan winnaar- en planningsmutaties om dubbele taps en edits vanaf twee apparaten veilig af te handelen.
- Bereken conflictcontrole incrementeel rond de gewijzigde wedstrijd/het gewijzigde onderdeel, of houd de huidige volledige berekening zolang profiling aantoont dat die snel genoeg is.
- Laat drag-and-drop direct optimistisch reageren en rol bij een fout terug. Blokkeer niet de hele planning voor één mutatie.
- Overweeg een compacte hostendpoint per actuele ronde of baan. De normale beheerweergave mag de volledige bracket behouden.
- Test correctie van een winnaar onder gelijktijdige invoer expliciet; dit is belangrijker dan het besparen van enkele querymilliseconden.

**Lokalisatie:** `app/components/Draw/Draw.hooks.ts`, `Matches.hooks.ts`, `Schedule.hooks.ts`, `drawPayload()`, `matchesPayload()`, `schedulePayload()` en bijbehorende mutatieroutes.

## 7. Presentatie en uploads

### Mogelijke verbeteringen

- Valideer naast bestandsgrootte ook pixelafmetingen en totale decoded pixels om extreem grote afbeeldingen te voorkomen.
- Genereer bij upload één of meer schermgeschikte WebP/AVIF-varianten en bewaar desgewenst het origineel alleen wanneer dat operationeel nodig is.
- Verwijder metadata uit rasterafbeeldingen. Dit verlaagt bestandsgrootte en voorkomt onbedoeld meegestuurde EXIF-locatiegegevens.
- Gebruik content-hashes of de bestaande willekeurige bestandsnamen met lange immutable cacheheaders.
- Preload alleen de eerstvolgende slideafbeelding; laad overige beelden gecontroleerd om piekverkeer bij openen te beperken.
- Laat slidebeheer na een mutatie alleen de gewijzigde lijstconfiguratie teruggeven. De publieke livepreview hoeft niet automatisch opnieuw opgehaald te worden als de mutatie-response voldoende informatie bevat.
- Ruim weesbestanden op wanneer een database-update faalt of bij periodiek onderhoud. Neem uploadmap én database consistent op in backup/herstel.

**Lokalisatie:** uploadroutes en `presentationSlidesPayload()` in `backend/public/index.php`, `Presentation.hooks.ts`, `LivePresentation.tsx`, `backend/public/uploads/`.

## 8. Database en API-contracten

### Indexkandidaten om te meten

Voeg deze niet blind toe; iedere index kost ook schrijfsnelheid en opslag.

- `matches (tournament_id, status, scheduled_at)` voor komende wedstrijden.
- `email_messages (tournament_id, created_at)` voor verzendhistorie.
- `audit_log (tournament_id, action, created_at, id)` en/of `(tournament_id, entity_type, created_at, id)` wanneer die filtercombinaties veel worden gebruikt.
- Een passende index voor actieve/aflopende tokens wanneer de periodieke cleanup wordt geïmplementeerd.

### Overige verbeteringen

- Beperk `SELECT *` tot transactieroutes die werkelijk het volledige record nodig hebben; expliciete kolommen maken payload en afhankelijkheden duidelijker.
- Voeg een uniforme responseversie/`updated_at` toe aan publieke en beheercollecties voor conditionele requests en conflictcontrole.
- Maak mutaties standaard idempotent waar een browser, webhook of mobiel netwerk veilig kan retryen.
- Splits op termijn het circa 144 kB grote `backend/public/index.php` per domein/router. Dit is vooral een testbaarheids- en onderhoudsverbetering; verwacht geen grote snelheidswinst wanneer PHP OPcache goed staat.
- Zorg dat JSON-compressie op Apache actief is en statische assets via HTTP/2 met lange cacheheaders worden geleverd.

### Sessies

`Auth::current()` voert bij elke beveiligde request een `UPDATE user_sessions SET last_seen_at = NOW()` uit. Beperk dit bijvoorbeeld tot één write per vijf minuten:

- neem `last_seen_at` op in de sessiequery;
- update alleen wanneer de waarde ouder is dan de gekozen grens;
- houd sessie-expiratie en intrekken direct en correct werkend.

**Lokalisatie:** `backend/src/Auth.php`, `backend/database/schema.sql`, nieuwe genummerde migraties en query's in `backend/public/index.php`.

## 9. E-mail en externe diensten

### E-mail

Een broadcast doet nu tot 300 sequentiële Brevo-requests binnen één HTTP-request. Dit kan de PHP-requesttijd overschrijden en laat bij een gedeeltelijke fout een onduidelijke eindtoestand achter.

- Schrijf eerst één campagne en de ontvangerjobs duurzaam naar de database.
- Laat een cron/CLI-worker kleine batches verzenden met begrensde retries, exponential backoff en provider-idempotency waar beschikbaar.
- Toon voortgang en aantallen verzonden/mislukt in de beheerinterface.
- Voorkom dubbele verzending met een unieke sleutel per campagne/ontvanger.
- Stel connect- en totale time-outs in voor alle externe HTTP-calls.

### Spotify

De browserdebounce en annulering zijn al goed. De backend vraagt echter voor iedere zoekopdracht een nieuw client-credentials token aan.

- Cache het Spotify access token tot kort vóór `expires_in` en deel het tussen PHP-requests via een geschikte kleine cache of database, afhankelijk van de hosting.
- Cache korte tijd genormaliseerde zoekresultaten voor veelvoorkomende identieke queries.
- Houd de bestaande vrije-tekstfallback; registratie mag nooit van Spotify afhangen.

### Mollie en webhooks

- Bewaar de webhookafhandeling idempotent en antwoord snel; verplaats e-mail of ander traag vervolgwerk naar de wachtrij.
- Voeg een periodieke reconciliatietaak toe voor open betalingen waarvan de webhook gemist kan zijn.
- Registreer providerduur en foutcategorie zonder betaalgeheimen of tokens te loggen.

**Lokalisatie:** `sendTransactionalEmail()`, broadcast-, Spotify- en betaalroutes in `backend/public/index.php`, toekomstige worker/cron onder `backend/bin/`.

## 10. Offline, operationeel beheer en dataminimalisatie

### Event-day offline

- Cache de app-shell en de laatst succesvolle publieke feed in Cache Storage of IndexedDB, zodat een refresh zonder netwerk nog een duidelijke read-only toestand toont.
- Bewaar tijdstip en versie van de lokale data en toon prominent dat deze verouderd kan zijn.
- Voor beheeracties is een offline queue alleen veilig met idempotency keys, versies en zichtbare conflictafhandeling. Begin daarom met read-only offline support; voeg queued winnaaracties pas na grondige tests toe.
- Voeg een eenvoudige verbindingsindicator en een handmatige “opnieuw synchroniseren”-actie toe aan de hostweergave.

### Hosting en onderhoud

- Verifieer PHP OPcache, gzip/Brotli, HTTP/2, keep-alive, uploadlimieten en databaseconnectielimieten op TransIP staging.
- Voeg periodieke cleanup toe voor verlopen sessies, tokens, rate-limitregels, betaalreserveringen, wachtwoordresets en weesuploads.
- Implementeer de geplande privacyretentie/anonimisatietaak. Minder bewaarde persoonsgegevens betekent ook kleinere operationele tabellen en backups.
- Test backup en restore inclusief uploads; een backup zonder mediabestanden of een uploadmap zonder bijpassende database is onvolledig.
- Maak een wedstrijddag-runbook met healthcheck, database-/schijfruimtecontrole, fallbackpresentatie, herstelstappen en contactpunten.

**Lokalisatie:** nieuw service-worker/offline ontwerp in de frontend, onderhoudsscripts onder `backend/bin/`, TransIP/Apache-configuratie en het productiegereedheidsdeel van `docs/IMPLEMENTATION_STATUS.md`.

## Voorgestelde fasering

### Fase A — baseline en veilige quick wins

1. Stagingdataset en meetpunten toevoegen.
2. Sessiewrites throttlen.
3. Polling niet laten overlappen, pauzeren bij verborgen tab en backoff toevoegen.
4. ETag/304 voor publieke feeds implementeren.
5. Beheerdata alleen op relevante schermen laden.

### Fase B — kritieke flows robuust maken

1. Atomaire capaciteitsreservering en korte betalingstransactie.
2. Idempotency voor registratie, betaling en winnaaracties.
3. Duurzame e-mailwachtrij met worker.
4. Read-only offline cache en reconnectscenario's.
5. Presentatieafbeeldingen verwerken en immutable cachen.

### Fase C — incrementele domeinupdates

1. Loting patchen, saves coalescen en versieconflicten afhandelen.
2. Winnaar- en planningsresponses beperken tot wijzigingen.
3. Publieke feed eventueel opdelen of delta-updates toevoegen.
4. Gemeten indexen toevoegen.
5. API-monoliet per domein opdelen en contracttests uitbreiden.

## Definitie van klaar per optimalisatie

Een optimalisatie is pas afgerond wanneer:

- de beginsituatie en het gekozen budget zijn gemeten;
- correctness-, autorisatie- en privacygedrag gelijk blijven of expliciet verbeteren;
- relevante concurrency-, fout- en reconnectscenario's geautomatiseerd zijn getest;
- de verbetering op een realistische 256-speler stagingdataset is gemeten;
- nieuwe cleanup-, worker- of cacheprocessen in deployment en runbook staan;
- `IMPLEMENTATION_STATUS.md` met het resultaat en de volgende stap is bijgewerkt.

## Bewust nog niet optimaliseren

- Geen WebSockets of SSE alleen om polling te vervangen; conditionele polling is eenvoudiger en past bij gewone PHP-hosting.
- Geen algemene spelerpaginering zolang één editie maximaal 256 spelers toont en metingen geen probleem laten zien.
- Geen complexe cache-infrastructuur zonder hostingbehoefte; ETag, browsercache en kleine lokale caches leveren waarschijnlijk eerst de meeste winst.
- Geen database-indexen op basis van aannames; bevestig kandidaten met productieachtige data en `EXPLAIN ANALYZE`.
