"use client";
import { Brand } from "../Brand/Brand";
import { useStaffInvitation } from "./StaffInvitation.hooks";
export function StaffInvitation({ token }: { token: string }) {
  const form = useStaffInvitation(token);
  return (
    <div className="payment-confirmation-page">
      <Brand />
      {form.accepted ? (
        <section className="registration-card payment-confirmation-card">
          <span className="confirmation-icon">✓</span>
          <h1>Account geactiveerd</h1>
          <p className="muted">Je kunt nu inloggen in de beheeromgeving.</p>
          <a className="primary confirmation-link" href="../">
            Naar inloggen
          </a>
        </section>
      ) : (
        <form className="registration-card" onSubmit={form.submit}>
          <p className="kicker">HOST-UITNODIGING</p>
          <h1>Maak je account aan</h1>
          <p className="muted">Kies een wachtwoord van minimaal 12 tekens.</p>
          <label>
            Wachtwoord
            <input
              type="password"
              minLength={12}
              required
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
              value={form.confirm}
              onChange={(event) => form.setConfirm(event.target.value)}
            />
          </label>
          {form.error && <p className="form-error">{form.error}</p>}
          <button className="primary continue" disabled={form.busy || !token}>
            {form.busy ? "Activeren…" : "Account activeren"}
          </button>
        </form>
      )}
    </div>
  );
}
