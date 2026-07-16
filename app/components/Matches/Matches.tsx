"use client";

import type { StaffUser, TournamentMatch } from "../shared/types";
import { MatchWinnerModal } from "./MatchWinnerModal";
import { roundLabel, useMatches } from "./Matches.hooks";

function PlayerChoice({
  match,
  side,
  choose,
}: {
  match: TournamentMatch;
  side: "one" | "two";
  choose: (match: TournamentMatch, winnerId: number | null) => void;
}) {
  const id = side === "one" ? match.player_one_id : match.player_two_id;
  const name = side === "one" ? match.player_one_name : match.player_two_name;
  const number = side === "one" ? match.player_one_number : match.player_two_number;
  const isBye = side === "one" ? match.player_one_is_bye : match.player_two_is_bye;
  const winner = id !== null && match.winner_id === id;
  const ready = Boolean(
    id && match.player_one_id && match.player_two_id && !match.player_one_is_bye && !match.player_two_is_bye,
  );
  return (
    <button
      type="button"
      className={`match-player-choice ${winner ? "winner" : ""} ${!id ? "waiting" : ""}`}
      onClick={() => ready && choose(match, id)}
      disabled={!ready}
    >
      <span>{isBye ? "B" : (number ?? "–")}</span>
      <div>
        <strong>{isBye ? "Bye" : (name ?? "Winnaar vorige wedstrijd")}</strong>
        <small>
          {winner ? "Winnaar" : ready ? "Tik om als winnaar te kiezen" : id ? "Automatisch door" : "Nog niet bekend"}
        </small>
      </div>
      {winner && <b>✓</b>}
    </button>
  );
}

export function Matches({ tournamentId, user }: { tournamentId: number; user: StaffUser }) {
  const controller = useMatches(tournamentId, user);
  if (controller.loading)
    return (
      <section className="panel full">
        <div className="empty-state">Wedstrijden laden…</div>
      </section>
    );
  if (controller.data.matches.length === 0)
    return (
      <section className="panel full">
        <div className="match-header">
          <div>
            <p>WEDSTRIJDBEHEER</p>
            <h2>Nog geen gepubliceerde loting</h2>
            <span>Publiceer eerst de handmatige loting. Daarna verschijnen alle rondes hier automatisch.</span>
          </div>
        </div>
        {controller.error && <p className="inline-error">{controller.error}</p>}
        <div className="empty-state">
          <strong>Maak eerst de loting</strong>
          <span>Daarna kunnen Hosts en Administrators hier winnaars invoeren.</span>
        </div>
      </section>
    );
  const total = controller.data.matches.length;
  return (
    <>
      <section className="matches-page">
        <section className="panel match-management-heading">
          <div>
            <p>LIVE WEDSTRIJDBEHEER</p>
            <h2>{roundLabel(controller.round, controller.data.round_count)}</h2>
            <span>Tik op een speler en bevestig de winnaar. Die wordt direct in de volgende ronde geplaatst.</span>
          </div>
          <div className="match-progress">
            <strong>
              {controller.completed}
              <small> / {total}</small>
            </strong>
            <span>wedstrijden afgerond</span>
          </div>
        </section>
        {controller.error && <p className="inline-error">{controller.error}</p>}
        <nav className="panel match-round-tabs" aria-label="Rondes">
          {Array.from({ length: controller.data.round_count }, (_, index) => {
            const value = index + 1;
            const matches = controller.data.matches.filter((match) => match.round_number === value);
            const done = matches.filter((match) => match.status === "complete").length;
            return (
              <button
                key={value}
                className={controller.round === value ? "active" : ""}
                onClick={() => controller.setRound(value)}
              >
                <span>{roundLabel(value, controller.data.round_count)}</span>
                <small>
                  {done}/{matches.length}
                </small>
              </button>
            );
          })}
        </nav>
        <section className="match-score-grid">
          {controller.visible.map((match) => (
            <article
              className={`panel match-score-card ${match.status === "complete" ? "complete" : ""}`}
              key={match.id}
            >
              <header>
                <div>
                  <b>W{match.bracket_position}</b>
                  <span>{roundLabel(match.round_number, controller.data.round_count)}</span>
                </div>
                <small>
                  {match.court_name ?? "Nog niet gepland"} · {match.duration_minutes} min
                </small>
              </header>
              <PlayerChoice match={match} side="one" choose={controller.choose} />
              <div className="match-vs">VS</div>
              <PlayerChoice match={match} side="two" choose={controller.choose} />
              <footer>
                {match.status === "complete" ? (
                  <>
                    <span>Afgerond</span>
                    <button
                      type="button"
                      onClick={() =>
                        controller.choose(
                          match,
                          match.winner_id === match.player_one_id ? match.player_two_id : match.player_one_id,
                        )
                      }
                    >
                      Uitslag corrigeren
                    </button>
                  </>
                ) : (
                  <span>
                    {match.player_one_id && match.player_two_id ? "Klaar voor uitslag" : "Wacht op vorige ronde"}
                  </span>
                )}
              </footer>
            </article>
          ))}
        </section>
      </section>
      {controller.selected && (
        <MatchWinnerModal
          match={controller.selected.match}
          winnerId={controller.selected.winnerId}
          busy={controller.busy}
          close={controller.closeConfirm}
          confirm={controller.confirmWinner}
        />
      )}
    </>
  );
}
