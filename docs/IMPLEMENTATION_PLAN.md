# Matchpoint Tournament — implementation plan

## Product decisions used for the first build

- **Payments:** Mollie hosted checkout, starting with iDEAL, with a configurable fee (initially €12.50). A 15-minute checkout reservation protects the configurable 32/64/128/256 capacity. Only the verified Mollie webhook confirms a player.
- **Editions and draw:** multiple tournament editions are supported; one is active. The initial 256-position draw is fully manual, supports explicit byes, and assigns permanent public player numbers from bracket positions.
- **Identity:** staff use Administrator and Host accounts with 12-hour secure sessions. Players receive single-use, 30-minute secure e-mail links instead of passwords.
- **Live display:** a public read-only JSON feed refreshes every few seconds. It works on ordinary PHP hosting. Server-Sent Events or WebSockets can be added later if the selected TransIP package permits long-running processes.
- **Spotify:** registration stores mandatory free text for artist/title; a Spotify match can be suggested later without making registration dependent on Spotify.
- **Scheduling:** two named courts start with three-minute complete slots; quarter-finals onward default to five minutes. A simultaneous five-minute break is suggested every 30 minutes. Matches, breaks and custom items remain draggable and overridable.
- **Presentation:** slides default to 10 seconds and can include full-screen JPG, PNG or WebP images with `object-fit: contain`. Sponsors have configurable Hoofdsponsor/Subsponsor tiers and explicit presentation inclusion.
- **Privacy:** players must be 18 on the tournament date and accept versioned privacy and tournament terms. Operational personal data is anonymized 90 days after the event; public historical results keep player numbers.

## Architecture

1. **Web interface** — responsive React interface using Shadcn-style components and Matchpoint branding.
2. **Application API** — PHP 8.3 endpoints, compatible with Apache/PHP hosting at TransIP.
3. **Database** — MySQL 8 with explicit entities for staff, players, payments, draw progression, courts, breaks, sponsors, slides, and audit history.
4. **Payments** — Mollie Payments API plus an idempotent webhook. API keys are environment variables and never stored in source control.
5. **Live presentation** — public read-only feed of active slides and upcoming matches; admin mutations remain protected.

## Milestones

### 1. Foundation and paid registration

- Docker environment, schema/migrations, configuration and deployment notes.
- Public form, server validation, capacity check, Mollie checkout and confirmation page.
- Webhook reconciliation, duplicate-payment protection and registration e-mail.
- Staff login, password reset, CSRF protection, rate limiting and role middleware.

### 2. CRM operations

- Player search, filters, edit, refund/cancel/waitlist, CSV export and check-in.
- Sponsor CRUD with image upload.
- Court CRUD and tournament-wide settings.
- Audit log for sensitive staff actions.

### 3. Draw, matches and schedule

- Manual 256-slot draw editor with duplicate-player prevention.
- Bracket generation, byes, validation and locked/published states.
- One-tap winner entry with confirmation/undo and automatic advancement.
- Fast host view optimized for phones and poor venue Wi-Fi.
- Timeline scheduler, round defaults, per-match overrides, cadence breaks and conflict detection.

### 4. Presentation mode

- Slide editor for sponsor, custom and dynamic match slides.
- Per-slide duration, ordering, preview and public full-screen route.
- Resilient auto-refresh, offline fallback and a visible "last updated" status.

### 5. Production readiness

- Automated tests for registration/payment, authorization and bracket advancement.
- Database backups, privacy retention policy, security review and event-day runbook.
- Staging payment test, production Mollie key, domain/HTTPS and TransIP deployment.

## Production inputs still required

1. Legal entity and Mollie account/API keys, including the final VAT/refund wording.
2. Final privacy statement and tournament terms (the database already versions acceptance).
3. Brevo API key and verified sender/domain configuration.
4. TransIP database credentials and a staging deployment under `/tournament` for acceptance testing.
