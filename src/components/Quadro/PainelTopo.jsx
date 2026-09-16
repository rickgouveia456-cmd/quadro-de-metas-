import { formatDate } from '../../data/datas';
import styles from './Quadro.module.css';

export default function PainelTopo({ obraAtual, obras, stats }) {
  const obra = obras[obraAtual] || {};

  return (
    <div className={styles.painelTopo}>

      <div className={styles.bloco} style={{ minWidth: 160, textAlign: 'left', paddingLeft: 14 }}>
        <div className={styles.blocoLabel}>OBRA</div>
        <div className={styles.blocoValor} style={{ fontSize: 13, color: '#1d4ed8' }}>
          {obra.nome || '—'}
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>TORRE</div>
        <div className={styles.blocoValor}>{obraAtual}</div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>INÍCIO</div>
        <div className={styles.blocoValor} style={{ fontSize: 13 }}>
          {formatDate(obra.dataInicio)}
        </div>
      </div>

      <div className={`${styles.bloco} ${styles.blocoLocked}`}>
        <div className={styles.blocoLabel}>TÉRMINO 🔒</div>
        <div className={styles.blocoValor} style={{ fontSize: 13 }}>
          {formatDate(obra.dataTermino)}
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>RITMO</div>
        <div className={styles.blocoValor}>
          {stats.ritmo ?? '—'}
          <span style={{ fontSize: 9, fontWeight: 500, color: '#5a6a7e', marginLeft: 3 }}>apto/dia</span>
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>EFICIÊNCIA</div>
        <div className={styles.blocoValor} style={{ color: stats.eficienciaCor }}>
          {stats.eficiencia ?? '—'}
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>METAS DO DIA</div>
        <div className={styles.blocoValor}>{stats.metasDia}</div>
      </div>

      {/* PPC — Percentual de Planos Concluídos (semana atual) */}
      <div className={styles.bloco} title="PPC — Percentual de Planos Concluídos: metas planejadas para esta semana que foram concluídas">
        <div className={styles.blocoLabel}>PPC SEM.</div>
        <div className={styles.blocoValor} style={{ color: stats.ppcCor }}>
          {stats.ppc ?? '—'}
        </div>
      </div>

      {/* PPCQ — PPC incluindo qualidade (FVs) */}
      <div className={styles.bloco} title="PPCQ — PPC com Qualidade: inclui verificação de FVs concluídas na semana">
        <div className={styles.blocoLabel}>PPCQ SEM.</div>
        <div className={styles.blocoValor} style={{ color: stats.ppcqCor }}>
          {stats.ppcq ?? '—'}
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>EM ATRASO</div>
        <div className={styles.blocoValor}
          style={{ color: stats.atrasos > 0 ? '#dc2626' : '#16a34a' }}>
          {stats.atrasos}
          {stats.atrasos > 0 && (
            <span style={{ fontSize: 10, marginLeft: 4 }}>⚠</span>
          )}
        </div>
      </div>

      <div className={styles.bloco}>
        <div className={styles.blocoLabel}>DENTES</div>
        <div className={styles.blocoValor}
          style={{ color: stats.dentes > 0 ? '#ea580c' : '#16a34a' }}>
          {stats.dentes}
          {stats.dentes > 0 && (
            <span style={{ fontSize: 10, marginLeft: 4 }}>🦷</span>
          )}
        </div>
      </div>

    </div>
  );
}
