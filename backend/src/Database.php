<?php

declare(strict_types=1);

namespace Matchpoint;

use PDO;

final class Database
{
    public static function connect(): PDO
    {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $name = getenv('DB_DATABASE') ?: 'matchpoint';
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        return new PDO($dsn, getenv('DB_USERNAME') ?: 'matchpoint', getenv('DB_PASSWORD') ?: '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
