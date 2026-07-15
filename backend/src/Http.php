<?php

declare(strict_types=1);

namespace Matchpoint;

final class Http
{
    public static function json(array $payload, int $status = 200): never
    {
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function input(): array
    {
        $data = json_decode(file_get_contents('php://input') ?: '{}', true);
        return is_array($data) ? $data : [];
    }

    public static function ip(): string
    {
        return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
    }

    public static function bearerToken(): ?string
    {
        $header = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        return preg_match('/^Bearer\s+(.+)$/i', $header, $matches) ? trim($matches[1]) : null;
    }
}
