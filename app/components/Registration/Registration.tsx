"use client";

import { Brand } from "../Brand/Brand";
import { SHOW_ADMIN_SHORTCUT } from "../shared/config";
import { routeHref } from "../shared/routing";
import { useEffect, useState } from "react";
import { API_URL } from "../shared/config";
import type { TournamentConfig } from "../shared/types";
import { useRegistrationForm } from "./Registration.hooks";
import { WaitlistForm } from "./WaitlistForm";

export function Registration({ close, tournament }: { close: () => void; tournament: TournamentConfig | null }) {
  const registration = useRegistrationForm();
  const { step, setStep, busy, error, form, update, personalComplete, readyToPay, submit } = registration;
  const price = tournament?.registration_price.formatted ?? "€ 12,50";
  const capacity = tournament?.capacity ?? 32;
  const roundCount = Math.log2(capacity);
  const startsAt = tournament ? new Date(tournament.starts_at.replace(" ", "T")) : new Date("2027-06-26T11:00:00");
  const eventDate = startsAt.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const day = startsAt.toLocaleDateString("nl-NL", { day: "2-digit" });
  const month = startsAt.toLocaleDateString("nl-NL", { month: "short" }).replace(".", "").toUpperCase();
  const year = startsAt.getFullYear();
  const showWaitlist = Boolean(tournament?.registration_full && !registration.invitationToken);
  const registrationClosed = Boolean(
    tournament && !tournament.registration_available && !tournament.registration_full && !registration.invitationToken,
  );
  const [tracks, setTracks] = useState<
    Array<{ id: string; title: string; artists: string; album: string; image_url: string | null; spotify_url: string }>
  >([]);
  const [spotifyState, setSpotifyState] = useState<"idle" | "loading" | "unavailable">("idle");

  useEffect(() => {
    const query = form.entrance_song_query.trim();
    if (query.length < 2 || form.entrance_song_url) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSpotifyState("loading");
      try {
        const response = await fetch(`${API_URL}/api/spotify/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setTracks(result.tracks ?? []);
        setSpotifyState("idle");
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setTracks([]);
        setSpotifyState("unavailable");
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.entrance_song_query, form.entrance_song_url]);

  return (
    <div className="registration-page">
      <header>
        <Brand />
        <div className="public-registration-links">
          <a href={routeHref("/toernooi")}>Toernooischema →</a>
          {SHOW_ADMIN_SHORTCUT && <button onClick={close}>Beheeromgeving →</button>}
        </div>
      </header>
      <main>
        <div className="registration-intro">
          <span className="eyebrow">
            {tournament?.name?.toUpperCase() ?? "MATCHPOINT TOURNAMENT"} · {day} {month} {year}
          </span>
          <h1>
            Jouw route naar
            <br />
            het <em>matchpoint.</em>
          </h1>
          <p>
            {capacity} spelers. {roundCount} rondes. Eén winnaar. Op {eventDate} spelen we bij{" "}
            {tournament?.venue.name ?? "TVA Arkel"}.
          </p>
          <div className="event-facts">
            <div>
              <b>{day}</b>
              <span>
                {month}
                <br />
                {year}
              </span>
            </div>
            <div>
              <b>{price}</b>
              <span>
                PER
                <br />
                SPELER
              </span>
            </div>
            <div>
              <b>{capacity}</b>
              <span>
                PLEKKEN
                <br />
                TOTAAL
              </span>
            </div>
          </div>
        </div>
        {showWaitlist ? (
          <WaitlistForm />
        ) : registrationClosed ? (
          <div className="registration-card waitlist-card">
            <p className="kicker">INSCHRIJVING GESLOTEN</p>
            <h2>Inschrijven is niet meer mogelijk</h2>
            <p className="muted">De inschrijfdeadline is verstreken. Neem bij vragen contact op met de organisatie.</p>
          </div>
        ) : registration.invitationLoading ? (
          <div className="registration-card waitlist-card">Uitnodiging controleren…</div>
        ) : !registration.invitationValid ? (
          <div className="registration-card waitlist-card">
            <p className="form-error">{error}</p>
          </div>
        ) : (
          <form className="registration-card" onSubmit={submit}>
            <div className="steps">
              <span className="active">1</span>
              <i />
              <span className={step >= 2 ? "active" : ""}>2</span>
              <i />
              <span>3</span>
            </div>
            {registration.invitationToken && (
              <p className="invitation-notice">
                Er is een plek voor je gereserveerd. Rond je inschrijving binnen 48 uur af.
              </p>
            )}
            {step === 1 ? (
              <>
                <p className="kicker">STAP 1 VAN 3</p>
                <h2>Vertel ons wie je bent</h2>
                <p className="muted">Je moet op de toernooidatum minimaal 18 jaar zijn.</p>
                <label>
                  Naam
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Voor- en achternaam"
                  />
                </label>
                <label>
                  E-mailadres
                  <input
                    required
                    readOnly={Boolean(registration.invitationToken)}
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                  />
                </label>
                <label>
                  Telefoonnummer
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="06 12345678"
                  />
                </label>
                <label>
                  Geboortedatum
                  <input
                    required
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary continue"
                  disabled={!personalComplete}
                  onClick={() => setStep(2)}
                >
                  Verder →
                </button>
              </>
            ) : (
              <>
                <p className="kicker">STAP 2 VAN 3</p>
                <h2>Spelersprofiel</h2>
                <section className="player-details-section" aria-labelledby="player-details-heading">
                  <div className="form-section-heading">
                    <h3 id="player-details-heading">Bondsnummer of speelsterkte</h3>
                    <p>Vul je bondsnummer in, of zowel je enkel- als dubbelsterkte.</p>
                  </div>
                  <div className="qualification-option">
                    <label>
                      KNLTB bondsnummer
                      <input
                        disabled={form.no_tennis_association_membership}
                        value={form.knltb_number}
                        onChange={(e) => update("knltb_number", e.target.value)}
                        placeholder="Bijv. 1234567"
                      />
                    </label>
                  </div>
                  <div className="qualification-option">
                    <div className="rating-fields">
                      <label>
                        Speelsterkte enkel
                        <input
                          disabled={form.no_tennis_association_membership}
                          value={form.singles_rating}
                          onChange={(e) => update("singles_rating", e.target.value)}
                          placeholder="Bijv. 5"
                        />
                      </label>
                      <label>
                        Speelsterkte dubbel
                        <input
                          disabled={form.no_tennis_association_membership}
                          value={form.doubles_rating}
                          onChange={(e) => update("doubles_rating", e.target.value)}
                          placeholder="Bijv. 6"
                        />
                      </label>
                    </div>
                  </div>
                  <label className="field-unavailable membership-exemption">
                    <input
                      type="checkbox"
                      checked={form.no_tennis_association_membership}
                      onChange={(e) => update("no_tennis_association_membership", e.target.checked)}
                    />
                    Ik ben geen lid van de tennisbond, maar wil toch graag meedoen
                  </label>
                </section>
                <section className="entrance-song-section" aria-labelledby="entrance-song-heading">
                  <div className="form-section-heading">
                    <h3 id="entrance-song-heading">Opkomstnummer</h3>
                    <p>Kies het nummer waarmee je tijdens het toernooi wilt opkomen.</p>
                  </div>
                  <label>
                    Artiest en titel
                    <input
                      required
                      value={form.entrance_song_query}
                      onChange={(e) => update("entrance_song_query", e.target.value)}
                      placeholder="Artiest – titel"
                    />
                  </label>
                  <small className="hint">Tijdens het typen zoeken we naar de bijpassende Spotify-track.</small>
                  {spotifyState === "loading" && <small className="hint">Spotify doorzoeken…</small>}
                  {spotifyState === "unavailable" && (
                    <small className="hint">Spotify zoeken is nu niet beschikbaar. Je vrije tekst blijft geldig.</small>
                  )}
                  {form.entrance_song_url && (
                    <div className="spotify-selection">
                      ✓ Spotify-track gekozen. Pas de tekst aan om opnieuw te zoeken.
                    </div>
                  )}
                  {!form.entrance_song_url && form.entrance_song_query.trim().length >= 2 && tracks.length > 0 && (
                    <div className="spotify-results" role="listbox" aria-label="Spotify zoekresultaten">
                      {tracks.map((track) => (
                        <button
                          type="button"
                          key={track.id}
                          onClick={() => {
                            update("entrance_song_query", `${track.artists} – ${track.title}`);
                            update("entrance_song_url", track.spotify_url);
                            setTracks([]);
                          }}
                        >
                          {track.image_url ? (
                            // Spotify artwork comes from a dynamic CDN URL returned by its API.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={track.image_url} alt="" />
                          ) : (
                            <span className="spotify-placeholder">♫</span>
                          )}
                          <span>
                            <strong>{track.title}</strong>
                            <small>
                              {track.artists} · {track.album}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={form.accept_privacy}
                    onChange={(e) => update("accept_privacy", e.target.checked)}
                  />{" "}
                  Ik ga akkoord met de privacyverklaring.
                </label>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={form.accept_terms}
                    onChange={(e) => update("accept_terms", e.target.checked)}
                  />{" "}
                  Ik ga akkoord met de toernooivoorwaarden.
                </label>
                <input
                  className="honeypot"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
                <div className="payment-summary">
                  <span>Inschrijving Matchpoint Tournament</span>
                  <strong>{price}</strong>
                </div>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="primary continue" disabled={!readyToPay || busy}>
                  {busy ? "Betaling voorbereiden…" : "Veilig betalen met iDEAL →"}
                </button>
                <button type="button" className="back" onClick={() => setStep(1)}>
                  ← Terug
                </button>
              </>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
