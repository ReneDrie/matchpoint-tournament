import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the protected Matchpoint shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Matchpoint Tournament<\/title>/i);
  assert.match(html, /Beveiligde omgeving laden/i);
});

test("keeps registration configuration and validation wired to the API", async () => {
  const [page, router, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../backend/public/index.php", import.meta.url), "utf8"),
    readFile(new URL("../backend/database/schema.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\/api\/public\/tournament/);
  assert.match(page, /\/api\/registrations/);
  assert.match(page, /\/api\/auth\/login/);
  assert.match(page, /\/api\/admin\/players/);
  assert.match(page, /check-in/);
  assert.match(page, /players\/export/);
  assert.match(page, /date_of_birth/);
  assert.match(page, /singles_rating/);
  assert.match(page, /doubles_rating/);
  assert.match(router, /minimaal 18 jaar/);
  assert.match(router, /payment_reservation_expires_at/);
  assert.match(schema, /CREATE TABLE tournaments/);
  assert.match(schema, /CREATE TABLE user_sessions/);
  assert.match(schema, /Hoofdsponsor/);
});
