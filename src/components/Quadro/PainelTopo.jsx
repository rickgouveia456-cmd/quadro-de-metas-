import { formatDate } from '../../data/datas';
import styles from './Quadro.module.css';

export default function PainelTopo({ obraAtual, obras, stats }) {
  const obra = obras[obraAtual] || {};
  return (
    <div className={styles.painelTopo}>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>OBRA</div>
        <div className={styles.blocoValor}>Ventura Patamares</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>TORRE</div>
        <div className={styles.blocoValor}>{obraAtual}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>DATA INÍCIO</div>
        <div className={styles.blocoValor}>{formatDate(obra.dataInicio)}</div>
      </div>
      <div className={`${styles.bloco} ${styles.blocoLocked}`}>
        <div className={styles.blocoLabel}>TÉRMINO 🔒</div>
        <div className={styles.blocoValor}>{formatDate(obra.dataTermino)}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>RITMO (apto/dia)</div>
        <div className={styles.blocoValor}>{stats.ritmo ?? '—'}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>EFICIÊNCIA DIÁRIA</div>
        <div className={styles.blocoValor} style={{ color: stats.eficienciaCor }}>{stats.eficiencia ?? '—'}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>METAS DO DIA</div>
        <div className={styles.blocoValor}>{stats.metasDia}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>EM ATRASO</div>
        <div className={styles.blocoValor} style={{ color: stats.atrasos > 0 ? '#e74c3c' : '#27ae60' }}>{stats.atrasos}</div>
      </div>
      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>DENTES</div>
        <div className={styles.blocoValor} style={{ color: stats.dentes > 0 ? '#e67e22' : '#27ae60' }}>{stats.dentes}</div>
      </div>
    </div>
  );
}
