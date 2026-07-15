"use client";

import type { ReactNode } from "react";
import { Draw } from "../Draw/Draw";
import { Login } from "../Login/Login";
import { Matches } from "../Matches/Matches";
import { Sidebar, Topbar } from "../Navigation/Navigation";
import { Overview } from "../Overview/Overview";
import { Players } from "../Players/Players";
import { Presentation } from "../Presentation/Presentation";
import { Registration } from "../Registration/Registration";
import { Schedule } from "../Schedule/Schedule";
import { Settings } from "../Settings/Settings";
import { Sponsors } from "../Sponsors/Sponsors";
import type { View } from "../shared/types";
import { useTournamentApp } from "./TournamentApp.hooks";

export function TournamentApp({ initialView }: { initialView: View }) {
  const app = useTournamentApp(initialView);
  if (app.view === "registration") return <Registration tournament={app.tournament} close={() => app.navigate("overview")} />;
  if (app.authLoading) return <div className="login-page"><div className="login-card">Beveiligde omgeving laden…</div></div>;
  if (!app.user) return <Login onLogin={app.setUser} openRegistration={() => app.navigate("registration")} />;

  const content: Record<Exclude<View, "registration">, ReactNode> = {
    overview: <Overview setView={app.navigate} players={app.playerRows} tournament={app.tournament} />,
    players: <Players user={app.user} rows={app.playerRows} sponsors={app.sponsors} loading={app.playersLoading} reload={app.reloadCrm} />,
    draw: app.user.role === "administrator" ? <Draw tournamentId={app.tournament?.id ?? 1} user={app.user} /> : <Matches />,
    matches: <Matches />,
    schedule: <Schedule />,
    sponsors: <Sponsors user={app.user} sponsors={app.sponsors} tiers={app.sponsorTiers} players={app.playerRows} reloadSponsors={app.loadSponsors} reloadPlayers={app.loadPlayers} />,
    presentation: <Presentation />,
    settings: app.user.role === "administrator" ? <Settings tournamentId={app.tournament?.id ?? 1} user={app.user} onTournamentSaved={app.loadPublicTournament} /> : <Overview setView={app.navigate} players={app.playerRows} tournament={app.tournament} />,
  };

  return <div className="app-shell"><Sidebar view={app.view} user={app.user} navigate={app.navigate} logout={app.logout} /><main className="main"><Topbar view={app.view} user={app.user} navigate={app.navigate} tournament={app.tournament} /><div className="content">{content[app.view]}</div></main></div>;
}
