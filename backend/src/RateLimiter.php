<?php

declare(strict_types=1);

namespace Matchpoint;

use DateTimeImmutable;
use PDO;

final class RateLimiter
{
    public static function check(PDO $db, string $scope, string $identifier, int $limit = 8, int $windowMinutes = 15): void
    {
        $key = hash('sha256', $scope . '|' . strtolower($identifier));
        $select = $db->prepare('SELECT attempts, window_started_at, blocked_until FROM rate_limits WHERE rate_key = ?');
        $select->execute([$key]);
        $row = $select->fetch();
        $now = new DateTimeImmutable();

        if ($row && $row['blocked_until'] && new DateTimeImmutable($row['blocked_until']) > $now) {
            Http::json(['error' => 'Te veel pogingen. Probeer het later opnieuw.'], 429);
        }

        $windowExpired = !$row || new DateTimeImmutable($row['window_started_at']) <= $now->modify("-{$windowMinutes} minutes");
        if ($windowExpired) {
            $statement = $db->prepare(
                'INSERT INTO rate_limits (rate_key, attempts, window_started_at, blocked_until) VALUES (?, 1, NOW(), NULL)
                 ON DUPLICATE KEY UPDATE attempts = 1, window_started_at = NOW(), blocked_until = NULL'
            );
            $statement->execute([$key]);
            return;
        }

        $attempts = (int)$row['attempts'] + 1;
        $blockedUntil = $attempts > $limit ? $now->modify("+{$windowMinutes} minutes")->format('Y-m-d H:i:s') : null;
        $db->prepare('UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE rate_key = ?')
            ->execute([$attempts, $blockedUntil, $key]);

        if ($blockedUntil) {
            Http::json(['error' => 'Te veel pogingen. Probeer het later opnieuw.'], 429);
        }
    }

    public static function clear(PDO $db, string $scope, string $identifier): void
    {
        $key = hash('sha256', $scope . '|' . strtolower($identifier));
        $db->prepare('DELETE FROM rate_limits WHERE rate_key = ?')->execute([$key]);
    }
}
