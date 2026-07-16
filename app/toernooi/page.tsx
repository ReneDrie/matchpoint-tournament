import type { Metadata } from "next";
import { PublicTournament } from "../components/PublicTournament/PublicTournament";

export const metadata: Metadata = {
  title: "Toernooischema | Matchpoint Tournament",
  description: "Bekijk het programma, de loting en actuele uitslagen van Matchpoint Tournament.",
};

export default function TournamentPage() {
  return <PublicTournament />;
}
