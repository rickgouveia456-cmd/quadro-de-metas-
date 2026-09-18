<?php
// ================================================================
// Helpers globais — respostas JSON, auth, CORS
// ================================================================
declare(strict_types=1);

// ── CORS ────────────────────────────────────────────────────
function setCors(): void {
    $allowed = getenv('CORS_ORIGIN') ?: '*';
    header("Access-Control-Allow-Origin: {$allowed}");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ── Resposta JSON ────────────────────────────────────────────
function json(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ok(mixed $data = null, string $msg = 'ok'): never {
    json(['ok' => true, 'msg' => $msg, 'data' => $data]);
}

function err(string $msg, int $code = 400): never {
    json(['ok' => false, 'msg' => $msg], $code);
}

// ── Body JSON da request ─────────────────────────────────────
function body(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

// ── Autenticação por token ───────────────────────────────────
function authUser(): array {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN']
          ?? ($_COOKIE['qm_token'] ?? '');

    if (!$token) err('Não autenticado', 401);

    $db  = getDB();
    $now = date('Y-m-d H:i:s');
    $st  = $db->prepare(
        'SELECT s.token, s.perfil, s.usuario_id, u.label, u.cor, u.icone
           FROM sessoes s
           JOIN usuarios u ON u.id = s.usuario_id
          WHERE s.token = ? AND s.expira_em > ?'
    );
    $st->execute([$token, $now]);
    $row = $st->fetch();
    if (!$row) err('Sessão expirada ou inválida', 401);

    // Renova expiração (+8h)
    $db->prepare('UPDATE sessoes SET expira_em = DATE_ADD(NOW(), INTERVAL 8 HOUR) WHERE token = ?')
       ->execute([$token]);

    return $row;
}

// ── Verifica permissão mínima ────────────────────────────────
// Hierarquia: admin > engenheiro > mestre > encarregado
function requirePerfil(string ...$perfis): array {
    $user = authUser();
    if (!in_array($user['perfil'], $perfis, true)) {
        err('Sem permissão para esta ação', 403);
    }
    return $user;
}
