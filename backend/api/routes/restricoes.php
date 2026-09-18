<?php
// GET    /api/restricoes?obra=TC
// POST   /api/restricoes
// PUT    /api/restricoes/{id}
// DELETE /api/restricoes/{id}
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';
setCors();

$method = $_SERVER['REQUEST_METHOD'];
$id     = (int)($_GET['id'] ?? 0);
$obra   = trim($_GET['obra'] ?? '');
$db     = getDB();

if ($method === 'GET') {
    authUser();
    if (!$obra) err('Parâmetro obra obrigatório');
    $st = $db->prepare('SELECT * FROM restricoes WHERE obra_codigo = ? ORDER BY criado_em DESC');
    $st->execute([$obra]);
    ok($st->fetchAll());
}

if ($method === 'POST') {
    $user = requirePerfil('admin','engenheiro','mestre');
    $b    = body();
    $obra = trim($b['obra'] ?? '');
    if (!$obra || empty($b['descricao'])) err('obra e descricao são obrigatórios');

    $db->prepare(
        'INSERT INTO restricoes (obra_codigo,tipo,descricao,responsavel,prazo,pacote_id,criado_por)
         VALUES (?,?,?,?,?,?,?)'
    )->execute([
        $obra,
        $b['tipo']       ?? 'Outro',
        $b['descricao'],
        $b['responsavel'] ?: null,
        $b['prazo']       ?: null,
        $b['pacoteId']    ?: null,
        $user['label'],
    ]);
    ok(['id' => $db->lastInsertId()], 'Restrição criada');
}

if ($method === 'PUT' && $id) {
    $user = requirePerfil('admin','engenheiro','mestre');
    $b    = body();
    $sets = []; $params = [];
    foreach (['tipo','descricao','responsavel','prazo','status'] as $f) {
        if (array_key_exists($f, $b)) { $sets[] = "{$f} = ?"; $params[] = $b[$f]; }
    }
    if (empty($sets)) err('Nenhum campo');
    $params[] = $id;
    $db->prepare('UPDATE restricoes SET ' . implode(',', $sets) . ' WHERE id = ?')->execute($params);
    ok(null, 'Restrição atualizada');
}

if ($method === 'DELETE' && $id) {
    requirePerfil('admin','engenheiro');
    $db->prepare('DELETE FROM restricoes WHERE id = ?')->execute([$id]);
    ok(null, 'Restrição removida');
}

err('Rota não encontrada', 404);
