# Matchpoint Tournament — implementatiestatus

Dit document is het vaste startpunt voor iedere volgende bouwstap. Werk het na iedere afgeronde feature bij, samen met de relevante tests en database-migraties.

**Laatst bijgewerkt:** 15 juli 2026  
**Huidige hoofdbranch:** `main`  
**Laatste afgeronde feature:** publieke wachtlijst met dashboardbeheer en veilige 48-uurs uitnodigingslinks

## Statuslegenda

- ✅ Afgerond en lokaal geverifieerd
- 🟡 Gedeeltelijk aanwezig of nog niet productieklaar
- ⬜ Nog niet gestart

## Huidige volgende stap

### Productie-integraties — fase 5A

De eerstvolgende aanbevolen bouwstap rondt betaling en bevestiging af:

- Mollie testbetaling end-to-end doorlopen.
- Bevestigingspagina en betaalbevestigingsmail afronden.
- Brevo-afzender en templates configureren.
- Veilige e-maillinks voor spelers toevoegen.

Deze stap vraagt voor de externe tests om Mollie- en Brevo-testgegevens.

## 0. Technische basis en beheerinterface

- ✅ Lokale Docker-omgeving met PHP 8.3, Apache en MySQL 8.
- ✅ React/Vinext-frontend met Matchpoint-huisstijl.
- ✅ Rechtstreeks bereikbare URL-routes voor alle huidige schermen.
- ✅ Persistente beheerlayout zonder witte paginawissel.
- ✅ Componenten per domein met componentgebonden hookbestanden.
- ✅ Grotere typografie, ruimere interface en responsive basis.
- ✅ Administrator- en Host-autorisatie in frontend en API.
- ✅ GitHub-repository en doorlopende commits op `main`.

## 1. Foundation en betaalde inschrijving

### Afgerond

- ✅ Openbare inschrijfformulier met naam, e-mail, telefoon en geboortedatum.
- ✅ KNLTB-nummer of zowel enkel- als dubbelsterkte verplicht.
- ✅ Opkomstnummer als verplichte vrije tekst.
- ✅ Controle dat een speler op de toernooidatum minimaal 18 jaar is.
- ✅ Versievelden voor privacy- en voorwaardenacceptatie.
- ✅ Configurabele prijs, capaciteit, datum, locatie en inschrijfdeadline.
- ✅ Tijdelijke reservering van een plek tijdens de betaalflow.
- ✅ Mollie checkout-aanmaak en webhookbasis met auditregistratie.
- ✅ Staff-login met beveiligde sessies, CSRF-controle en rollen.
- ✅ Staff-uitnodigingen voor Administrator en Host.
- ✅ Rate limiting op gevoelige publieke acties.

### Nog nodig

- 🟡 Mollie-flow met echte test- en productiekeys volledig doorlopen.
- 🟡 Bevestigingspagina na betaling afronden.
- 🟡 Bevestigingsmail via Brevo versturen.
- ✅ Wachtlijstformulier, dashboardbeheer, plekreservering en veilige uitnodigingslink.
- ✅ Uitnodigingsmail wordt via Brevo verzonden of zonder key veilig in de lokale mailwachtrij gezet.
- 🟡 Beveiligde e-maillinks voor spelers implementeren.
- 🟡 Spotify-zoekresultaat suggereren en opslaan.
- ⬜ Wachtwoord vergeten/herstellen voor staff.

## 2. CRM en toernooibeheer

### Afgerond

- ✅ Deelnemersoverzicht met zoeken en statusfilter.
- ✅ Deelnemers handmatig toevoegen zonder betaalflow.
- ✅ Deelnemers als betaald sponsorpakket-speler toevoegen.
- ✅ Deelnemersgegevens en deelnamestatus wijzigen.
- ✅ Spelers aan sponsors koppelen.
- ✅ Deelnemers in- en uitchecken voor Administrator en Host.
- ✅ CSV-export van deelnemers.
- ✅ Sponsor toevoegen en wijzigen.
- ✅ Hoofdsponsor- en Subsponsor-niveaus.
- ✅ Sponsorpakketten toevoegen en wijzigen met eenmalige kosten in centen.
- ✅ Standaard inbegrepen spelers per pakket en override per sponsor.
- ✅ Pakketlimiet wordt afgedwongen bij het toevoegen van sponsorpakketspelers.
- ✅ Contact-e-mail en telefoonnummer per sponsor.
- ✅ Toernooi-instellingen in tabs voor Algemeen, Planning, Presentatie en Banen.
- ✅ Baan toevoegen, wijzigen, activeren, automatisch opslaan en verwijderen.
- ✅ Auditregistratie voor belangrijke mutaties in de API.

### Nog nodig

- 🟡 Een annulering of terugbetaling is als status wijzigbaar, maar nog niet gekoppeld aan een echte Mollie-refund.
- ✅ Sponsorlogo veilig als SVG uploaden, vervangen en tonen.
- ✅ Wachtlijst beheren vanuit het dashboard, inclusief uitnodigen en verwijderen.
- 🟡 Handmatige e-mail aan geselecteerde of alle deelnemers.
- 🟡 Auditlog zichtbaar maken voor Administrators.
- ⬜ Excel-export naast CSV.

## 3. Loting, wedstrijden en planning

### Afgerond

- ✅ Database-entiteiten voor conceptloting, lotingsposities en wedstrijden bestaan.
- ✅ Handmatige lotingseditor voor 32, 64, 128 of 256 posities.
- ✅ Betaalde spelers en expliciete byes per positie plaatsen.
- ✅ Automatische conceptopslag en blokweergave per 32 posities.
- ✅ Dubbele spelers en ongeldige posities worden in frontend en API voorkomen.
- ✅ Spelersnummer wordt afgeleid van de positie in de loting.
- ✅ Publicatievalidatie en aanmaak van wedstrijden voor ronde 1.
- ✅ Alle knock-outrondes en `next_match`-koppelingen worden bij publicatie aangemaakt.
- ✅ Bye-winnaars schuiven automatisch door naar de volgende ronde.
- ✅ Administrator en Host zien alle wedstrijden per ronde.
- ✅ Eén-tap winnaarselectie met bevestigingsmodal.
- ✅ Winnaars worden automatisch in de juiste positie van de volgende ronde gezet.
- ✅ Uitslagen corrigeren wist veilig alle afhankelijke vervolgresultaten.
- ✅ “Plan nu” verdeelt iedere ronde in twee helften over twee gekozen banen.
- ✅ Standaardduur per ronde wordt toegepast en is per wedstrijd aanpasbaar.
- ✅ Automatische gezamenlijke pauze volgens de ingestelde 30/5-minutencadans.
- ✅ Vrije onderdelen zoals prijsuitreiking en baanonderhoud toevoegen en wijzigen.
- ✅ Wedstrijden en baangebonden onderdelen kunnen onderling worden versleept.
- ✅ Conflicten voor banen en bekende spelers worden direct zichtbaar gemaakt.
- 🟡 Configureerbare wedstrijdduur, kwartfinaleduur en pauzecadans bestaan.
- 🟡 Wedstrijden en Planning hebben nog een placeholderinterface.

### Nog nodig

- ✅ Automatische aanmaak van acht knock-outrondes voor 256 spelers.
- ✅ Eén-tap winnaarselectie met bevestiging.
- ✅ Winnaar automatisch naar de volgende ronde doorzetten.
- ✅ Correctie/undo door Host en Administrator.
- ✅ Snelle responsive hostweergave.
- ✅ “Plan nu”-flow per helft van een ronde en per baan.
- ✅ Sleepbare wedstrijden, pauzes en vrije programmaonderdelen.
- ✅ Automatische pauzesuggesties en conflictcontrole.

## 4. Presentatiemodus

### Aanwezig als basis

- ✅ Openbare live-feed voor slides, komende wedstrijden en uitgelichte rondes.
- ✅ Databasemodel en beheer-API voor custom-, image-, sponsor- en dynamische slides.
- ✅ Beheereditor met live schermpreview.

- ✅ Slide-editor met volgorde en actieve/inactieve status.
- ✅ Fullscreen JPG, PNG en WebP upload met `object-fit: contain`.
- ✅ Sponsor- en customslides.
- ✅ Komende-wedstrijden- en ronde-aankondigingsslides.
- ✅ Instelbare duur per slide.
- ✅ Publieke fullscreen presentatieroute `/presentatie`.
- ✅ Automatisch verversen iedere vijf seconden, offline fallback en “laatst bijgewerkt”.

## 5. Productieklaar maken

### Aanwezig als basis

- ✅ Frontend build-, lint- en route-regressietests.
- ✅ PHP-syntaxcontrole en lokaal geteste API-mutaties.
- ✅ Database-migraties en TransIP-richting gedocumenteerd.

### Nog nodig

- ⬜ Geautomatiseerde integratietests voor betaling, autorisatie en bracketprogressie.
- ⬜ Back-up- en herstelprocedure.
- ⬜ Privacyretentie en anonimisatietaak activeren.
- ⬜ Securityreview.
- ⬜ Draaiboek voor de wedstrijddag.
- ⬜ Staging onder `/tournament` op TransIP.
- ⬜ Productieconfiguratie voor Mollie, Brevo, HTTPS en database.

## Nog aan te leveren voor productie

- Juridische entiteit en Mollie-accountgegevens.
- Definitieve privacyverklaring en toernooivoorwaarden.
- Brevo API-key en geverifieerde afzender/domein.
- TransIP databasegegevens en stagingomgeving.

## Werkwijze voor volgende stappen

Na iedere afgeronde implementatiestap:

1. Werk de betreffende checklist hierboven bij.
2. Zet de nieuwe eerstvolgende stap bovenaan.
3. Noteer relevante migraties of productieafhankelijkheden.
4. Draai build, lint en tests.
5. Commit en push de wijziging samen met de bijgewerkte status.
