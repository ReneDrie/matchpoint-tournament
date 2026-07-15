import { PlayerTable } from "../Players/PlayerTable";
import type { Navigate, Player } from "../shared/types";

function Stat({ value, label, note, badge, accent }: { value: string; label: string; note: string; badge: string; accent?: boolean }) {
  return <div className={`stat-card ${accent ? "accent" : ""}`}><div className="stat-top"><span className="stat-icon">{accent ? "↗" : "•"}</span><span className="trend">{badge}</span></div><strong>{value}</strong><p>{label}</p><small>{note}</small></div>;
}

export function Overview({ setView, players }: { setView: Navigate; players: Player[] }) {
  const confirmed = players.filter(player => player.registration_status === "confirmed").length;
  const occupancy = Math.round((confirmed / 256) * 100);
  return <>
    <section className="stats"><Stat value={String(confirmed)} label="Betaalde deelnemers" note="van maximaal 256 plekken" badge={`Nog ${256 - confirmed} plekken`} accent /><Stat value={`${occupancy}%`} label="Bezetting" note="Inschrijven sluit 26 juni 2027" badge="Inschrijving open" /><Stat value="2" label="Buitenbanen" note="Baan 1 en Baan 2" badge="Beschikbaar" /><Stat value="128" label="Wedstrijden ronde 1" note="Toernooi start om 11:00 uur" badge="Nog te plannen" /></section>
    <section className="overview-grid"><div className="panel upcoming"><div className="panel-title"><div><p>LIVE OPERATIE</p><h2>Eerstvolgende wedstrijden</h2></div><button onClick={() => setView("matches")}>Alle wedstrijden →</button></div><div className="empty-state"><strong>Nog geen wedstrijden gepland</strong><span>Wedstrijden verschijnen hier nadat de handmatige loting is ingevuld.</span></div></div><div className="panel progress"><div className="panel-title"><div><p>TOERNOOI VOORTGANG</p><h2>8 rondes naar de finale</h2></div></div><div className="rounds"><span className="done" /><span className="current" /><span /><span /><span /><span /><span /><span /></div><div className="round-labels"><strong>Ronde 1</strong><span>Finale</span></div><div className="progress-big"><strong>0</strong><span>van 255<br />wedstrijden gespeeld</span></div><button className="secondary" onClick={() => setView("matches")}>Open wedstrijdbeheer</button></div></section>
    <section className="panel player-panel"><div className="panel-title"><div><p>LAATSTE INSCHRIJVINGEN</p><h2>Nieuwe deelnemers</h2></div><button onClick={() => setView("players")}>Alle deelnemers →</button></div><PlayerTable rows={players} compact /></section>
  </>;
}
