import type { MouseEvent } from "react";

export type View = "overview" | "players" | "matches" | "schedule" | "sponsors" | "presentation" | "registration";

export type Navigate = (view: View, event?: MouseEvent<HTMLAnchorElement>) => void;

export type TournamentConfig = {
  name: string;
  starts_at: string;
  venue: { name: string; address: string };
  capacity: number;
  registration_price: { formatted: string };
  confirmed_players: number;
  registration_available: boolean;
};

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: "administrator" | "host";
  csrf_token: string;
};

export type Player = {
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

export type PlayerDetail = Player & { date_of_birth: string };

export type Sponsor = {
  id: number;
  name: string;
  website_url: string | null;
  logo_path: string | null;
  is_active: number;
  show_on_public_pages: number;
  tier_id: number;
  tier_name: string;
  player_count: number;
};

export type SponsorTier = { id: number; name: string };
