// ================================================================
// useAuth — autenticação híbrida
// Tenta o backend PHP; se offline, cai no modo local (localStorage)
// ================================================================
import { useState, useCallback, useEffect } from 'react';
import { auth as apiAuth, healthCheck } from '../services/api';

const LS_USER    = 'quadroMetas_user';
const LS_OFFLINE = 'quadroMetas_offline';

// ── Perfis locais (fallback offline) ────────────────────────
export const PERFIS = {
  admin:       { label: 'Administrador',  cor: '#1d4ed8', icone: '👑', senha: 'Admin@2026'  },
  engenheiro:  { label: 'Engenheiro',     cor: '#059669', icone: '🏗', senha: 'Eng@2026'    },
  mestre:      { label: 'Mestre de Obra', cor: '#d97706', icone: '🔨', senha: 'Mestre@2026' },
  encarregado: { label: 'Encarregado',    cor: '#7c3aed', icone: '📋', senha: 'Enc@2026'    },
};

function carregarUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
  catch { return null; }
}

export function useAuth() {
  const [user,    setUser]    = useState(carregarUser);
  const [offline, setOffline] = useState(() => localStorage.getItem(LS_OFFLINE) === '1');

  // Detecta modo online/offline ao montar
  useEffect(() => {
    healthCheck().then(ok => {
      setOffline(!ok);
      localStorage.setItem(LS_OFFLINE, ok ? '0' : '1');
    });
    // Ouve evento de logout forçado pelo 401
    const handler = () => { setUser(null); localStorage.removeItem(LS_USER); };
    window.addEventListener('qm:logout', handler);
    return () => window.removeEventListener('qm:logout', handler);
  }, []);

  // ── Login ────────────────────────────────────────────────
  const login = useCallback(async (perfil, senha) => {
    // Tenta API primeiro
    if (!offline) {
      try {
        const r = await apiAuth.login(perfil, senha);
        if (r.ok && r.data) {
          const u = {
            perfil:  r.data.perfil,
            label:   r.data.label,
            icone:   r.data.icone,
            cor:     r.data.cor,
            loginAt: new Date().toISOString(),
            modo:    'online',
          };
          localStorage.setItem(LS_USER, JSON.stringify(u));
          setUser(u);
          return { ok: true };
        }
        return { ok: false, msg: r.msg || 'Credenciais inválidas' };
      } catch {
        // API caiu — tenta offline
        setOffline(true);
        localStorage.setItem(LS_OFFLINE, '1');
      }
    }

    // Modo offline: valida localmente
    const p = PERFIS[perfil];
    if (!p) return { ok: false, msg: 'Perfil inválido.' };
    if (senha !== p.senha) return { ok: false, msg: 'Senha incorreta.' };
    const u = {
      perfil, label: p.label, cor: p.cor, icone: p.icone,
      loginAt: new Date().toISOString(),
      modo: 'offline',
    };
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setUser(u);
    return { ok: true };
  }, [offline]);

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (!offline) {
      try { await apiAuth.logout(); } catch { /* ignora */ }
    }
    localStorage.removeItem(LS_USER);
    setUser(null);
  }, [offline]);

  const isAdmin = user?.perfil === 'admin';

  return { user, login, logout, isAdmin, offline };
}
