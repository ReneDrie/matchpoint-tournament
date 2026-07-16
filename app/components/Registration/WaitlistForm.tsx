"use client";

import { useWaitlistForm } from "./WaitlistForm.hooks";

export function WaitlistForm() {
  const form = useWaitlistForm();
  if (form.position !== null)
    return (
      <div className="registration-card waitlist-card">
        <p className="kicker">WACHTLIJST</p>
        <h2>Je staat op de lijst</h2>
        <p className="muted">
          Je hebt positie <strong>#{form.position}</strong>. Zodra er een plek vrijkomt kunnen we je per e-mail
          uitnodigen. De inschrijflink blijft dan 48 uur geldig.
        </p>
      </div>
    );
  return (
    <form className="registration-card waitlist-card" onSubmit={form.submit}>
      <p className="kicker">TOERNOOI VOL</p>
      <h2>Blijf op de hoogte</h2>
      <p className="muted">
        Laat je naam en e-mailadres achter. Wanneer er een plek vrijkomt kan de organisatie je een persoonlijke
        inschrijflink sturen.
      </p>
      <label>
        Naam
        <input
          autoFocus
          required
          value={form.name}
          onChange={(event) => form.setName(event.target.value)}
          placeholder="Voor- en achternaam"
        />
      </label>
      <label>
        E-mailadres
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => form.setEmail(event.target.value)}
          placeholder="naam@voorbeeld.nl"
        />
      </label>
      {form.error && <p className="form-error">{form.error}</p>}
      <button className="primary continue" disabled={!form.name || !form.email || form.busy}>
        {form.busy ? "Aanmelden…" : "Zet mij op de wachtlijst →"}
      </button>
    </form>
  );
}
