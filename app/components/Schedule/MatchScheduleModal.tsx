"use client";

import { useState } from "react";
import { useModalDismiss } from "../Modal/Modal.hooks";
import type { Court, TournamentMatch } from "../shared/types";
import { toInputDate } from "./Schedule.hooks";

export function MatchScheduleModal({
  match,
  courts,
  defaultStart,
  busy,
  close,
  save,
}: {
  match: TournamentMatch;
  courts: Court[];
  defaultStart: string;
  busy: boolean;
  close: () => void;
  save: (payload: Record<string, unknown>) => void;
}) {
  useModalDismiss(close);
  const [startsAt, setStartsAt] = useState(toInputDate(match.scheduled_at ?? defaultStart));
  const [courtId, setCourtId] = useState(
    String(match.court_id ?? courts.find((court) => Boolean(court.is_active))?.id ?? ""),
  );
  const [duration, setDuration] = useState(match.duration_minutes);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className="modal-card match-schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-plan-title"
        onSubmit={(event) => {
          event.preventDefault();
          save({ court_id: Number(courtId), starts_at: startsAt, duration_minutes: duration });
        }}
      >
        <div className="modal-header">
          <div>
            <p>
              WEDSTRIJD {match.bracket_position} · RONDE {match.round_number}
            </p>
            <h2 id="match-plan-title">Wedstrijd plannen</h2>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Sluiten">
            ×
          </button>
        </div>
        <div className="schedule-match-names">
          <strong>{match.player_one_name ?? "Nog niet bekend"}</strong>
          <span>tegen</span>
          <strong>{match.player_two_name ?? "Nog niet bekend"}</strong>
        </div>
        <div className="modal-grid">
          <label>
            Baan
            <select required value={courtId} onChange={(event) => setCourtId(event.target.value)}>
              {courts
                .filter((court) => Boolean(court.is_active))
                .map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Starttijd
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label>
            Duur in minuten
            <input
              type="number"
              min="1"
              max="60"
              required
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Annuleren
          </button>
          <button className="primary" disabled={busy || !courtId}>
            {busy ? "Opslaan…" : "Wedstrijd opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
