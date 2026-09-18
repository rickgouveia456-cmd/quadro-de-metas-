<?php
// ================================================================
// Router principal — /api/{recurso}/{sub?}
// ================================================================
declare(strict_types=1);

require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/init_db.php';

// Auto-cria tabelas se banco estiver vazio (primeira vez no Railway)
autoInit();

// Remove trailing slash do PATH_INFO
$uri  = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$base = '/api';
$path = ltrim(substr($uri, strlen($base)), '/');

$partes  = explode('/', $path);
$recurso = $partes[0] ?? '';
$param   = $partes[1] ?? '';

// Repassa parâmetro de URL para $_GET
if ($param) {
    $_GET[$recurso === 'obras' ? 'codigo' : 'id'] = $param;
}
$_GET['sub'] = $param;

// ── Health check ─────────────────────────────────────────────
if ($recurso === 'health') {
    header('Content-Type: application/json');
    $dbOk = false;
    try { getDB()->query('SELECT 1'); $dbOk = true; } catch (\Throwable) {}
    http_response_code($dbOk ? 200 : 503);
    echo json_encode([
        'ok'  => $dbOk,
        'db'  => $dbOk ? 'connected' : 'error',
        'ts'  => date('c'),
        'env' => getenv('APP_ENV') ?: 'unknown',
    ]);
    exit;
}

// ── Endpoint de init manual (útil para primeiro deploy) ──────
if ($recurso === 'setup') {
    header('Content-Type: application/json');
    // Só permite se não houver usuários ainda (banco virgem) ou via token de setup
    $setupToken = getenv('SETUP_TOKEN') ?: '';
    $reqToken   = $_GET['token'] ?? ($_SERVER['HTTP_X_SETUP_TOKEN'] ?? '');
    $db = getDB();
    $temUsuarios = $db->query("SHOW TABLES LIKE 'usuarios'")->fetch();

    if ($temUsuarios && (!$setupToken || $reqToken !== $setupToken)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'msg' => 'Setup já realizado.']);
        exit;
    }
    echo json_encode(initDb());
    exit;
}

// ── Rotas da API ─────────────────────────────────────────────
$routes = [
    'auth'       => __DIR__ . '/routes/auth.php',
    'obras'      => __DIR__ . '/routes/obras.php',
    'metas'      => __DIR__ . '/routes/metas.php',
    'historico'  => __DIR__ . '/routes/historico.php',
    'restricoes' => __DIR__ . '/routes/restricoes.php',
    'feriados'   => __DIR__ . '/routes/feriados.php',
];

if (!isset($routes[$recurso])) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['ok' => false, 'msg' => "Recurso '{$recurso}' nao encontrado"]);
    exit;
}

require $routes[$recurso];
