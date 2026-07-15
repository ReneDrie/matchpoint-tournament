import { PlayerTable } from "../Players/PlayerTable";
import type { Navigate, Player, TournamentConfig } from "../shared/types";

function Stat({ value, label, note, badge, accent }: { value: string; label: string; note: string; badge: string; accent?: boolean }) {
  return <div className={`stat-card ${accent ? "accent" : ""}`}><div className="stat-top"><span className="stat-icon">{accent ? "↗" : "•"}</span><span className="trend">{badge}</span></div><strong>{value}</strong><p>{label}</p><small>{note}</small></div>;
}

export function Overview({ setView, players, tournament }: { setView: Navigate; players: Player[]; tournament: TournamentConfig | null }) {
  const confirmed = players.filter(player => player.registration_status === "confirmed").length;
  const capacity = tournament?.capacity ?? 256;
  const occupancy = Math.round((confirmed / capacity) * 100);
  const start = tournament ? new Date(tournament.starts_at.replace(" ", "T")) : new Date("2027-06-26T11:00:00");
  const deadline = tournament ? new Date(tournament.registration_deadline_at.replace(" ", "T")).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "26 juni 2027";
  const firstRoundMatches = capacity / 2;
  return <>
    <section className="stats"><Stat value={String(confirmed)} label="Betaalde deelnemers" note={`van maximaal ${capacity} plekken`} badge={`Nog ${capacity - confirmed} plekken`} accent /><Stat value={`${occupancy}%`} label="Bezetting" note={`Inschrijven sluit ${deadline}`} badge={tournament?.registration_available ? "Inschrijving open" : "Inschrijving gesloten"} /><Stat value={String(tournament?.active_courts ?? 2)} label="Actieve banen" note="Beheerbaar via instellingen" badge="Beschikbaar" /><Stat value={String(firstRoundMatches)} label="Wedstrijden ronde 1" note={`Toernooi start om ${start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} uur`} badge="Nog te plannen" /></section>
    <section className="overview-grid"><div className="panel upcoming"><div className="panel-title"><div><p>LIVE OPERATIE</p><h2>Eerstvolgende wedstrijden</h2></div><button onClick={() => setView("matches")}>Alle wedstrijden →</button></div><div className="empty-state"><strong>Nog geen wedstrijden gepland</strong><span>Wedstrijden verschijnen hier nadat de handmatige loting is ingevuld.</span></div></div><div className="panel progress"><div className="panel-title"><div><p>TOERNOOI VOORTGANG</p><h2>8 rondes naar de finale</h2></div></div><div className="rounds"><span className="done" /><span className="current" /><span /><span /><span /><span /><span /><span /></div><div className="round-labels"><strong>Ronde 1</strong><span>Finale</span></div><div className="progress-big"><strong>0</strong><span>van 255<br />wedstrijden gespeeld</span></div><button className="secondary" onClick={() => setView("matches")}>Open wedstrijdbeheer</button></div></section>
    <section className="panel player-panel"><div className="panel-title"><div><p>LAATSTE INSCHRIJVINGEN</p><h2>Nieuwe deelnemers</h2></div><button onClick={() => setView("players")}>Alle deelnemers →</button></div><PlayerTable rows={players} compact /></section>
  </>;
}
