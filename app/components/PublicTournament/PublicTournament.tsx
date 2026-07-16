"use client";

/* eslint-disable @next/next/no-img-element */

import { Brand } from "../Brand/Brand";
import { routeHref } from "../shared/routing";
import type { PublicMatch, PublicTournamentTab } from "../shared/types";
import { usePublicTournament } from "./PublicTournament.hooks";

function roundLabel(round: number, total: number) {
  if (round === total) return "Finale";
  if (round === total - 1) return "Halve finale";
  if (round === total - 2) return "Kwartfinale";
  return `Ronde ${round}`;
}

function Player({ match, side }: { match: PublicMatch; side: "one" | "two" }) {
  const name = side === "one" ? match.player_one_name : match.player_two_name;
  const number = side === "one" ? match.player_one_number : match.player_two_number;
  return (
    <div className={`public-bracket-player ${match.winner_side === side ? "winner" : ""}`}>
      <span>{number ?? "–"}</span>
      <strong>{name ?? "Nog niet bekend"}</strong>
      {match.winner_side === side && <b>✓</b>}
    </div>
  );
}

function Bracket({ matches, roundCount }: { matches: PublicMatch[]; roundCount: number }) {
  if (!matches.length)
    return (
      <div className="public-empty">
        <strong>De loting is nog niet gepubliceerd</strong>
        <span>Zodra de loting definitief is, verschijnt hier het volledige schema.</span>
      </div>
    );
  return (
    <div className="public-bracket">
      {Array.from({ length: roundCount }, (_, index) => {
        const round = index + 1;
        return (
          <section key={round}>
            <header>
              <span>{round}</span>
              <h2>{roundLabel(round, roundCount)}</h2>
            </header>
            <div>
              {matches
                .filter((match) => match.round_number === round)
                .map((match) => (
                  <article key={match.id}>
                    <small>WEDSTRIJD {match.bracket_position}</small>
                    <Player match={match} side="one" />
                    <Player match={match} side="two" />
                    {match.scheduled_at && (
                      <footer>
                        {new Date(match.scheduled_at.replace(" ", "T")).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {match.court_name ?? "Baan volgt"}
                      </footer>
                    )}
                  </article>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PublicNavigation({ tab, select }: { tab: PublicTournamentTab; select: (tab: PublicTournamentTab) => void }) {
  const tabs: { id: PublicTournamentTab; label: string }[] = [
    { id: "schedule", label: "Programma" },
    { id: "bracket", label: "Toernooischema" },
    { id: "results", label: "Uitslagen" },
  ];
  return (
    <nav className="public-tournament-tabs">
      {tabs.map((item) => (
        <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => select(item.id)}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function PublicTournament() {
  const page = usePublicTournament();
  if (page.loading && !page.data)
    return (
      <main className="public-tournament-loading">
        <Brand />
        <span>Toernooipagina laden…</span>
      </main>
    );
  if (!page.data)
    return (
      <main className="public-tournament-loading">
        <Brand />
        <span>De toernooipagina is momenteel niet bereikbaar.</span>
      </main>
    );
  const { tournament } = page.data;
  const start = new Date(tournament.starts_at.replace(" ", "T"));
  const date = start.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="public-tournament-page">
      <header className="public-tournament-header">
        <a href={routeHref("/")}>
          <Brand />
        </a>
        <div>
          <a href={routeHref("/presentatie")}>Livepresentatie</a>
          {tournament.registration_available && (
            <a className="primary" href={routeHref("/inschrijven")}>
              Inschrijven
            </a>
          )}
        </div>
      </header>
      <section className="public-tournament-hero">
        <div>
          <p>{tournament.status === "live" ? "● TOERNOOI LIVE" : "MATCHPOINT TOURNAMENT"}</p>
          <h1>{tournament.name}</h1>
          <span>
            {date} · {start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} uur
          </span>
        </div>
        <aside>
          <strong>{tournament.capacity}</strong>
          <span>
            spelers
            <br />
            {page.data.round_count} rondes
          </span>
        </aside>
      </section>
      <PublicNavigation tab={page.tab} select={page.setTab} />
      {page.offline && (
        <p className="public-offline">Live verversen lukt even niet. De laatst bekende gegevens worden getoond.</p>
      )}
      <div className="public-tournament-content">
        {page.tab === "schedule" && (
          <section className="public-schedule">
            <div className="public-section-heading">
              <p>PROGRAMMA</p>
              <h2>Wat staat er op de planning?</h2>
            </div>
            {page.schedule.length === 0 ? (
              <div className="public-empty">
                <strong>De planning wordt nog gemaakt</strong>
                <span>Wedstrijden en programmaonderdelen verschijnen hier zodra ze een tijd hebben.</span>
              </div>
            ) : (
              page.schedule.map((entry) =>
                entry.kind === "match" ? (
                  <article key={`match-${entry.match.id}`}>
                    <time>
                      {new Date(entry.starts_at.replace(" ", "T")).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span className="public-event-icon">↗</span>
                    <div>
                      <small>
                        {roundLabel(entry.match.round_number, page.data!.round_count)} ·{" "}
                        {entry.match.court_name ?? "Baan volgt"}
                      </small>
                      <strong>
                        {entry.match.player_one_name ?? "Nog niet bekend"} <i>tegen</i>{" "}
                        {entry.match.player_two_name ?? "Nog niet bekend"}
                      </strong>
                    </div>
                    <b>{entry.match.status === "complete" ? "Afgelopen" : "Wedstrijd"}</b>
                  </article>
                ) : (
                  <article className="special" key={`item-${entry.item.id}`}>
                    <time>
                      {new Date(entry.starts_at.replace(" ", "T")).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span className="public-event-icon">•</span>
                    <div>
                      <small>
                        {entry.item.is_tournament_wide ? "Hele toernooi" : (entry.item.court_name ?? "Programma")}
                      </small>
                      <strong>{entry.item.title}</strong>
                    </div>
                    <b>{entry.item.duration_minutes} min</b>
                  </article>
                ),
              )
            )}
          </section>
        )}
        {page.tab === "bracket" && <Bracket matches={page.data.matches} roundCount={page.data.round_count} />}
        {page.tab === "results" && (
          <section className="public-results">
            <div className="public-section-heading">
              <p>UITSLAGEN</p>
              <h2>Gespeelde wedstrijden</h2>
            </div>
            {page.results.length === 0 ? (
              <div className="public-empty">
                <strong>Nog geen uitslagen</strong>
                <span>Afgeronde wedstrijden verschijnen automatisch in dit overzicht.</span>
              </div>
            ) : (
              page.results.map((match) => (
                <article key={match.id}>
                  <span>{roundLabel(match.round_number, page.data!.round_count)}</span>
                  <div>
                    <strong>{match.player_one_name}</strong>
                    <i>tegen</i>
                    <strong>{match.player_two_name}</strong>
                  </div>
                  <b>Winnaar: {match.winner_name}</b>
                </article>
              ))
            )}
          </section>
        )}
      </div>
      {page.data.sponsors.length > 0 && (
        <section className="public-sponsors">
          <p>MEDE MOGELIJK GEMAAKT DOOR</p>
          <div>
            {page.data.sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.website_url ?? undefined}
                target={sponsor.website_url ? "_blank" : undefined}
                rel="noreferrer"
              >
                <span>{sponsor.tier_name}</span>
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={`${sponsor.name} logo`} />
                ) : (
                  <strong>{sponsor.name}</strong>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
      <footer className="public-tournament-footer">
        <Brand />
        <span>
          {tournament.venue.name}
          <br />
          {tournament.venue.address}
        </span>
        <small>Wordt iedere 10 seconden automatisch bijgewerkt</small>
      </footer>
    </main>
  );
}
