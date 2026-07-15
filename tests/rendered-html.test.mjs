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
  for (const pathname of ["/beheer", "/beheer/deelnemers", "/beheer/wedstrijden", "/beheer/planning", "/beheer/sponsors", "/beheer/presentatie", "/beheer/instellingen"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /Beveiligde omgeving laden/i, pathname);
  }
});

test("keeps registration configuration and validation wired to the API", async () => {
  const [appHooks, registrationHooks, loginHooks, playerHooks, settingsHooks, router, schema] = await Promise.all([
    readFile(new URL("../app/components/TournamentApp/TournamentApp.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Registration/Registration.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Login/Login.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Players/Players.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Settings/Settings.hooks.ts", import.meta.url), "utf8"),
    readFile(new URL("../backend/public/index.php", import.meta.url), "utf8"),
    readFile(new URL("../backend/database/schema.sql", import.meta.url), "utf8"),
  ]);

  assert.match(appHooks, /\/api\/public\/tournament/);
  assert.match(registrationHooks, /\/api\/registrations/);
  assert.match(loginHooks, /\/api\/auth\/login/);
  assert.match(playerHooks, /\/api\/admin\/players/);
  assert.match(playerHooks, /check-in/);
  assert.match(playerHooks, /players\/export/);
  assert.match(appHooks, /window\.history\.pushState/);
  assert.match(appHooks, /popstate/);
  assert.match(registrationHooks, /date_of_birth/);
  assert.match(registrationHooks, /singles_rating/);
  assert.match(registrationHooks, /doubles_rating/);
  assert.match(settingsHooks, /\/api\/admin\/tournaments/);
  assert.match(settingsHooks, /\/courts/);
  assert.match(router, /tournament\.settings_updated/);
  assert.match(router, /court\.created/);
  assert.match(router, /minimaal 18 jaar/);
  assert.match(router, /payment_reservation_expires_at/);
  assert.match(schema, /CREATE TABLE tournaments/);
  assert.match(schema, /CREATE TABLE user_sessions/);
  assert.match(schema, /Hoofdsponsor/);
});
