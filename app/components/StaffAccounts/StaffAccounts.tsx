"use client";

import type { StaffUser } from "../shared/types";
import { useStaffAccounts } from "./StaffAccounts.hooks";

export function StaffAccounts({ user }: { user: StaffUser }) {
  const staff = useStaffAccounts(user);
  const hosts = staff.accounts.filter((account) => account.role === "host");
  return (
    <div className="staff-settings">
      <section className="panel settings-section">
        <div className="settings-section-title">
          <span>06</span>
          <div>
            <h3>Host-accounts</h3>
            <p>Hosts kunnen spelers bekijken en inchecken en wedstrijduitslagen invoeren of corrigeren.</p>
          </div>
        </div>
        {staff.error && <p className="settings-message error">{staff.error}</p>}
        {staff.notice && <p className="settings-message success">{staff.notice}</p>}
        <div className="staff-list">
          {hosts.length === 0 ? (
            <div className="empty-state">Nog geen Host-accounts.</div>
          ) : (
            hosts.map((account) => (
              <article key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.email}</span>
                  <small>
                    {account.last_login_at
                      ? `Laatst ingelogd: ${new Date(account.last_login_at.replace(" ", "T")).toLocaleString("nl-NL")}`
                      : "Nog niet ingelogd"}
                  </small>
                </div>
                <span className={`status ${account.is_active ? "paid" : "pending"}`}>
                  {account.is_active ? "Actief" : "Inactief"}
                </span>
                <button className="secondary" onClick={() => staff.toggle(account)}>
                  {account.is_active ? "Deactiveren" : "Activeren"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>
      <section className="panel settings-section">
        <div className="settings-section-title">
          <span>＋</span>
          <div>
            <h3>Host uitnodigen</h3>
            <p>De persoonlijke activatielink is 24 uur geldig.</p>
          </div>
        </div>
        <form className="staff-invite-form" onSubmit={staff.invite}>
          <label>
            Naam
            <input required value={staff.name} onChange={(event) => staff.setName(event.target.value)} />
          </label>
          <label>
            E-mailadres
            <input required type="email" value={staff.email} onChange={(event) => staff.setEmail(event.target.value)} />
          </label>
          <button className="primary" disabled={staff.busy}>
            {staff.busy ? "Uitnodigen…" : "Uitnodiging versturen"}
          </button>
        </form>
        {staff.invitations.length > 0 && (
          <div className="pending-invitations">
            <strong>Openstaande uitnodigingen</strong>
            {staff.invitations.map((invitation) => (
              <span key={invitation.id}>
                {invitation.name} · {invitation.email} · geldig tot{" "}
                {new Date(invitation.expires_at.replace(" ", "T")).toLocaleString("nl-NL")}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
