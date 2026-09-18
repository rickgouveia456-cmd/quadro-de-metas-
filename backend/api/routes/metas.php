<?php
// ================================================================
// GET  /api/metas?obra=TC             → todo o estado da obra
// GET  /api/metas?obra=TC&pacote=GRA-VAO&unidade=1A → estado específico
// POST /api/metas                     → salvar/atualizar estado
// POST /api/metas/batch               → salvar lote (sync do localStorage)
// ================================================================
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';

setCors();

$method = $_SERVER['REQUEST_METHOD'];
$sub    = trim($_GET['sub'] ?? '');
$db     = getDB();

// ── GET /metas?obra=TC ───────────────────────────────────────
if ($method === 'GET') {
    $user  = authUser();
    $obra  = trim($_GET['obra']    ?? '');
    $pac   = trim($_GET['pacote']  ?? '');
    $uni   = trim($_GET['unidade'] ?? '');

    if (!$obra) err('Parâmetro obra obrigatório');

    // Estado principal
    $sql    = 'SELECT * FROM estado_metas WHERE obra_codigo = ?';
    $params = [$obra];

    if ($pac)  { $sql .= ' AND pacote_id = ?';    $params[] = $pac; }
    if ($uni)  { $sql .= ' AND unidade_cod = ?';  $params[] = $uni; }

    $st = $db->prepare($sql);
    $st->execute($params);
    $metas = $st->fetchAll();

    // Estado FVS
    $sqlFvs = 'SELECT * FROM estado_fvs WHERE obra_codigo = ?';
    $pFvs   = [$obra];
    if ($pac) { $sqlFvs .= ' AND pacote_id = ?'; $pFvs[] = $pac; }
    if ($uni) { $sqlFvs .= ' AND unidade_cod = ?'; $pFvs[] = $uni; }

    $stF = $db->prepare($sqlFvs);
    $stF->execute($pFvs);
    $fvs = $stF->fetchAll();

    // Monta o mapa igual ao formato do localStorage do frontend:
    // { "pacote_id|unidade_cod": { status, dataPlanejada, ... } }
    $mapa = [];
    foreach ($metas as $m) {
        $chave = $m['pacote_id'] . '|' . $m['unidade_cod'];
        $mapa[$chave] = [
            'status'              => $m['status'],
            'dataPlanejada'       => $m['data_planejada'],
            'dataReprogramada'    => $m['data_reprogramada'],
            'dataReal'            => $m['data_real'],
            'programadoManualmente' => (bool)$m['programado_manual'],
            'observacao'          => $m['observacao'],
        ];
    }
    foreach ($fvs as $f) {
        $chave = $f['pacote_id'] . '_FVS|' . $f['unidade_cod'];
        $mapa[$chave] = [
            'fvsStatus'     => $f['fvs_status'],
            'dataPlanejada' => $f['data_planejada'],
        ];
    }

    ok($mapa);
}

// ── POST /metas/batch  (sync completo do estado) ─────────────
if ($method === 'POST' && $sub === 'batch') {
    $user = requirePerfil('admin','engenheiro','mestre','encarregado');
    $b    = body();
    $obra = trim($b['obra'] ?? '');
    $itens = $b['itens'] ?? [];   // array de { pacote, unidade, ...campos }

    if (!$obra) err('Parâmetro obra obrigatório');
    if (!is_array($itens) || empty($itens)) err('Nenhum item enviado');

    $db->beginTransaction();
    try {
        $stMeta = $db->prepare(
            'INSERT INTO estado_metas
               (obra_codigo,pacote_id,unidade_cod,status,data_planejada,
                data_reprogramada,data_real,programado_manual,observacao,atualizado_por)
             VALUES (?,?,?,?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE
               status              = VALUES(status),
               data_planejada      = VALUES(data_planejada),
               data_reprogramada   = VALUES(data_reprogramada),
               data_real           = VALUES(data_real),
               programado_manual   = VALUES(programado_manual),
               observacao          = VALUES(observacao),
               atualizado_por      = VALUES(atualizado_por)'
        );
        $stFvs = $db->prepare(
            'INSERT INTO estado_fvs
               (obra_codigo,pacote_id,unidade_cod,fvs_status,data_planejada)
             VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE
               fvs_status     = VALUES(fvs_status),
               data_planejada = VALUES(data_planejada)'
        );

        foreach ($itens as $item) {
            $pac = $item['pacote']  ?? '';
            $uni = $item['unidade'] ?? '';
            if (!$pac || !$uni) continue;

            // FVS separado
            if (str_ends_with($pac, '_FVS')) {
                $stFvs->execute([
                    $obra,
                    rtrim($pac, '_FVS'),  // pacote sem sufixo
                    $uni,
                    $item['fvsStatus'] ?? 'nao-iniciada',
                    $item['dataPlanejada'] ?? null,
                ]);
                continue;
            }

            $stMeta->execute([
                $obra,
                $pac,
                $uni,
                $item['status']              ?? 'nao-iniciada',
                $item['dataPlanejada']        ?: null,
                $item['dataReprogramada']     ?: null,
                $item['dataReal']             ?: null,
                empty($item['programadoManualmente']) ? 0 : 1,
                $item['observacao']           ?: null,
                $user['label'],
            ]);
        }

        $db->commit();
        ok(['salvos' => count($itens)], 'Batch salvo com sucesso');
    } catch (\Throwable $e) {
        $db->rollBack();
        err('Erro ao salvar: ' . $e->getMessage(), 500);
    }
}

// ── POST /metas  (salvar uma meta individual) ─────────────────
if ($method === 'POST' && $sub === '') {
    $user = requirePerfil('admin','engenheiro','mestre','encarregado');
    $b    = body();

    $obra   = trim($b['obra']    ?? '');
    $pac    = trim($b['pacote']  ?? '');
    $uni    = trim($b['unidade'] ?? '');

    if (!$obra || !$pac || !$uni) err('obra, pacote e unidade são obrigatórios');

    // FVS
    if (str_ends_with($pac, '_FVS')) {
        $db->prepare(
            'INSERT INTO estado_fvs (obra_codigo,pacote_id,unidade_cod,fvs_status,data_planejada)
             VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE fvs_status=VALUES(fvs_status), data_planejada=VALUES(data_planejada)'
        )->execute([
            $obra,
            str_replace('_FVS', '', $pac),
            $uni,
            $b['fvsStatus'] ?? 'nao-iniciada',
            $b['dataPlanejada'] ?: null,
        ]);
        ok(null, 'FVS atualizado');
    }

    // Meta normal
    $db->prepare(
        'INSERT INTO estado_metas
           (obra_codigo,pacote_id,unidade_cod,status,data_planejada,
            data_reprogramada,data_real,programado_manual,observacao,atualizado_por)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           status=VALUES(status), data_planejada=VALUES(data_planejada),
           data_reprogramada=VALUES(data_reprogramada), data_real=VALUES(data_real),
           programado_manual=VALUES(programado_manual), observacao=VALUES(observacao),
           atualizado_por=VALUES(atualizado_por)'
    )->execute([
        $obra, $pac, $uni,
        $b['status']           ?? 'nao-iniciada',
        $b['dataPlanejada']    ?: null,
        $b['dataReprogramada'] ?: null,
        $b['dataReal']         ?: null,
        empty($b['programadoManualmente']) ? 0 : 1,
        $b['observacao']       ?: null,
        $user['label'],
    ]);

    // Registra histórico
    if (!empty($b['historico'])) {
        $db->prepare(
            'INSERT INTO historico (obra_codigo,pacote_id,unidade_cod,acao,valor_anterior,valor_novo,usuario)
             VALUES (?,?,?,?,?,?,?)'
        )->execute([
            $obra, $pac, $uni,
            $b['historico']['acao']      ?? 'alteracao',
            json_encode($b['historico']['anterior'] ?? null),
            json_encode($b['historico']['novo']     ?? null),
            $user['label'],
        ]);
    }

    ok(null, 'Meta salva');
}

err('Rota não encontrada', 404);
