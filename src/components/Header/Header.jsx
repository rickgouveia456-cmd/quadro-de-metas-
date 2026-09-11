import { formatDate } from '../../data/datas';
import styles from './Header.module.css';

export default function Header({ obraAtual, obras, tela, setTela, setObraAtual }) {
  const obra = obras[obraAtual] || {};

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoTitle}>VENTURA PATAMARES</span>
        <span className={styles.logoSub}>Sistema de Controle de Metas</span>
      </div>

      <nav className={styles.nav}>
        <button
          className={`${styles.navBtn} ${tela === 'quadro' ? styles.active : ''}`}
          onClick={() => setTela('quadro')}
        >
          📋 Quadro de Produtividade
        </button>
        <button
          className={`${styles.navBtn} ${tela === 'torre' ? styles.active : ''}`}
          onClick={() => setTela('torre')}
        >
          🏢 Torre 3D
        </button>
      </nav>

      <div className={styles.obraSelector}>
        <label>Obra:</label>
        <select value={obraAtual} onChange={e => setObraAtual(e.target.value)}>
          {Object.keys(obras).map(id => (
            <option key={id} value={id}>{obras[id].nome}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
