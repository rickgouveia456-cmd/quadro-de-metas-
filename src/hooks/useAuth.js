// ================================================================
// useAuth — autenticação simples com localStorage
// ================================================================
import { useState, useCallback } from 'react';

const LS_USER = 'quadroMetas_user';

export const PERFIS = {
  admin:       { label: 'Administrador',  cor: '#1d4ed8', icone: '👑', senha: 'admin123' },
  engenheiro:  { label: 'Engenheiro',     cor: '#059669', icone: '🏗', senha: 'eng123'   },
  mestre:      { label: 'Mestre de Obra', cor: '#d97706', icone: '🔨', senha: 'mestre123'},
  encarregado: { label: 'Encarregado',    cor: '#7c3aed', icone: '📋', senha: 'enc123'   },
};

function carregarUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
  catch { return null; }
}

export function useAuth() {
  const [user, setUser] = useState(carregarUser);

  const login = useCallback((perfil, senha) => {
    const p = PERFIS[perfil];
    if (!p) return { ok: false, msg: 'Perfil inválido.' };
    if (senha !== p.senha) return { ok: false, msg: 'Senha incorreta.' };
    const u = { perfil, label: p.label, cor: p.cor, icone: p.icone, loginAt: new Date().toISOString() };
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setUser(u);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LS_USER);
    setUser(null);
  }, []);

  const isAdmin = user?.perfil === 'admin';

  return { user, login, logout, isAdmin };
}
