<?php
// ================================================================
// Conexão PDO — suporta DATABASE_URL (Railway) ou variáveis separadas
// ================================================================
declare(strict_types=1);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Railway injeta DATABASE_URL no formato:
    // mysql://user:pass@host:port/dbname
    $url = getenv('DATABASE_URL') ?: getenv('MYSQL_URL') ?: '';

    if ($url) {
        $p    = parse_url($url);
        $host = $p['host']                        ?? 'localhost';
        $port = $p['port']                        ?? 3306;
        $name = ltrim($p['path'] ?? '/railway', '/');
        $user = urldecode($p['user']              ?? 'root');
        $pass = urldecode($p['pass']              ?? '');
    } else {
        $host = getenv('DB_HOST')     ?: 'db';
        $port = getenv('DB_PORT')     ?: 3306;
        $name = getenv('DB_NAME')     ?: 'railway';
        $user = getenv('DB_USER')     ?: 'root';
        $pass = getenv('DB_PASSWORD') ?: '';
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 10,
    ]);

    return $pdo;
}
