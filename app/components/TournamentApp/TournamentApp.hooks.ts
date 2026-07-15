"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../shared/config";
import { routeHref, viewFromPath, viewRoutes } from "../shared/routing";
import type { Navigate, Player, Sponsor, SponsorTier, StaffUser, TournamentConfig, View } from "../shared/types";

export function useTournamentApp(initialView: View) {
  const [view, setView] = useState<View>(initialView);
  const [tournament, setTournament] = useState<TournamentConfig | null>(null);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [playerRows, setPlayerRows] = useState<Player[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorTiers, setSponsorTiers] = useState<SponsorTier[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  const navigate: Navigate = (nextView, event) => {
    if (event && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    const href = routeHref(viewRoutes[nextView]);
    if (window.location.pathname !== href) window.history.pushState({}, "", href);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

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
    if (response.ok) {
      const result = await response.json();
      setSponsors(result.sponsors);
      setSponsorTiers(result.tiers);
    }
  }

  async function reloadCrm() { await Promise.all([loadPlayers(), loadSponsors()]); }

  useEffect(() => {
    fetch(`${API_URL}/api/public/tournament`).then(response => response.json()).then(data => setTournament(data.tournament)).catch(() => undefined);
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" }).then(async response => { if (response.ok) setUser((await response.json()).user); }).finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => { if (user) { void loadPlayers(); void loadSponsors(); } }, [user]);

  async function logout() {
    if (user) await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": user.csrf_token } });
    setUser(null);
    setPlayerRows([]);
    setSponsors([]);
    setSponsorTiers([]);
  }

  return { view, tournament, user, setUser, authLoading, playerRows, sponsors, sponsorTiers, playersLoading, navigate, loadPlayers, loadSponsors, reloadCrm, logout };
}
