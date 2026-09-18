<?php
// ================================================================
// GET    /api/obras          → lista todas as obras
// GET    /api/obras/{codigo} → detalhe de uma obra
// POST   /api/obras          → criar obra (admin/engenheiro)
// PUT    /api/obras/{codigo} → atualizar obra (admin/engenheiro)
// DELETE /api/obras/{codigo} → desativar obra (admin)
// ================================================================
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';

setCors();

$method = $_SERVER['REQUEST_METHOD'];
$codigo = trim($_GET['codigo'] ?? '');
$db     = getDB();

// ── GET /obras ───────────────────────────────────────────────
if ($method === 'GET' && !$codigo) {
    authUser();
    $rows = $db->query(
        'SELECT * FROM obras WHERE ativo = 1 ORDER BY criado_em'
    )->fetchAll();
    // Converte ciclos string → array
    $rows = array_map(fn($r) => obraFormat($r), $rows);
    ok($rows);
}

// ── GET /obras/{codigo} ──────────────────────────────────────
if ($method === 'GET' && $codigo) {
    authUser();
    $st = $db->prepare('SELECT * FROM obras WHERE codigo = ? AND ativo = 1');
    $st->execute([$codigo]);
    $obra = $st->fetch();
    if (!$obra) err('Obra não encontrada', 404);
    ok(obraFormat($obra));
}

// ── POST /obras ──────────────────────────────────────────────
if ($method === 'POST') {
    requirePerfil('admin', 'engenheiro');
    $b = body();

    $campos = ['codigo','nome','pavimentos','aptos_por_pav','ciclos',
                'dias_por_meta','tipologia','data_inicio','data_termino',
                'obra_anterior','sequencia'];

    $vals = [
        'codigo'        => strtoupper(trim($b['codigo']  ?? '')),
        'nome'          => trim($b['nome']               ?? ''),
        'pavimentos'    => (int)($b['pavimentos']         ?? 17),
        'aptos_por_pav' => (int)($b['aptosPorPav']       ?? 4),
        'ciclos'        => implode(',', (array)($b['ciclos'] ?? ['A','B','C','D'])),
        'dias_por_meta' => (int)($b['diasPorMeta']        ?? 1),
        'tipologia'     => trim($b['tipologia']           ?? 'TC'),
        'data_inicio'   => $b['dataInicio']  ?: null,
        'data_termino'  => $b['dataTermino'] ?: null,
        'obra_anterior' => $b['obraAnterior'] ?: null,
        'sequencia'     => trim($b['sequencia'] ?? 'ABCD'),
    ];

    if (!$vals['codigo'] || !$vals['nome']) err('Código e nome são obrigatórios');

    $db->prepare(
        'INSERT INTO obras (codigo,nome,pavimentos,aptos_por_pav,ciclos,
          dias_por_meta,tipologia,data_inicio,data_termino,obra_anterior,sequencia)
         VALUES (:codigo,:nome,:pavimentos,:aptos_por_pav,:ciclos,
          :dias_por_meta,:tipologia,:data_inicio,:data_termino,:obra_anterior,:sequencia)'
    )->execute($vals);

    ok(['codigo' => $vals['codigo']], 'Obra criada com sucesso');
}

// ── PUT /obras/{codigo} ──────────────────────────────────────
if ($method === 'PUT' && $codigo) {
    requirePerfil('admin', 'engenheiro');
    $b = body();

    $sets = [];
    $params = [];

    $map = [
        'nome'          => 'nome',
        'pavimentos'    => 'pavimentos',
        'aptosPorPav'   => 'aptos_por_pav',
        'diasPorMeta'   => 'dias_por_meta',
        'tipologia'     => 'tipologia',
        'dataInicio'    => 'data_inicio',
        'dataTermino'   => 'data_termino',
        'obraAnterior'  => 'obra_anterior',
        'sequencia'     => 'sequencia',
    ];

    foreach ($map as $jsKey => $dbCol) {
        if (array_key_exists($jsKey, $b)) {
            $sets[]         = "{$dbCol} = ?";
            $params[]       = $b[$jsKey];
        }
    }
    if (array_key_exists('ciclos', $b)) {
        $sets[]   = 'ciclos = ?';
        $params[] = is_array($b['ciclos']) ? implode(',', $b['ciclos']) : $b['ciclos'];
    }

    if (empty($sets)) err('Nenhum campo para atualizar');
    $params[] = $codigo;

    $db->prepare('UPDATE obras SET ' . implode(', ', $sets) . ' WHERE codigo = ?')
       ->execute($params);

    ok(null, 'Obra atualizada');
}

// ── DELETE /obras/{codigo} ───────────────────────────────────
if ($method === 'DELETE' && $codigo) {
    requirePerfil('admin');
    $db->prepare('UPDATE obras SET ativo = 0 WHERE codigo = ?')->execute([$codigo]);
    ok(null, 'Obra desativada');
}

err('Rota não encontrada', 404);

// ── Helper format ────────────────────────────────────────────
function obraFormat(array $r): array {
    $r['ciclos']      = explode(',', $r['ciclos']);
    $r['pavimentos']  = (int)$r['pavimentos'];
    $r['aptosPorPav'] = (int)$r['aptos_por_pav'];
    $r['diasPorMeta'] = (int)$r['dias_por_meta'];
    unset($r['aptos_por_pav'], $r['dias_por_meta']);
    return $r;
}
