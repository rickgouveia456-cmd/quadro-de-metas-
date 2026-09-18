// ================================================================
// api.js — cliente HTTP para o backend PHP
// Usa a variável de ambiente VITE_API_URL (definida no .env)
// Fallback: modo localStorage (quando API não está disponível)
// ================================================================

const BASE = import.meta.env.VITE_API_URL || '/api';

// Token em memória (também salvo no cookie pelo backend)
let _token = localStorage.getItem('qm_token') || '';

function setToken(t) {
  _token = t;
  if (t) localStorage.setItem('qm_token', t);
  else   localStorage.removeItem('qm_token');
}

// ── Fetch base com auth ──────────────────────────────────────
async function req(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (_token) headers['X-Auth-Token'] = _token;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({ ok: false, msg: 'Resposta inválida' }));
  if (!res.ok && res.status === 401) {
    setToken('');
    window.dispatchEvent(new CustomEvent('qm:logout'));
  }
  return { status: res.status, ...data };
}

// ── Auth ─────────────────────────────────────────────────────
export const auth = {
  async login(perfil, senha) {
    const r = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ perfil, senha }),
    });
    if (r.ok && r.data?.token) setToken(r.data.token);
    return r;
  },

  async logout() {
    await req('/auth/logout', { method: 'POST' });
    setToken('');
  },

  async me() {
    return req('/auth/me');
  },

  isLoggedIn: () => !!_token,
};

// ── Obras ────────────────────────────────────────────────────
export const obras = {
  listar:   ()        => req('/obras'),
  buscar:   (cod)     => req(`/obras/${cod}`),
  criar:    (data)    => req('/obras',        { method: 'POST',   body: JSON.stringify(data) }),
  atualizar:(cod, data)=> req(`/obras/${cod}`, { method: 'PUT',    body: JSON.stringify(data) }),
  deletar:  (cod)     => req(`/obras/${cod}`, { method: 'DELETE' }),
};

// ── Metas ────────────────────────────────────────────────────
export const metas = {
  // Carrega todo o estado de uma obra → retorna mapa { "pacote|unidade": {...} }
  carregar: (obra) => req(`/metas?obra=${obra}`),

  // Salva uma meta individual
  salvar: (obra, pacote, unidade, estado, historico = null) =>
    req('/metas', {
      method: 'POST',
      body: JSON.stringify({ obra, pacote, unidade, ...estado, historico }),
    }),

  // Sync em lote (usado para migrar localStorage → banco)
  batch: (obra, itens) =>
    req('/metas/batch', {
      method: 'POST',
      body: JSON.stringify({ obra, itens }),
    }),
};

// ── Histórico ────────────────────────────────────────────────
export const historico = {
  listar: (obra, limit = 200) => req(`/historico?obra=${obra}&limit=${limit}`),
  limpar: (obra)              => req(`/historico?obra=${obra}`, { method: 'DELETE' }),
};

// ── Restrições ───────────────────────────────────────────────
export const restricoes = {
  listar:    (obra)       => req(`/restricoes?obra=${obra}`),
  criar:     (data)       => req('/restricoes',     { method: 'POST',   body: JSON.stringify(data) }),
  atualizar: (id, data)   => req(`/restricoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletar:   (id)         => req(`/restricoes/${id}`, { method: 'DELETE' }),
};

// ── Feriados ─────────────────────────────────────────────────
export const feriados = {
  listar: ()             => req('/feriados'),
  criar:  (data, desc)   => req('/feriados', { method: 'POST',   body: JSON.stringify({ data, descricao: desc }) }),
  deletar:(id)           => req(`/feriados/${id}`, { method: 'DELETE' }),
};

// ── Health check ─────────────────────────────────────────────
export async function healthCheck() {
  try {
    const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}
