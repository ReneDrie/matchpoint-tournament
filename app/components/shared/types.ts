import type { MouseEvent } from "react";

export type View =
  | "overview"
  | "players"
  | "draw"
  | "matches"
  | "schedule"
  | "sponsors"
  | "communications"
  | "presentation"
  | "settings"
  | "registration";

export type Navigate = (view: View, event?: MouseEvent<HTMLAnchorElement>) => void;

export type TournamentConfig = {
  id: number;
  name: string;
  status: "draft" | "registration" | "live" | "completed" | "archived";
  starts_at: string;
  registration_deadline_at: string;
  timezone: string;
  venue: { name: string; address: string };
  capacity: number;
  registration_price: { amount_cents: number; currency: string; formatted: string };
  schedule_defaults: {
    match_minutes: number;
    quarter_finals_onward_minutes: number;
    quarter_finals_start_round: number;
    break_every_minutes: number;
    break_duration_minutes: number;
  };
  presentation_defaults: { slide_seconds: number; upcoming_match_count: number };
  confirmed_players: number;
  sponsor_reserved_spots: number;
  public_spots_available: number;
  registration_available: boolean;
  registration_full: boolean;
  active_courts: number;
};

export type TournamentSettings = TournamentConfig & {
  venue_name: string;
  venue_address: string;
  registration_price_cents: number;
  default_match_minutes: number;
  final_round_match_minutes: number;
  final_round_starts_at: number;
  break_every_minutes: number;
  break_duration_minutes: number;
  default_slide_seconds: number;
  upcoming_match_count: number;
  daily_summary_email: string | null;
  daily_summary_time: string;
};

export type Court = {
  id: number;
  tournament_id: number;
  name: string;
  surface: string | null;
  is_active: number;
  sort_order: number;
};

export type DrawPlayer = {
  id: number;
  name: string;
  email: string;
  player_number: number | null;
  sponsor_name: string | null;
  registration_status?: string;
};

export type DrawSlot = {
  position: number;
  player_id: number | null;
  is_bye: boolean;
  player: DrawPlayer | null;
};

export type TournamentDraw = {
  id: number | null;
  status: "draft" | "published";
  bracket_size: number;
  published_at: string | null;
  updated_at: string | null;
};

export type DrawData = { draw: TournamentDraw; slots: DrawSlot[]; players: DrawPlayer[] };

export type TournamentMatch = {
  id: number;
  round_number: number;
  bracket_position: number;
  player_one_id: number | null;
  player_two_id: number | null;
  player_one_name: string | null;
  player_two_name: string | null;
  player_one_number: number | null;
  player_two_number: number | null;
  player_one_is_bye: boolean;
  player_two_is_bye: boolean;
  winner_id: number | null;
  winner_name: string | null;
  next_match_id: number | null;
  next_match_slot: "player_one" | "player_two" | null;
  court_id: number | null;
  court_name: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  status: "draft" | "scheduled" | "ready" | "complete";
  completed_at: string | null;
};

export type MatchesData = { matches: TournamentMatch[]; round_count: number };

export type ScheduleItem = {
  id: number;
  tournament_id: number;
  court_id: number | null;
  court_name: string | null;
  item_type: "break" | "ceremony" | "maintenance" | "custom";
  title: string;
  starts_at: string;
  duration_minutes: number;
  is_tournament_wide: boolean;
  is_automatic: boolean;
};

export type ScheduleData = {
  matches: TournamentMatch[];
  items: ScheduleItem[];
  courts: Court[];
  round_count: number;
  tournament: { starts_at: string; break_every_minutes: number; break_duration_minutes: number };
  conflicts: { type: "court" | "player"; message: string; court_id?: number; player_id?: number }[];
};

export type PresentationSlide = {
  id: number;
  tournament_id?: number;
  type: "custom" | "image" | "sponsor" | "upcoming_matches" | "round_announcement" | "featured_round";
  title: string | null;
  content_json: { subtitle?: string; body?: string; round_number?: number } | null;
  image_path: string | null;
  image_url: string | null;
  sponsor_id: number | null;
  sponsor_name: string | null;
  sponsor_logo_path: string | null;
  sponsor_logo_url?: string | null;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
};

export type LiveMatch = {
  id: number;
  round_number: number;
  bracket_position: number;
  scheduled_at: string | null;
  court: string | null;
  player_one: string | null;
  player_two: string | null;
};
export type LivePresentationData = {
  tournament: TournamentConfig;
  slides: PresentationSlide[];
  upcoming_matches: LiveMatch[];
  featured_round: { round_number: number; round_count: number; matches: LiveMatch[] } | null;
  refreshed_at: string;
};

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: "administrator" | "host";
  csrf_token: string;
};
export type StaffAccount = {
  id: number;
  name: string;
  email: string;
  role: "administrator" | "host";
  is_active: number;
  last_login_at: string | null;
  created_at: string;
};
export type StaffInvitation = {
  id: number;
  name: string;
  email: string;
  role: "administrator" | "host";
  expires_at: string;
  created_at: string;
};
export type EmailMessage = {
  id: number;
  message_type: string;
  recipient_email: string;
  subject: string;
  status: "queued" | "sent" | "delivered" | "bounced" | "failed";
  sent_at: string | null;
  created_at: string;
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

export type WaitlistEntry = {
  id: number;
  name: string;
  email: string;
  position: number;
  status: "waiting" | "invited" | "registered" | "expired" | "removed";
  invited_at: string | null;
  invitation_expires_at: string | null;
  created_at: string;
};

export type Sponsor = {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  logo_path: string | null;
  logo_url: string | null;
  is_active: number;
  show_on_public_pages: number;
  tier_id: number;
  tier_name: string;
  player_count: number;
  package_cost_cents: number;
  package_included_players: number;
  player_limit_override: number | null;
  effective_player_limit: number;
};

export type SponsorTier = {
  id: number;
  name: string;
  cost_cents: number;
  included_players: number;
  sponsor_count: number;
};
