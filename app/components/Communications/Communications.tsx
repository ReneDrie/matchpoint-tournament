"use client";

import type { Player, StaffUser } from "../shared/types";
import { useCommunications } from "./Communications.hooks";

function statusLabel(status: string) {
  return ({ sent: "Verzonden", delivered: "Afgeleverd", queued: "In wachtrij", failed: "Mislukt" } as Record<string, string>)[status] ?? status;
}

export function Communications({ user, tournamentId, players, tournamentName }: { user: StaffUser; tournamentId: number; players: Player[]; tournamentName: string }) {
  const mail = useCommunications({ user, tournamentId, players });
  const exampleName = mail.recipients[0]?.name ?? "Voornaam";
  const previewBody = mail.body.replaceAll("{naam}", exampleName).replaceAll("{toernooi}", tournamentName);

  return <div className="communications-page">
    <section className="panel mail-composer">
      <div className="table-heading"><div><p>HANDMATIGE VERZENDING</p><h2>E-mail deelnemers</h2></div><span>{mail.recipients.length} ontvangers</span></div>
      {mail.error && <p className="settings-message error">{mail.error}</p>}
      {mail.notice && <p className="settings-message success">{mail.notice}</p>}
      <div className="mail-layout">
        <aside>
          <label>Ontvangers<select value={mail.filter} onChange={(event) => mail.changeFilter(event.target.value)}><option value="confirmed">Betaalde deelnemers</option><option value="all">Betaald en betaling open</option><option value="checked_in">Ingecheckte deelnemers</option></select></label>
          <div className="recipient-list">{mail.eligible.map((player) => <label key={player.id}><input type="checkbox" checked={mail.selected.includes(player.id)} onChange={() => mail.toggle(player.id)} /><span><strong>{player.name}</strong><small>{player.email}</small></span></label>)}</div>
          <small>Geen selectie betekent: iedereen binnen het gekozen filter.</small>
        </aside>
        <form onSubmit={mail.submit}>
          <label>Onderwerp<input required maxLength={255} value={mail.subject} onChange={(event) => mail.setSubject(event.target.value)} /></label>
          <label>Bericht<textarea required maxLength={10000} rows={12} value={mail.body} onChange={(event) => mail.setBody(event.target.value)} placeholder={"Hallo {naam},\n\nTyp hier je bericht…"} /></label>
          <small>Gebruik <code>{"{naam}"}</code> en <code>{"{toernooi}"}</code> om het bericht te personaliseren.</small>
          <button className="primary" disabled={mail.busy || mail.recipients.length === 0}>{mail.busy ? "Versturen…" : `Verstuur naar ${mail.recipients.length}`}</button>
        </form>
        <div className="mail-preview">
          <p>VOORBEELD</p>
          <div><i /><header>MATCHPOINT TOURNAMENT</header><h3>{mail.subject || "Onderwerp van de e-mail"}</h3><div className="mail-preview-body">{previewBody || "Hier verschijnt een voorbeeld van je bericht."}</div><footer>TVA Arkel · Hoefpad 5, 4241 DT Arkel</footer></div>
        </div>
      </div>
    </section>
    <section className="panel full">
      <div className="table-heading"><div><p>LAATSTE 100 BERICHTEN</p><h2>Verzendhistorie</h2></div></div>
      {mail.messages.length === 0 ? <div className="empty-state">Nog geen e-mails geregistreerd.</div> : <div className="table-wrap"><table><thead><tr><th>Ontvanger</th><th>Onderwerp</th><th>Type</th><th>Status</th><th>Datum</th></tr></thead><tbody>{mail.messages.map((message) => <tr key={message.id}><td>{message.recipient_email}</td><td>{message.subject}</td><td>{message.message_type}</td><td><span className={`status ${message.status === "sent" || message.status === "delivered" ? "paid" : "pending"}`}>{statusLabel(message.status)}</span></td><td>{new Date(message.created_at.replace(" ", "T")).toLocaleString("nl-NL")}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
