import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { PACOTES_BASE, MESES_PT } from '../../data/pacotes';
import { gerarColunasDatas, gerarUnidades, isUtilDay, hoje, toDateStr, addDiasUteis } from '../../data/datas';
import PainelTopo from './PainelTopo';
import { getDiasUteisEntre } from '../../data/datas';
import styles from './Quadro.module.css';

const STATUS_CLASS = {
  'nao-iniciada': styles.cellNaoIniciada,
  'em-andamento': styles.cellEmAndamento,
  'concluida':    styles.cellConcluida,
  'atrasada':     styles.cellAtrasada,
  'dente':        styles.cellDente,
};

export default function Quadro({ obraAtual, obras, tipologias, getEstado, setEstadoMeta, atualizarDatas, atualizarTipologia, adicionarTipologia, removerTipologia, onAlerta }) {
  const obra          = obras[obraAtual] || {};
  const bodyRef       = useRef(null);
  const headerScrollRef = useRef(null);
  const [modalMeta, setModalMeta] = useState(null);  // { pacote, unidade, dateStr, status }
  const [modalTip,  setModalTip]  = useState(false);

  const colunas  = useMemo(() => {
    const inicio = obra.dataInicio || hoje();
    return gerarColunasDatas(inicio, 177);
  }, [obra.dataInicio]);

  const unidades = useMemo(() => gerarUnidades(obra, tipologias), [obra, tipologias]);

  const hj = hoje();

  // Sincronizar scroll header ↔ body
  useEffect(() => {
    const body = bodyRef.current;
    const hdr  = headerScrollRef.current;
    if (!body || !hdr) return;
    const onScroll = () => { hdr.scrollLeft = body.scrollLeft; };
    body.addEventListener('scroll', onScroll);
    return () => body.removeEventListener('scroll', onScroll);
  }, []);

  // Calcular stats painel topo
  const stats = useMemo(() => {
    let concluidas = 0, planejadas = 0, realizadas = 0, atrasos = 0, dentes = 0;
    PACOTES_BASE.forEach(p => {
      unidades.forEach(u => {
        const e = getEstado(obraAtual, p.id, u.cod);
        if (e.status === 'concluida')   concluidas++;
        if (e.status === 'atrasada')    atrasos++;
        if (e.status === 'dente')       dentes++;
        if (e.dataPlanejada === hj) {
          planejadas++;
          if (e.status === 'concluida') realizadas++;
        }
      });
    });
    const diasDec = obra.dataInicio ? getDiasUteisEntre(obra.dataInicio, hj) : 0;
    const ritmo   = diasDec > 0 ? (concluidas / diasDec).toFixed(1) : null;
    const efic    = planejadas > 0 ? Math.round((realizadas / planejadas) * 100) : null;
    return {
      ritmo, atrasos, dentes,
      metasDia: `${realizadas} / ${planejadas}`,
      eficiencia: efic != null ? `${efic}%` : '—',
      eficienciaCor: efic == null ? '#fff' : efic >= 80 ? '#27ae60' : efic >= 50 ? '#f39c12' : '#e74c3c',
    };
  }, [obraAtual, unidades, getEstado, obra.dataInicio, hj]);

  // Calcular planejamento de unidades por data
  const calcPlanejamento = useCallback((pacote, isFvs) => {
    const inicio = obra.dataInicio || hj;
    const pIdx   = PACOTES_BASE.findIndex(p => p.id === pacote.id);
    const offset = pIdx + (isFvs ? 1 : 0);
    let curD = new Date(inicio + 'T12:00:00');
    let av = 0;
    while (av < offset) {
      curD.setDate(curD.getDate() + 1);
      if (isUtilDay(toDateStr(curD))) av++;
    }
    const res = {};
    const colFim = colunas.length > 0 ? colunas[colunas.length - 1].dateStr : '2099-12-31';
    unidades.forEach(u => {
      while (!isUtilDay(toDateStr(curD))) curD.setDate(curD.getDate() + 1);
      const ds = toDateStr(curD);
      if (ds <= colFim) {
        res[ds] = u;
        const key = isFvs ? pacote.id + '_FVS' : pacote.id;
        const e   = getEstado(obraAtual, key, u.cod);
        if (!e.dataPlanejada) setEstadoMeta(obraAtual, key, u.cod, { dataPlanejada: ds });
      }
      curD.setDate(curD.getDate() + 1);
      while (!isUtilDay(toDateStr(curD))) curD.setDate(curD.getDate() + 1);
    });
    return res;
  }, [obra.dataInicio, unidades, colunas, obraAtual, getEstado, setEstadoMeta, hj]);

  function mudarStatus(pacoteId, unidadeCod, novoStatus) {
    setEstadoMeta(obraAtual, pacoteId, unidadeCod, {
      status:   novoStatus,
      dataReal: novoStatus === 'concluida' ? hj : (getEstado(obraAtual, pacoteId, unidadeCod).dataReal || null),
    });
    setModalMeta(null);
  }

  function toggleFvs(pacote, unidade, dateStr) {
    const key = pacote.id + '_FVS';
    const e   = getEstado(obraAtual, key, unidade.cod);
    const novo = e.fvsStatus === 'concluida' ? 'nao-iniciada' : 'concluida';
    setEstadoMeta(obraAtual, key, unidade.cod, { fvsStatus: novo, dataReal: novo === 'concluida' ? dateStr : null });
  }

  return (
    <div className={styles.container}>
      <PainelTopo obraAtual={obraAtual} obras={obras} stats={stats} />

      {/* Config bar */}
      <div className={styles.configBar}>
        <div className={styles.configGrp}>
          <label>Data Início:</label>
          <input type="date" value={obra.dataInicio || ''} onChange={e => atualizarDatas(obraAtual, e.target.value)} />
        </div>
        <div className={styles.configGrp}>
          <label>Término 🔒:</label>
          <input type="date" value={obra.dataTermino || ''} readOnly className={styles.inputLocked} />
        </div>
        <div className={styles.configGrp}>
          <label>Tipologia:</label>
          <select value={obra.tipologia || ''} onChange={e => atualizarTipologia(obraAtual, e.target.value)}>
            {tipologias.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <button className={styles.btnConfig} onClick={() => setModalTip(true)}>⚙️ Tipologias</button>
        <button className={styles.btnAlerta} onClick={onAlerta}>🔔 Alerta 80 Dias</button>
      </div>

      {/* Legenda */}
      <div className={styles.legenda}>
        {[
          ['Não Iniciada', styles.corNaoIniciada], ['Em Andamento', styles.corEmAndamento],
          ['Concluída',    styles.corConcluida],   ['Em Atraso',    styles.corAtrasada],
          ['Dente',        styles.corDente],        ['FVs ✓',        styles.corFvs],
        ].map(([label, cls]) => (
          <span key={label} className={styles.legendaItem}>
            <span className={`${styles.legendaCor} ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Quadro */}
      <div className={styles.scrollArea}>
        <div className={styles.wrapper}>
          {/* Header de datas */}
          <div className={styles.headerDatas}>
            <div className={styles.headerFixed}>
              <div className={styles.hcfRow}>PACOTE DE TRABALHO</div>
              <div className={styles.hcfRow}>DESCRIÇÃO DAS METAS</div>
              <div className={styles.hcfRow}>EQUIPE</div>
            </div>
            <div className={styles.headerDatesScroll} ref={headerScrollRef}>
              {colunas.map((col, idx) => (
                <div
                  key={col.dateStr}
                  className={[
                    styles.dateCol,
                    col.isHoje ? styles.hoje : '',
                    col.isFimSemana && !col.isFeriado ? styles.fimSemana : '',
                    col.isFeriado ? styles.feriado : '',
                  ].join(' ')}
                >
                  <span className={styles.dchNum}>{idx + 1}</span>
                  <span className={styles.dchDia}>{col.dia}</span>
                  <span className={styles.dchDiaSem}>{col.diaSemana.slice(0,3)}</span>
                  <span className={styles.dchMes}>{col.mesNome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Corpo */}
          <div className={styles.quadroBody} ref={bodyRef}>
            {PACOTES_BASE.map(pacote => {
              const planMeta = calcPlanejamento(pacote, false);
              const planFvs  = pacote.temFvs ? calcPlanejamento(pacote, true) : {};
              return (
                <div key={pacote.id} className={styles.grupo}>
                  {/* Linha meta */}
                  <LinhaQuadro
                    pacote={pacote} isFvs={false} colunas={colunas}
                    planejamento={planMeta} hj={hj} obraAtual={obraAtual}
                    getEstado={getEstado} styles={styles}
                    onClickMeta={(p, u, ds, st) => setModalMeta({ pacote: p, unidade: u, dateStr: ds, status: st })}
                    onToggleFvs={toggleFvs}
                  />
                  {/* Linha FVs */}
                  {pacote.temFvs && (
                    <LinhaQuadro
                      pacote={pacote} isFvs={true} colunas={colunas}
                      planejamento={planFvs} hj={hj} obraAtual={obraAtual}
                      getEstado={getEstado} styles={styles}
                      onClickMeta={() => {}}
                      onToggleFvs={toggleFvs}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal meta */}
      {modalMeta && (
        <ModalMeta
          {...modalMeta}
          getEstado={getEstado}
          obraAtual={obraAtual}
          onMudar={mudarStatus}
          onSalvarObs={(pacoteId, cod, obs) => { setEstadoMeta(obraAtual, pacoteId, cod, { observacao: obs }); }}
          onClose={() => setModalMeta(null)}
          styles={styles}
        />
      )}

      {/* Modal tipologias */}
      {modalTip && (
        <ModalTipologias
          tipologias={tipologias}
          onAdicionar={adicionarTipologia}
          onRemover={removerTipologia}
          onClose={() => setModalTip(false)}
        />
      )}
    </div>
  );
}

// ── Linha do quadro ──────────────────────────────────────────
function LinhaQuadro({ pacote, isFvs, colunas, planejamento, hj, obraAtual, getEstado, styles, onClickMeta, onToggleFvs }) {
  return (
    <div className={`${styles.linha} ${isFvs ? styles.linhaFvs : ''}`}>
      <div className={styles.linhaFixed}>
        <div className={`${styles.lfPacote} ${isFvs ? styles.linhaFvs : ''}`}>
          {isFvs ? `FVs ${pacote.codigo}` : pacote.pacote}
        </div>
        <div className={`${styles.lfDesc} ${isFvs ? styles.linhaFvs : ''}`}>
          {isFvs ? pacote.fvsDesc : pacote.descricao}
        </div>
        <div className={styles.lfEquipe}>{isFvs ? '' : pacote.equipe}</div>
      </div>
      <div className={styles.linhaCelulas}>
        {colunas.map(col => {
          const unidade = planejamento[col.dateStr];
          if (!unidade) return <div key={col.dateStr} className={`${styles.cell} ${styles.cellVazia}`} />;

          const chave = isFvs ? pacote.id + '_FVS' : pacote.id;
          const e     = getEstado(obraAtual, chave, unidade.cod);
          let st = isFvs
            ? (e.fvsStatus || 'nao-iniciada')
            : (e.status    || 'nao-iniciada');
          if (!isFvs && st === 'nao-iniciada' && col.dateStr < hj && col.isUtil) st = 'atrasada';

          const cls = isFvs
            ? (st === 'concluida' ? styles.cellFvs : styles.cellNaoIniciada)
            : (STATUS_CLASS[st] || styles.cellNaoIniciada);

          return (
            <div
              key={col.dateStr}
              className={`${styles.cell} ${cls} ${col.isHoje ? styles.cellHoje : ''}`}
              title={`${unidade.cod} | ${pacote.codigo} — ${col.dateStr}`}
              onClick={() => isFvs
                ? onToggleFvs(pacote, unidade, col.dateStr)
                : onClickMeta(pacote, unidade, col.dateStr, st)
              }
            >
              <span className={styles.cellText}>{unidade.cod}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal meta ───────────────────────────────────────────────
function ModalMeta({ pacote, unidade, dateStr, status, getEstado, obraAtual, onMudar, onSalvarObs, onClose }) {
  const e   = getEstado(obraAtual, pacote.id, unidade.cod);
  const [obs, setObs] = useState(e.observacao || '');
  const statusLabels  = { 'nao-iniciada':'Não Iniciada','em-andamento':'Em Andamento','concluida':'Concluída','atrasada':'Em Atraso','dente':'Dente' };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#111827',border:'1px solid #2a3a4a',borderRadius:10,minWidth:400,maxWidth:500,width:'90%',maxHeight:'80vh',overflow:'hidden',display:'flex',flexDirection:'column' }}>
        <div style={{ background:'#0d1b2a',color:'#fff',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',fontWeight:700,fontSize:14,borderBottom:'1px solid #2a3a4a' }}>
          <span>{pacote.codigo} — Unidade {unidade.cod}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,.6)',fontSize:16,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:16,overflowY:'auto',color:'#e2e8f0',display:'flex',flexDirection:'column',gap:8 }}>
          {[['Pacote', pacote.pacote], ['Unidade', `${unidade.cod} (Pav. ${unidade.pav} – Ciclo ${unidade.ciclo})`],
            ['Descrição', pacote.descricao], ['Status', statusLabels[status] || status],
            ['Data Planejada', e.dataPlanejada || dateStr], ['Data Real', e.dataReal || '—']
          ].map(([label, val]) => (
            <div key={label} style={{ display:'flex',gap:8,fontSize:12 }}>
              <span style={{ width:120,color:'#8899aa',flexShrink:0,fontWeight:600 }}>{label}:</span>
              <span style={{ whiteSpace:'pre-line' }}>{val}</span>
            </div>
          ))}
          <div style={{ fontSize:12 }}>
            <div style={{ color:'#8899aa',marginBottom:4 }}>Observação:</div>
            <textarea value={obs} onChange={e => setObs(e.target.value)}
              style={{ width:'100%',background:'#0d1b2a',border:'1px solid #2a3a4a',borderRadius:4,color:'#e2e8f0',padding:5,fontSize:11,resize:'vertical',minHeight:52 }} />
          </div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:4 }}>
            {[['▶ Iniciar','#92400e','#fcd34d','em-andamento'],['✓ Concluir','#14532d','#86efac','concluida'],
              ['⚠ Atraso','#7f1d1d','#fca5a5','atrasada'],['🦷 Dente','#7c2d12','#fdba74','dente'],
              ['↺ Resetar','#1e293b','#94a3b8','nao-iniciada']
            ].map(([label, bg, color, st]) => (
              <button key={st} onClick={() => onMudar(pacote.id, unidade.cod, st)}
                style={{ padding:'6px 12px',border:'none',borderRadius:4,background:bg,color,fontWeight:600,fontSize:11 }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => onSalvarObs(pacote.id, unidade.cod, obs)}
            style={{ alignSelf:'flex-end',padding:'6px 14px',background:'#166534',color:'#4ade80',border:'1px solid #22c55e',borderRadius:4,fontSize:12,fontWeight:600 }}>
            💾 Salvar Observação
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal tipologias ─────────────────────────────────────────
function ModalTipologias({ tipologias, onAdicionar, onRemover, onClose }) {
  const [form, setForm] = useState({ nome:'', pavimentos:17, aptos:8, ciclos:'A,B,C,D', diasPorMeta:1 });
  function salvar() {
    if (!form.nome.trim()) return;
    onAdicionar({ ...form, ciclos: form.ciclos.split(',').map(s => s.trim()).filter(Boolean) });
    setForm({ nome:'', pavimentos:17, aptos:8, ciclos:'A,B,C,D', diasPorMeta:1 });
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#111827',border:'1px solid #2a3a4a',borderRadius:10,minWidth:420,maxWidth:680,width:'90%',maxHeight:'80vh',display:'flex',flexDirection:'column' }}>
        <div style={{ background:'#0d1b2a',color:'#fff',padding:'12px 16px',display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:14,borderBottom:'1px solid #2a3a4a' }}>
          <span>⚙️ Cadastro de Tipologias</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,.6)',fontSize:16,cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:16,overflowY:'auto',display:'flex',flexDirection:'column',gap:10 }}>
          {[['nome','Nome','text','Ex: Torre A'],['pavimentos','Pavimentos','number','17'],
            ['aptos','Aptos/Pav','number','8'],['ciclos','Ciclos','text','A,B,C,D'],['diasPorMeta','Dias/meta','number','1']
          ].map(([key, label, type, ph]) => (
            <div key={key} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12 }}>
              <label style={{ width:140,color:'#8899aa',flexShrink:0 }}>{label}:</label>
              <input type={type} placeholder={ph} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                style={{ flex:1,background:'#1e2d3d',border:'1px solid #2a3a4a',borderRadius:4,padding:'5px 8px',fontSize:12,color:'#e2e8f0' }} />
            </div>
          ))}
          <button onClick={salvar} style={{ alignSelf:'flex-end',padding:'7px 16px',background:'#166534',color:'#4ade80',border:'1px solid #22c55e',borderRadius:4,fontSize:12,fontWeight:600 }}>
            Salvar Tipologia
          </button>
          <div style={{ display:'flex',flexDirection:'column',gap:6,marginTop:8 }}>
            {tipologias.map((t, idx) => (
              <div key={t.id} style={{ background:'#1e2d3d',border:'1px solid #2a3a4a',borderRadius:4,padding:'8px 10px',fontSize:11,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700,color:'#00b4d8' }}>{t.nome}</div>
                  <div style={{ color:'#8899aa' }}>{t.pavimentos} pav. · {t.aptos} aptos/pav. · Ciclos: {t.ciclos.join(',')} · {t.diasPorMeta} dia(s)/meta</div>
                </div>
                <button onClick={() => onRemover(idx)} style={{ background:'#7f1d1d',color:'#fca5a5',border:'none',borderRadius:3,padding:'2px 7px',fontSize:10,cursor:'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
