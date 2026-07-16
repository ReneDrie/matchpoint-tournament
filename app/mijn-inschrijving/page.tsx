import { PlayerSelfService } from "../components/PlayerSelfService/PlayerSelfService";

export default async function MijnInschrijvingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <PlayerSelfService token={token} />;
}
