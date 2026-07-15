import { Brand } from "../Brand/Brand";
import { routeHref, viewRoutes } from "../shared/routing";
import type { Navigate, StaffUser, View } from "../shared/types";

const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overzicht", icon: "⌂" },
  { id: "players", label: "Deelnemers", icon: "◎" },
  { id: "matches", label: "Wedstrijden", icon: "◇" },
  { id: "schedule", label: "Planning", icon: "▦" },
  { id: "sponsors", label: "Sponsors", icon: "✦" },
  { id: "presentation", label: "Presentatie", icon: "▣" },
  { id: "settings", label: "Instellingen", icon: "⚙" },
];

export function Sidebar({ view, user, navigate, logout }: { view: View; user: StaffUser; navigate: Navigate; logout: () => void }) {
  return <aside className="sidebar">
    <Brand />
    <p className="nav-kicker">TOERNOOI BEHEER</p>
    <nav>{nav.filter(item => user.role === "administrator" || !["sponsors", "presentation", "settings"].includes(item.id)).map(item => <a key={item.id} href={routeHref(viewRoutes[item.id])} className={view === item.id ? "active" : ""} onClick={event => navigate(item.id, event)}><span>{item.icon}</span>{item.label}</a>)}</nav>
    <div className="sidebar-spacer" />
    <a className="public-link" href={routeHref("/")} onClick={event => navigate("registration", event)}><span>↗</span> Inschrijfpagina</a>
    <div className="profile"><div className="avatar">{user.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</div><div><strong>{user.name}</strong><small>{user.role === "administrator" ? "Administrator" : "Host"}</small></div><button onClick={logout} title="Uitloggen">↪</button></div>
  </aside>;
}

export function Topbar({ view, user, navigate, tournament }: { view: View; user: StaffUser; navigate: Navigate; tournament: { name: string; starts_at: string } | null }) {
  const labels: Record<View, string> = { overview: `Goedemorgen, ${user.name.split(" ")[0]}`, players: "Deelnemers", matches: "Wedstrijden", schedule: "Court planning", sponsors: "Sponsors", presentation: "Presentatiemodus", settings: "Toernooi-instellingen", registration: "Inschrijving" };
  const date = tournament ? new Date(tournament.starts_at.replace(" ", "T")).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "26 juni 2027";
  return <header className="topbar"><div><p>{tournament?.name ?? "Matchpoint Tournament"} · {date}</p><h1>{labels[view]}</h1></div><div className="top-actions"><a className="primary small" href={routeHref("/inschrijven")} onClick={event => navigate("registration", event)}>＋ Nieuwe inschrijving</a></div></header>;
}
