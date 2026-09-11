import { useState } from 'react';
import { PERFIS } from '../../hooks/useAuth';
import styles from './Login.module.css';

export default function Login({ onLogin }) {
  const [perfil, setPerfil] = useState('');
  const [senha,  setSenha]  = useState('');
  const [erro,   setErro]   = useState('');
  const [loading, setLoading] = useState(false);

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
            <span className={styles.logoSub}>Sistema de Controle de Metas</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.label}>Seu perfil</div>
          <div className={styles.perfisList}>
            {Object.entries(PERFIS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className={`${styles.perfilBtn} ${perfil === key ? styles.perfilAtivo : ''}`}
                style={perfil === key ? { borderColor: p.cor, background: p.cor + '18' } : {}}
                onClick={() => { setPerfil(key); setErro(''); }}
              >
                <span className={styles.perfilIcon}>{p.icone}</span>
                <span className={styles.perfilLabel}>{p.label}</span>
              </button>
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
            style={perfil ? { background: PERFIS[perfil]?.cor } : {}}
          >
            {loading ? 'Entrando...' : `${PERFIS[perfil]?.icone || '🔐'} Entrar`}
          </button>
        </form>

        <div className={styles.footer}>
          Ventura Patamares · Torres TC, TB, TA
        </div>
      </div>
    </div>
  );
}
