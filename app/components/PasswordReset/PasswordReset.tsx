"use client";

import { Brand } from "../Brand/Brand";
import { routeHref } from "../shared/routing";
import { usePasswordReset } from "./PasswordReset.hooks";

export function PasswordReset({ token }: { token: string }) {
  const form = usePasswordReset(token);

  return (
    <div className="login-page">
      <div className="login-brand">
        <Brand />
        <p>Herstel veilig de toegang tot de Matchpoint-beheeromgeving.</p>
      </div>
      {form.checking ? (
        <section className="login-card">Herstellink controleren…</section>
      ) : form.completed ? (
        <section className="login-card">
          <p className="kicker">WACHTWOORD GEWIJZIGD</p>
          <h1>Je kunt weer inloggen</h1>
          <p className="muted">Alle eerdere sessies zijn voor de zekerheid afgemeld.</p>
          <a className="primary confirmation-link" href={routeHref("/beheer")}>
            Naar inloggen
          </a>
        </section>
      ) : form.sent ? (
        <section className="login-card">
          <p className="kicker">CONTROLEER JE E-MAIL</p>
          <h1>Herstellink aangevraagd</h1>
          <p className="muted">
            Als het adres bij een actief account hoort, ontvang je een eenmalige link die 30 minuten geldig is.
          </p>
          <a className="back inline-link" href={routeHref("/beheer")}>
            Terug naar inloggen
          </a>
        </section>
      ) : token && form.valid ? (
        <form className="login-card" onSubmit={form.completeReset}>
          <p className="kicker">NIEUW WACHTWOORD</p>
          <h1>Kies een nieuw wachtwoord</h1>
          <p className="muted">Gebruik minimaal 12 tekens.</p>
          <label>
            Nieuw wachtwoord
            <input
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => form.setPassword(event.target.value)}
            />
          </label>
          <label>
            Herhaal wachtwoord
            <input
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => form.setConfirm(event.target.value)}
            />
          </label>
          {form.error && <p className="form-error">{form.error}</p>}
          <button className="primary continue" disabled={form.busy}>
            {form.busy ? "Wijzigen…" : "Wachtwoord wijzigen"}
          </button>
        </form>
      ) : token ? (
        <section className="login-card">
          <p className="kicker">HERSTELLINK</p>
          <h1>Link niet meer geldig</h1>
          <p className="form-error">{form.error}</p>
          <a className="back inline-link" href={routeHref("/beheer/wachtwoord-herstellen")}>
            Vraag een nieuwe link aan
          </a>
        </section>
      ) : (
        <form className="login-card" onSubmit={form.requestReset}>
          <p className="kicker">WACHTWOORD VERGETEN</p>
          <h1>Herstel je toegang</h1>
          <p className="muted">Vul het e-mailadres van je Administrator- of Host-account in.</p>
          <label>
            E-mailadres
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => form.setEmail(event.target.value)}
            />
          </label>
          {form.error && <p className="form-error">{form.error}</p>}
          <button className="primary continue" disabled={form.busy}>
            {form.busy ? "Aanvragen…" : "Herstellink aanvragen"}
          </button>
          <a className="back inline-link" href={routeHref("/beheer")}>
            Terug naar inloggen
          </a>
        </form>
      )}
    </div>
  );
}
