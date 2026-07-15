"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type View = "overview" | "players" | "matches" | "schedule" | "sponsors" | "presentation" | "registration";

type TournamentConfig = {
  name: string;
  starts_at: string;
  venue: { name: string; address: string };
  capacity: number;
  registration_price: { formatted: string };
  confirmed_players: number;
  registration_available: boolean;
};

type StaffUser = { id: number; name: string; email: string; role: "administrator" | "host"; csrf_token: string };
type Player = {
  id: number;
  player_number: number | null;
  sponsor_id: number | null;
  sponsor_name: string | null;
  name: string;
  email: string;
  phone: string;
  knltb_number: string | null;
  singles_rating: string | null;
  doubles_rating: string | null;
  entrance_song_query: string;
  entrance_song_url: string | null;
  registration_status: string;
  checked_in_at: string | null;
  created_at: string;
};
type PlayerDetail = Player & { date_of_birth: string };
type Sponsor = { id: number; name: string; website_url: string | null; logo_path: string | null; is_active: number; tier_id: number; tier_name: string; player_count: number };
type SponsorTier = { id: number; name: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overzicht", icon: "⌂" },
  { id: "players", label: "Deelnemers", icon: "◎" },
  { id: "matches", label: "Wedstrijden", icon: "◇" },
  { id: "schedule", label: "Planning", icon: "▦" },
  { id: "sponsors", label: "Sponsors", icon: "✦" },
  { id: "presentation", label: "Presentatie", icon: "▣" },
];

function Brand() {
  return <div className="brand"><img src="/mpt-logo.svg" alt="Matchpoint Tournament" /></div>;
}

function Sidebar({ view, setView, user, logout }: { view: View; setView: (v: View) => void; user: StaffUser; logout: () => void }) {
  return <aside className="sidebar">
    <Brand />
    <p className="nav-kicker">TOERNOOI BEHEER</p>
    <nav>{nav.filter(item => user.role === "administrator" || !["sponsors", "presentation"].includes(item.id)).map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
    <div className="sidebar-spacer" />
    <button className="public-link" onClick={() => setView("registration")}><span>↗</span> Inschrijfpagina</button>
    <div className="profile"><div className="avatar">{user.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><div><strong>{user.name}</strong><small>{user.role === "administrator" ? "Administrator" : "Host"}</small></div><button onClick={logout} title="Uitloggen">↪</button></div>
  </aside>;
}

function Topbar({ view, setView, user }: { view: View; setView: (view: View) => void; user: StaffUser }) {
  const labels: Record<View, string> = { overview: `Goedemorgen, ${user.name.split(" ")[0]}`, players: "Deelnemers", matches: "Wedstrijden", schedule: "Court planning", sponsors: "Sponsors", presentation: "Presentatiemodus", registration: "Inschrijving" };
  return <header className="topbar"><div><p>Matchpoint Tournament · 26 juni 2027</p><h1>{labels[view]}</h1></div><div className="top-actions"><button className="primary small" onClick={() => setView("registration")}>＋ Nieuwe inschrijving</button></div></header>;
}

function Stat({ value, label, note, badge, accent }: { value: string; label: string; note: string; badge: string; accent?: boolean }) {
  return <div className={`stat-card ${accent ? "accent" : ""}`}><div className="stat-top"><span className="stat-icon">{accent ? "↗" : "•"}</span><span className="trend">{badge}</span></div><strong>{value}</strong><p>{label}</p><small>{note}</small></div>;
}

function Overview({ setView, players: playerRows }: { setView: (v: View) => void; players: Player[] }) {
  const confirmed = playerRows.filter(player => player.registration_status === "confirmed").length;
  const occupancy = Math.round((confirmed / 256) * 100);
  return <>
    <section className="stats"><Stat value={String(confirmed)} label="Betaalde deelnemers" note="van maximaal 256 plekken" badge={`Nog ${256 - confirmed} plekken`} accent /><Stat value={`${occupancy}%`} label="Bezetting" note="Inschrijven sluit 26 juni 2027" badge="Inschrijving open" /><Stat value="2" label="Buitenbanen" note="Baan 1 en Baan 2" badge="Beschikbaar" /><Stat value="128" label="Wedstrijden ronde 1" note="Toernooi start om 11:00 uur" badge="Nog te plannen" /></section>
    <section className="overview-grid">
      <div className="panel upcoming"><div className="panel-title"><div><p>LIVE OPERATIE</p><h2>Eerstvolgende wedstrijden</h2></div><button onClick={() => setView("matches")}>Alle wedstrijden →</button></div><div className="empty-state"><strong>Nog geen wedstrijden gepland</strong><span>Wedstrijden verschijnen hier nadat de handmatige loting is ingevuld.</span></div></div>
      <div className="panel progress"><div className="panel-title"><div><p>TOERNOOI VOORTGANG</p><h2>8 rondes naar de finale</h2></div></div><div className="rounds"><span className="done" /><span className="current" /><span /><span /><span /><span /><span /><span /></div><div className="round-labels"><strong>Ronde 1</strong><span>Finale</span></div><div className="progress-big"><strong>0</strong><span>van 255<br />wedstrijden gespeeld</span></div><button className="secondary" onClick={() => setView("matches")}>Open wedstrijdbeheer</button></div>
    </section>
    <section className="panel player-panel"><div className="panel-title"><div><p>LAATSTE INSCHRIJVINGEN</p><h2>Nieuwe deelnemers</h2></div><button onClick={() => setView("players")}>Alle deelnemers →</button></div><PlayerTable rows={playerRows} compact /></section>
  </>;
}

function PlayerTable({ rows, onCheckIn, onEdit, compact = false }: { rows: Player[]; onCheckIn?: (player: Player) => void; onEdit?: (player: Player) => void; compact?: boolean }) {
  const visibleRows = compact ? rows.slice(0, 4) : rows;
  if (visibleRows.length === 0) return <div className="empty-state"><strong>Nog geen deelnemers</strong><span>Betaalde inschrijvingen verschijnen hier automatisch.</span></div>;
  const statusLabel = (status: string) => ({ confirmed: "Betaald", payment_pending: "Betaling open", cancelled: "Geannuleerd", refunded: "Terugbetaald", waitlisted: "Wachtlijst" }[status] ?? status);
  return <div className="table-wrap"><table><thead><tr><th>Deelnemer</th><th>KNLTB / speelsterkte</th><th>Betaalstatus</th><th>Opkomstnummer</th><th>Acties</th></tr></thead><tbody>{visibleRows.map(player => <tr key={player.id}><td><div className="person"><span>{player.player_number ?? player.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div><strong>{player.name}</strong><small>{player.email} · {player.phone}{player.sponsor_name ? ` · Sponsor: ${player.sponsor_name}` : ""}</small></div></div></td><td>{player.knltb_number || `Enkel ${player.singles_rating} / dubbel ${player.doubles_rating}`}</td><td><span className={`status ${player.registration_status === "confirmed" ? "paid" : "pending"}`}>{statusLabel(player.registration_status)}</span></td><td>{player.entrance_song_url ? <a className="song" href={player.entrance_song_url} target="_blank" rel="noreferrer">♫ {player.entrance_song_query}</a> : <span>{player.entrance_song_query}</span>}</td><td><div className="row-actions">{onCheckIn && <button className={player.checked_in_at ? "secondary checkin active" : "secondary checkin"} onClick={() => onCheckIn(player)}>{player.checked_in_at ? "✓ Ingecheckt" : "Inchecken"}</button>}{onEdit && <button className="secondary checkin" onClick={() => onEdit(player)}>Wijzigen</button>}</div></td></tr>)}</tbody></table></div>;
}

function ManualPlayerModal({ user, sponsors, initialSponsorId = "", player, close, saved }: { user: StaffUser; sponsors: Sponsor[]; initialSponsorId?: string; player?: PlayerDetail; close: () => void; saved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: player?.name ?? "", email: player?.email ?? "", phone: player?.phone ?? "", date_of_birth: player?.date_of_birth ?? "", knltb_number: player?.knltb_number ?? "", singles_rating: player?.singles_rating ?? "", doubles_rating: player?.doubles_rating ?? "", entrance_song_query: player?.entrance_song_query ?? "", sponsor_id: player?.sponsor_id ? String(player.sponsor_id) : initialSponsorId, registration_status: player?.registration_status ?? "confirmed" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
  const complete = Boolean(form.name && form.email && form.phone && form.date_of_birth && form.entrance_song_query && (form.knltb_number || (form.singles_rating && form.doubles_rating)));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete) return;
    setBusy(true);
    setError("");
    const response = await fetch(player ? `${API_URL}/api/admin/players/${player.id}` : `${API_URL}/api/admin/players`, { method: player ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify(form) });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Deelnemer toevoegen is niet gelukt.");
      setBusy(false);
      return;
    }
    await saved();
    close();
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="manual-player-title" onSubmit={submit}><div className="modal-header"><div><p>{player ? "DEELNEMER BEHEREN" : "BETALING OVERSLAAN"}</p><h2 id="manual-player-title">{player ? "Deelnemer wijzigen" : "Deelnemer handmatig toevoegen"}</h2></div><button type="button" className="modal-close" onClick={close} aria-label="Sluiten">×</button></div><div className="modal-grid"><label>Naam<input autoFocus required value={form.name} onChange={event => update("name", event.target.value)} /></label><label>E-mailadres<input type="email" required value={form.email} onChange={event => update("email", event.target.value)} /></label><label>Telefoonnummer<input required value={form.phone} onChange={event => update("phone", event.target.value)} /></label><label>Geboortedatum<input type="date" required value={form.date_of_birth} onChange={event => update("date_of_birth", event.target.value)} /></label><label>KNLTB bondsnummer<input value={form.knltb_number} onChange={event => update("knltb_number", event.target.value)} /></label><div className="modal-ratings"><label>Enkel<input value={form.singles_rating} onChange={event => update("singles_rating", event.target.value)} /></label><label>Dubbel<input value={form.doubles_rating} onChange={event => update("doubles_rating", event.target.value)} /></label></div><label className="modal-wide">Opkomstnummer<input required value={form.entrance_song_query} onChange={event => update("entrance_song_query", event.target.value)} placeholder="Artiest – titel" /></label><label>Sponsor (optioneel)<select value={form.sponsor_id} onChange={event => update("sponsor_id", event.target.value)}><option value="">Geen sponsor</option>{sponsors.map(sponsor => <option key={sponsor.id} value={sponsor.id}>{sponsor.name} · {sponsor.tier_name}</option>)}</select></label>{player && <label>Deelnamestatus<select value={form.registration_status} onChange={event => update("registration_status", event.target.value)}><option value="confirmed">Betaald</option><option value="payment_pending">Betaling open</option><option value="cancelled">Geannuleerd</option><option value="refunded">Terugbetaald</option></select></label>}</div><p className="hint">KNLTB bondsnummer óf zowel enkel- als dubbelsterkte is verplicht.</p>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Annuleren</button><button className="primary" disabled={!complete || busy}>{busy ? "Opslaan…" : player ? "Wijzigingen opslaan" : "Direct als betaald toevoegen"}</button></div></form></div>;
}

function Players({ user, rows, sponsors, loading, reload }: { user: StaffUser; rows: Player[]; sponsors: Sponsor[]; loading: boolean; reload: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDetail | null>(null);
  const filtered = rows.filter(player => {
    const haystack = `${player.name} ${player.email} ${player.knltb_number ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === "all" || player.registration_status === status);
  });
  async function checkIn(player: Player) {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/${player.id}/check-in`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ checked_in: !player.checked_in_at }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Inchecken is niet gelukt.");
    await reload();
  }
  async function exportCsv() {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/export`, { credentials: "include" });
    if (!response.ok) return setError("Exporteren is niet gelukt.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "matchpoint-deelnemers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function edit(player: Player) {
    setError("");
    const response = await fetch(`${API_URL}/api/admin/players/${player.id}`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Deelnemer laden is niet gelukt.");
    setEditingPlayer(result.player);
  }
  return <><section className="panel full"><div className="toolbar"><div className="search">⌕ <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Zoek op naam, e-mail of bondsnummer" /></div><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Alle betaalstatussen</option><option value="confirmed">Betaald</option><option value="payment_pending">Betaling open</option><option value="cancelled">Geannuleerd</option><option value="refunded">Terugbetaald</option></select>{user.role === "administrator" && <button className="secondary" onClick={exportCsv}>⇩ Exporteer CSV</button>}</div><div className="table-heading"><div><p>{rows.length} VAN 256 PLEKKEN</p><h2>Alle deelnemers</h2></div>{user.role === "administrator" && <button className="primary" onClick={() => setManualOpen(true)}>＋ Handmatig toevoegen</button>}</div>{error && <p className="inline-error">{error}</p>}{loading ? <div className="empty-state">Deelnemers laden…</div> : <PlayerTable rows={filtered} onCheckIn={checkIn} onEdit={user.role === "administrator" ? edit : undefined} />}<div className="pagination"><span>{filtered.length} deelnemers zichtbaar</span></div></section>{manualOpen && <ManualPlayerModal user={user} sponsors={sponsors} close={() => setManualOpen(false)} saved={reload} />}{editingPlayer && <ManualPlayerModal user={user} sponsors={sponsors} player={editingPlayer} close={() => setEditingPlayer(null)} saved={reload} />}</>;
}

function Matches() {
  return <section className="panel full"><div className="match-header"><div><p>WEDSTRIJDBEHEER</p><h2>Nog geen wedstrijden</h2><span>De handmatige loting en persistente winnaarselectie worden in de volgende bouwfase toegevoegd.</span></div></div><div className="empty-state"><strong>Maak eerst de loting</strong><span>Daarna kunnen Hosts en Administrators hier winnaars invoeren.</span></div></section>;
}

function Schedule() {
  return <section className="panel full schedule"><div className="schedule-toolbar"><div><p>ZATERDAG 26 JUNI 2027</p><h2>Baanplanning</h2></div><button className="primary disabled-action" disabled title="Beschikbaar zodra de loting is gebouwd">Plan nu</button></div><div className="empty-state"><strong>Planning nog niet opgebouwd</strong><span>Baan 1 en Baan 2 zijn aangemaakt. De planner volgt samen met de loting.</span></div></section>;
}

function SponsorModal({ user, tiers, sponsor, close, saved }: { user: StaffUser; tiers: SponsorTier[]; sponsor?: Sponsor; close: () => void; saved: () => Promise<void> }) {
  const [name, setName] = useState(sponsor?.name ?? "");
  const [tierId, setTierId] = useState(sponsor?.tier_id ? String(sponsor.tier_id) : tiers[0]?.id ? String(tiers[0].id) : "");
  const [website, setWebsite] = useState(sponsor?.website_url ?? "");
  const [isActive, setIsActive] = useState(sponsor ? Boolean(sponsor.is_active) : true);
  const [showPublic, setShowPublic] = useState(sponsor ? Boolean(sponsor.show_on_public_pages) : true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(sponsor ? `${API_URL}/api/admin/sponsors/${sponsor.id}` : `${API_URL}/api/admin/sponsors`, { method: sponsor ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token }, body: JSON.stringify({ name, tier_id: tierId, website_url: website, is_active: isActive, show_on_public_pages: showPublic }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Sponsor toevoegen is niet gelukt."); setBusy(false); return; }
    await saved(); close();
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><form className="modal-card sponsor-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-modal-title" onSubmit={submit}><div className="modal-header"><div><p>{sponsor ? "PARTNER BEHEREN" : "NIEUWE PARTNER"}</p><h2 id="sponsor-modal-title">{sponsor ? "Sponsor wijzigen" : "Sponsor toevoegen"}</h2></div><button type="button" className="modal-close" onClick={close} aria-label="Sluiten">×</button></div><div className="modal-grid"><label>Naam<input autoFocus required value={name} onChange={event => setName(event.target.value)} /></label><label>Niveau<select required value={tierId} onChange={event => setTierId(event.target.value)}>{tiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></label><label className="modal-wide">Website (optioneel)<input type="url" value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://" /></label>{sponsor && <div className="modal-wide sponsor-switches"><label><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} /> Sponsor is actief</label><label><input type="checkbox" checked={showPublic} onChange={event => setShowPublic(event.target.checked)} /> Tonen op openbare pagina’s</label></div>}</div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={close}>Annuleren</button><button className="primary" disabled={!name || !tierId || busy}>{busy ? "Opslaan…" : sponsor ? "Wijzigingen opslaan" : "Sponsor toevoegen"}</button></div></form></div>;
}

function Sponsors({ user, sponsors, tiers, players, reloadSponsors, reloadPlayers }: { user: StaffUser; sponsors: Sponsor[]; tiers: SponsorTier[]; players: Player[]; reloadSponsors: () => Promise<void>; reloadPlayers: () => Promise<void> }) {
  const [sponsorModal, setSponsorModal] = useState(false);
  const [playerSponsor, setPlayerSponsor] = useState<Sponsor | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  async function playerSaved() { await Promise.all([reloadPlayers(), reloadSponsors()]); }
  return <><section className="panel full"><div className="table-heading"><div><p>PARTNERS VAN HET TOERNOOI</p><h2>Sponsors</h2></div><button className="primary" onClick={() => setSponsorModal(true)}>＋ Sponsor toevoegen</button></div>{sponsors.length === 0 ? <div className="empty-state"><strong>Nog geen sponsors toegevoegd</strong><span>Voeg eerst een Hoofdsponsor of Subsponsor toe.</span></div> : <div className="sponsor-management-grid">{sponsors.map(sponsor => { const sponsoredPlayers = players.filter(player => player.sponsor_id === sponsor.id); return <article className={`sponsor-management-card ${sponsor.is_active ? "" : "inactive"}`} key={sponsor.id}><div className="sponsor-card-head"><div className="sponsor-logo">{sponsor.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><div><span className={sponsor.is_active ? "status paid" : "status pending"}>{sponsor.is_active ? sponsor.tier_name : "Inactief"}</span><h3>{sponsor.name}</h3>{sponsor.website_url && <a href={sponsor.website_url} target="_blank" rel="noreferrer">Website openen ↗</a>}</div><button className="secondary sponsor-edit" onClick={() => setEditingSponsor(sponsor)}>Wijzigen</button></div><div className="sponsor-player-head"><strong>Spelers uit sponsorpakket</strong><span>{sponsoredPlayers.length}</span></div>{sponsoredPlayers.length === 0 ? <p className="sponsor-empty">Nog geen spelers gekoppeld.</p> : <ul className="sponsor-player-list">{sponsoredPlayers.map(player => <li key={player.id}><span>{player.player_number ?? "–"}</span><div><strong>{player.name}</strong><small>{player.email}</small></div><b>Betaald</b></li>)}</ul>}<button className="secondary sponsor-add-player" onClick={() => setPlayerSponsor(sponsor)} disabled={!sponsor.is_active}>＋ Speler toevoegen</button></article>; })}</div>}</section>{sponsorModal && <SponsorModal user={user} tiers={tiers} close={() => setSponsorModal(false)} saved={reloadSponsors} />}{editingSponsor && <SponsorModal user={user} tiers={tiers} sponsor={editingSponsor} close={() => setEditingSponsor(null)} saved={reloadSponsors} />}{playerSponsor && <ManualPlayerModal user={user} sponsors={sponsors} initialSponsorId={String(playerSponsor.id)} close={() => setPlayerSponsor(null)} saved={playerSaved} />}</>;
}

function Presentation() {
  return <section className="presentation-page"><div className="presentation-control panel"><div><p>PRESENTATIE MODUS</p><h2>Live scherm</h2><span>De openbare live-feed is voorbereid; slidebeheer wordt nog gekoppeld.</span></div><div className="live-pill">VOORBEREID</div></div><div className="screen-preview"><div className="screen-top"><Brand /><span>MATCHPOINT TOURNAMENT</span></div><div className="screen-content"><p>PRESENTATIE</p><h2>Nog geen slides</h2><i>Voeg straks sponsorbeelden en dynamische wedstrijdslides toe.</i></div></div><div className="slide-list panel"><div className="panel-title"><div><p>AFSPEELLIJST</p><h2>Slides en timing</h2></div><button className="primary disabled-action" disabled title="Slidebeheer wordt nog gebouwd">＋ Slide toevoegen</button></div><div className="empty-state"><strong>Afspeellijst is leeg</strong><span>Standaardduur: 10 seconden.</span></div></div></section>;
}

function Login({ onLogin, openRegistration }: { onLogin: (user: StaffUser) => void; openRegistration: () => void }) {
  const [email, setEmail] = useState("info@matchpointtournament.nl");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inloggen is niet gelukt.");
      onLogin(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inloggen is niet gelukt.");
      setBusy(false);
    }
  }
  return <div className="login-page"><div className="login-brand"><Brand /><p>Beheer het toernooi, de deelnemers en de wedstrijddag.</p></div><form className="login-card" onSubmit={submit}><p className="kicker">BEHEEROMGEVING</p><h1>Welkom terug</h1><p className="muted">Log in als Administrator of Host.</p><label>E-mailadres<input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Wachtwoord<input type="password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="primary continue" disabled={busy}>{busy ? "Inloggen…" : "Inloggen"}</button><button type="button" className="back" onClick={openRegistration}>Naar de openbare inschrijving →</button></form></div>;
}

function Registration({ close, tournament }: { close: () => void; tournament: TournamentConfig | null }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", date_of_birth: "", knltb_number: "", singles_rating: "", doubles_rating: "", entrance_song_query: "", accept_privacy: false, accept_terms: false, website: "" });
  const update = (field: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [field]: value }));
  const personalComplete = Boolean(form.name && form.email && form.phone && form.date_of_birth);
  const qualificationComplete = Boolean(form.knltb_number || (form.singles_rating && form.doubles_rating));
  const readyToPay = qualificationComplete && Boolean(form.entrance_song_query && form.accept_privacy && form.accept_terms);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!readyToPay) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/registrations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Inschrijven is niet gelukt.");
      window.location.assign(result.checkout_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inschrijven is niet gelukt.");
      setBusy(false);
    }
  }

  const price = tournament?.registration_price.formatted ?? "€ 12,50";
  const capacity = tournament?.capacity ?? 256;
  return <div className="registration-page"><header><Brand /><button onClick={close}>Beheeromgeving →</button></header><main><div className="registration-intro"><span className="eyebrow">MATCHPOINT TOURNAMENT · 26 JUNI 2027</span><h1>Jouw route naar<br />het <em>matchpoint.</em></h1><p>{capacity} spelers. Acht rondes. Eén winnaar. Op zaterdag 26 juni 2027 spelen we bij TVA Arkel.</p><div className="event-facts"><div><b>26</b><span>JUN<br />2027</span></div><div><b>{price}</b><span>PER<br />SPELER</span></div><div><b>{capacity}</b><span>PLEKKEN<br />TOTAAL</span></div></div></div><form className="registration-card" onSubmit={submit}><div className="steps"><span className="active">1</span><i /><span className={step >= 2 ? "active" : ""}>2</span><i /><span>3</span></div>{step === 1 ? <><p className="kicker">STAP 1 VAN 3</p><h2>Vertel ons wie je bent</h2><p className="muted">Je moet op de toernooidatum minimaal 18 jaar zijn.</p><label>Naam<input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Voor- en achternaam" /></label><label>E-mailadres<input required type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="naam@voorbeeld.nl" /></label><label>Telefoonnummer<input required type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="06 12345678" /></label><label>Geboortedatum<input required type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} /></label><button type="button" className="primary continue" disabled={!personalComplete} onClick={() => setStep(2)}>Verder →</button></> : <><p className="kicker">STAP 2 VAN 3</p><h2>Spelersprofiel</h2><p className="muted">Vul je bondsnummer in, of zowel je enkel- als dubbelsterkte.</p><label>KNLTB bondsnummer<input value={form.knltb_number} onChange={e => update("knltb_number", e.target.value)} placeholder="Bijv. 1234567" /></label><div className="rating-fields"><label>Speelsterkte enkel<input value={form.singles_rating} onChange={e => update("singles_rating", e.target.value)} placeholder="Bijv. 5" /></label><label>Speelsterkte dubbel<input value={form.doubles_rating} onChange={e => update("doubles_rating", e.target.value)} placeholder="Bijv. 6" /></label></div><small className="hint">Een bondsnummer óf beide speelsterktes is verplicht.</small><label>Opkomstnummer<input required value={form.entrance_song_query} onChange={e => update("entrance_song_query", e.target.value)} placeholder="Artiest – titel" /></label><small className="hint">We zoeken na inschrijving automatisch naar de bijpassende Spotify-track.</small><label className="consent"><input type="checkbox" checked={form.accept_privacy} onChange={e => update("accept_privacy", e.target.checked)} /> Ik ga akkoord met de privacyverklaring.</label><label className="consent"><input type="checkbox" checked={form.accept_terms} onChange={e => update("accept_terms", e.target.checked)} /> Ik ga akkoord met de toernooivoorwaarden.</label><input className="honeypot" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => update("website", e.target.value)} /><div className="payment-summary"><span>Inschrijving Matchpoint Tournament</span><strong>{price}</strong></div>{error && <p className="form-error">{error}</p>}<button type="submit" className="primary continue" disabled={!readyToPay || busy}>{busy ? "Betaling voorbereiden…" : "Veilig betalen met iDEAL →"}</button><button type="button" className="back" onClick={() => setStep(1)}>← Terug</button></>}</form></main></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [tournament, setTournament] = useState<TournamentConfig | null>(null);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [playerRows, setPlayerRows] = useState<Player[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorTiers, setSponsorTiers] = useState<SponsorTier[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  async function loadPlayers() {
    if (!user) return;
    setPlayersLoading(true);
    const response = await fetch(`${API_URL}/api/admin/players`, { credentials: "include" });
    if (response.ok) setPlayerRows((await response.json()).players);
    setPlayersLoading(false);
  }
  async function loadSponsors() {
    if (!user || user.role !== "administrator") return;
    const response = await fetch(`${API_URL}/api/admin/sponsors`, { credentials: "include" });
    if (response.ok) { const result = await response.json(); setSponsors(result.sponsors); setSponsorTiers(result.tiers); }
  }
  async function reloadCrm() { await Promise.all([loadPlayers(), loadSponsors()]); }
  useEffect(() => {
    fetch(`${API_URL}/api/public/tournament`).then(response => response.json()).then(data => setTournament(data.tournament)).catch(() => undefined);
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" }).then(async response => { if (response.ok) setUser((await response.json()).user); }).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => { if (user) { void loadPlayers(); void loadSponsors(); } }, [user]);
  async function logout() {
    if (user) await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": user.csrf_token } });
    setUser(null);
    setPlayerRows([]);
    setSponsors([]);
    setSponsorTiers([]);
  }
  if (view === "registration") return <Registration tournament={tournament} close={() => setView("overview")} />;
  if (authLoading) return <div className="login-page"><div className="login-card">Beveiligde omgeving laden…</div></div>;
  if (!user) return <Login onLogin={setUser} openRegistration={() => setView("registration")} />;
  const content: Record<Exclude<View, "registration">, ReactNode> = {
    overview: <Overview setView={setView} players={playerRows} />,
    players: <Players user={user} rows={playerRows} sponsors={sponsors} loading={playersLoading} reload={reloadCrm} />,
    matches: <Matches />,
    schedule: <Schedule />,
    sponsors: <Sponsors user={user} sponsors={sponsors} tiers={sponsorTiers} players={playerRows} reloadSponsors={loadSponsors} reloadPlayers={loadPlayers} />,
    presentation: <Presentation />,
  };
  return <div className="app-shell"><Sidebar view={view} setView={setView} user={user} logout={logout} /><main className="main"><Topbar view={view} setView={setView} user={user} /><div className="content">{content[view]}</div></main></div>;
}
