"use client";

import { useState } from "react";
import { useModalDismiss } from "../Modal/Modal.hooks";
import type { ScheduleData } from "../shared/types";
import { roundLabel } from "../Matches/Matches.hooks";
import { toInputDate } from "./Schedule.hooks";

export function PlanScheduleModal({
  data,
  busy,
  close,
  save,
}: {
  data: ScheduleData;
  busy: boolean;
  close: () => void;
  save: (payload: Record<string, unknown>) => void;
}) {
  useModalDismiss(close);
  const activeCourts = data.courts.filter((court) => Boolean(court.is_active));
  const availableRounds = Array.from({ length: data.round_count }, (_, index) => index + 1);
  const [round, setRound] = useState(
    availableRounds.find((value) =>
      data.matches.some((match) => match.round_number === value && !match.scheduled_at),
    ) ?? 1,
  );
  const [startsAt, setStartsAt] = useState(toInputDate(data.tournament.starts_at));
  const [firstCourt, setFirstCourt] = useState(String(activeCourts[0]?.id ?? ""));
  const [secondCourt, setSecondCourt] = useState(String(activeCourts[1]?.id ?? ""));
  const matchCount = data.matches.filter((match) => match.round_number === round).length;
  const hasSecondHalf = matchCount > 1;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className="modal-card plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
        onSubmit={(event) => {
          event.preventDefault();
          save({
            round_number: round,
            starts_at: startsAt,
            first_court_id: Number(firstCourt),
            second_court_id: hasSecondHalf ? Number(secondCourt) : null,
          });
        }}
      >
        <div className="modal-header">
          <div>
            <p>SEMI-AUTOMATISCH PLANNEN</p>
            <h2 id="plan-title">Ronde over banen verdelen</h2>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Sluiten">
            ×
          </button>
        </div>
        <div className="modal-grid">
          <label>
            Ronde
            <select value={round} onChange={(event) => setRound(Number(event.target.value))}>
              {availableRounds.map((value) => (
                <option key={value} value={value}>
                  {roundLabel(value, data.round_count)} ·{" "}
                  {data.matches.filter((match) => match.round_number === value).length} wedstrijden
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
            Eerste helft
            <select required value={firstCourt} onChange={(event) => setFirstCourt(event.target.value)}>
              {activeCourts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>
          {hasSecondHalf && (
            <label>
              Tweede helft
              <select required value={secondCourt} onChange={(event) => setSecondCourt(event.target.value)}>
                {activeCourts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="hint">
          Wedstrijden worden per baan achter elkaar gezet. Na iedere {data.tournament.break_every_minutes} minuten wordt
          automatisch een gezamenlijke pauze van {data.tournament.break_duration_minutes} minuten ingepland.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            Annuleren
          </button>
          <button
            className="primary"
            disabled={busy || !firstCourt || (hasSecondHalf && (!secondCourt || firstCourt === secondCourt))}
          >
            {busy ? "Plannen…" : "Ronde plannen"}
          </button>
        </div>
      </form>
    </div>
  );
}
