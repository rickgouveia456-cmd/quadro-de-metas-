<?php
// ================================================================
// init_db.php — roda na primeira requisição se as tabelas não existem
// Pode ser chamado também via: GET /api/init  (apenas admin ou sem usuários)
// ================================================================
declare(strict_types=1);
require_once __DIR__ . '/core/db.php';

function initDb(): array {
    $db   = getDB();
    $msgs = [];

    // Verifica se as tabelas já existem
    $tabelas = $db->query("SHOW TABLES LIKE 'usuarios'")->fetchAll();
    if (!empty($tabelas)) {
        return ['ok' => true, 'msg' => 'Banco já inicializado.'];
    }

    // Lê e executa schema.sql
    $schemaFile = '/var/www/html/schema.sql';
    $seedFile   = '/var/www/html/seed.sql';

    if (!file_exists($schemaFile)) {
        return ['ok' => false, 'msg' => 'schema.sql não encontrado.'];
    }

    try {
        // Executa schema (tabelas)
        $db->exec(file_get_contents($schemaFile));
        $msgs[] = '✅ Schema criado';

        // Executa seed (dados iniciais)
        if (file_exists($seedFile)) {
            $db->exec(file_get_contents($seedFile));
            $msgs[] = '✅ Seed executado';
        }

        return ['ok' => true, 'msgs' => $msgs];
    } catch (\Throwable $e) {
        return ['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()];
    }
}

// ── Auto-init: roda silenciosamente se tabelas não existem ────
// Chamado pelo index.php em cada request (barato pois usa SHOW TABLES cache)
function autoInit(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        $db     = getDB();
        $existe = $db->query("SHOW TABLES LIKE 'usuarios'")->fetch();
        if (!$existe) {
            initDb();
        }
    } catch (\Throwable) {
        // silencioso — a rota vai retornar erro de conexão normalmente
    }
}
