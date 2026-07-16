"use client";

import { roundLabel } from "../Matches/Matches.hooks";
import type { ScheduleItem, StaffUser, TournamentMatch } from "../shared/types";
import { MatchScheduleModal } from "./MatchScheduleModal";
import { PlanScheduleModal } from "./PlanScheduleModal";
import { ScheduleItemModal } from "./ScheduleItemModal";
import type { ScheduleRef } from "./Schedule.hooks";
import { useSchedule } from "./Schedule.hooks";

type LaneEntry = { kind: "match"; value: TournamentMatch } | { kind: "item"; value: ScheduleItem };

function time(value: string) {
  return value.slice(11, 16);
}

function PlanningCard({
  entry,
  roundCount,
  editable,
  drag,
  drop,
  editMatch,
  editItem,
}: {
  entry: LaneEntry;
  roundCount: number;
  editable: boolean;
  drag: (ref: ScheduleRef) => void;
  drop: (ref: ScheduleRef) => void;
  editMatch: (match: TournamentMatch) => void;
  editItem: (item: ScheduleItem) => void;
}) {
  const ref: ScheduleRef = { kind: entry.kind, id: entry.value.id };
  if (entry.kind === "match") {
    const match = entry.value;
    return (
      <article
        className="planning-card match"
        draggable={editable}
        onDragStart={() => drag(ref)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => drop(ref)}
        onClick={() => editable && editMatch(match)}
      >
        <header>
          <strong>{time(match.scheduled_at!)}</strong>
          <span>{match.duration_minutes} min</span>
        </header>
        <small>
          {roundLabel(match.round_number, roundCount)} · W{match.bracket_position}
        </small>
        <b>{match.player_one_name ?? "Winnaar vorige wedstrijd"}</b>
        <i>tegen</i>
        <b>{match.player_two_name ?? "Winnaar vorige wedstrijd"}</b>
        {editable && <footer>↕ Verslepen · Klik om te wijzigen</footer>}
      </article>
    );
  }
  const item = entry.value;
  return (
    <article
      className={`planning-card program ${item.item_type}`}
      draggable={editable}
      onDragStart={() => drag(ref)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => drop(ref)}
      onClick={() => editable && editItem(item)}
    >
      <header>
        <strong>{time(item.starts_at)}</strong>
        <span>{item.duration_minutes} min</span>
      </header>
      <small>
        {item.item_type === "break" ? "PAUZE" : "PROGRAMMA"}
        {item.is_automatic ? " · AUTOMATISCH" : ""}
      </small>
      <b>{item.title}</b>
      {editable && <footer>↕ Verslepen · Klik om te wijzigen</footer>}
    </article>
  );
}

export function Schedule({ tournamentId, user }: { tournamentId: number; user: StaffUser }) {
  const controller = useSchedule(tournamentId, user);
  if (controller.loading || !controller.data)
    return (
      <section className="panel full">
        <div className="empty-state">Planning laden…</div>
      </section>
    );
  const data = controller.data;
  const editable = user.role === "administrator";
  const activeCourts = data.courts.filter((court) => Boolean(court.is_active));
  const editingItem = controller.item !== "new" ? controller.item : null;
  const date = new Date(data.tournament.starts_at.replace(" ", "T")).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <section className="schedule-page">
        <section className="panel schedule-heading">
          <div>
            <p>{date.toUpperCase()}</p>
            <h2>Baanplanning</h2>
            <span>
              {controller.scheduledMatches.length} wedstrijden gepland · {controller.unscheduled.length} nog niet
              gepland
            </span>
          </div>
          {editable && (
            <div>
              <button className="secondary" onClick={() => controller.setItem("new")}>
                ＋ Onderdeel
              </button>
              <button
                className="primary"
                onClick={() => controller.setPlanOpen(true)}
                disabled={data.matches.length === 0}
              >
                Plan nu
              </button>
            </div>
          )}
        </section>
        {controller.error && <p className="inline-error">{controller.error}</p>}
        {data.conflicts.length > 0 && (
          <section className="schedule-conflicts">
            <strong>
              ⚠ {data.conflicts.length} planningsconflict{data.conflicts.length === 1 ? "" : "en"}
            </strong>
            {data.conflicts.map((conflict, index) => (
              <span key={`${conflict.type}-${index}`}>{conflict.message}</span>
            ))}
          </section>
        )}
        {controller.globalItems.length > 0 && (
          <section className="global-program">
            {controller.globalItems.map((item) => (
              <button key={item.id} onClick={() => editable && controller.setItem(item)}>
                <strong>{time(item.starts_at)}</strong>
                <span>{item.title}</span>
                <small>
                  {item.duration_minutes} min{item.is_automatic ? " · automatisch" : ""}
                </small>
              </button>
            ))}
          </section>
        )}
        <section className="schedule-board">
          {activeCourts.map((court) => {
            const entries: LaneEntry[] = [
              ...controller.scheduledMatches
                .filter((match) => match.court_id === court.id)
                .map((value) => ({ kind: "match" as const, value })),
              ...data.items
                .filter((item) => !item.is_tournament_wide && item.court_id === court.id)
                .map((value) => ({ kind: "item" as const, value })),
            ].sort((a, b) => (a.value.starts_at ?? "").localeCompare(b.value.starts_at ?? ""));
            return (
              <section className="schedule-lane panel" key={court.id}>
                <header>
                  <div>
                    <span>●</span>
                    <div>
                      <h3>{court.name}</h3>
                      <small>{court.surface ?? "Ondergrond niet ingesteld"}</small>
                    </div>
                  </div>
                  <b>{entries.length} onderdelen</b>
                </header>
                <div className="schedule-lane-list">
                  {entries.length === 0 ? (
                    <div className="schedule-lane-empty">Nog niets gepland</div>
                  ) : (
                    entries.map((entry) => (
                      <PlanningCard
                        key={`${entry.kind}-${entry.value.id}`}
                        entry={entry}
                        roundCount={data.round_count}
                        editable={editable}
                        drag={controller.setDragging}
                        drop={controller.drop}
                        editMatch={controller.setMatch}
                        editItem={controller.setItem}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </section>
        {editable && controller.unscheduled.length > 0 && (
          <section className="panel unscheduled-panel">
            <header>
              <div>
                <p>NOG TE PLANNEN</p>
                <h3>{controller.unscheduled.length} wedstrijden</h3>
              </div>
              <span>Klik op een wedstrijd om deze handmatig te plannen.</span>
            </header>
            <div>
              {controller.unscheduled.map((match) => (
                <button key={match.id} onClick={() => controller.setMatch(match)}>
                  <span>
                    R{match.round_number} · W{match.bracket_position}
                  </span>
                  <strong>
                    {match.player_one_name ?? "Nog onbekend"} — {match.player_two_name ?? "Nog onbekend"}
                  </strong>
                  <small>{match.duration_minutes} min</small>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
      {controller.planOpen && (
        <PlanScheduleModal
          data={data}
          busy={controller.busy}
          close={() => controller.setPlanOpen(false)}
          save={controller.plan}
        />
      )}
      {controller.item && (
        <ScheduleItemModal
          item={editingItem ?? undefined}
          courts={data.courts}
          defaultStart={data.tournament.starts_at}
          busy={controller.busy}
          close={() => controller.setItem(null)}
          save={controller.saveItem}
          remove={editingItem ? () => controller.deleteItem(editingItem.id) : undefined}
        />
      )}
      {controller.match && (
        <MatchScheduleModal
          match={controller.match}
          courts={data.courts}
          defaultStart={data.tournament.starts_at}
          busy={controller.busy}
          close={() => controller.setMatch(null)}
          save={controller.saveMatch}
        />
      )}
    </>
  );
}
