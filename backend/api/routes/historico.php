<?php
// GET  /api/historico?obra=TC&limit=100
// DELETE /api/historico?obra=TC  (admin only — limpa histórico)
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';
setCors();

$method = $_SERVER['REQUEST_METHOD'];
$obra   = trim($_GET['obra'] ?? '');
$db     = getDB();

if ($method === 'GET') {
    authUser();
    if (!$obra) err('Parâmetro obra obrigatório');
    $limit = min((int)($_GET['limit'] ?? 200), 500);
    $st = $db->prepare(
        'SELECT * FROM historico WHERE obra_codigo = ?
         ORDER BY criado_em DESC LIMIT ?'
    );
    $st->execute([$obra, $limit]);
    ok($st->fetchAll());
}

if ($method === 'DELETE') {
    requirePerfil('admin');
    if (!$obra) err('Parâmetro obra obrigatório');
    $db->prepare('DELETE FROM historico WHERE obra_codigo = ?')->execute([$obra]);
    ok(null, 'Histórico limpo');
}

err('Rota não encontrada', 404);
