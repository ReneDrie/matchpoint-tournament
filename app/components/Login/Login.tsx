"use client";

import { Brand } from "../Brand/Brand";
import type { StaffUser } from "../shared/types";
import { useLogin } from "./Login.hooks";

export function Login({
  onLogin,
  openRegistration,
}: {
  onLogin: (user: StaffUser) => void;
  openRegistration: () => void;
}) {
  const { email, setEmail, password, setPassword, busy, error, submit } = useLogin(onLogin);
  return (
    <div className="login-page">
      <div className="login-brand">
        <Brand />
        <p>Beheer het toernooi, de deelnemers en de wedstrijddag.</p>
      </div>
      <form className="login-card" onSubmit={submit}>
        <p className="kicker">BEHEEROMGEVING</p>
        <h1>Welkom terug</h1>
        <p className="muted">Log in als Administrator of Host.</p>
        <label>
          E-mailadres
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Wachtwoord
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary continue" disabled={busy}>
          {busy ? "Inloggen…" : "Inloggen"}
        </button>
        <button type="button" className="back" onClick={openRegistration}>
          Naar de openbare inschrijving →
        </button>
      </form>
    </div>
  );
}
