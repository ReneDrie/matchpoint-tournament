<?php

declare(strict_types=1);

namespace Matchpoint;

use DateTimeImmutable;
use PDO;

final class Auth
{
    private const COOKIE = 'mpt_session';

    public static function login(PDO $db, string $email, string $password): array
    {
        RateLimiter::check($db, 'staff-login', Http::ip() . '|' . $email);
        $statement = $db->prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1');
        $statement->execute([strtolower(trim($email))]);
        $user = $statement->fetch();

        if (!$user || !$user['is_active'] || !password_verify($password, $user['password_hash'])) {
            Audit::record($db, 'auth.login_failed', 'user', $user ? (int)$user['id'] : null, null, null, ['email' => strtolower(trim($email))]);
            Http::json(['error' => 'E-mailadres of wachtwoord is onjuist.'], 401);
        }

        RateLimiter::clear($db, 'staff-login', Http::ip() . '|' . $email);
        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        $expires = new DateTimeImmutable('+12 hours');
        $db->prepare(
            'INSERT INTO user_sessions (user_id, token_hash, csrf_token, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            (int)$user['id'],
            hash('sha256', $token),
            $csrf,
            Http::ip() ?: null,
            substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500) ?: null,
            $expires->format('Y-m-d H:i:s'),
        ]);
        $db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int)$user['id']]);
        self::setCookie($token, $expires->getTimestamp());
        Audit::record($db, 'auth.login', 'user', (int)$user['id'], (int)$user['id']);

        return self::publicUser($user, $csrf);
    }

    public static function current(PDO $db, bool $required = true): ?array
    {
        $token = $_COOKIE[self::COOKIE] ?? Http::bearerToken();
        if (!$token) {
            if ($required) Http::json(['error' => 'Log in om door te gaan.'], 401);
            return null;
        }

        $statement = $db->prepare(
            'SELECT u.id, u.name, u.email, u.role, u.is_active, s.id AS session_id, s.csrf_token
             FROM user_sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1'
        );
        $statement->execute([hash('sha256', $token)]);
        $user = $statement->fetch();
        if (!$user || !$user['is_active']) {
            self::clearCookie();
            if ($required) Http::json(['error' => 'Je sessie is verlopen. Log opnieuw in.'], 401);
            return null;
        }

        $db->prepare('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = ?')->execute([(int)$user['session_id']]);
        return self::publicUser($user, $user['csrf_token']);
    }

    public static function requireRole(PDO $db, array $roles): array
    {
        $user = self::current($db);
        if (!in_array($user['role'], $roles, true)) {
            Http::json(['error' => 'Je hebt geen toegang tot deze actie.'], 403);
        }
        return $user;
    }

    public static function verifyCsrf(array $user): void
    {
        $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($provided === '' || !hash_equals($user['csrf_token'], $provided)) {
            Http::json(['error' => 'Ongeldige beveiligingstoken. Vernieuw de pagina en probeer opnieuw.'], 419);
        }
    }

    public static function logout(PDO $db): void
    {
        $token = $_COOKIE[self::COOKIE] ?? Http::bearerToken();
        if ($token) $db->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        self::clearCookie();
    }

    public static function issuePlayerToken(PDO $db, int $playerId, string $purpose = 'manage', string $lifetime = '+30 minutes'): string
    {
        $token = bin2hex(random_bytes(32));
        $expires = new DateTimeImmutable($lifetime);
        $db->prepare(
            'UPDATE player_access_tokens SET used_at = NOW() WHERE player_id = ? AND purpose = ? AND used_at IS NULL'
        )->execute([$playerId, $purpose]);
        $db->prepare(
            'INSERT INTO player_access_tokens (player_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?)'
        )->execute([$playerId, hash('sha256', $token), $purpose, $expires->format('Y-m-d H:i:s')]);
        return $token;
    }

    private static function publicUser(array $user, string $csrf): array
    {
        return [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'csrf_token' => $csrf,
        ];
    }

    private static function setCookie(string $token, int $expires): void
    {
        setcookie(self::COOKIE, $token, [
            'expires' => $expires,
            'path' => getenv('COOKIE_PATH') ?: '/',
            'secure' => getenv('APP_ENV') === 'production',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function clearCookie(): void
    {
        setcookie(self::COOKIE, '', [
            'expires' => time() - 3600,
            'path' => getenv('COOKIE_PATH') ?: '/',
            'secure' => getenv('APP_ENV') === 'production',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
