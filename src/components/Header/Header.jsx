import { formatDate } from '../../data/datas';
import styles from './Header.module.css';

export default function Header({ obraAtual, obras, tela, setTela, setObraAtual, user, onLogout }) {
  const obra = obras[obraAtual] || {};

  return (
    <header className={styles.header}>

      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoTitle}>{obra.nome || 'VENTURA PATAMARES'}</span>
        <span className={styles.logoSub}>Sistema de Controle de Metas</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <button
          className={`${styles.navBtn} ${tela === 'quadro' ? styles.active : ''}`}
          onClick={() => setTela('quadro')}
        >
          📋 Quadro
        </button>
        <button
          className={`${styles.navBtn} ${tela === 'diario' ? styles.active : ''}`}
          onClick={() => setTela('diario')}
        >
          📅 Controle Diário
        </button>
        <button
          className={`${styles.navBtn} ${tela === 'torre' ? styles.active : ''}`}
          onClick={() => setTela('torre')}
        >
          🏢 Torre 3D
        </button>
      </nav>

      {/* Seletor de obra */}
      <div className={styles.obraSelector}>
        <span>Obra:</span>
        <select value={obraAtual} onChange={e => setObraAtual(e.target.value)}>
          {Object.keys(obras).map(id => (
            <option key={id} value={id}>{obras[id].nome}</option>
          ))}
        </select>
      </div>

      {/* Usuário logado */}
      {user && (
        <div className={styles.userArea}>
          <span className={styles.userIcon}>{user.icone}</span>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.label}</span>
            <button className={styles.btnLogout} onClick={onLogout}>Sair</button>
          </div>
        </div>
      )}

    </header>
  );
}
