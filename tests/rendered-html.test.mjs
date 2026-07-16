import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders public registration at the root", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Matchpoint Tournament<\/title>/i);
  assert.match(html, /MATCHPOINT TOURNAMENT/i);
  assert.match(html, /Jouw route naar/i);
});

test("all management URLs can be loaded directly", async () => {
  for (const pathname of [
    "/beheer",
    "/beheer/deelnemers",
    "/beheer/loting",
    "/beheer/wedstrijden",
    "/beheer/planning",
    "/beheer/sponsors",
    "/beheer/presentatie",
    "/beheer/email",
    "/beheer/instellingen",
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /Beveiligde omgeving laden/i, pathname);
  }
});

test("server-renders a Host invitation directly", async () => {
  const response = await render("/beheer/uitnodiging?token=test");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /HOST-UITNODIGING/i);
});

test("server-renders the public presentation directly", async () => {
  const response = await render("/presentatie");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Live presentatie laden/i);
});

test("server-renders the public tournament page directly", async () => {
  const response = await render("/toernooi");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Toernooipagina laden/i);
});

test("server-renders the payment confirmation directly", async () => {
  const response = await render("/inschrijven/bevestiging?token=test");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /BETALING CONTROLEREN/i);
});

test("server-renders player self-service directly", async () => {
  const requestResponse = await render("/mijn-inschrijving");
  assert.equal(requestResponse.status, 200);
  assert.match(await requestResponse.text(), /MIJN INSCHRIJVING/i);

  const tokenResponse = await render("/mijn-inschrijving?token=test");
  assert.equal(tokenResponse.status, 200);
  assert.match(await tokenResponse.text(), /LINK CONTROLEREN/i);
});

test("keeps secure player links single-use and enumeration-safe", async () => {
  const [auth, router, hooks] = await Promise.all([
    readFile(new URL("../backend/src/Auth.php", import.meta.url), "utf8"),
    readFile(new URL("../backend/public/index.php", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PlayerSelfService/PlayerSelfService.hooks.ts", import.meta.url), "utf8"),
  ]);
  assert.match(auth, /UPDATE player_access_tokens SET used_at = NOW\(\).*player_id = \?.*purpose = \?/s);
  assert.match(router, /POST.*api\/players\/access-link/s);
  assert.match(router, /Http::json\(\['sent' => true\], 202\)/);
  assert.match(router, /pat\.used_at IS NULL AND pat\.expires_at > NOW\(\)/);
  assert.match(router, /FOR UPDATE/);
  assert.match(router, /UPDATE player_access_tokens SET used_at = NOW\(\) WHERE id = \?/);
  assert.match(router, /player\.self_service_updated/);
  assert.match(hooks, /method: "PATCH"/);
  assert.match(hooks, /api\/players\/access-link/);
});

test("derives participant and round totals from tournament capacity", async () => {
  const [overview, registration, players] = await Promise.all([
    readFile(new URL("../app/components/Overview/Overview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Registration/Registration.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Players/Players.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(overview, /Math\.log2\(capacity\)/);
  assert.match(overview, /capacity - 1/);
  assert.match(registration, /\{roundCount\} rondes/);
  assert.match(players, /VAN \{capacity\} PLEKKEN/);
  assert.doesNotMatch(`${overview}\n${registration}\n${players}`, /8 rondes|van 255|VAN 256 PLEKKEN/i);
});

test("keeps registration configuration and validation wired to the API", async () => {
  const [
    appHooks,
    registrationHooks,
    waitlistHooks,
    loginHooks,
    playerHooks,
    settingsHooks,
    sponsorHooks,
    drawHooks,
    matchHooks,
    scheduleHooks,
    presentationHooks,
    communicationHooks,
    publicTournamentHooks,
    modalHooks,
    router,
    schema,
  ] = await Promise.all([
    readFile(new URL("../app/components/TournamentApp/TournamentApp.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Registration/Registration.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Registration/WaitlistForm.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Login/Login.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Players/Players.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Settings/Settings.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Sponsors/Sponsors.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Draw/Draw.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Matches/Matches.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Schedule/Schedule.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Presentation/Presentation.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Communications/Communications.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PublicTournament/PublicTournament.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Modal/Modal.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../backend/public/index.php", import.meta.url), "utf8"),
    readFile(new URL("../backend/database/schema.sql", import.meta.url), "utf8"),
  ]);

  assert.match(appHooks, /\/api\/public\/tournament/);
  assert.match(registrationHooks, /\/api\/registrations/);
  assert.match(registrationHooks, /invitation_token/);
  assert.doesNotMatch(await (await render("/inschrijven")).text(), /Beheeromgeving →/);
  assert.match(waitlistHooks, /\/api\/waitlist/);
  assert.match(loginHooks, /\/api\/auth\/login/);
  assert.match(playerHooks, /\/api\/admin\/players/);
  assert.match(playerHooks, /check-in/);
  assert.match(playerHooks, /players\/export/);
  assert.match(playerHooks, /admin\/waitlist/);
  assert.match(appHooks, /window\.history\.pushState/);
  assert.match(appHooks, /popstate/);
  assert.match(registrationHooks, /date_of_birth/);
  assert.match(registrationHooks, /singles_rating/);
  assert.match(registrationHooks, /doubles_rating/);
  assert.match(settingsHooks, /\/api\/admin\/tournaments/);
  assert.match(settingsHooks, /\/courts/);
  assert.match(settingsHooks, /surface/);
  assert.match(sponsorHooks, /sponsor-tiers/);
  assert.match(sponsorHooks, /player_limit_override/);
  assert.match(sponsorHooks, /useState<SponsorsTab>\("sponsors"\)/);
  assert.match(sponsorHooks, /sponsors\/\$\{result\.sponsor_id\}\/logo/);
  assert.match(router, /tournament\.settings_updated/);
  assert.match(router, /court\.created/);
  assert.match(drawHooks, /\/draw\/publish/);
  assert.match(matchHooks, /\/matches\/\$\{selected\.match\.id\}\/winner/);
  assert.match(scheduleHooks, /\/schedule\/plan/);
  assert.match(scheduleHooks, /\/schedule\/swap/);
  assert.match(presentationHooks, /\/slides\/upload/);
  assert.match(presentationHooks, /\/slides\/reorder/);
  assert.match(communicationHooks, /\/api\/admin\/emails\/broadcast/);
  assert.match(publicTournamentHooks, /\/api\/public\/tournament-page/);
  assert.match(router, /publicTournamentPagePayload/);
  assert.match(router, /email\.broadcast_sent/);
  assert.match(modalHooks, /event\.key !== "Escape"/);
  assert.match(modalHooks, /openModals\.at\(-1\)/);
  assert.match(router, /draw\.saved/);
  assert.match(router, /draw\.published/);
  assert.match(router, /draw\.capacity_changed/);
  assert.match(router, /match\.winner_selected/);
  assert.match(router, /match\.winner_corrected/);
  assert.match(router, /clearDownstreamResult/);
  assert.match(router, /rounds_created/);
  assert.match(router, /schedule\.round_planned/);
  assert.match(router, /schedule\.items_swapped/);
  assert.match(router, /break_every_minutes/);
  assert.match(schema, /is_automatic BOOLEAN/);
  assert.match(router, /presentation\.image_uploaded/);
  assert.match(router, /featured_round/);
  assert.match(schema, /CREATE TABLE draws/);
  assert.match(schema, /CREATE TABLE draw_slots/);
  assert.match(router, /UPDATE courts SET name = \?, surface = \?/);
  assert.match(router, /minimaal 18 jaar/);
  assert.match(router, /payment_reservation_expires_at/);
  assert.match(router, /reconcileMolliePayment/);
  assert.match(router, /payment_confirmation/);
  assert.match(router, /staff\.status_changed/);
  assert.match(router, /\/api\/admin\/staff/);
  assert.match(schema, /CREATE TABLE tournaments/);
  assert.match(schema, /CREATE TABLE user_sessions/);
  assert.match(schema, /Hoofdsponsor/);
  assert.match(schema, /cost_cents INT UNSIGNED/);
  assert.match(schema, /included_players SMALLINT UNSIGNED/);
  assert.match(router, /sponsor_package\.updated/);
  assert.match(router, /assertSponsorPlayerCapacity/);
  assert.match(router, /reservedSponsorSpots/);
  assert.match(router, /public_spots_available/);
  assert.match(router, /waitlist\.invited/);
  assert.match(router, /waitlist_invitation/);
  assert.match(router, /sponsor\.logo_uploaded/);
  assert.match(router, /foreignObject/);
  assert.match(router, /uitvoerbare inhoud/);
});
