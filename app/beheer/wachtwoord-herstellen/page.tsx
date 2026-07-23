import { PasswordReset } from "../../components/PasswordReset/PasswordReset";

export default async function WachtwoordHerstellenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <PasswordReset token={token} />;
}
