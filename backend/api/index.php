<?php
// ================================================================
// Router principal — /api/{recurso}/{sub?}
// ================================================================
declare(strict_types=1);

// Remove trailing slash do PATH_INFO
$uri = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

// Extrai segmentos após /api
$base    = '/api';
$path    = ltrim(substr($uri, strlen($base)), '/');
$partes  = explode('/', $path);
$recurso = $partes[0] ?? '';
$param   = $partes[1] ?? '';

// Repassa parâmetros de URL como $_GET para as rotas
if ($param && !isset($_GET[$recurso === 'obras' ? 'codigo' : 'id'])) {
    $_GET[$recurso === 'obras' ? 'codigo' : 'id'] = $param;
}
$_GET['sub'] = $param;

// Health check
if ($recurso === 'health') {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'ts' => date('c')]);
    exit;
}

$routes = [
    'auth'       => __DIR__ . '/routes/auth.php',
    'obras'      => __DIR__ . '/routes/obras.php',
    'metas'      => __DIR__ . '/routes/metas.php',
    'historico'  => __DIR__ . '/routes/historico.php',
    'restricoes' => __DIR__ . '/routes/restricoes.php',
    'feriados'   => __DIR__ . '/routes/feriados.php',
];

if (!isset($routes[$recurso])) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'msg' => "Recurso '{$recurso}' não encontrado"]);
    exit;
}

require $routes[$recurso];
