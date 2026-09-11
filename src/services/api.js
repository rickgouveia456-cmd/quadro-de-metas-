// ================================================================
// API.JS — comunicação com backend PHP
// Em desenvolvimento usa localStorage; em produção usa o backend
// ================================================================

const BASE = import.meta.env.VITE_API_URL || '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Obras ────────────────────────────────────────────────────
export const api = {
  obras: {
    listar:      ()           => req('/obras.php'),
    salvar:      (dados)      => req('/obras.php',     { method:'PUT',  body: JSON.stringify(dados) }),
  },
  metas: {
    listar:      (obraId)     => req(`/metas.php?obra=${obraId}`),
    salvar:      (dados)      => req('/metas.php',     { method:'POST', body: JSON.stringify(dados) }),
    atualizar:   (id, dados)  => req(`/metas.php?id=${id}`, { method:'PUT', body: JSON.stringify(dados) }),
  },
  tipologias: {
    listar:      ()           => req('/tipologias.php'),
    criar:       (dados)      => req('/tipologias.php', { method:'POST', body: JSON.stringify(dados) }),
    deletar:     (id)         => req(`/tipologias.php?id=${id}`, { method:'DELETE' }),
  },
  sync: {
    // Sincroniza tudo de uma vez (compatibilidade com backend antigo)
    push: (payload) => req('/sync.php', { method:'PUT', body: JSON.stringify(payload) }),
    pull: ()        => req('/sync.php'),
  },
};

export default api;
