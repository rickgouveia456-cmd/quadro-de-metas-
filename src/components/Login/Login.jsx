import { useState } from 'react';
import { PERFIS } from '../../hooks/useAuth';
import styles from './Login.module.css';

const PERMISSOES = {
  admin:       ['Ver quadro', 'Editar metas', 'Liberar FVs', 'Criar obras', 'Gerenciar usuários'],
  engenheiro:  ['Ver quadro', 'Editar metas', 'Liberar FVs', 'Criar obras'],
  mestre:      ['Ver quadro', 'Editar metas', 'Registrar FVs'],
  encarregado: ['Ver quadro', 'Registrar status'],
};

export default function Login({ onLogin }) {
  const [perfil,   setPerfil]  = useState('');
  const [senha,    setSenha]   = useState('');
  const [erro,     setErro]    = useState('');
  const [loading,  setLoading] = useState(false);
  const [verPerms, setVerPerms]= useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!perfil) { setErro('Selecione seu perfil.'); return; }
    setLoading(true);
    setTimeout(() => {
      const res = onLogin(perfil, senha);
      if (!res.ok) { setErro(res.msg); setLoading(false); }
    }, 400);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🏗</div>
          <div className={styles.logoTexto}>
            <span className={styles.logoNome}>VENTURA PATAMARES</span>
            <span className={styles.logoSub}>Sistema de Controle de Metas · Torres TC · TB · TA</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Seu perfil</span>
            <button type="button" className={styles.btnVerPerms}
              onClick={() => setVerPerms(v => !v)}>
              {verPerms ? 'Ocultar permissões' : 'Ver permissões'}
            </button>
          </div>

          <div className={styles.perfisList}>
            {Object.entries(PERFIS).map(([key, p]) => (
              <div key={key}>
                <button
                  type="button"
                  className={`${styles.perfilBtn} ${perfil === key ? styles.perfilAtivo : ''}`}
                  style={perfil === key ? { borderColor: p.cor, background: p.cor + '18' } : {}}
                  onClick={() => { setPerfil(key); setErro(''); }}
                >
                  <span className={styles.perfilIcon}>{p.icone}</span>
                  <span className={styles.perfilLabel}>{p.label}</span>
                </button>
                {verPerms && (
                  <div className={styles.permsBox}
                    style={{ borderColor: p.cor + '44', background: p.cor + '08' }}>
                    {PERMISSOES[key].map(pm => (
                      <span key={pm} className={styles.permTag}>✓ {pm}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.label} style={{ marginTop: 16 }}>Senha</div>
          <input
            className={styles.input}
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={e => { setSenha(e.target.value); setErro(''); }}
            autoComplete="current-password"
          />

          {erro && <div className={styles.erro}>⚠ {erro}</div>}

          <button
            className={styles.btnEntrar}
            type="submit"
            disabled={loading}
            style={perfil ? { background: `linear-gradient(135deg, ${PERFIS[perfil]?.cor} 0%, ${PERFIS[perfil]?.cor}dd 100%)` } : {}}
          >
            {loading ? 'Entrando...' : `${PERFIS[perfil]?.icone || '🔐'} Entrar`}
          </button>
        </form>

        <div className={styles.footer}>
          Ventura Patamares · Sistema de Controle de Metas
        </div>
      </div>
    </div>
  );
}
