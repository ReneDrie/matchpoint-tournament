# Matchpoint Tournament

A tournament CRM for paid player registration, staff operations, a 256-player knockout draw, court scheduling, sponsors and a public live presentation.

## Local preview

The interface runs at `http://localhost:3000`:

```bash
npm install
npm run dev
```

Use the navigation to preview the dashboard, player CRM, one-tap score entry, scheduling, sponsors and presentation mode. Use **Inschrijfpagina** at the bottom of the navigation to open the public registration flow. The form reads the active edition and price from the PHP API.

The application uses normal, directly addressable routes:

- `/` and `/inschrijven` — public registration
- `/beheer` — staff overview
- `/beheer/deelnemers`
- `/beheer/loting` — manual draw editor for Administrators
- `/beheer/wedstrijden`
- `/beheer/planning`
- `/beheer/sponsors`
- `/beheer/presentatie`
- `/presentatie` — openbare fullscreen livepresentatie
- `/beheer/instellingen` — Administrator settings and court management

For the TransIP build, set `NEXT_PUBLIC_BASE_PATH=/tournament`; the same routes are then published below `/tournament`.

React-componenten staan per domein in `app/components/<ComponentName>/`. Componentgebonden state en API-acties staan in een naastgelegen `<ComponentName>.hooks.ts`-bestand; gedeelde types, configuratie en routinghelpers staan in `app/components/shared/`.

## PHP/MySQL API

Create `.env` from `.env.example`, add a Mollie test API key, then run:

```bash
docker compose up --build
```

The API is available at `http://localhost:8080/api/health` and MySQL at port `3306`. The Docker build installs the official Mollie PHP client and initializes the schema automatically on a new database volume.

The implemented foundation endpoints are:

- `GET /api/health`
- `GET /api/public/tournament`
- `GET /api/public/live`
- `POST /api/registrations`
- `POST /api/payments/mollie-webhook`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/invitations` (Administrator)
- `POST /api/auth/invitations/accept`
- `GET /api/admin/tournaments` (staff)
- `GET/PATCH /api/admin/tournaments/{id}` (Administrator)
- `GET/POST /api/admin/tournaments/{id}/courts` (Administrator)
- `PATCH/DELETE /api/admin/courts/{id}` (Administrator)
- `GET /api/admin/players` (staff)
- `GET/PUT /api/admin/tournaments/{id}/draw` (Administrator)
- `POST /api/admin/tournaments/{id}/draw/publish` (Administrator)
- `GET /api/admin/matches?tournament_id={id}` (Administrator, Host)
- `POST /api/admin/matches/{id}/winner` (Administrator, Host)
- `GET /api/admin/tournaments/{id}/schedule` (Administrator, Host)
- `POST /api/admin/tournaments/{id}/schedule/plan` (Administrator)
- `PATCH /api/admin/matches/{id}/schedule` (Administrator)
- `POST/PATCH/DELETE /api/admin/.../schedule/items` (Administrator)
- `POST /api/admin/tournaments/{id}/schedule/swap` (Administrator)
- `GET/POST /api/admin/tournaments/{id}/slides` (Administrator)
- `POST /api/admin/tournaments/{id}/slides/upload` (Administrator)
- `PATCH/DELETE /api/admin/slides/{id}` (Administrator)
- `POST /api/admin/tournaments/{id}/slides/reorder` (Administrator)

Presentatieafbeeldingen staan persistent in `backend/public/uploads/presentation`. Houd deze map op TransIP schrijfbaar en neem hem mee in back-ups.

For local development only, the seeded administrator used for API testing is `info@matchpointtournament.nl` with password `LocalAdmin2027!`. Never reuse this password in production. Create or replace an administrator with:

```bash
docker compose exec api php bin/create-admin.php email@example.nl "Naam" "een-sterk-wachtwoord"
```

Existing prototype databases can be upgraded by applying the SQL files in `backend/database/migrations` in numeric order. New databases are initialized directly from `backend/database/schema.sql`.

See `docs/IMPLEMENTATION_STATUS.md` for the current progress and next implementation step. `docs/IMPLEMENTATION_PLAN.md` contains the architecture, decisions and complete phased roadmap.

## Production direction

The backend targets PHP 8.2+ and MySQL 8. For TransIP, build the frontend with `/tournament` as its base path, publish the static assets in that subfolder, route `/tournament/api` to `backend/public`, run Composer with production flags, provide environment variables outside the public directory, import `backend/database/schema.sql`, and require HTTPS.
