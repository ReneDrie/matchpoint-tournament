<?php

declare(strict_types=1);

use Matchpoint\Database;

require dirname(__DIR__) . '/vendor/autoload.php';

[$script, $email, $name, $password] = array_pad($argv, 4, null);
if (!$email || !$name || !$password || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Gebruik: php bin/create-admin.php email naam wachtwoord (minimaal 12 tekens)\n");
    exit(1);
}

$db = Database::connect();
$statement = $db->prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'administrator')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'administrator', is_active = 1"
);
$statement->execute([$name, strtolower($email), password_hash($password, PASSWORD_DEFAULT)]);
fwrite(STDOUT, "Administrator aangemaakt: " . strtolower($email) . "\n");
