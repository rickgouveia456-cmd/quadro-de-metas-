<?php
// ================================================================
// POST /api/auth/login   → { perfil, senha }
// POST /api/auth/logout  → { token }
// GET  /api/auth/me      → usuário autenticado
// ================================================================
declare(strict_types=1);
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/helpers.php';

setCors();

$method = $_SERVER['REQUEST_METHOD'];
$path   = trim($_GET['sub'] ?? '', '/');

// ── POST /login ──────────────────────────────────────────────
if ($method === 'POST' && $path === 'login') {
    $b      = body();
    $perfil = trim($b['perfil'] ?? '');
    $senha  = trim($b['senha']  ?? '');

    if (!$perfil || !$senha) err('Perfil e senha são obrigatórios');

    $db = getDB();
    $st = $db->prepare('SELECT * FROM usuarios WHERE perfil = ? AND ativo = 1');
    $st->execute([$perfil]);
    $user = $st->fetch();

    if (!$user || !password_verify($senha, $user['senha_hash'])) {
        err('Perfil ou senha incorretos', 401);
    }

    // Gera token de sessão
    $token    = bin2hex(random_bytes(32));
    $expiraEm = date('Y-m-d H:i:s', strtotime('+8 hours'));

    $db->prepare(
        'INSERT INTO sessoes (token, usuario_id, perfil, expira_em)
         VALUES (?, ?, ?, ?)'
    )->execute([$token, $user['id'], $user['perfil'], $expiraEm]);

    // Cookie seguro
    setcookie('qm_token', $token, [
        'expires'  => time() + 28800,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (getenv('APP_ENV') === 'production'),
    ]);

    ok([
        'token'  => $token,
        'perfil' => $user['perfil'],
        'label'  => $user['label'],
        'icone'  => $user['icone'],
        'cor'    => $user['cor'],
    ], 'Login realizado com sucesso');
}

// ── POST /logout ─────────────────────────────────────────────
if ($method === 'POST' && $path === 'logout') {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? ($_COOKIE['qm_token'] ?? '');
    if ($token) {
        getDB()->prepare('DELETE FROM sessoes WHERE token = ?')->execute([$token]);
        setcookie('qm_token', '', time() - 3600, '/');
    }
    ok(null, 'Logout realizado');
}

// ── GET /me ──────────────────────────────────────────────────
if ($method === 'GET' && $path === 'me') {
    $user = authUser();
    ok([
        'perfil' => $user['perfil'],
        'label'  => $user['label'],
        'icone'  => $user['icone'],
        'cor'    => $user['cor'],
    ]);
}

err('Rota não encontrada', 404);
