"use client";

import { Brand } from "../Brand/Brand";
import { usePaymentConfirmation } from "./PaymentConfirmation.hooks";

export function PaymentConfirmation({ token }: { token: string }) {
  const { payment, error } = usePaymentConfirmation(token);
  const paid = payment?.status === "paid";
  const failed = payment && ["failed", "canceled", "expired"].includes(payment.status);
  return (
    <div className="payment-confirmation-page">
      <Brand />
      <section className="registration-card payment-confirmation-card">
        {error ? (
          <>
            <p className="kicker">BETALING</p>
            <h1>Status niet beschikbaar</h1>
            <p className="form-error">{error}</p>
          </>
        ) : !payment ? (
          <>
            <p className="kicker">BETALING CONTROLEREN</p>
            <h1>Even geduld…</h1>
            <p className="muted">We controleren de betaalstatus bij Mollie.</p>
          </>
        ) : paid ? (
          <>
            <span className="confirmation-icon">✓</span>
            <p className="kicker">INSCHRIJVING BEVESTIGD</p>
            <h1>Je bent erbij, {payment.player_name}!</h1>
            <p className="muted">
              Je betaling van {payment.amount} is ontvangen. We hebben een bevestiging gestuurd naar je e-mailadres.
            </p>
          </>
        ) : failed ? (
          <>
            <p className="kicker">BETALING NIET VOLTOOID</p>
            <h1>De betaling is niet gelukt</h1>
            <p className="muted">
              Je inschrijving is nog niet bevestigd. Start de inschrijving opnieuw om nogmaals te proberen.
            </p>
            <a className="primary confirmation-link" href="../">
              Terug naar inschrijven
            </a>
          </>
        ) : (
          <>
            <p className="kicker">BETALING WORDT VERWERKT</p>
            <h1>We wachten op Mollie</h1>
            <p className="muted">Deze pagina vernieuwt de status automatisch. Je hoeft niets te doen.</p>
          </>
        )}
      </section>
    </div>
  );
}
