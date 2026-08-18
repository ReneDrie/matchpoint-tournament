import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const project = "matchpoint-integration";
const composeFile = "docker-compose.integration.yml";
const apiUrl = "http://127.0.0.1:18080";
const adminCredentials = {
  email: "integration-admin@matchpoint.test",
  password: "IntegrationAdmin2027!",
};

function compose(...args) {
  return execFileSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
    stdio: args.includes("up") ? "inherit" : "pipe",
  });
}

async function waitForApi() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("De integration API werd niet binnen 90 seconden beschikbaar.");
}

async function request(path, { method = "GET", cookie, csrf, json, form } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers["X-CSRF-Token"] = csrf;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form);
  }
  const response = await fetch(`${apiUrl}${path}`, { method, headers, body, redirect: "manual" });
  const payload = await response.json();
  return { response, payload };
}

function sessionCookie(response) {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(/mpt_session=[^;]+/);
  assert.ok(match, "Login response bevat geen sessiecookie.");
  return match[0];
}

async function login(credentials) {
  const result = await request("/api/auth/login", { method: "POST", json: credentials });
  assert.equal(result.response.status, 200);
  return {
    cookie: sessionCookie(result.response),
    csrf: result.payload.user.csrf_token,
    user: result.payload.user,
  };
}

test("critical payment and authorization flows", { timeout: 180_000 }, async (t) => {
  compose("down", "--volumes", "--remove-orphans");
  try {
    compose("up", "--build", "-d");
    await waitForApi();
    compose(
      "exec",
      "-T",
      "api-test",
      "php",
      "bin/create-admin.php",
      adminCredentials.email,
      "Integration Administrator",
      adminCredentials.password,
    );

    await t.test("requires authentication and enforces administrator-only endpoints", async () => {
      const anonymous = await request("/api/admin/staff");
      assert.equal(anonymous.response.status, 401);

      const admin = await login(adminCredentials);
      const noCsrf = await request("/api/auth/invitations", {
        method: "POST",
        cookie: admin.cookie,
        json: { name: "Integration Host", email: "integration-host@matchpoint.test", role: "host" },
      });
      assert.equal(noCsrf.response.status, 403, JSON.stringify(noCsrf.payload));

      const invitation = await request("/api/auth/invitations", {
        method: "POST",
        cookie: admin.cookie,
        csrf: admin.csrf,
        json: { name: "Integration Host", email: "integration-host@matchpoint.test", role: "host" },
      });
      assert.equal(invitation.response.status, 201);
      const token = new URL(invitation.payload.accept_url).searchParams.get("token");
      assert.equal(token?.length, 64);

      const accepted = await request("/api/auth/invitations/accept", {
        method: "POST",
        json: { token, password: "IntegrationHost2027!" },
      });
      assert.equal(accepted.response.status, 201);

      const host = await login({
        email: "integration-host@matchpoint.test",
        password: "IntegrationHost2027!",
      });
      assert.equal((await request("/api/admin/players", { cookie: host.cookie })).response.status, 200);
      assert.equal((await request("/api/admin/staff", { cookie: host.cookie })).response.status, 403);

      const staff = await request("/api/admin/staff", { cookie: admin.cookie });
      const hostAccount = staff.payload.users.find((user) => user.email === "integration-host@matchpoint.test");
      assert.ok(hostAccount);
      const deactivated = await request(`/api/admin/staff/${hostAccount.id}`, {
        method: "PATCH",
        cookie: admin.cookie,
        csrf: admin.csrf,
        json: { is_active: false },
      });
      assert.equal(deactivated.response.status, 200);
      assert.equal((await request("/api/auth/me", { cookie: host.cookie })).response.status, 401);
    });

    await t.test("reserves capacity and reconciles a paid Mollie webhook idempotently", async () => {
      const before = await request("/api/public/tournament");
      assert.equal(before.response.status, 200);
      const spotsBefore = before.payload.tournament.public_spots_available;

      const registration = await request("/api/registrations", {
        method: "POST",
        json: {
          name: "Integration Player",
          email: "integration-player@matchpoint.test",
          phone: "+31612345678",
          date_of_birth: "1990-01-01",
          knltb_number: "12345678",
          entrance_song_query: "Daft Punk - One More Time",
          accept_privacy: true,
          accept_terms: true,
        },
      });
      assert.equal(registration.response.status, 201);
      const checkout = new URL(registration.payload.checkout_url);
      const paymentId = checkout.searchParams.get("payment_id");
      assert.match(paymentId ?? "", /^tr_test_[a-f0-9]{16}$/);

      const afterReservation = await request("/api/public/tournament");
      assert.equal(afterReservation.payload.tournament.public_spots_available, spotsBefore - 1);

      for (let attempt = 0; attempt < 2; attempt++) {
        const webhook = await request("/api/payments/mollie-webhook", {
          method: "POST",
          form: { id: paymentId },
        });
        assert.equal(webhook.response.status, 200);
        assert.equal(webhook.payload.received, true);
      }

      const admin = await login(adminCredentials);
      const players = await request("/api/admin/players", { cookie: admin.cookie });
      const player = players.payload.players.find((entry) => entry.email === "integration-player@matchpoint.test");
      assert.equal(player.registration_status, "confirmed");

      const emails = await request("/api/admin/emails", { cookie: admin.cookie });
      const confirmations = emails.payload.messages.filter(
        (message) =>
          message.message_type === "payment_confirmation" &&
          message.recipient_email === "integration-player@matchpoint.test",
      );
      assert.equal(confirmations.length, 1);

      const audit = await request("/api/admin/audit-log?action=payment.paid&tournament_id=1", {
        cookie: admin.cookie,
      });
      assert.equal(audit.payload.pagination.total, 1);
    });

    await t.test("requires CSRF for logout and revokes the session", async () => {
      const admin = await login(adminCredentials);
      const noCsrf = await request("/api/auth/logout", { method: "POST", cookie: admin.cookie });
      assert.equal(noCsrf.response.status, 403, JSON.stringify(noCsrf.payload));
      assert.equal(
        (await request("/api/auth/logout", { method: "POST", cookie: admin.cookie, csrf: admin.csrf })).response.status,
        200,
      );
      assert.equal((await request("/api/auth/me", { cookie: admin.cookie })).response.status, 401);
    });
  } finally {
    compose("down", "--volumes", "--remove-orphans");
  }
});
