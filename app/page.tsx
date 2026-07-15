import { TournamentApp } from "./components/TournamentApp/TournamentApp";

export { TournamentApp };

export default function Home() {
  return <TournamentApp initialView="registration" />;
}
