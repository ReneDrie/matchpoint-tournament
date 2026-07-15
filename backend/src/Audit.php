<?php

declare(strict_types=1);

namespace Matchpoint;

use PDO;

final class Audit
{
    public static function record(
        PDO $db,
        string $action,
        string $entityType,
        ?int $entityId = null,
        ?int $userId = null,
        ?int $tournamentId = null,
        array $payload = []
    ): void {
        $statement = $db->prepare(
            'INSERT INTO audit_log (tournament_id, user_id, action, entity_type, entity_id, payload_json, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $tournamentId,
            $userId,
            $action,
            $entityType,
            $entityId,
            $payload === [] ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            Http::ip() ?: null,
        ]);
    }
}
