"use client";

import { Brand } from "../Brand/Brand";
import { usePlayerSelfService } from "./PlayerSelfService.hooks";

export function PlayerSelfService({ token }: { token: string }) {
  const service = usePlayerSelfService(token);

  return (
    <div className="payment-confirmation-page player-self-service-page">
      <Brand />
      <section className="registration-card player-self-service-card">
        {!token ? (
          service.linkSent ? (
            <>
              <span className="confirmation-icon">✓</span>
              <p className="kicker">LINK AANGEVRAAGD</p>
              <h1>Controleer je inbox</h1>
              <p className="muted">
                Als dit e-mailadres bij een actieve inschrijving hoort, ontvang je een persoonlijke link. Deze is 30 minuten
                geldig.
              </p>
            </>
          ) : (
            <form onSubmit={service.requestLink}>
              <p className="kicker">MIJN INSCHRIJVING</p>
              <h1>Bekijk of wijzig je gegevens</h1>
              <p className="muted">Je ontvangt een eenmalige, persoonlijke link op het e-mailadres van je inschrijving.</p>
              <label>
                E-mailadres
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={service.email}
                  onChange={(event) => service.setEmail(event.target.value)}
                />
              </label>
              {service.error && <p className="form-error">{service.error}</p>}
              <button className="primary continue" disabled={service.busy}>
                {service.busy ? "Link aanvragen…" : "Stuur persoonlijke link →"}
              </button>
            </form>
          )
        ) : service.loading ? (
          <>
            <p className="kicker">LINK CONTROLEREN</p>
            <h1>Even geduld…</h1>
          </>
        ) : service.updated ? (
          <>
            <span className="confirmation-icon">✓</span>
            <p className="kicker">GEGEVENS OPGESLAGEN</p>
            <h1>Je inschrijving is bijgewerkt</h1>
            <p className="muted">Deze persoonlijke link is nu gebruikt. Vraag een nieuwe link aan als je later opnieuw iets wilt wijzigen.</p>
            <a className="primary confirmation-link" href="./mijn-inschrijving">
              Nieuwe link aanvragen
            </a>
          </>
        ) : service.error && !service.form.email ? (
          <>
            <p className="kicker">PERSOONLIJKE LINK</p>
            <h1>Deze link werkt niet meer</h1>
            <p className="form-error">{service.error}</p>
            <a className="primary confirmation-link" href="./mijn-inschrijving">
              Nieuwe link aanvragen
            </a>
          </>
        ) : (
          <form onSubmit={service.save}>
            <p className="kicker">{service.form.tournament_name.toUpperCase()}</p>
            <h1>Jouw inschrijving</h1>
            <p className="muted">Controleer je gegevens. Om veiligheidsredenen vervalt de link nadat je opslaat.</p>
            <div className="player-self-service-fields">
              <label>
                Naam
                <input required value={service.form.name} onChange={(event) => service.update("name", event.target.value)} />
              </label>
              <label>
                E-mailadres
                <input readOnly type="email" value={service.form.email} />
              </label>
              <label>
                Telefoonnummer
                <input required type="tel" value={service.form.phone} onChange={(event) => service.update("phone", event.target.value)} />
              </label>
              <label>
                Geboortedatum
                <input required type="date" value={service.form.date_of_birth} onChange={(event) => service.update("date_of_birth", event.target.value)} />
              </label>
              <label>
                KNLTB bondsnummer
                <input value={service.form.knltb_number} onChange={(event) => service.update("knltb_number", event.target.value)} />
              </label>
              <label>
                Speelsterkte enkel
                <input value={service.form.singles_rating} onChange={(event) => service.update("singles_rating", event.target.value)} />
              </label>
              <label>
                Speelsterkte dubbel
                <input value={service.form.doubles_rating} onChange={(event) => service.update("doubles_rating", event.target.value)} />
              </label>
              <label>
                Opkomstnummer
                <input required value={service.form.entrance_song_query} onChange={(event) => service.update("entrance_song_query", event.target.value)} />
              </label>
            </div>
            <small className="hint">Een bondsnummer óf beide speelsterktes is verplicht.</small>
            {service.error && <p className="form-error">{service.error}</p>}
            <button className="primary continue" disabled={service.busy}>
              {service.busy ? "Opslaan…" : "Gegevens veilig opslaan →"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
