import { PaymentConfirmation } from "../../components/PaymentConfirmation/PaymentConfirmation";

export default async function BevestigingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <PaymentConfirmation token={token} />;
}
