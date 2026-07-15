<?php

declare(strict_types=1);

use Matchpoint\Audit;
use Matchpoint\Auth;
use Matchpoint\Database;
use Matchpoint\Http;
use Matchpoint\RateLimiter;
use Mollie\Api\MollieApiClient;

require dirname(__DIR__) . '/vendor/autoload.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . (getenv('FRONTEND_URL') ?: 'http://localhost:3000'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$basePath = rtrim(getenv('APP_BASE_PATH') ?: '', '/');
if ($basePath !== '' && str_starts_with($path, $basePath)) $path = substr($path, strlen($basePath)) ?: '/';

function publicTournament(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'slug' => $row['slug'],
        'status' => $row['status'],
        'starts_at' => $row['starts_at'],
        'registration_deadline_at' => $row['registration_deadline_at'],
        'timezone' => $row['timezone'],
        'venue' => ['name' => $row['venue_name'], 'address' => $row['venue_address']],
        'capacity' => (int)$row['capacity'],
        'registration_price' => [
            'amount_cents' => (int)$row['registration_price_cents'],
            'currency' => $row['currency'],
            'formatted' => '€ ' . number_format(((int)$row['registration_price_cents']) / 100, 2, ',', '.'),
        ],
        'schedule_defaults' => [
            'match_minutes' => (int)$row['default_match_minutes'],
            'quarter_finals_onward_minutes' => (int)$row['final_round_match_minutes'],
            'quarter_finals_start_round' => (int)$row['final_round_starts_at'],
            'break_every_minutes' => (int)$row['break_every_minutes'],
            'break_duration_minutes' => (int)$row['break_duration_minutes'],
        ],
        'presentation_defaults' => [
            'slide_seconds' => (int)$row['default_slide_seconds'],
            'upcoming_match_count' => (int)$row['upcoming_match_count'],
        ],
    ];
}

function adminTournament(array $row): array
{
    return array_merge(publicTournament($row), [
        'venue_name' => $row['venue_name'],
        'venue_address' => $row['venue_address'],
        'registration_price_cents' => (int)$row['registration_price_cents'],
        'default_match_minutes' => (int)$row['default_match_minutes'],
        'final_round_match_minutes' => (int)$row['final_round_match_minutes'],
        'final_round_starts_at' => (int)$row['final_round_starts_at'],
        'break_every_minutes' => (int)$row['break_every_minutes'],
        'break_duration_minutes' => (int)$row['break_duration_minutes'],
        'default_slide_seconds' => (int)$row['default_slide_seconds'],
        'upcoming_match_count' => (int)$row['upcoming_match_count'],
        'daily_summary_email' => $row['daily_summary_email'],
        'daily_summary_time' => substr((string)$row['daily_summary_time'], 0, 5),
    ]);
}

function drawPayload(PDO $db, int $tournamentId): array
{
    $tournament = $db->prepare('SELECT id, capacity FROM tournaments WHERE id = ? LIMIT 1');
    $tournament->execute([$tournamentId]);
    $edition = $tournament->fetch();
    if (!$edition) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
    $capacity = (int)$edition['capacity'];
    $drawStatement = $db->prepare('SELECT id, status, bracket_size, published_at, updated_at FROM draws WHERE tournament_id = ? LIMIT 1');
    $drawStatement->execute([$tournamentId]);
    $draw = $drawStatement->fetch();
    $assigned = [];
    if ($draw) {
        $slotStatement = $db->prepare(
            'SELECT ds.position, ds.player_id, ds.is_bye, p.name AS player_name, p.email AS player_email, p.registration_status, s.name AS sponsor_name
             FROM draw_slots ds LEFT JOIN players p ON p.id = ds.player_id LEFT JOIN sponsors s ON s.id = p.sponsor_id
             WHERE ds.draw_id = ? ORDER BY ds.position'
        );
        $slotStatement->execute([(int)$draw['id']]);
        foreach ($slotStatement->fetchAll() as $slot) $assigned[(int)$slot['position']] = $slot;
    }
    $slots = [];
    for ($position = 1; $position <= $capacity; $position++) {
        $slot = $assigned[$position] ?? null;
        $slots[] = [
            'position' => $position,
            'player_id' => $slot && $slot['player_id'] !== null ? (int)$slot['player_id'] : null,
            'is_bye' => $slot ? (bool)$slot['is_bye'] : false,
            'player' => $slot && $slot['player_id'] !== null ? [
                'id' => (int)$slot['player_id'],
                'name' => $slot['player_name'],
                'email' => $slot['player_email'],
                'sponsor_name' => $slot['sponsor_name'],
                'registration_status' => $slot['registration_status'],
            ] : null,
        ];
    }
    $players = $db->prepare(
        "SELECT p.id, p.name, p.email, p.player_number, s.name AS sponsor_name
         FROM players p LEFT JOIN sponsors s ON s.id = p.sponsor_id
         WHERE p.tournament_id = ? AND p.registration_status = 'confirmed' ORDER BY p.name"
    );
    $players->execute([$tournamentId]);
    return [
        'draw' => [
            'id' => $draw ? (int)$draw['id'] : null,
            'status' => $draw['status'] ?? 'draft',
            'bracket_size' => $draw ? (int)$draw['bracket_size'] : $capacity,
            'published_at' => $draw['published_at'] ?? null,
            'updated_at' => $draw['updated_at'] ?? null,
        ],
        'slots' => $slots,
        'players' => $players->fetchAll(),
    ];
}

function matchesPayload(PDO $db, int $tournamentId): array
{
    $statement = $db->prepare(
        'SELECT m.id, m.round_number, m.bracket_position, m.player_one_id, m.player_two_id,
                m.player_one_is_bye, m.player_two_is_bye, m.winner_id, m.next_match_id, m.next_match_slot,
                m.court_id, m.scheduled_at, m.duration_minutes, m.status, m.completed_at,
                p1.name AS player_one_name, p1.player_number AS player_one_number,
                p2.name AS player_two_name, p2.player_number AS player_two_number,
                w.name AS winner_name, c.name AS court_name
         FROM matches m
         LEFT JOIN players p1 ON p1.id = m.player_one_id
         LEFT JOIN players p2 ON p2.id = m.player_two_id
         LEFT JOIN players w ON w.id = m.winner_id
         LEFT JOIN courts c ON c.id = m.court_id
         WHERE m.tournament_id = ? ORDER BY m.round_number, m.bracket_position'
    );
    $statement->execute([$tournamentId]);
    $matches = array_map(static function (array $match): array {
        foreach (['id', 'round_number', 'bracket_position', 'duration_minutes'] as $field) $match[$field] = (int)$match[$field];
        foreach (['player_one_id', 'player_two_id', 'winner_id', 'next_match_id', 'court_id', 'player_one_number', 'player_two_number'] as $field) {
            $match[$field] = $match[$field] !== null ? (int)$match[$field] : null;
        }
        $match['player_one_is_bye'] = (bool)$match['player_one_is_bye'];
        $match['player_two_is_bye'] = (bool)$match['player_two_is_bye'];
        return $match;
    }, $statement->fetchAll());
    return ['matches' => $matches, 'round_count' => $matches ? max(array_column($matches, 'round_number')) : 0];
}

function clearDownstreamResult(PDO $db, array $match, int $userId): void
{
    if ($match['next_match_id'] === null || $match['next_match_slot'] === null) return;
    $nextStatement = $db->prepare('SELECT * FROM matches WHERE id = ? FOR UPDATE');
    $nextStatement->execute([(int)$match['next_match_id']]);
    $next = $nextStatement->fetch();
    if (!$next) return;
    if ($next['winner_id'] !== null) clearDownstreamResult($db, $next, $userId);
    $slot = $match['next_match_slot'] === 'player_two' ? 'player_two_id' : 'player_one_id';
    $db->prepare("UPDATE matches SET {$slot} = NULL, winner_id = NULL, completed_at = NULL,
        status = IF(scheduled_at IS NULL, 'draft', 'scheduled'), updated_by = ? WHERE id = ?")->execute([$userId, (int)$next['id']]);
}

function schedulePayload(PDO $db, int $tournamentId): array
{
    $tournament = $db->prepare('SELECT starts_at, break_every_minutes, break_duration_minutes FROM tournaments WHERE id = ? LIMIT 1');
    $tournament->execute([$tournamentId]);
    $settings = $tournament->fetch();
    if (!$settings) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
    $courts = $db->prepare('SELECT id, tournament_id, name, surface, is_active, sort_order FROM courts WHERE tournament_id = ? ORDER BY sort_order, name');
    $courts->execute([$tournamentId]);
    $items = $db->prepare(
        'SELECT si.id, si.tournament_id, si.court_id, c.name AS court_name, si.item_type, si.title, si.starts_at,
                si.duration_minutes, si.is_tournament_wide, si.is_automatic
         FROM schedule_items si LEFT JOIN courts c ON c.id = si.court_id
         WHERE si.tournament_id = ? ORDER BY si.starts_at, si.sort_order, si.id'
    );
    $items->execute([$tournamentId]);
    $payload = matchesPayload($db, $tournamentId);
    $scheduleItems = array_map(static function (array $item): array {
        $item['id'] = (int)$item['id'];
        $item['tournament_id'] = (int)$item['tournament_id'];
        $item['court_id'] = $item['court_id'] !== null ? (int)$item['court_id'] : null;
        $item['duration_minutes'] = (int)$item['duration_minutes'];
        $item['is_tournament_wide'] = (bool)$item['is_tournament_wide'];
        $item['is_automatic'] = (bool)$item['is_automatic'];
        return $item;
    }, $items->fetchAll());
    $payload['items'] = $scheduleItems;
    $payload['courts'] = array_map(static function (array $court): array {
        foreach (['id', 'tournament_id', 'sort_order'] as $field) $court[$field] = (int)$court[$field];
        $court['is_active'] = (int)$court['is_active'];
        return $court;
    }, $courts->fetchAll());
    $payload['tournament'] = [
        'starts_at' => $settings['starts_at'],
        'break_every_minutes' => (int)$settings['break_every_minutes'],
        'break_duration_minutes' => (int)$settings['break_duration_minutes'],
    ];
    $conflicts = [];
    $courtEntries = [];
    foreach ($payload['matches'] as $match) {
        if ($match['court_id'] === null || $match['scheduled_at'] === null) continue;
        $courtEntries[$match['court_id']][] = ['start' => strtotime($match['scheduled_at']), 'end' => strtotime($match['scheduled_at']) + $match['duration_minutes'] * 60, 'label' => "Ronde {$match['round_number']} · W{$match['bracket_position']}"];
    }
    foreach ($scheduleItems as $item) {
        if ($item['court_id'] === null || $item['is_tournament_wide']) continue;
        $courtEntries[$item['court_id']][] = ['start' => strtotime($item['starts_at']), 'end' => strtotime($item['starts_at']) + $item['duration_minutes'] * 60, 'label' => $item['title']];
    }
    foreach ($courtEntries as $courtId => $entries) {
        usort($entries, static fn(array $a, array $b): int => $a['start'] <=> $b['start']);
        for ($index = 1; $index < count($entries); $index++) if ($entries[$index]['start'] < $entries[$index - 1]['end']) {
            $conflicts[] = ['type' => 'court', 'court_id' => $courtId, 'message' => "{$entries[$index - 1]['label']} overlapt met {$entries[$index]['label']}."];
        }
    }
    $playerEntries = [];
    foreach ($payload['matches'] as $match) {
        if ($match['scheduled_at'] === null) continue;
        foreach ([$match['player_one_id'], $match['player_two_id']] as $playerId) if ($playerId !== null) {
            $playerEntries[$playerId][] = ['start' => strtotime($match['scheduled_at']), 'end' => strtotime($match['scheduled_at']) + $match['duration_minutes'] * 60, 'label' => "R{$match['round_number']} · W{$match['bracket_position']}"];
        }
    }
    foreach ($playerEntries as $playerId => $entries) {
        usort($entries, static fn(array $a, array $b): int => $a['start'] <=> $b['start']);
        for ($index = 1; $index < count($entries); $index++) if ($entries[$index]['start'] < $entries[$index - 1]['end']) {
            $conflicts[] = ['type' => 'player', 'player_id' => $playerId, 'message' => "Een speler staat tegelijk gepland voor {$entries[$index - 1]['label']} en {$entries[$index]['label']}."];
        }
    }
    $payload['conflicts'] = $conflicts;
    return $payload;
}

function scheduleDateTime(mixed $value): string
{
    $normalized = str_replace('T', ' ', trim((string)$value));
    $date = DateTimeImmutable::createFromFormat('Y-m-d H:i', substr($normalized, 0, 16));
    if (!$date) Http::json(['error' => 'Kies een geldige datum en tijd.'], 422);
    return $date->format('Y-m-d H:i:s');
}

function publicAssetUrl(?string $path): ?string
{
    if (!$path) return null;
    if (preg_match('#^https?://#', $path)) return $path;
    return rtrim(getenv('APP_URL') ?: '', '/') . '/' . ltrim($path, '/');
}

function presentationSlidesPayload(PDO $db, int $tournamentId, bool $activeOnly = false): array
{
    $statement = $db->prepare(
        'SELECT ps.id, ps.tournament_id, ps.type, ps.title, ps.content_json, ps.image_path, ps.sponsor_id,
                ps.duration_seconds, ps.sort_order, ps.is_active, s.name AS sponsor_name, s.logo_path AS sponsor_logo_path
         FROM presentation_slides ps LEFT JOIN sponsors s ON s.id = ps.sponsor_id
         WHERE ps.tournament_id = ?' . ($activeOnly ? ' AND ps.is_active = 1' : '') . ' ORDER BY ps.sort_order, ps.id'
    );
    $statement->execute([$tournamentId]);
    return array_map(static function (array $slide): array {
        foreach (['id', 'tournament_id', 'duration_seconds', 'sort_order'] as $field) $slide[$field] = (int)$slide[$field];
        $slide['sponsor_id'] = $slide['sponsor_id'] !== null ? (int)$slide['sponsor_id'] : null;
        $slide['is_active'] = (bool)$slide['is_active'];
        $slide['content_json'] = $slide['content_json'] ? json_decode($slide['content_json'], true) : null;
        $slide['image_url'] = publicAssetUrl($slide['image_path']);
        $slide['sponsor_logo_url'] = publicAssetUrl($slide['sponsor_logo_path']);
        return $slide;
    }, $statement->fetchAll());
}

try {
    $db = Database::connect();

    if ($method === 'GET' && $path === '/api/health') {
        $db->query('SELECT 1');
        Http::json(['status' => 'ok', 'service' => 'matchpoint-api']);
    }

    if ($method === 'GET' && $path === '/api/public/tournament') {
        $tournament = $db->query("SELECT * FROM tournaments WHERE status IN ('registration','live') ORDER BY starts_at LIMIT 1")->fetch();
        if (!$tournament) Http::json(['error' => 'Er is momenteel geen actief toernooi.'], 404);
        $confirmed = $db->prepare("SELECT COUNT(*) FROM players WHERE tournament_id = ? AND registration_status = 'confirmed'");
        $confirmed->execute([(int)$tournament['id']]);
        $activeCourts = $db->prepare('SELECT COUNT(*) FROM courts WHERE tournament_id = ? AND is_active = 1');
        $activeCourts->execute([(int)$tournament['id']]);
        $payload = publicTournament($tournament);
        $payload['confirmed_players'] = (int)$confirmed->fetchColumn();
        $payload['active_courts'] = (int)$activeCourts->fetchColumn();
        $payload['registration_available'] = $tournament['status'] === 'registration'
            && $payload['confirmed_players'] < $payload['capacity']
            && new DateTimeImmutable($tournament['registration_deadline_at'], new DateTimeZone($tournament['timezone'])) > new DateTimeImmutable('now', new DateTimeZone($tournament['timezone']));
        Http::json(['tournament' => $payload]);
    }

    if ($method === 'POST' && $path === '/api/auth/login') {
        $data = Http::input();
        Http::json(['user' => Auth::login($db, (string)($data['email'] ?? ''), (string)($data['password'] ?? ''))]);
    }

    if ($method === 'GET' && $path === '/api/auth/me') {
        Http::json(['user' => Auth::current($db)]);
    }

    if ($method === 'POST' && $path === '/api/auth/logout') {
        $user = Auth::current($db);
        Auth::verifyCsrf($user);
        Audit::record($db, 'auth.logout', 'user', $user['id'], $user['id']);
        Auth::logout($db);
        Http::json(['logged_out' => true]);
    }

    if ($method === 'POST' && $path === '/api/auth/invitations') {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $data = Http::input();
        $name = trim((string)($data['name'] ?? ''));
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $role = (string)($data['role'] ?? 'host');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, ['administrator', 'host'], true)) {
            Http::json(['error' => 'Naam, geldig e-mailadres en geldige rol zijn verplicht.'], 422);
        }
        $token = bin2hex(random_bytes(32));
        $expiresAt = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s');
        $db->prepare(
            'INSERT INTO staff_invitations (invited_by, name, email, role, token_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$user['id'], $name, $email, $role, hash('sha256', $token), $expiresAt]);
        $invitationId = (int)$db->lastInsertId();
        Audit::record($db, 'staff.invited', 'staff_invitation', $invitationId, $user['id'], null, ['email' => $email, 'role' => $role]);
        $frontend = rtrim(getenv('FRONTEND_URL') ?: 'http://localhost:3000', '/');
        $response = ['invitation_id' => $invitationId, 'expires_at' => $expiresAt];
        if (getenv('APP_ENV') === 'local') $response['accept_url'] = "{$frontend}/tournament/beheer/uitnodiging?token={$token}";
        Http::json($response, 201);
    }

    if ($method === 'POST' && $path === '/api/auth/invitations/accept') {
        $data = Http::input();
        $token = (string)($data['token'] ?? '');
        $password = (string)($data['password'] ?? '');
        if (strlen($token) !== 64 || strlen($password) < 12) {
            Http::json(['error' => 'De uitnodiging is ongeldig of het wachtwoord is korter dan 12 tekens.'], 422);
        }
        RateLimiter::check($db, 'accept-invitation', Http::ip(), 10, 15);
        $statement = $db->prepare(
            'SELECT * FROM staff_invitations WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > NOW() LIMIT 1'
        );
        $statement->execute([hash('sha256', $token)]);
        $invitation = $statement->fetch();
        if (!$invitation) Http::json(['error' => 'Deze uitnodiging is ongeldig of verlopen.'], 410);
        $db->beginTransaction();
        $db->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
            ->execute([$invitation['name'], $invitation['email'], password_hash($password, PASSWORD_DEFAULT), $invitation['role']]);
        $userId = (int)$db->lastInsertId();
        $db->prepare('UPDATE staff_invitations SET accepted_at = NOW() WHERE id = ?')->execute([(int)$invitation['id']]);
        Audit::record($db, 'staff.invitation_accepted', 'user', $userId, $userId, null, ['role' => $invitation['role']]);
        $db->commit();
        Http::json(['accepted' => true], 201);
    }

    if ($method === 'GET' && $path === '/api/admin/tournaments') {
        Auth::requireRole($db, ['administrator']);
        $rows = $db->query('SELECT * FROM tournaments ORDER BY starts_at DESC')->fetchAll();
        Http::json(['tournaments' => array_map('adminTournament', $rows)]);
    }

    if ($method === 'GET' && preg_match('#^/api/admin/tournaments/(\d+)$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator']);
        $statement = $db->prepare('SELECT * FROM tournaments WHERE id = ? LIMIT 1');
        $statement->execute([(int)$matches[1]]);
        $tournament = $statement->fetch();
        if (!$tournament) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        Http::json(['tournament' => adminTournament($tournament)]);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/tournaments/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $name = trim((string)($data['name'] ?? ''));
        $venueName = trim((string)($data['venue_name'] ?? ''));
        $venueAddress = trim((string)($data['venue_address'] ?? ''));
        $status = (string)($data['status'] ?? 'draft');
        $timezone = (string)($data['timezone'] ?? 'Europe/Amsterdam');
        $capacity = (int)($data['capacity'] ?? 256);
        $price = (int)($data['registration_price_cents'] ?? 0);
        $summaryEmail = strtolower(trim((string)($data['daily_summary_email'] ?? '')));
        $summaryTime = (string)($data['daily_summary_time'] ?? '18:00');
        if ($name === '' || $venueName === '' || $venueAddress === '') Http::json(['error' => 'Naam, locatie en adres zijn verplicht.'], 422);
        if (!in_array($status, ['draft', 'registration', 'live', 'completed', 'archived'], true)) Http::json(['error' => 'Ongeldige toernooistatus.'], 422);
        if (!in_array($timezone, DateTimeZone::listIdentifiers(), true)) Http::json(['error' => 'Ongeldige tijdzone.'], 422);
        $zone = new DateTimeZone($timezone);
        $startsAt = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', (string)($data['starts_at'] ?? ''), $zone);
        $deadline = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', (string)($data['registration_deadline_at'] ?? ''), $zone);
        if (!in_array($capacity, [32, 64, 128, 256], true)) Http::json(['error' => 'Kies een deelnemerslimiet van 32, 64, 128 of 256.'], 422);
        if (!$startsAt || !$deadline) Http::json(['error' => 'Vul een geldige toernooi- en inschrijfdatum in.'], 422);
        if ($price < 0 || $price > 100000) Http::json(['error' => 'Het inschrijfbedrag is ongeldig.'], 422);
        if ($summaryEmail !== '' && !filter_var($summaryEmail, FILTER_VALIDATE_EMAIL)) Http::json(['error' => 'Vul een geldig e-mailadres voor de dagrapportage in.'], 422);
        if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $summaryTime)) Http::json(['error' => 'De tijd voor de dagrapportage is ongeldig.'], 422);
        $bounds = [
            'default_match_minutes' => [1, 60],
            'final_round_match_minutes' => [1, 60],
            'break_every_minutes' => [5, 240],
            'break_duration_minutes' => [1, 60],
            'default_slide_seconds' => [3, 300],
            'upcoming_match_count' => [1, 25],
        ];
        foreach ($bounds as $field => [$minimum, $maximum]) {
            $value = (int)($data[$field] ?? 0);
            if ($value < $minimum || $value > $maximum) Http::json(['error' => "De waarde voor {$field} is ongeldig."], 422);
        }
        $quarterFinalRound = max(1, (int)round(log($capacity, 2)) - 2);
        $statement = $db->prepare(
            'UPDATE tournaments SET name = ?, status = ?, starts_at = ?, registration_deadline_at = ?, timezone = ?,
                venue_name = ?, venue_address = ?, capacity = ?, registration_price_cents = ?, default_match_minutes = ?,
                final_round_match_minutes = ?, final_round_starts_at = ?, break_every_minutes = ?, break_duration_minutes = ?,
                default_slide_seconds = ?, upcoming_match_count = ?, daily_summary_email = ?, daily_summary_time = ? WHERE id = ?'
        );
        $statement->execute([
            $name, $status, $startsAt->format('Y-m-d H:i:s'), $deadline->format('Y-m-d H:i:s'), $timezone,
            $venueName, $venueAddress, $capacity, $price, (int)$data['default_match_minutes'],
            (int)$data['final_round_match_minutes'], $quarterFinalRound, (int)$data['break_every_minutes'],
            (int)$data['break_duration_minutes'], (int)$data['default_slide_seconds'], (int)$data['upcoming_match_count'],
            $summaryEmail ?: null, $summaryTime . ':00', $tournamentId,
        ]);
        if ($statement->rowCount() === 0) {
            $exists = $db->prepare('SELECT id FROM tournaments WHERE id = ?');
            $exists->execute([$tournamentId]);
            if (!$exists->fetch()) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        }
        Audit::record($db, 'tournament.settings_updated', 'tournament', $tournamentId, $user['id'], $tournamentId, ['status' => $status, 'capacity' => $capacity]);
        $updated = $db->prepare('SELECT * FROM tournaments WHERE id = ?');
        $updated->execute([$tournamentId]);
        Http::json(['tournament' => adminTournament($updated->fetch())]);
    }

    if ($method === 'GET' && preg_match('#^/api/admin/tournaments/(\d+)/courts$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator']);
        $statement = $db->prepare('SELECT id, tournament_id, name, surface, is_active, sort_order FROM courts WHERE tournament_id = ? ORDER BY sort_order, name');
        $statement->execute([(int)$matches[1]]);
        Http::json(['courts' => $statement->fetchAll()]);
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/courts$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $name = trim((string)($data['name'] ?? ''));
        $surface = trim((string)($data['surface'] ?? ''));
        if ($name === '') Http::json(['error' => 'De baannaam is verplicht.'], 422);
        $tournament = $db->prepare('SELECT id FROM tournaments WHERE id = ? LIMIT 1');
        $tournament->execute([$tournamentId]);
        if (!$tournament->fetch()) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        $duplicate = $db->prepare('SELECT id FROM courts WHERE tournament_id = ? AND name = ? LIMIT 1');
        $duplicate->execute([$tournamentId, $name]);
        if ($duplicate->fetch()) Http::json(['error' => 'Er bestaat al een baan met deze naam.'], 409);
        $order = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM courts WHERE tournament_id = ?');
        $order->execute([$tournamentId]);
        $db->prepare('INSERT INTO courts (tournament_id, name, surface, sort_order) VALUES (?, ?, ?, ?)')->execute([$tournamentId, $name, $surface ?: null, (int)$order->fetchColumn()]);
        $courtId = (int)$db->lastInsertId();
        Audit::record($db, 'court.created', 'court', $courtId, $user['id'], $tournamentId, ['name' => $name]);
        Http::json(['court_id' => $courtId], 201);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/courts/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $courtId = (int)$matches[1];
        $data = Http::input();
        $name = trim((string)($data['name'] ?? ''));
        $surface = trim((string)($data['surface'] ?? ''));
        $isActive = !array_key_exists('is_active', $data) || (bool)$data['is_active'];
        if ($name === '') Http::json(['error' => 'De baannaam is verplicht.'], 422);
        $current = $db->prepare('SELECT tournament_id FROM courts WHERE id = ? LIMIT 1');
        $current->execute([$courtId]);
        $court = $current->fetch();
        if (!$court) Http::json(['error' => 'Baan niet gevonden.'], 404);
        $duplicate = $db->prepare('SELECT id FROM courts WHERE tournament_id = ? AND name = ? AND id <> ? LIMIT 1');
        $duplicate->execute([(int)$court['tournament_id'], $name, $courtId]);
        if ($duplicate->fetch()) Http::json(['error' => 'Er bestaat al een baan met deze naam.'], 409);
        $db->prepare('UPDATE courts SET name = ?, surface = ?, is_active = ? WHERE id = ?')->execute([$name, $surface ?: null, $isActive ? 1 : 0, $courtId]);
        Audit::record($db, 'court.updated', 'court', $courtId, $user['id'], (int)$court['tournament_id'], ['name' => $name, 'is_active' => $isActive]);
        Http::json(['court_id' => $courtId, 'updated' => true]);
    }

    if ($method === 'DELETE' && preg_match('#^/api/admin/courts/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $courtId = (int)$matches[1];
        $current = $db->prepare('SELECT tournament_id, name FROM courts WHERE id = ? LIMIT 1');
        $current->execute([$courtId]);
        $court = $current->fetch();
        if (!$court) Http::json(['error' => 'Baan niet gevonden.'], 404);
        $usage = $db->prepare('SELECT (SELECT COUNT(*) FROM matches WHERE court_id = ?) + (SELECT COUNT(*) FROM schedule_items WHERE court_id = ?)');
        $usage->execute([$courtId, $courtId]);
        if ((int)$usage->fetchColumn() > 0) Http::json(['error' => 'Deze baan wordt al gebruikt. Zet de baan op inactief in plaats van deze te verwijderen.'], 409);
        $db->prepare('DELETE FROM courts WHERE id = ?')->execute([$courtId]);
        Audit::record($db, 'court.deleted', 'court', $courtId, $user['id'], (int)$court['tournament_id'], ['name' => $court['name']]);
        Http::json(['court_id' => $courtId, 'deleted' => true]);
    }

    if ($method === 'GET' && preg_match('#^/api/admin/tournaments/(\d+)/draw$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator']);
        Http::json(drawPayload($db, (int)$matches[1]));
    }

    if ($method === 'PUT' && preg_match('#^/api/admin/tournaments/(\d+)/draw$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $tournament = $db->prepare('SELECT id, capacity FROM tournaments WHERE id = ? LIMIT 1');
        $tournament->execute([$tournamentId]);
        $edition = $tournament->fetch();
        if (!$edition) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        $capacity = (int)$edition['capacity'];
        $slots = $data['slots'] ?? null;
        if (!is_array($slots) || count($slots) !== $capacity) Http::json(['error' => "De loting moet exact {$capacity} posities bevatten."], 422);
        $normalized = [];
        $positions = [];
        $playerIds = [];
        foreach ($slots as $slot) {
            if (!is_array($slot)) Http::json(['error' => 'Een positie in de loting is ongeldig.'], 422);
            $position = (int)($slot['position'] ?? 0);
            $playerId = !empty($slot['player_id']) ? (int)$slot['player_id'] : null;
            $isBye = !empty($slot['is_bye']);
            if ($position < 1 || $position > $capacity || isset($positions[$position])) Http::json(['error' => 'De loting bevat een dubbele of ongeldige positie.'], 422);
            if ($playerId !== null && $isBye) Http::json(['error' => "Positie {$position} kan niet tegelijk een speler en een bye bevatten."], 422);
            if ($playerId !== null && isset($playerIds[$playerId])) Http::json(['error' => 'Een speler kan maar één keer in de loting staan.'], 422);
            $positions[$position] = true;
            if ($playerId !== null) $playerIds[$playerId] = true;
            $normalized[$position] = ['player_id' => $playerId, 'is_bye' => $isBye];
        }
        if (count($positions) !== $capacity) Http::json(['error' => 'Niet alle posities zijn aanwezig.'], 422);
        if ($playerIds !== []) {
            $placeholders = implode(',', array_fill(0, count($playerIds), '?'));
            $validPlayers = $db->prepare("SELECT COUNT(*) FROM players WHERE tournament_id = ? AND registration_status = 'confirmed' AND id IN ({$placeholders})");
            $validPlayers->execute(array_merge([$tournamentId], array_keys($playerIds)));
            if ((int)$validPlayers->fetchColumn() !== count($playerIds)) Http::json(['error' => 'De loting bevat een speler die niet (meer) betaald is.'], 422);
        }
        ksort($normalized);
        $db->beginTransaction();
        $db->prepare(
            "INSERT INTO draws (tournament_id, status, bracket_size) VALUES (?, 'draft', ?)
             ON DUPLICATE KEY UPDATE status = 'draft', bracket_size = VALUES(bracket_size), published_at = NULL, published_by = NULL, updated_at = NOW()"
        )->execute([$tournamentId, $capacity]);
        $drawIdStatement = $db->prepare('SELECT id FROM draws WHERE tournament_id = ?');
        $drawIdStatement->execute([$tournamentId]);
        $drawId = (int)$drawIdStatement->fetchColumn();
        $db->prepare('DELETE FROM draw_slots WHERE draw_id = ?')->execute([$drawId]);
        $insertSlot = $db->prepare('INSERT INTO draw_slots (draw_id, position, player_id, is_bye) VALUES (?, ?, ?, ?)');
        foreach ($normalized as $position => $slot) {
            if ($slot['player_id'] === null && !$slot['is_bye']) continue;
            $insertSlot->execute([$drawId, $position, $slot['player_id'], $slot['is_bye'] ? 1 : 0]);
        }
        $db->prepare('UPDATE players SET player_number = NULL WHERE tournament_id = ?')->execute([$tournamentId]);
        $assignNumber = $db->prepare('UPDATE players SET player_number = ? WHERE id = ? AND tournament_id = ?');
        foreach ($normalized as $position => $slot) if ($slot['player_id'] !== null) $assignNumber->execute([$position, $slot['player_id'], $tournamentId]);
        $db->prepare('DELETE FROM matches WHERE tournament_id = ?')->execute([$tournamentId]);
        Audit::record($db, 'draw.saved', 'draw', $drawId, $user['id'], $tournamentId, ['assigned_players' => count($playerIds)]);
        $db->commit();
        Http::json(drawPayload($db, $tournamentId));
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/draw/publish$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $drawStatement = $db->prepare(
            'SELECT d.id, d.bracket_size, t.capacity, t.default_match_minutes, t.final_round_match_minutes, t.final_round_starts_at
             FROM draws d JOIN tournaments t ON t.id = d.tournament_id WHERE d.tournament_id = ? LIMIT 1'
        );
        $drawStatement->execute([$tournamentId]);
        $draw = $drawStatement->fetch();
        if (!$draw) Http::json(['error' => 'Sla eerst een conceptloting op.'], 409);
        $capacity = (int)$draw['capacity'];
        if ((int)$draw['bracket_size'] !== $capacity) Http::json(['error' => 'De grootte van de loting komt niet overeen met de huidige deelnemerslimiet.'], 409);
        $slotsStatement = $db->prepare(
            'SELECT ds.position, ds.player_id, ds.is_bye, p.registration_status FROM draw_slots ds LEFT JOIN players p ON p.id = ds.player_id WHERE ds.draw_id = ? ORDER BY ds.position'
        );
        $slotsStatement->execute([(int)$draw['id']]);
        $rows = $slotsStatement->fetchAll();
        if (count($rows) !== $capacity) Http::json(['error' => 'Vul iedere positie met een speler of bye voordat je publiceert.'], 422);
        $slots = [];
        foreach ($rows as $slot) {
            $position = (int)$slot['position'];
            $playerId = $slot['player_id'] !== null ? (int)$slot['player_id'] : null;
            $isBye = (bool)$slot['is_bye'];
            if (($playerId === null) === !$isBye) Http::json(['error' => "Positie {$position} is ongeldig."], 422);
            if ($playerId !== null && $slot['registration_status'] !== 'confirmed') Http::json(['error' => "De speler op positie {$position} is niet meer betaald."], 422);
            $slots[$position] = ['player_id' => $playerId, 'is_bye' => $isBye];
        }
        for ($position = 1; $position <= $capacity; $position += 2) {
            if ($slots[$position]['is_bye'] && $slots[$position + 1]['is_bye']) Http::json(['error' => "Wedstrijd " . ((int)(($position + 1) / 2)) . ' bevat twee byes. Plaats minimaal één speler.'], 422);
        }
        $db->beginTransaction();
        $db->prepare('DELETE FROM matches WHERE tournament_id = ?')->execute([$tournamentId]);
        $insertMatch = $db->prepare(
            "INSERT INTO matches (tournament_id, round_number, bracket_position, player_one_id, player_two_id,
                player_one_is_bye, player_two_is_bye, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')"
        );
        $roundCount = (int)round(log($capacity, 2));
        if (2 ** $roundCount !== $capacity) {
            $db->rollBack();
            Http::json(['error' => 'De deelnemerslimiet moet een macht van twee zijn.'], 422);
        }
        $matchIds = [];
        for ($round = 1; $round <= $roundCount; $round++) {
            $matchesInRound = (int)($capacity / (2 ** $round));
            $duration = $round >= (int)$draw['final_round_starts_at'] ? (int)$draw['final_round_match_minutes'] : (int)$draw['default_match_minutes'];
            for ($bracketPosition = 1; $bracketPosition <= $matchesInRound; $bracketPosition++) {
                $insertMatch->execute([$tournamentId, $round, $bracketPosition, null, null, 0, 0, $duration]);
                $matchIds[$round][$bracketPosition] = (int)$db->lastInsertId();
            }
        }
        $linkMatch = $db->prepare('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE id = ?');
        for ($round = 1; $round < $roundCount; $round++) {
            foreach ($matchIds[$round] as $bracketPosition => $matchId) {
                $nextPosition = (int)ceil($bracketPosition / 2);
                $linkMatch->execute([$matchIds[$round + 1][$nextPosition], $bracketPosition % 2 === 1 ? 'player_one' : 'player_two', $matchId]);
            }
        }
        $setOpeningMatch = $db->prepare(
            'UPDATE matches SET player_one_id = ?, player_two_id = ?, player_one_is_bye = ?, player_two_is_bye = ?,
                winner_id = ?, status = ?, completed_at = ?, updated_by = ? WHERE id = ?'
        );
        $advanceBye = $db->prepare('UPDATE matches SET player_one_id = IF(? = \'player_one\', ?, player_one_id), player_two_id = IF(? = \'player_two\', ?, player_two_id) WHERE id = ?');
        $matchPosition = 1;
        for ($position = 1; $position <= $capacity; $position += 2) {
            $one = $slots[$position];
            $two = $slots[$position + 1];
            $byeWinner = $one['is_bye'] ? $two['player_id'] : ($two['is_bye'] ? $one['player_id'] : null);
            $setOpeningMatch->execute([$one['player_id'], $two['player_id'], $one['is_bye'] ? 1 : 0, $two['is_bye'] ? 1 : 0,
                $byeWinner, $byeWinner ? 'complete' : 'draft', $byeWinner ? date('Y-m-d H:i:s') : null, $byeWinner ? $user['id'] : null, $matchIds[1][$matchPosition]]);
            if ($byeWinner !== null && $roundCount > 1) {
                $slotName = $matchPosition % 2 === 1 ? 'player_one' : 'player_two';
                $advanceBye->execute([$slotName, $byeWinner, $slotName, $byeWinner, $matchIds[2][(int)ceil($matchPosition / 2)]]);
            }
            $matchPosition++;
        }
        $db->prepare("UPDATE draws SET status = 'published', published_at = NOW(), published_by = ? WHERE id = ?")->execute([$user['id'], (int)$draw['id']]);
        Audit::record($db, 'draw.published', 'draw', (int)$draw['id'], $user['id'], $tournamentId, ['matches_created' => $capacity - 1, 'rounds_created' => $roundCount]);
        $db->commit();
        $payload = drawPayload($db, $tournamentId);
        $payload['matches_created'] = $capacity - 1;
        Http::json($payload);
    }

    if ($method === 'GET' && $path === '/api/admin/matches') {
        Auth::requireRole($db, ['administrator', 'host']);
        $tournamentId = max(1, (int)($_GET['tournament_id'] ?? 1));
        Http::json(matchesPayload($db, $tournamentId));
    }

    if ($method === 'POST' && preg_match('#^/api/admin/matches/(\d+)/winner$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator', 'host']);
        Auth::verifyCsrf($user);
        $matchId = (int)$matches[1];
        $winnerId = (int)(Http::input()['winner_id'] ?? 0);
        $db->beginTransaction();
        $statement = $db->prepare('SELECT * FROM matches WHERE id = ? FOR UPDATE');
        $statement->execute([$matchId]);
        $match = $statement->fetch();
        if (!$match) {
            $db->rollBack();
            Http::json(['error' => 'Wedstrijd niet gevonden.'], 404);
        }
        $participants = array_values(array_filter([(int)($match['player_one_id'] ?? 0), (int)($match['player_two_id'] ?? 0)]));
        if ($winnerId <= 0 || !in_array($winnerId, $participants, true)) {
            $db->rollBack();
            Http::json(['error' => 'Kies één van de spelers in deze wedstrijd.'], 422);
        }
        if ((bool)$match['player_one_is_bye'] || (bool)$match['player_two_is_bye'] || count($participants) !== 2) {
            $db->rollBack();
            Http::json(['error' => 'Deze wedstrijd kan nog niet handmatig worden afgerond.'], 409);
        }
        $corrected = $match['winner_id'] !== null && (int)$match['winner_id'] !== $winnerId;
        if ($corrected) clearDownstreamResult($db, $match, (int)$user['id']);
        $db->prepare("UPDATE matches SET winner_id = ?, status = 'complete', completed_at = NOW(), updated_by = ? WHERE id = ?")
            ->execute([$winnerId, $user['id'], $matchId]);
        if ($match['next_match_id'] !== null && $match['next_match_slot'] !== null) {
            $slot = $match['next_match_slot'] === 'player_two' ? 'player_two_id' : 'player_one_id';
            $db->prepare("UPDATE matches SET {$slot} = ?, updated_by = ? WHERE id = ?")->execute([$winnerId, $user['id'], (int)$match['next_match_id']]);
        }
        Audit::record($db, $corrected ? 'match.winner_corrected' : 'match.winner_selected', 'match', $matchId, $user['id'], (int)$match['tournament_id'], ['winner_id' => $winnerId]);
        $db->commit();
        Http::json(matchesPayload($db, (int)$match['tournament_id']));
    }

    if ($method === 'GET' && preg_match('#^/api/admin/tournaments/(\d+)/schedule$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator', 'host']);
        Http::json(schedulePayload($db, (int)$matches[1]));
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/schedule/plan$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $round = max(1, (int)($data['round_number'] ?? 0));
        $startsAt = scheduleDateTime($data['starts_at'] ?? '');
        $courtIds = array_values(array_unique(array_filter([(int)($data['first_court_id'] ?? 0), (int)($data['second_court_id'] ?? 0)])));
        if (!$courtIds) Http::json(['error' => 'Kies minimaal één baan.'], 422);
        $placeholders = implode(',', array_fill(0, count($courtIds), '?'));
        $courtStatement = $db->prepare("SELECT id FROM courts WHERE tournament_id = ? AND is_active = 1 AND id IN ({$placeholders})");
        $courtStatement->execute(array_merge([$tournamentId], $courtIds));
        if (count($courtStatement->fetchAll()) !== count($courtIds)) Http::json(['error' => 'Een geselecteerde baan bestaat niet of is inactief.'], 422);
        $matchStatement = $db->prepare('SELECT id, duration_minutes FROM matches WHERE tournament_id = ? AND round_number = ? ORDER BY bracket_position');
        $matchStatement->execute([$tournamentId, $round]);
        $roundMatches = $matchStatement->fetchAll();
        if (!$roundMatches) Http::json(['error' => 'Deze ronde bevat nog geen wedstrijden.'], 409);
        $settingsStatement = $db->prepare('SELECT break_every_minutes, break_duration_minutes FROM tournaments WHERE id = ? LIMIT 1');
        $settingsStatement->execute([$tournamentId]);
        $settings = $settingsStatement->fetch();
        if (!$settings) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        $firstCount = (int)ceil(count($roundMatches) / 2);
        $lanes = [array_slice($roundMatches, 0, $firstCount), array_slice($roundMatches, $firstCount)];
        if ($lanes[1] && count($courtIds) < 2) Http::json(['error' => 'Kies voor beide helften een verschillende baan.'], 422);
        $cursor = new DateTimeImmutable($startsAt);
        $elapsed = 0;
        $breakEvery = (int)$settings['break_every_minutes'];
        $breakDuration = (int)$settings['break_duration_minutes'];
        $waves = max(count($lanes[0]), count($lanes[1]));
        $db->beginTransaction();
        $db->prepare("DELETE FROM schedule_items WHERE tournament_id = ? AND is_automatic = 1 AND title = ?")
            ->execute([$tournamentId, "Pauze · Ronde {$round}"]);
        $scheduleMatch = $db->prepare("UPDATE matches SET court_id = ?, scheduled_at = ?, status = IF(status = 'complete', 'complete', 'scheduled'), updated_by = ? WHERE id = ?");
        $addBreak = $db->prepare("INSERT INTO schedule_items (tournament_id, item_type, title, starts_at, duration_minutes, is_tournament_wide, is_automatic) VALUES (?, 'break', ?, ?, ?, 1, 1)");
        for ($wave = 0; $wave < $waves; $wave++) {
            $waveDuration = 0;
            foreach ($lanes as $laneIndex => $lane) {
                if (!isset($lane[$wave])) continue;
                $courtId = $courtIds[min($laneIndex, count($courtIds) - 1)];
                $scheduleMatch->execute([$courtId, $cursor->format('Y-m-d H:i:s'), $user['id'], (int)$lane[$wave]['id']]);
                $waveDuration = max($waveDuration, (int)$lane[$wave]['duration_minutes']);
            }
            $cursor = $cursor->modify("+{$waveDuration} minutes");
            $elapsed += $waveDuration;
            if ($elapsed >= $breakEvery && $wave < $waves - 1) {
                $addBreak->execute([$tournamentId, "Pauze · Ronde {$round}", $cursor->format('Y-m-d H:i:s'), $breakDuration]);
                $cursor = $cursor->modify("+{$breakDuration} minutes");
                $elapsed = 0;
            }
        }
        Audit::record($db, 'schedule.round_planned', 'tournament', $tournamentId, $user['id'], $tournamentId, ['round_number' => $round, 'matches' => count($roundMatches)]);
        $db->commit();
        Http::json(schedulePayload($db, $tournamentId));
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/matches/(\d+)/schedule$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $matchId = (int)$matches[1];
        $data = Http::input();
        $courtId = (int)($data['court_id'] ?? 0);
        $duration = (int)($data['duration_minutes'] ?? 0);
        if ($courtId <= 0 || $duration < 1 || $duration > 60) Http::json(['error' => 'Kies een baan en een duur tussen 1 en 60 minuten.'], 422);
        $current = $db->prepare('SELECT tournament_id FROM matches WHERE id = ? LIMIT 1');
        $current->execute([$matchId]);
        $tournamentId = (int)$current->fetchColumn();
        if (!$tournamentId) Http::json(['error' => 'Wedstrijd niet gevonden.'], 404);
        $court = $db->prepare('SELECT id FROM courts WHERE id = ? AND tournament_id = ? AND is_active = 1');
        $court->execute([$courtId, $tournamentId]);
        if (!$court->fetch()) Http::json(['error' => 'Baan niet gevonden of inactief.'], 422);
        $db->prepare("UPDATE matches SET court_id = ?, scheduled_at = ?, duration_minutes = ?, status = IF(status = 'complete', 'complete', 'scheduled'), updated_by = ? WHERE id = ?")
            ->execute([$courtId, scheduleDateTime($data['starts_at'] ?? ''), $duration, $user['id'], $matchId]);
        Audit::record($db, 'schedule.match_updated', 'match', $matchId, $user['id'], $tournamentId);
        Http::json(schedulePayload($db, $tournamentId));
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/schedule/items$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $title = trim((string)($data['title'] ?? ''));
        $type = (string)($data['item_type'] ?? 'custom');
        $duration = (int)($data['duration_minutes'] ?? 0);
        $wide = !empty($data['is_tournament_wide']);
        $courtId = $wide ? null : (int)($data['court_id'] ?? 0);
        if ($title === '' || !in_array($type, ['break', 'ceremony', 'maintenance', 'custom'], true) || $duration < 1 || $duration > 240) Http::json(['error' => 'Vul een titel, type en geldige duur in.'], 422);
        if (!$wide && !$courtId) Http::json(['error' => 'Kies een baan of maak het onderdeel toernooibreed.'], 422);
        if ($courtId) {
            $court = $db->prepare('SELECT id FROM courts WHERE id = ? AND tournament_id = ?');
            $court->execute([$courtId, $tournamentId]);
            if (!$court->fetch()) Http::json(['error' => 'Baan niet gevonden.'], 422);
        }
        $db->prepare('INSERT INTO schedule_items (tournament_id, court_id, item_type, title, starts_at, duration_minutes, is_tournament_wide) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$tournamentId, $courtId, $type, $title, scheduleDateTime($data['starts_at'] ?? ''), $duration, $wide ? 1 : 0]);
        $itemId = (int)$db->lastInsertId();
        Audit::record($db, 'schedule.item_created', 'schedule_item', $itemId, $user['id'], $tournamentId, ['title' => $title]);
        Http::json(schedulePayload($db, $tournamentId), 201);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/schedule/items/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $itemId = (int)$matches[1];
        $data = Http::input();
        $current = $db->prepare('SELECT tournament_id FROM schedule_items WHERE id = ? LIMIT 1');
        $current->execute([$itemId]);
        $tournamentId = (int)$current->fetchColumn();
        if (!$tournamentId) Http::json(['error' => 'Programmaonderdeel niet gevonden.'], 404);
        $title = trim((string)($data['title'] ?? ''));
        $type = (string)($data['item_type'] ?? 'custom');
        $duration = (int)($data['duration_minutes'] ?? 0);
        $wide = !empty($data['is_tournament_wide']);
        $courtId = $wide ? null : (int)($data['court_id'] ?? 0);
        if ($title === '' || !in_array($type, ['break', 'ceremony', 'maintenance', 'custom'], true) || $duration < 1 || $duration > 240) Http::json(['error' => 'Vul geldige gegevens in.'], 422);
        if (!$wide) {
            $court = $db->prepare('SELECT id FROM courts WHERE id = ? AND tournament_id = ?');
            $court->execute([$courtId, $tournamentId]);
            if (!$court->fetch()) Http::json(['error' => 'Baan niet gevonden.'], 422);
        }
        $db->prepare('UPDATE schedule_items SET court_id = ?, item_type = ?, title = ?, starts_at = ?, duration_minutes = ?, is_tournament_wide = ?, is_automatic = 0 WHERE id = ?')
            ->execute([$courtId ?: null, $type, $title, scheduleDateTime($data['starts_at'] ?? ''), $duration, $wide ? 1 : 0, $itemId]);
        Audit::record($db, 'schedule.item_updated', 'schedule_item', $itemId, $user['id'], $tournamentId);
        Http::json(schedulePayload($db, $tournamentId));
    }

    if ($method === 'DELETE' && preg_match('#^/api/admin/schedule/items/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $itemId = (int)$matches[1];
        $current = $db->prepare('SELECT tournament_id FROM schedule_items WHERE id = ? LIMIT 1');
        $current->execute([$itemId]);
        $tournamentId = (int)$current->fetchColumn();
        if (!$tournamentId) Http::json(['error' => 'Programmaonderdeel niet gevonden.'], 404);
        $db->prepare('DELETE FROM schedule_items WHERE id = ?')->execute([$itemId]);
        Audit::record($db, 'schedule.item_deleted', 'schedule_item', $itemId, $user['id'], $tournamentId);
        Http::json(schedulePayload($db, $tournamentId));
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/schedule/swap$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $firstKind = ($data['first']['kind'] ?? '') === 'item' ? 'item' : 'match';
        $secondKind = ($data['second']['kind'] ?? '') === 'item' ? 'item' : 'match';
        $firstId = (int)($data['first']['id'] ?? 0);
        $secondId = (int)($data['second']['id'] ?? 0);
        $table = static fn(string $kind): string => $kind === 'item' ? 'schedule_items' : 'matches';
        $timeColumn = static fn(string $kind): string => $kind === 'item' ? 'starts_at' : 'scheduled_at';
        $fetch = static function (PDO $db, string $tableName, string $timeField, int $id, int $tournament): array {
            $statement = $db->prepare("SELECT id, court_id, {$timeField} AS schedule_time FROM {$tableName} WHERE id = ? AND tournament_id = ? LIMIT 1");
            $statement->execute([$id, $tournament]);
            return $statement->fetch() ?: [];
        };
        $first = $fetch($db, $table($firstKind), $timeColumn($firstKind), $firstId, $tournamentId);
        $second = $fetch($db, $table($secondKind), $timeColumn($secondKind), $secondId, $tournamentId);
        if (!$first || !$second || $first['schedule_time'] === null || $second['schedule_time'] === null) Http::json(['error' => 'Beide onderdelen moeten gepland zijn.'], 422);
        $db->beginTransaction();
        $db->prepare('UPDATE ' . $table($firstKind) . ' SET court_id = ?, ' . $timeColumn($firstKind) . ' = ? WHERE id = ?')->execute([$second['court_id'], $second['schedule_time'], $firstId]);
        $db->prepare('UPDATE ' . $table($secondKind) . ' SET court_id = ?, ' . $timeColumn($secondKind) . ' = ? WHERE id = ?')->execute([$first['court_id'], $first['schedule_time'], $secondId]);
        Audit::record($db, 'schedule.items_swapped', 'tournament', $tournamentId, $user['id'], $tournamentId, ['first' => $data['first'] ?? null, 'second' => $data['second'] ?? null]);
        $db->commit();
        Http::json(schedulePayload($db, $tournamentId));
    }

    if ($method === 'GET' && $path === '/api/admin/players') {
        Auth::requireRole($db, ['administrator', 'host']);
        $tournamentId = max(1, (int)($_GET['tournament_id'] ?? 1));
        $statement = $db->prepare(
            "SELECT p.id, p.player_number, p.sponsor_id, s.name AS sponsor_name, p.name, p.email, p.phone,
                    p.knltb_number, p.singles_rating, p.doubles_rating, p.entrance_song_query, p.entrance_song_url,
                    p.registration_status, p.checked_in_at, p.created_at
             FROM players p LEFT JOIN sponsors s ON s.id = p.sponsor_id
             WHERE p.tournament_id = ? ORDER BY COALESCE(p.player_number, 9999), p.name"
        );
        $statement->execute([$tournamentId]);
        Http::json(['players' => $statement->fetchAll()]);
    }

    if ($method === 'POST' && $path === '/api/admin/players') {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $data = Http::input();
        $tournamentId = max(1, (int)($data['tournament_id'] ?? 1));
        foreach (['name', 'email', 'phone', 'date_of_birth', 'entrance_song_query'] as $field) {
            if (trim((string)($data[$field] ?? '')) === '') Http::json(['error' => "{$field} is verplicht."], 422);
        }
        $email = strtolower(trim((string)$data['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Http::json(['error' => 'Vul een geldig e-mailadres in.'], 422);
        if (empty($data['knltb_number']) && (empty($data['singles_rating']) || empty($data['doubles_rating']))) {
            Http::json(['error' => 'Vul een KNLTB bondsnummer in, of zowel enkel- als dubbelsterkte.'], 422);
        }
        $tournament = $db->prepare('SELECT id, starts_at, timezone, capacity, privacy_version, terms_version FROM tournaments WHERE id = ? LIMIT 1');
        $tournament->execute([$tournamentId]);
        $edition = $tournament->fetch();
        if (!$edition) Http::json(['error' => 'Toernooi niet gevonden.'], 404);
        $birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$data['date_of_birth']);
        $startDate = new DateTimeImmutable($edition['starts_at'], new DateTimeZone($edition['timezone']));
        if (!$birthDate || $birthDate->modify('+18 years') > $startDate) Http::json(['error' => 'De speler moet op de toernooidatum minimaal 18 jaar zijn.'], 422);
        $duplicate = $db->prepare("SELECT id FROM players WHERE tournament_id = ? AND email = ? AND registration_status NOT IN ('cancelled','refunded') LIMIT 1");
        $duplicate->execute([$tournamentId, $email]);
        if ($duplicate->fetch()) Http::json(['error' => 'Er bestaat al een actieve deelnemer met dit e-mailadres.'], 409);
        $count = $db->prepare("SELECT COUNT(*) FROM players WHERE tournament_id = ? AND registration_status = 'confirmed'");
        $count->execute([$tournamentId]);
        if ((int)$count->fetchColumn() >= (int)$edition['capacity']) Http::json(['error' => 'Het deelnemersveld is vol.'], 409);
        $sponsorId = !empty($data['sponsor_id']) ? (int)$data['sponsor_id'] : null;
        if ($sponsorId !== null) {
            $sponsor = $db->prepare('SELECT id FROM sponsors WHERE id = ? AND tournament_id = ? AND is_active = 1 LIMIT 1');
            $sponsor->execute([$sponsorId, $tournamentId]);
            if (!$sponsor->fetch()) Http::json(['error' => 'De geselecteerde sponsor bestaat niet of is niet actief.'], 422);
        }

        $statement = $db->prepare(
            "INSERT INTO players (tournament_id, sponsor_id, name, email, phone, date_of_birth, age_verified_at, knltb_number,
                singles_rating, doubles_rating, entrance_song_query, registration_status,
                privacy_version, privacy_accepted_at, terms_version, terms_accepted_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'confirmed', ?, NOW(), ?, NOW())"
        );
        $statement->execute([
            $tournamentId,
            $sponsorId,
            trim((string)$data['name']),
            $email,
            trim((string)$data['phone']),
            $birthDate->format('Y-m-d'),
            trim((string)($data['knltb_number'] ?? '')) ?: null,
            trim((string)($data['singles_rating'] ?? '')) ?: null,
            trim((string)($data['doubles_rating'] ?? '')) ?: null,
            trim((string)$data['entrance_song_query']),
            $edition['privacy_version'],
            $edition['terms_version'],
        ]);
        $playerId = (int)$db->lastInsertId();
        Audit::record($db, 'player.created_manually', 'player', $playerId, $user['id'], $tournamentId, ['payment_bypassed' => true, 'sponsor_id' => $sponsorId]);
        Http::json(['player_id' => $playerId, 'registration_status' => 'confirmed', 'sponsor_id' => $sponsorId], 201);
    }

    if ($method === 'GET' && preg_match('#^/api/admin/players/(\d+)$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator']);
        $statement = $db->prepare(
            "SELECT p.id, p.player_number, p.sponsor_id, s.name AS sponsor_name, p.name, p.email, p.phone,
                    p.date_of_birth, p.knltb_number, p.singles_rating, p.doubles_rating, p.entrance_song_query,
                    p.entrance_song_url, p.registration_status, p.checked_in_at, p.created_at
             FROM players p LEFT JOIN sponsors s ON s.id = p.sponsor_id WHERE p.id = ? LIMIT 1"
        );
        $statement->execute([(int)$matches[1]]);
        $player = $statement->fetch();
        if (!$player) Http::json(['error' => 'Deelnemer niet gevonden.'], 404);
        Http::json(['player' => $player]);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/players/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $playerId = (int)$matches[1];
        $data = Http::input();
        foreach (['name', 'email', 'phone', 'date_of_birth', 'entrance_song_query'] as $field) {
            if (trim((string)($data[$field] ?? '')) === '') Http::json(['error' => "{$field} is verplicht."], 422);
        }
        $email = strtolower(trim((string)$data['email']));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Http::json(['error' => 'Vul een geldig e-mailadres in.'], 422);
        if (empty($data['knltb_number']) && (empty($data['singles_rating']) || empty($data['doubles_rating']))) {
            Http::json(['error' => 'Vul een KNLTB bondsnummer in, of zowel enkel- als dubbelsterkte.'], 422);
        }
        $status = (string)($data['registration_status'] ?? 'confirmed');
        if (!in_array($status, ['payment_pending', 'confirmed', 'cancelled', 'refunded'], true)) Http::json(['error' => 'Ongeldige deelnemersstatus.'], 422);
        $current = $db->prepare('SELECT tournament_id FROM players WHERE id = ? LIMIT 1');
        $current->execute([$playerId]);
        $existing = $current->fetch();
        if (!$existing) Http::json(['error' => 'Deelnemer niet gevonden.'], 404);
        $tournamentId = (int)$existing['tournament_id'];
        $edition = $db->prepare('SELECT starts_at, timezone FROM tournaments WHERE id = ? LIMIT 1');
        $edition->execute([$tournamentId]);
        $tournament = $edition->fetch();
        $birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$data['date_of_birth']);
        $startDate = new DateTimeImmutable($tournament['starts_at'], new DateTimeZone($tournament['timezone']));
        if (!$birthDate || $birthDate->modify('+18 years') > $startDate) Http::json(['error' => 'De speler moet op de toernooidatum minimaal 18 jaar zijn.'], 422);
        $duplicate = $db->prepare("SELECT id FROM players WHERE tournament_id = ? AND email = ? AND id <> ? AND registration_status NOT IN ('cancelled','refunded') LIMIT 1");
        $duplicate->execute([$tournamentId, $email, $playerId]);
        if ($duplicate->fetch()) Http::json(['error' => 'Er bestaat al een actieve deelnemer met dit e-mailadres.'], 409);
        $sponsorId = !empty($data['sponsor_id']) ? (int)$data['sponsor_id'] : null;
        if ($sponsorId !== null) {
            $sponsor = $db->prepare('SELECT id FROM sponsors WHERE id = ? AND tournament_id = ? AND is_active = 1 LIMIT 1');
            $sponsor->execute([$sponsorId, $tournamentId]);
            if (!$sponsor->fetch()) Http::json(['error' => 'De geselecteerde sponsor bestaat niet of is niet actief.'], 422);
        }
        $statement = $db->prepare(
            'UPDATE players SET sponsor_id = ?, name = ?, email = ?, phone = ?, date_of_birth = ?, age_verified_at = NOW(),
                knltb_number = ?, singles_rating = ?, doubles_rating = ?, entrance_song_query = ?, registration_status = ? WHERE id = ?'
        );
        $statement->execute([
            $sponsorId, trim((string)$data['name']), $email, trim((string)$data['phone']), $birthDate->format('Y-m-d'),
            trim((string)($data['knltb_number'] ?? '')) ?: null,
            trim((string)($data['singles_rating'] ?? '')) ?: null,
            trim((string)($data['doubles_rating'] ?? '')) ?: null,
            trim((string)$data['entrance_song_query']), $status, $playerId,
        ]);
        Audit::record($db, 'player.updated', 'player', $playerId, $user['id'], $tournamentId, ['sponsor_id' => $sponsorId, 'registration_status' => $status]);
        Http::json(['player_id' => $playerId, 'updated' => true]);
    }

    if ($method === 'GET' && $path === '/api/admin/sponsors') {
        Auth::requireRole($db, ['administrator']);
        $tournamentId = max(1, (int)($_GET['tournament_id'] ?? 1));
        $statement = $db->prepare(
            "SELECT s.id, s.name, s.website_url, s.logo_path, s.is_active, s.show_on_public_pages,
                    st.id AS tier_id, st.name AS tier_name,
                    COUNT(p.id) AS player_count
             FROM sponsors s LEFT JOIN sponsor_tiers st ON st.id = s.tier_id
             LEFT JOIN players p ON p.sponsor_id = s.id AND p.registration_status = 'confirmed'
             WHERE s.tournament_id = ? GROUP BY s.id, st.id ORDER BY st.sort_order, s.sort_order, s.name"
        );
        $statement->execute([$tournamentId]);
        $tiers = $db->prepare('SELECT id, name FROM sponsor_tiers WHERE tournament_id = ? ORDER BY sort_order, name');
        $tiers->execute([$tournamentId]);
        Http::json(['sponsors' => $statement->fetchAll(), 'tiers' => $tiers->fetchAll()]);
    }

    if ($method === 'POST' && $path === '/api/admin/sponsors') {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $data = Http::input();
        $tournamentId = max(1, (int)($data['tournament_id'] ?? 1));
        $name = trim((string)($data['name'] ?? ''));
        $tierId = (int)($data['tier_id'] ?? 0);
        if ($name === '' || $tierId < 1) Http::json(['error' => 'Naam en sponsorniveau zijn verplicht.'], 422);
        $tier = $db->prepare('SELECT id FROM sponsor_tiers WHERE id = ? AND tournament_id = ? LIMIT 1');
        $tier->execute([$tierId, $tournamentId]);
        if (!$tier->fetch()) Http::json(['error' => 'Ongeldig sponsorniveau.'], 422);
        $db->prepare('INSERT INTO sponsors (tournament_id, tier_id, name, website_url) VALUES (?, ?, ?, ?)')
            ->execute([$tournamentId, $tierId, $name, trim((string)($data['website_url'] ?? '')) ?: null]);
        $sponsorId = (int)$db->lastInsertId();
        Audit::record($db, 'sponsor.created', 'sponsor', $sponsorId, $user['id'], $tournamentId);
        Http::json(['sponsor_id' => $sponsorId], 201);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/sponsors/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $sponsorId = (int)$matches[1];
        $data = Http::input();
        $name = trim((string)($data['name'] ?? ''));
        $tierId = (int)($data['tier_id'] ?? 0);
        if ($name === '' || $tierId < 1) Http::json(['error' => 'Naam en sponsorniveau zijn verplicht.'], 422);
        $current = $db->prepare('SELECT tournament_id FROM sponsors WHERE id = ? LIMIT 1');
        $current->execute([$sponsorId]);
        $sponsor = $current->fetch();
        if (!$sponsor) Http::json(['error' => 'Sponsor niet gevonden.'], 404);
        $tournamentId = (int)$sponsor['tournament_id'];
        $tier = $db->prepare('SELECT id FROM sponsor_tiers WHERE id = ? AND tournament_id = ? LIMIT 1');
        $tier->execute([$tierId, $tournamentId]);
        if (!$tier->fetch()) Http::json(['error' => 'Ongeldig sponsorniveau.'], 422);
        $isActive = !array_key_exists('is_active', $data) || (bool)$data['is_active'];
        $showPublic = !array_key_exists('show_on_public_pages', $data) || (bool)$data['show_on_public_pages'];
        $db->prepare('UPDATE sponsors SET tier_id = ?, name = ?, website_url = ?, is_active = ?, show_on_public_pages = ? WHERE id = ?')
            ->execute([$tierId, $name, trim((string)($data['website_url'] ?? '')) ?: null, $isActive ? 1 : 0, $showPublic ? 1 : 0, $sponsorId]);
        Audit::record($db, 'sponsor.updated', 'sponsor', $sponsorId, $user['id'], $tournamentId, ['tier_id' => $tierId, 'is_active' => $isActive, 'show_on_public_pages' => $showPublic]);
        Http::json(['sponsor_id' => $sponsorId, 'updated' => true]);
    }

    if ($method === 'GET' && $path === '/api/admin/players/export') {
        Auth::requireRole($db, ['administrator']);
        $tournamentId = max(1, (int)($_GET['tournament_id'] ?? 1));
        $statement = $db->prepare(
            "SELECT p.player_number, p.name, p.email, p.phone, p.knltb_number, p.singles_rating, p.doubles_rating,
                    p.entrance_song_query, p.entrance_song_url, s.name AS sponsor, p.registration_status,
                    IF(p.age_verified_at IS NULL, 'Nee', 'Ja') AS age_verified, p.checked_in_at, p.created_at
             FROM players p LEFT JOIN sponsors s ON s.id = p.sponsor_id
             WHERE p.tournament_id = ? ORDER BY COALESCE(p.player_number, 9999), p.name"
        );
        $statement->execute([$tournamentId]);
        header_remove('Content-Type');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="matchpoint-deelnemers.csv"');
        echo "\xEF\xBB\xBF";
        $output = fopen('php://output', 'wb');
        fputcsv($output, ['Spelersnummer', 'Naam', 'E-mail', 'Telefoon', 'KNLTB', 'Enkel', 'Dubbel', 'Opkomstnummer', 'Spotify', 'Sponsor', 'Status', '18+ geverifieerd', 'Ingecheckt op', 'Ingeschreven op'], ';');
        foreach ($statement->fetchAll() as $row) fputcsv($output, array_values($row), ';');
        fclose($output);
        exit;
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/players/(\d+)/check-in$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator', 'host']);
        Auth::verifyCsrf($user);
        $playerId = (int)$matches[1];
        $data = Http::input();
        $checkedIn = !array_key_exists('checked_in', $data) || (bool)$data['checked_in'];
        $statement = $db->prepare('UPDATE players SET checked_in_at = IF(?, NOW(), NULL) WHERE id = ?');
        $statement->execute([$checkedIn ? 1 : 0, $playerId]);
        if ($statement->rowCount() === 0) {
            $exists = $db->prepare('SELECT id FROM players WHERE id = ?');
            $exists->execute([$playerId]);
            if (!$exists->fetch()) Http::json(['error' => 'Deelnemer niet gevonden.'], 404);
        }
        Audit::record($db, $checkedIn ? 'player.checked_in' : 'player.check_in_reverted', 'player', $playerId, $user['id']);
        Http::json(['player_id' => $playerId, 'checked_in' => $checkedIn]);
    }

    if ($method === 'GET' && preg_match('#^/api/admin/tournaments/(\d+)/slides$#', $path, $matches)) {
        Auth::requireRole($db, ['administrator']);
        Http::json(['slides' => presentationSlidesPayload($db, (int)$matches[1])]);
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/slides$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $data = Http::input();
        $type = (string)($data['type'] ?? 'custom');
        $allowed = ['custom', 'sponsor', 'upcoming_matches', 'round_announcement', 'featured_round'];
        if (!in_array($type, $allowed, true)) Http::json(['error' => 'Ongeldig slidetype.'], 422);
        $title = trim((string)($data['title'] ?? '')) ?: null;
        $duration = min(300, max(3, (int)($data['duration_seconds'] ?? 10)));
        $sponsorId = $type === 'sponsor' ? (int)($data['sponsor_id'] ?? 0) : null;
        if ($type === 'custom' && !$title) Http::json(['error' => 'Vul een titel in.'], 422);
        if ($type === 'sponsor') {
            $sponsor = $db->prepare('SELECT id FROM sponsors WHERE id = ? AND tournament_id = ? AND is_active = 1');
            $sponsor->execute([$sponsorId, $tournamentId]);
            if (!$sponsor->fetch()) Http::json(['error' => 'Kies een actieve sponsor.'], 422);
        }
        $order = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM presentation_slides WHERE tournament_id = ?');
        $order->execute([$tournamentId]);
        $content = [
            'subtitle' => trim((string)($data['subtitle'] ?? '')) ?: null,
            'body' => trim((string)($data['body'] ?? '')) ?: null,
            'round_number' => !empty($data['round_number']) ? (int)$data['round_number'] : null,
        ];
        $db->prepare('INSERT INTO presentation_slides (tournament_id, type, title, content_json, sponsor_id, duration_seconds, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$tournamentId, $type, $title, json_encode($content, JSON_UNESCAPED_UNICODE), $sponsorId ?: null, $duration, (int)$order->fetchColumn(), !array_key_exists('is_active', $data) || $data['is_active'] ? 1 : 0]);
        $slideId = (int)$db->lastInsertId();
        Audit::record($db, 'presentation.slide_created', 'presentation_slide', $slideId, $user['id'], $tournamentId, ['type' => $type]);
        Http::json(['slides' => presentationSlidesPayload($db, $tournamentId)], 201);
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/slides/upload$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) Http::json(['error' => 'Kies een geldige afbeelding.'], 422);
        $file = $_FILES['image'];
        if ((int)$file['size'] > 10 * 1024 * 1024) Http::json(['error' => 'De afbeelding mag maximaal 10 MB zijn.'], 422);
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime]) || !getimagesize($file['tmp_name'])) Http::json(['error' => 'Alleen JPG, PNG en WebP zijn toegestaan.'], 422);
        $directory = __DIR__ . '/uploads/presentation';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) Http::json(['error' => 'De uploadmap kon niet worden aangemaakt.'], 500);
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $filename)) Http::json(['error' => 'De afbeelding kon niet worden opgeslagen.'], 500);
        $order = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM presentation_slides WHERE tournament_id = ?');
        $order->execute([$tournamentId]);
        $title = trim((string)($_POST['title'] ?? '')) ?: pathinfo((string)$file['name'], PATHINFO_FILENAME);
        $duration = min(300, max(3, (int)($_POST['duration_seconds'] ?? 10)));
        $path = '/uploads/presentation/' . $filename;
        try {
            $db->prepare("INSERT INTO presentation_slides (tournament_id, type, title, image_path, duration_seconds, sort_order, is_active) VALUES (?, 'image', ?, ?, ?, ?, 1)")
                ->execute([$tournamentId, $title, $path, $duration, (int)$order->fetchColumn()]);
        } catch (Throwable $cause) {
            if (is_file($directory . '/' . $filename)) unlink($directory . '/' . $filename);
            throw $cause;
        }
        $slideId = (int)$db->lastInsertId();
        Audit::record($db, 'presentation.image_uploaded', 'presentation_slide', $slideId, $user['id'], $tournamentId, ['mime' => $mime]);
        Http::json(['slides' => presentationSlidesPayload($db, $tournamentId)], 201);
    }

    if ($method === 'PATCH' && preg_match('#^/api/admin/slides/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $slideId = (int)$matches[1];
        $data = Http::input();
        $current = $db->prepare('SELECT tournament_id, type FROM presentation_slides WHERE id = ? LIMIT 1');
        $current->execute([$slideId]);
        $slide = $current->fetch();
        if (!$slide) Http::json(['error' => 'Slide niet gevonden.'], 404);
        $title = trim((string)($data['title'] ?? '')) ?: null;
        $duration = min(300, max(3, (int)($data['duration_seconds'] ?? 10)));
        $sponsorId = $slide['type'] === 'sponsor' ? (int)($data['sponsor_id'] ?? 0) : null;
        $content = ['subtitle' => trim((string)($data['subtitle'] ?? '')) ?: null, 'body' => trim((string)($data['body'] ?? '')) ?: null, 'round_number' => !empty($data['round_number']) ? (int)$data['round_number'] : null];
        $db->prepare('UPDATE presentation_slides SET title = ?, content_json = ?, sponsor_id = ?, duration_seconds = ?, is_active = ? WHERE id = ?')
            ->execute([$title, json_encode($content, JSON_UNESCAPED_UNICODE), $sponsorId ?: null, $duration, !empty($data['is_active']) ? 1 : 0, $slideId]);
        Audit::record($db, 'presentation.slide_updated', 'presentation_slide', $slideId, $user['id'], (int)$slide['tournament_id']);
        Http::json(['slides' => presentationSlidesPayload($db, (int)$slide['tournament_id'])]);
    }

    if ($method === 'DELETE' && preg_match('#^/api/admin/slides/(\d+)$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $slideId = (int)$matches[1];
        $current = $db->prepare('SELECT tournament_id, image_path FROM presentation_slides WHERE id = ? LIMIT 1');
        $current->execute([$slideId]);
        $slide = $current->fetch();
        if (!$slide) Http::json(['error' => 'Slide niet gevonden.'], 404);
        $db->prepare('DELETE FROM presentation_slides WHERE id = ?')->execute([$slideId]);
        if ($slide['image_path']) {
            $file = __DIR__ . '/' . ltrim((string)$slide['image_path'], '/');
            if (is_file($file)) unlink($file);
        }
        Audit::record($db, 'presentation.slide_deleted', 'presentation_slide', $slideId, $user['id'], (int)$slide['tournament_id']);
        Http::json(['slides' => presentationSlidesPayload($db, (int)$slide['tournament_id'])]);
    }

    if ($method === 'POST' && preg_match('#^/api/admin/tournaments/(\d+)/slides/reorder$#', $path, $matches)) {
        $user = Auth::requireRole($db, ['administrator']);
        Auth::verifyCsrf($user);
        $tournamentId = (int)$matches[1];
        $ids = array_map('intval', Http::input()['slide_ids'] ?? []);
        $existing = $db->prepare('SELECT id FROM presentation_slides WHERE tournament_id = ? ORDER BY sort_order, id');
        $existing->execute([$tournamentId]);
        $existingIds = array_map('intval', array_column($existing->fetchAll(), 'id'));
        if (count($ids) !== count($existingIds) || array_diff($ids, $existingIds) || count($ids) !== count(array_unique($ids))) Http::json(['error' => 'De slidevolgorde is ongeldig.'], 422);
        $db->beginTransaction();
        $update = $db->prepare('UPDATE presentation_slides SET sort_order = ? WHERE id = ? AND tournament_id = ?');
        foreach ($ids as $index => $id) $update->execute([$index + 1, $id, $tournamentId]);
        Audit::record($db, 'presentation.slides_reordered', 'tournament', $tournamentId, $user['id'], $tournamentId);
        $db->commit();
        Http::json(['slides' => presentationSlidesPayload($db, $tournamentId)]);
    }

    if ($method === 'GET' && $path === '/api/public/live') {
        $tournament = $db->query("SELECT * FROM tournaments WHERE status IN ('registration','live') ORDER BY starts_at LIMIT 1")->fetch();
        if (!$tournament) Http::json(['error' => 'Er is momenteel geen actief toernooi.'], 404);
        $limit = min(25, max(1, (int)$tournament['upcoming_match_count']));
        $upcoming = $db->prepare("SELECT m.id, m.round_number, m.bracket_position, m.scheduled_at, c.name AS court, p1.name AS player_one, p2.name AS player_two
            FROM matches m LEFT JOIN courts c ON c.id = m.court_id
            LEFT JOIN players p1 ON p1.id = m.player_one_id LEFT JOIN players p2 ON p2.id = m.player_two_id
            WHERE m.tournament_id = ? AND m.status = 'scheduled' ORDER BY m.scheduled_at ASC LIMIT {$limit}");
        $upcoming->execute([(int)$tournament['id']]);
        $featuredRound = $db->prepare("SELECT MIN(round_number) FROM matches WHERE tournament_id = ? AND round_number >= ? AND status <> 'complete' AND (player_one_id IS NOT NULL OR player_two_id IS NOT NULL)");
        $featuredRound->execute([(int)$tournament['id'], (int)$tournament['final_round_starts_at']]);
        $featuredRoundNumber = (int)$featuredRound->fetchColumn();
        $featured = null;
        if ($featuredRoundNumber > 0) {
            $roundCountStatement = $db->prepare('SELECT MAX(round_number) FROM matches WHERE tournament_id = ?');
            $roundCountStatement->execute([(int)$tournament['id']]);
            $featuredMatches = $db->prepare("SELECT m.id, m.round_number, m.bracket_position, m.scheduled_at, c.name AS court, p1.name AS player_one, p2.name AS player_two
                FROM matches m LEFT JOIN courts c ON c.id = m.court_id LEFT JOIN players p1 ON p1.id = m.player_one_id LEFT JOIN players p2 ON p2.id = m.player_two_id
                WHERE m.tournament_id = ? AND m.round_number = ? ORDER BY m.bracket_position");
            $featuredMatches->execute([(int)$tournament['id'], $featuredRoundNumber]);
            $featured = ['round_number' => $featuredRoundNumber, 'round_count' => (int)$roundCountStatement->fetchColumn(), 'matches' => $featuredMatches->fetchAll()];
        }
        Http::json(['tournament' => publicTournament($tournament), 'upcoming_matches' => $upcoming->fetchAll(), 'featured_round' => $featured, 'slides' => presentationSlidesPayload($db, (int)$tournament['id'], true), 'refreshed_at' => gmdate(DATE_ATOM)]);
    }

    if ($method === 'POST' && $path === '/api/registrations') {
        $data = Http::input();
        if (!empty($data['website'])) Http::json(['received' => true], 202);
        RateLimiter::check($db, 'registration', Http::ip(), 10, 30);
        $tournament = $db->query("SELECT * FROM tournaments WHERE status = 'registration' ORDER BY starts_at LIMIT 1")->fetch();
        if (!$tournament) Http::json(['error' => 'De inschrijving is gesloten.'], 409);

        foreach (['name','email','phone','date_of_birth','entrance_song_query'] as $field) {
            if (trim((string)($data[$field] ?? '')) === '') Http::json(['error' => "{$field} is verplicht"], 422);
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) Http::json(['error' => 'Vul een geldig e-mailadres in.'], 422);
        if (empty($data['knltb_number']) && (empty($data['singles_rating']) || empty($data['doubles_rating']))) {
            Http::json(['error' => 'Vul een KNLTB bondsnummer in, of zowel enkel- als dubbelsterkte.'], 422);
        }
        if (empty($data['accept_privacy']) || empty($data['accept_terms'])) Http::json(['error' => 'Accepteer de privacyverklaring en toernooivoorwaarden.'], 422);

        $birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$data['date_of_birth']);
        $startDate = new DateTimeImmutable($tournament['starts_at'], new DateTimeZone($tournament['timezone']));
        if (!$birthDate || $birthDate->modify('+18 years') > $startDate) Http::json(['error' => 'Je moet op de toernooidatum minimaal 18 jaar zijn.'], 422);
        $count = $db->prepare("SELECT COUNT(*) FROM players WHERE tournament_id = ? AND (registration_status = 'confirmed' OR (registration_status = 'payment_pending' AND payment_reservation_expires_at > NOW()))");
        $count->execute([(int)$tournament['id']]);
        if ((int)$count->fetchColumn() >= (int)$tournament['capacity']) Http::json(['error' => 'Het toernooi is vol. Schrijf je in voor de wachtlijst.'], 409);

        $db->beginTransaction();
        $statement = $db->prepare("INSERT INTO players (
            tournament_id, name, email, phone, date_of_birth, age_verified_at, knltb_number, singles_rating, doubles_rating,
            entrance_song_query, registration_status, payment_reservation_expires_at, privacy_version, privacy_accepted_at, terms_version, terms_accepted_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'payment_pending', DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?, NOW(), ?, NOW())");
        $statement->execute([
            (int)$tournament['id'], trim($data['name']), strtolower(trim($data['email'])), trim($data['phone']), $birthDate->format('Y-m-d'),
            ($data['knltb_number'] ?? '') ?: null, ($data['singles_rating'] ?? '') ?: null, ($data['doubles_rating'] ?? '') ?: null,
            trim($data['entrance_song_query']), $tournament['privacy_version'], $tournament['terms_version'],
        ]);
        $playerId = (int)$db->lastInsertId();

        $mollie = new MollieApiClient();
        $mollie->setApiKey(getenv('MOLLIE_API_KEY') ?: '');
        $amount = number_format(((int)$tournament['registration_price_cents']) / 100, 2, '.', '');
        $appUrl = rtrim(getenv('APP_URL') ?: 'http://localhost:8080', '/');
        $frontendUrl = rtrim(getenv('FRONTEND_URL') ?: 'http://localhost:3000', '/');
        $payment = $mollie->payments->create([
            'amount' => ['currency' => $tournament['currency'], 'value' => $amount],
            'description' => "{$tournament['name']} inschrijving #{$playerId}",
            'redirectUrl' => "{$frontendUrl}/tournament/inschrijving/bevestiging?player={$playerId}",
            'webhookUrl' => "{$appUrl}/api/payments/mollie-webhook",
            'metadata' => ['player_id' => $playerId, 'tournament_id' => (int)$tournament['id']],
        ]);
        $db->prepare("INSERT INTO payments (player_id, provider, provider_payment_id, amount_cents, currency, status) VALUES (?, 'mollie', ?, ?, ?, ?)")
            ->execute([$playerId, $payment->id, (int)$tournament['registration_price_cents'], $tournament['currency'], $payment->status]);
        Audit::record($db, 'registration.started', 'player', $playerId, null, (int)$tournament['id']);
        $db->commit();
        Http::json(['player_id' => $playerId, 'checkout_url' => $payment->getCheckoutUrl()], 201);
    }

    if ($method === 'POST' && $path === '/api/payments/mollie-webhook') {
        $paymentId = $_POST['id'] ?? null;
        if (!$paymentId) Http::json(['error' => 'Payment ID ontbreekt'], 400);
        $mollie = new MollieApiClient();
        $mollie->setApiKey(getenv('MOLLIE_API_KEY') ?: '');
        $payment = $mollie->payments->get($paymentId);
        $statement = $db->prepare('SELECT py.id, py.player_id, py.status, p.tournament_id FROM payments py JOIN players p ON p.id = py.player_id WHERE py.provider_payment_id = ?');
        $statement->execute([$paymentId]);
        $stored = $statement->fetch();
        if (!$stored) Http::json(['received' => true]);
        $db->beginTransaction();
        $db->prepare("UPDATE payments SET status = ?, paid_at = IF(? = 'paid', COALESCE(paid_at, NOW()), paid_at), updated_at = NOW() WHERE id = ?")
            ->execute([$payment->status, $payment->status, (int)$stored['id']]);
        if ($payment->isPaid() && $stored['status'] !== 'paid') {
            $db->prepare("UPDATE players SET registration_status = 'confirmed', payment_reservation_expires_at = NULL WHERE id = ?")
                ->execute([(int)$stored['player_id']]);
            Auth::issuePlayerToken($db, (int)$stored['player_id']);
            Audit::record($db, 'payment.paid', 'payment', (int)$stored['id'], null, (int)$stored['tournament_id'], ['provider_payment_id' => $paymentId]);
        }
        $db->commit();
        Http::json(['received' => true]);
    }

    Http::json(['error' => 'Route niet gevonden'], 404);
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log($error->getMessage());
    Http::json(['error' => getenv('APP_ENV') === 'local' ? $error->getMessage() : 'Interne serverfout'], 500);
}
