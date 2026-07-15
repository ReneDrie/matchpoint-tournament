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
- `/beheer/wedstrijden`
- `/beheer/planning`
- `/beheer/sponsors`
- `/beheer/presentatie`

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
- `GET /api/admin/players` (staff)

For local development only, the seeded administrator used for API testing is `info@matchpointtournament.nl` with password `LocalAdmin2027!`. Never reuse this password in production. Create or replace an administrator with:

```bash
docker compose exec api php bin/create-admin.php email@example.nl "Naam" "een-sterk-wachtwoord"
```

Existing prototype databases can be upgraded by applying the SQL files in `backend/database/migrations` in numeric order. New databases are initialized directly from `backend/database/schema.sql`.

See `docs/IMPLEMENTATION_PLAN.md` for the architecture, decisions and phased roadmap.

## Production direction

The backend targets PHP 8.2+ and MySQL 8. For TransIP, build the frontend with `/tournament` as its base path, publish the static assets in that subfolder, route `/tournament/api` to `backend/public`, run Composer with production flags, provide environment variables outside the public directory, import `backend/database/schema.sql`, and require HTTPS.
