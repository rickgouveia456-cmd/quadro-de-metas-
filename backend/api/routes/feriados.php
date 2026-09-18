<?php
// GET    /api/feriados       → lista feriados customizados
// POST   /api/feriados       → adicionar { data, descricao }
// DELETE /api/feriados/{id}  → remover
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';
setCors();

$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);
$db     = getDB();

if ($method === 'GET') {
    authUser();
    $rows = $db->query('SELECT * FROM feriados_custom ORDER BY data')->fetchAll();
    ok($rows);
}

if ($method === 'POST') {
    requirePerfil('admin','engenheiro');
    $b = body();
    if (empty($b['data'])) err('Data obrigatória');
    $db->prepare('INSERT IGNORE INTO feriados_custom (data,descricao) VALUES (?,?)')
       ->execute([$b['data'], $b['descricao'] ?? null]);
    ok(null, 'Feriado adicionado');
}

if ($method === 'DELETE' && $id) {
    requirePerfil('admin','engenheiro');
    $db->prepare('DELETE FROM feriados_custom WHERE id = ?')->execute([$id]);
    ok(null, 'Feriado removido');
}

err('Rota não encontrada', 404);
