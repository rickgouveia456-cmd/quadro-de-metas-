// ================================================================
// Controle Diário — agenda de atividades programadas e reprogramadas
// ================================================================
import { useState, useMemo } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';
import { hoje, formatDate, addDiasUteis, toDateStr } from '../../data/datas';
import styles from './ControleDiario.module.css';

const STATUS_INFO = {
  'nao-iniciada': { label: 'Não Iniciada', cor: '#64748b', bg: '#f1f5f9' },
  'em-andamento': { label: 'Em Andamento', cor: '#92400e', bg: '#fef3c7' },
  'concluida':    { label: 'Concluída',    cor: '#14532d', bg: '#dcfce7' },
  'atrasada':     { label: 'Em Atraso',    cor: '#7f1d1d', bg: '#fee2e2' },
  'dente':        { label: 'Dente',        cor: '#7c2d12', bg: '#ffedd5' },
};

export default function ControleDiario({ obraAtual, obras, tipologias, getEstado, setEstadoMeta, user }) {
  const [dataAtual, setDataAtual] = useState(hoje());
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPacote, setFiltroPacote] = useState('');
  const [modalAcao, setModalAcao] = useState(null); // { pacoteId, unidadeCod, status, obs }

  const obra = obras[obraAtual] || {};

  // Navegar entre dias
  function irDia(delta) {
    const d = new Date(dataAtual + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDataAtual(toDateStr(d));
  }

  // Metas do dia atual (planejadas + reprogramadas)
  const metasDia = useMemo(() => {
    const resultado = [];
    PACOTES_BASE.forEach(pacote => {
      // pegar unidades da obra
      const tipId = obra.tipologia;
      const tip = tipologias.find(t => t.id === tipId);
      const pavimentos = tip ? tip.pavimentos : (obra.pavimentos || 17);
      const ciclos = tip ? tip.ciclos : ['A','B','C','D'];
      const unidades = [];
      for (let p = 0; p < pavimentos; p++) {
        let codPav = p === 0 ? 'T' : p === pavimentos - 1 ? 'COB' : String(p);
        if (codPav === 'COB') continue;
        ciclos.forEach(ciclo => {
          unidades.push({ pav: codPav, ciclo, cod: `${codPav}${ciclo}` });
        });
      }

      unidades.forEach(u => {
        const e = getEstado(obraAtual, pacote.id, u.cod);
        const estaNodia = e.dataPlanejada === dataAtual;
        const reprogramada = e.dataReprogramada === dataAtual;
        const atrasadaHoje = e.status === 'atrasada' && !e.dataPlanejada;

        if (estaNodia || reprogramada || atrasadaHoje) {
          resultado.push({
            pacote,
            unidade: u,
            estado: e,
            tipo: reprogramada ? 'reprogramada' : estaNodia ? 'planejada' : 'atraso',
          });
        }
      });
    });
    return resultado;
  }, [dataAtual, obraAtual, obras, tipologias, getEstado]);

  // Filtros
  const metasFiltradas = useMemo(() => {
    return metasDia.filter(m => {
      const statusOk = filtroStatus === 'todos' || m.estado.status === filtroStatus;
      const pacoteOk = !filtroPacote || m.pacote.codigo === filtroPacote;
      return statusOk && pacoteOk;
    });
  }, [metasDia, filtroStatus, filtroPacote]);

  // Contadores
  const counts = useMemo(() => {
    const c = { planejadas: 0, reprogramadas: 0, concluidas: 0, atrasos: 0, pendentes: 0 };
    metasDia.forEach(m => {
      if (m.tipo === 'reprogramada') c.reprogramadas++;
      else if (m.tipo === 'planejada') c.planejadas++;
      if (m.estado.status === 'concluida') c.concluidas++;
      else if (m.estado.status === 'atrasada') c.atrasos++;
      else if (m.tipo !== 'atraso') c.pendentes++;
    });
    return c;
  }, [metasDia]);

  function salvarAcao() {
    if (!modalAcao) return;
    setEstadoMeta(obraAtual, modalAcao.pacoteId, modalAcao.unidadeCod, {
      status: modalAcao.status,
      dataReal: modalAcao.status === 'concluida' ? hoje() : undefined,
      observacao: modalAcao.obs,
    });
    setModalAcao(null);
  }

  const hj = hoje();
  const ehHoje = dataAtual === hj;
  const dataFormatada = formatDate(dataAtual);
  const diaSemana = new Date(dataAtual + 'T12:00:00')
    .toLocaleDateString('pt-BR', { weekday: 'long' });

  return (
    <div className={styles.container}>

      {/* Barra superior */}
      <div className={styles.topBar}>
        <div className={styles.navData}>
          <button className={styles.navBtn} onClick={() => irDia(-1)}>‹</button>
          <div className={styles.dataInfo}>
            <span className={styles.dataDia}>{dataFormatada}</span>
            <span className={styles.dataSem}>{diaSemana}</span>
            {ehHoje && <span className={styles.tagHoje}>HOJE</span>}
          </div>
          <button className={styles.navBtn} onClick={() => irDia(1)}>›</button>
          <button className={styles.btnHoje} onClick={() => setDataAtual(hj)}>Ir para hoje</button>
        </div>

        {/* Cards de contagem */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardNum} style={{ color: '#1d4ed8' }}>{counts.planejadas}</div>
            <div className={styles.cardLabel}>Planejadas</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardNum} style={{ color: '#7c3aed' }}>{counts.reprogramadas}</div>
            <div className={styles.cardLabel}>Reprogramadas</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardNum} style={{ color: '#16a34a' }}>{counts.concluidas}</div>
            <div className={styles.cardLabel}>Concluídas</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardNum} style={{ color: '#dc2626' }}>{counts.atrasos}</div>
            <div className={styles.cardLabel}>Em Atraso</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardNum} style={{ color: '#b45309' }}>{counts.pendentes}</div>
            <div className={styles.cardLabel}>Pendentes</div>
          </div>
          <div className={styles.card} style={{ background: '#f0fdf4' }}>
            <div className={styles.cardNum} style={{ color: '#059669' }}>
              {counts.planejadas > 0 ? Math.round((counts.concluidas / counts.planejadas) * 100) : 0}%
            </div>
            <div className={styles.cardLabel}>Eficiência</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        <span className={styles.filtroLabel}>Filtrar:</span>
        <select
          className={styles.select}
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
        >
          <option value="todos">Todos os status</option>
          <option value="nao-iniciada">Não Iniciadas</option>
          <option value="em-andamento">Em Andamento</option>
          <option value="concluida">Concluídas</option>
          <option value="atrasada">Em Atraso</option>
          <option value="dente">Dente</option>
        </select>
        <select
          className={styles.select}
          value={filtroPacote}
          onChange={e => setFiltroPacote(e.target.value)}
        >
          <option value="">Todos os pacotes</option>
          {[...new Set(PACOTES_BASE.map(p => p.codigo))].map(cod => (
            <option key={cod} value={cod}>{cod}</option>
          ))}
        </select>
        <span className={styles.total}>{metasFiltradas.length} atividades</span>
      </div>

      {/* Tabela */}
      <div className={styles.tabelaWrap}>
        {metasFiltradas.length === 0 ? (
          <div className={styles.vazio}>
            <div style={{ fontSize: 40 }}>📅</div>
            <div>Nenhuma atividade programada para {ehHoje ? 'hoje' : dataFormatada}</div>
          </div>
        ) : (
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Pacote</th>
                <th>Descrição</th>
                <th>Unidade</th>
                <th>Pav.</th>
                <th>Status</th>
                <th>Data Real</th>
                <th>Observação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {metasFiltradas.map((m, i) => {
                const si = STATUS_INFO[m.estado.status] || STATUS_INFO['nao-iniciada'];
                return (
                  <tr key={i} className={styles.tr}>
                    <td>
                      <span className={`${styles.tag} ${styles['tag-' + m.tipo]}`}>
                        {m.tipo === 'planejada' ? '📅 Planejada'
                          : m.tipo === 'reprogramada' ? '🔄 Reprog.'
                          : '⚠ Atraso'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.cod}>{m.pacote.codigo}</span>
                      {m.pacote.pacote.replace(/^[A-Z-]+ - /, '')}
                    </td>
                    <td className={styles.tdDesc}>{m.pacote.descricao?.split('\n')[0]}</td>
                    <td><strong>{m.unidade.cod}</strong></td>
                    <td>{m.unidade.pav === 'T' ? 'Tér.' : `${m.unidade.pav}°`}</td>
                    <td>
                      <span className={styles.badge}
                        style={{ background: si.bg, color: si.cor, borderColor: si.cor + '66' }}>
                        {si.label}
                      </span>
                    </td>
                    <td className={styles.tdData}>{m.estado.dataReal ? formatDate(m.estado.dataReal) : '—'}</td>
                    <td className={styles.tdObs}>{m.estado.observacao || '—'}</td>
                    <td>
                      <button
                        className={styles.btnAcao}
                        onClick={() => setModalAcao({
                          pacoteId: m.pacote.id,
                          unidadeCod: m.unidade.cod,
                          status: m.estado.status || 'nao-iniciada',
                          obs: m.estado.observacao || '',
                          pacoteNome: m.pacote.pacote,
                          unidadeLabel: m.unidade.cod,
                        })}
                      >
                        ✏ Atualizar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de ação rápida */}
      {modalAcao && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setModalAcao(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>✏ Atualizar Meta</span>
              <button onClick={() => setModalAcao(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <strong>{modalAcao.pacoteNome}</strong>
                <span>Unidade: {modalAcao.unidadeLabel}</span>
              </div>

              <div className={styles.modalLabel}>Status</div>
              <div className={styles.statusBtns}>
                {[
                  ['em-andamento', '▶ Iniciar',   '#92400e', '#fef3c7'],
                  ['concluida',    '✓ Concluir',  '#14532d', '#dcfce7'],
                  ['atrasada',     '⚠ Atraso',    '#7f1d1d', '#fee2e2'],
                  ['dente',        '🦷 Dente',     '#7c2d12', '#ffedd5'],
                  ['nao-iniciada', '↺ Resetar',   '#374151', '#f1f5f9'],
                ].map(([st, label, cor, bg]) => (
                  <button
                    key={st}
                    className={styles.statusBtn}
                    style={{
                      background: modalAcao.status === st ? bg : '#f8fafc',
                      color: modalAcao.status === st ? cor : '#374151',
                      borderColor: modalAcao.status === st ? cor : '#e2e8f0',
                      fontWeight: modalAcao.status === st ? 800 : 600,
                    }}
                    onClick={() => setModalAcao(a => ({ ...a, status: st }))}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className={styles.modalLabel}>Observação</div>
              <textarea
                className={styles.textarea}
                value={modalAcao.obs}
                onChange={e => setModalAcao(a => ({ ...a, obs: e.target.value }))}
                placeholder="Detalhe o que foi feito, pendências, etc."
                rows={3}
              />

              <div className={styles.modalFooter}>
                <button className={styles.btnCancelar} onClick={() => setModalAcao(null)}>Cancelar</button>
                <button className={styles.btnSalvar} onClick={salvarAcao}>💾 Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
