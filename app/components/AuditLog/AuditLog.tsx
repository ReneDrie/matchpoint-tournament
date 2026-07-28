"use client";

import { Fragment, useState } from "react";
import type { AuditEntry } from "../shared/types";
import { useAuditLog } from "./AuditLog.hooks";

const actionLabels: Record<string, string> = {
  "auth.login": "Ingelogd",
  "auth.login_failed": "Inloggen mislukt",
  "auth.logout": "Uitgelogd",
  "auth.password_reset_requested": "Wachtwoordherstel aangevraagd",
  "auth.password_reset_completed": "Wachtwoord hersteld",
  "player.created_manually": "Deelnemer toegevoegd",
  "player.updated": "Deelnemer gewijzigd",
  "player.checked_in": "Deelnemer ingecheckt",
  "player.check_in_reverted": "Check-in teruggedraaid",
  "draw.saved": "Loting opgeslagen",
  "draw.published": "Loting gepubliceerd",
  "match.winner_selected": "Winnaar vastgelegd",
  "match.winner_corrected": "Winnaar gecorrigeerd",
  "tournament.settings_updated": "Instellingen gewijzigd",
  "email.broadcast_sent": "E-mailverzending gestart",
};

const entityLabels: Record<string, string> = {
  user: "Gebruiker",
  player: "Deelnemer",
  tournament: "Toernooi",
  draw: "Loting",
  match: "Wedstrijd",
  court: "Baan",
  sponsor: "Sponsor",
  sponsor_tier: "Sponsorpakket",
  presentation_slide: "Presentatieslide",
  schedule_item: "Programmaonderdeel",
  waitlist_entry: "Wachtlijstinschrijving",
  staff_invitation: "Staff-uitnodiging",
};

function label(value: string, labels: Record<string, string>) {
  return labels[value] ?? value.replaceAll("_", " ").replaceAll(".", " · ");
}

function Actor({ entry }: { entry: AuditEntry }) {
  if (!entry.user_id) return <span>Systeem of bezoeker</span>;
  return (
    <span className="audit-actor">
      <strong>{entry.user_name ?? "Verwijderde gebruiker"}</strong>
      {entry.user_email && <small>{entry.user_email}</small>}
    </span>
  );
}

export function AuditLog() {
  const audit = useAuditLog();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section className="panel full audit-page">
      <div className="table-heading">
        <div>
          <p>ALLE GEREGISTREERDE MUTATIES</p>
          <h2>Activiteiten en wijzigingen</h2>
        </div>
        <span>{audit.pagination.total} registraties</span>
      </div>
      <div className="audit-filters">
        <label>
          Actie
          <select value={audit.action} onChange={(event) => audit.setAction(event.target.value)}>
            <option value="">Alle acties</option>
            {audit.filters.actions.map((action) => (
              <option key={action} value={action}>
                {label(action, actionLabels)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entiteit
          <select value={audit.entityType} onChange={(event) => audit.setEntityType(event.target.value)}>
            <option value="">Alle entiteiten</option>
            {audit.filters.entity_types.map((entity) => (
              <option key={entity} value={entity}>
                {label(entity, entityLabels)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vanaf
          <input type="date" value={audit.dateFrom} onChange={(event) => audit.setDateFrom(event.target.value)} />
        </label>
        <label>
          Tot en met
          <input type="date" value={audit.dateTo} onChange={(event) => audit.setDateTo(event.target.value)} />
        </label>
        {audit.hasFilters && (
          <button className="secondary" type="button" onClick={audit.clearFilters}>
            Wis filters
          </button>
        )}
      </div>
      {audit.error && <p className="inline-error">{audit.error}</p>}
      {audit.loading ? (
        <div className="empty-state">Auditlog laden…</div>
      ) : audit.entries.length === 0 ? (
        <div className="empty-state">
          <strong>Geen registraties gevonden</strong>
          <span>Pas de filters aan om andere activiteiten te bekijken.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Datum en tijd</th>
                <th>Actie</th>
                <th>Uitgevoerd door</th>
                <th>Entiteit</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr>
                    <td>{new Date(entry.created_at.replace(" ", "T")).toLocaleString("nl-NL")}</td>
                    <td>
                      <strong>{label(entry.action, actionLabels)}</strong>
                      <small className="audit-technical">{entry.action}</small>
                    </td>
                    <td>
                      <Actor entry={entry} />
                    </td>
                    <td>
                      {label(entry.entity_type, entityLabels)}
                      {entry.entity_id ? ` #${entry.entity_id}` : ""}
                      {entry.tournament_id && (
                        <small className="audit-technical">Toernooi #{entry.tournament_id}</small>
                      )}
                    </td>
                    <td>
                      {entry.payload || entry.ip_address ? (
                        <button
                          className="secondary audit-detail-button"
                          type="button"
                          aria-expanded={expanded === entry.id}
                          onClick={() => setExpanded((current) => (current === entry.id ? null : entry.id))}
                        >
                          {expanded === entry.id ? "Sluiten" : "Bekijken"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr className="audit-detail-row">
                      <td colSpan={5}>
                        {entry.ip_address && (
                          <p>
                            <strong>IP-adres:</strong> {entry.ip_address}
                          </p>
                        )}
                        {entry.payload && <pre>{JSON.stringify(entry.payload, null, 2)}</pre>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!audit.loading && audit.pagination.total > 0 && (
        <div className="pagination">
          <span>
            Pagina {audit.pagination.page} van {audit.pagination.pages}
          </span>
          <div>
            <button
              type="button"
              disabled={audit.pagination.page <= 1}
              onClick={() => audit.setPage((current) => Math.max(1, current - 1))}
            >
              Vorige
            </button>
            <button
              type="button"
              disabled={audit.pagination.page >= audit.pagination.pages}
              onClick={() => audit.setPage((current) => current + 1)}
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
