<?php
// ================================================================
// Conexão PDO com MariaDB — singleton
// ================================================================
declare(strict_types=1);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host = getenv('DB_HOST')     ?: 'db';
    $name = getenv('DB_NAME')     ?: 'quadro_metas';
    $user = getenv('DB_USER')     ?: 'quadro';
    $pass = getenv('DB_PASSWORD') ?: 'quadro_pass';

    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}
