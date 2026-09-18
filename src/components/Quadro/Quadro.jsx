// ================================================================
// Quadro.jsx — versão completa com todas as melhorias
// ================================================================
import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { PACOTES_BASE, MESES_PT, MACROFLUXOS, FERIADOS } from '../../data/pacotes';
import {
  gerarColunasDatas, gerarUnidades, isUtilDay,
  hoje, toDateStr, addDiasUteis, getDiasUteisEntre,
} from '../../data/datas';
import PainelTopo       from './PainelTopo';
import ModalFvs         from '../Modais/ModalFvs';
import ModalProgSemanal from '../Modais/ModalProgSemanal';
import ModalNovaObra    from '../Modais/ModalNovaObra';
import ModalExportar    from '../Modais/ModalExportar';
import ModalReprogramacao from '../Modais/ModalReprogramacao';
import ModalHistorico   from '../Modais/ModalHistorico';
import styles from './Quadro.module.css';

// ── Cores de status (tema claro e vivo) ───────────────────────
const STATUS_CLASS = {
  'nao-iniciada': styles.cellNaoIniciada,
  'em-andamento': styles.cellEmAndamento,
  'concluida':    styles.cellConcluida,
  'atrasada':     styles.cellAtrasada,
  'dente':        styles.cellDente,
};

// ── Quantas colunas mostrar por período ───────────────────────
const PERIODO_COLS = { dia: 1, semana: 7, mes: 30, todos: 999 };

export default function Quadro({
  obraAtual, obras, tipologias,
  getEstado, setEstadoMeta,
  estado,
  atualizarDatas, atualizarTipologia,
  adicionarTipologia, removerTipologia,
  adicionarObra,
  onAlerta, user,
  getHistorico, limparHistorico,
  salvarBaseZero, getBaseZero, temBaseZero,
  getRestricoes, adicionarRestricao, atualizarRestricao, removerRestricao,
  feriadosCustom, adicionarFeriado, removerFeriado,
}) {
  const obra = obras[obraAtual] || {};
  const bodyRef         = useRef(null);
  const headerScrollRef = useRef(null);

  // ── Estados ───────────────────────────────────────────────────
  const [modalMeta,       setModalMeta]       = useState(null);
  const [modalTip,        setModalTip]        = useState(false);
  const [modalFvs,        setModalFvs]        = useState(null);
  const [modalSemanal,    setModalSemanal]     = useState(false);
  const [modalNovaObra,   setModalNovaObra]    = useState(false);
  const [modalExportar,   setModalExportar]    = useState(false);
  const [modalHistorico,  setModalHistorico]   = useState(false);
  const [modalBaseZero,   setModalBaseZero]    = useState(false);
  const [modalRestricoes, setModalRestricoes]  = useState(false);
  const [modalFeriados,   setModalFeriados]    = useState(false);
  const [modalReprog,     setModalReprog]      = useState(false);
  const [macroFluxo,    setMacroFluxo]    = useState(() => localStorage.getItem('qm_macro') || 'Todos');
  const [microFluxo,    setMicroFluxo]    = useState(() => localStorage.getItem('qm_micro') || 'Todos');
  const [ocultarFds,    setOcultarFds]    = useState(() => localStorage.getItem('qm_ocultar_fds') === '1');
  const [ocultarFer,    setOcultarFer]    = useState(() => localStorage.getItem('qm_ocultar_fer') === '1');
  const [periodo,       setPeriodo]       = useState(() => localStorage.getItem('qm_periodo') || 'semana');
  const [qtdPeriodo,    setQtdPeriodo]    = useState(() => Number(localStorage.getItem('qm_qtd_periodo') || '1'));
  const [dragInfo,      setDragInfo]      = useState(null);       // drag & drop
  const [zapLinks,      setZapLinks]      = useState(() => {      // zaproid links
    try { return JSON.parse(localStorage.getItem('quadro_zapLinks') || '{}'); } catch { return {}; }
  });
  const [toastMsg,      setToastMsg]      = useState('');
  const hj = hoje();

  // ── Toast helper ──────────────────────────────────────────────
  function showToast(msg, dur = 2500) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), dur);
  }

  // ── Persiste preferências de view no localStorage ─────────────
  useEffect(() => { localStorage.setItem('qm_periodo',     periodo);           }, [periodo]);
  useEffect(() => { localStorage.setItem('qm_qtd_periodo', String(qtdPeriodo));}, [qtdPeriodo]);
  useEffect(() => { localStorage.setItem('qm_macro',       macroFluxo);        }, [macroFluxo]);
  useEffect(() => { localStorage.setItem('qm_micro',       microFluxo);        }, [microFluxo]);
  useEffect(() => { localStorage.setItem('qm_ocultar_fds', ocultarFds?'1':'0');}, [ocultarFds]);
  useEffect(() => { localStorage.setItem('qm_ocultar_fer', ocultarFer?'1':'0');}, [ocultarFer]);

  // ── Colunas visíveis filtradas pelo período ───────────────────
  const todasColunas = useMemo(() => {
    const inicio = obra.dataInicio || hj;
    let cols = gerarColunasDatas(inicio, 177);
    if (ocultarFds) cols = cols.filter(c => !c.isFimSemana);
    if (ocultarFer) cols = cols.filter(c => !c.isFeriado);
    return cols;
  }, [obra.dataInicio, ocultarFds, ocultarFer, hj]);

  const colunas = useMemo(() => {
    if (periodo === 'todos') return todasColunas;
    const idxHoje = todasColunas.findIndex(c => c.isHoje);
    const base = idxHoje >= 0 ? idxHoje : 0;
    const diasBase = periodo === 'dia' ? 1 : periodo === 'semana' ? 7 : 30;
    const qty = diasBase * Math.max(1, qtdPeriodo);
    return todasColunas.slice(base, base + qty);
  }, [todasColunas, periodo, qtdPeriodo]);

  // ── Filtros de pacotes ────────────────────────────────────────
  const macroOpcoes = useMemo(() =>
    ['Todos', ...new Set(PACOTES_BASE.map(p => MACROFLUXOS[p.codigo]).filter(Boolean))], []);
  const microOpcoes = useMemo(() => {
    const base = macroFluxo === 'Todos' ? PACOTES_BASE : PACOTES_BASE.filter(p => MACROFLUXOS[p.codigo] === macroFluxo);
    return ['Todos', ...base.map(p => p.pacote)];
  }, [macroFluxo]);
  const pacotesFiltrados = useMemo(() =>
    PACOTES_BASE.filter(p => {
      const mOk = macroFluxo === 'Todos' || MACROFLUXOS[p.codigo] === macroFluxo;
      const uOk = microFluxo === 'Todos' || p.pacote === microFluxo;
      return mOk && uOk;
    }), [macroFluxo, microFluxo]);

  const unidades = useMemo(() => gerarUnidades(obra, tipologias), [obra, tipologias]);

  // ── Sync scroll header ↔ body ─────────────────────────────────
  useEffect(() => {
    const body = bodyRef.current;
    const hdr  = headerScrollRef.current;
    if (!body || !hdr) return;
    const fn = () => { hdr.scrollLeft = body.scrollLeft; };
    body.addEventListener('scroll', fn);
    return () => body.removeEventListener('scroll', fn);
  }, []);

  // ── Auto-scroll para hoje ─────────────────────────────────────
  useEffect(() => {
    if (!bodyRef.current || !todasColunas.length) return;
    const idxHoje = todasColunas.findIndex(c => c.isHoje);
    if (idxHoje < 0) return;
    const CELL_W = 40;
    const wrapW  = bodyRef.current.clientWidth || 800;
    const fixedW = 360;
    const scrollTo = Math.max(0, idxHoje * CELL_W - (wrapW - fixedW) / 2 + CELL_W / 2);
    setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollLeft = scrollTo; }, 180);
  }, [todasColunas, obra.dataInicio]);

  // ── Stats painel topo ─────────────────────────────────────────
  const stats = useMemo(() => {
    let concluidas=0, planejadas=0, realizadas=0, atrasos=0, dentes=0;
    // PPC — semana atual (Seg a Sex)
    const hojeDt   = new Date(hj+'T12:00:00');
    const dow       = hojeDt.getDay(); // 0=Dom
    const inicioSem = new Date(hojeDt);
    inicioSem.setDate(hojeDt.getDate() - (dow === 0 ? 6 : dow - 1));
    const fimSem    = new Date(inicioSem);
    fimSem.setDate(inicioSem.getDate() + 6);
    const semIni = toDateStr(inicioSem);
    const semFim = toDateStr(fimSem);

    let ppcPlan=0, ppcReal=0;   // Planejadas/Realizadas na semana
    let ppcqPlan=0, ppcqReal=0; // Idem com FVs

    PACOTES_BASE.forEach(p => {
      unidades.forEach(u => {
        const e = getEstado(obraAtual, p.id, u.cod);
        if (e.status==='concluida') concluidas++;
        if (e.status==='atrasada')  atrasos++;
        if (e.status==='dente')     dentes++;
        if (e.dataPlanejada===hj) {
          planejadas++;
          if (e.status==='concluida') realizadas++;
        }
        // PPC — meta estava planejada para esta semana?
        const dp = e.dataPlanejada || e.dataReprogramada;
        if (dp && dp >= semIni && dp <= semFim) {
          ppcPlan++;
          if (e.status === 'concluida') ppcReal++;
        }
        // PPCQ — inclui FVs
        if (p.temFvs) {
          const ef = getEstado(obraAtual, p.id+'_FVS', u.cod);
          const dpf = ef.dataPlanejada || ef.dataReprogramada;
          if (dpf && dpf >= semIni && dpf <= semFim) {
            ppcqPlan++;
            if (ef.fvsStatus === 'concluida') ppcqReal++;
          }
        }
      });
    });

    const diasDec = obra.dataInicio ? getDiasUteisEntre(obra.dataInicio, hj) : 0;
    const ritmo   = diasDec > 0 ? (concluidas/diasDec).toFixed(1) : null;
    const efic    = planejadas > 0 ? Math.round((realizadas/planejadas)*100) : null;
    const ppc     = ppcPlan  > 0 ? Math.round((ppcReal/ppcPlan)*100)   : null;
    const ppcq    = ppcqPlan > 0 ? Math.round((ppcqReal/ppcqPlan)*100) : null;

    return {
      ritmo, atrasos, dentes,
      metasDia:  `${realizadas} / ${planejadas}`,
      eficiencia: efic != null ? `${efic}%` : '—',
      eficienciaCor: efic==null?'#374151':efic>=80?'#16a34a':efic>=50?'#d97706':'#dc2626',
      ppc:  ppc  != null ? `${ppc}%`  : '—',
      ppcq: ppcq != null ? `${ppcq}%` : '—',
      ppcCor:  ppc==null?'#374151':ppc>=80?'#16a34a':ppc>=50?'#d97706':'#dc2626',
      ppcqCor: ppcq==null?'#374151':ppcq>=80?'#16a34a':ppcq>=50?'#d97706':'#dc2626',
    };
  }, [obraAtual, unidades, getEstado, obra.dataInicio, hj]);

  // ── Planejamento ──────────────────────────────────────────────
  const calcPlanejamento = useCallback((pacote, isFvs) => {
    const inicio = obra.dataInicio || hj;
    const pIdx   = PACOTES_BASE.findIndex(p => p.id === pacote.id);
    // offset -1: cada pacote começa 1 dia útil antes (mais adiantado no cronograma)
    const offset = Math.max(0, pIdx - 1) + (isFvs ? 1 : 0);
    let curD = new Date(inicio + 'T12:00:00');
    let av = 0;
    while (av < offset) {
      curD.setDate(curD.getDate()+1);
      if (isUtilDay(toDateStr(curD))) av++;
    }
    const res = {};
    const colFim = todasColunas.length > 0 ? todasColunas[todasColunas.length-1].dateStr : '2099-12-31';
    unidades.forEach(u => {
      while (!isUtilDay(toDateStr(curD))) curD.setDate(curD.getDate()+1);
      const ds = toDateStr(curD);
      if (ds <= colFim) {
        res[ds] = u;
        const key = isFvs ? pacote.id+'_FVS' : pacote.id;
        const e   = getEstado(obraAtual, key, u.cod);
        if (!e.dataPlanejada) setEstadoMeta(obraAtual, key, u.cod, { dataPlanejada: ds });
      }
      curD.setDate(curD.getDate()+1);
      while (!isUtilDay(toDateStr(curD))) curD.setDate(curD.getDate()+1);
    });
    return res;
  }, [obra.dataInicio, unidades, todasColunas, obraAtual, getEstado, setEstadoMeta, hj]);

  // ── Mudar status ──────────────────────────────────────────────
  function mudarStatus(pacoteId, unidadeCod, novoStatus) {
    setEstadoMeta(obraAtual, pacoteId, unidadeCod, {
      status:   novoStatus,
      dataReal: novoStatus==='concluida' ? hj : (getEstado(obraAtual,pacoteId,unidadeCod).dataReal||null),
    });
    setModalMeta(null);
    showToast(novoStatus==='concluida' ? '✅ Meta concluída!' : '💾 Status atualizado');
  }

  // ── Drag & Drop — reprogramar meta ────────────────────────────
  function handleDragStart(pacoteId, unidadeCod, dateStrAtual) {
    setDragInfo({ pacoteId, unidadeCod, dateStrAtual });
  }

  function handleDrop(novaData) {
    if (!dragInfo) return;
    const { pacoteId, unidadeCod } = dragInfo;
    if (!isUtilDay(novaData)) { showToast('⚠ Dia útil apenas'); setDragInfo(null); return; }
    setEstadoMeta(obraAtual, pacoteId, unidadeCod, {
      dataPlanejada: novaData,
      dataReprogramada: novaData,
      status: 'nao-iniciada',
    });
    showToast(`📅 Reprogramado para ${novaData.split('-').reverse().join('/')}`);
    setDragInfo(null);
  }

  // ── Reajuste automático de atrasos ────────────────────────────
  function reajustarAtrasos() {
    // Pega próxima segunda-feira
    const hoje_ = new Date(hj+'T12:00:00');
    const dow    = hoje_.getDay();
    const diasAteSeg = dow===0 ? 1 : (8-dow)%7||7;
    const proxSeg = new Date(hoje_);
    proxSeg.setDate(hoje_.getDate()+diasAteSeg);
    let novaData = toDateStr(proxSeg);
    while (!isUtilDay(novaData)) {
      const d = new Date(novaData+'T12:00:00');
      d.setDate(d.getDate()+1);
      novaData = toDateStr(d);
    }

    let count = 0;
    pacotesFiltrados.forEach(pacote => {
      unidades.forEach(u => {
        const e = getEstado(obraAtual, pacote.id, u.cod);
        if (e.status==='atrasada' || (e.status==='nao-iniciada' && e.dataPlanejada && e.dataPlanejada < hj)) {
          setEstadoMeta(obraAtual, pacote.id, u.cod, {
            dataPlanejada:    novaData,
            dataReprogramada: novaData,
            status:           'nao-iniciada',
          });
          count++;
        }
      });
    });
    showToast(count > 0 ? `🔄 ${count} atividades reprogramadas para ${novaData.split('-').reverse().join('/')}` : 'Nenhum atraso encontrado');
  }

  // ── Zaproid link ──────────────────────────────────────────────
  function salvarZapLink(pacoteId, url) {
    const novo = { ...zapLinks, [pacoteId]: url };
    setZapLinks(novo);
    localStorage.setItem('quadro_zapLinks', JSON.stringify(novo));
    showToast('🔗 Link Zaproid salvo!');
  }

  return (
    <div className={styles.container}>
      <PainelTopo obraAtual={obraAtual} obras={obras} stats={stats} />

      {/* ── Config bar ── */}
      <div className={styles.configBar}>

        {/* Datas */}
        <div className={styles.configGrp}>
          <label>Início:</label>
          <input type="date" value={obra.dataInicio||''} onChange={e=>atualizarDatas(obraAtual,e.target.value)} />
        </div>
        <div className={styles.configGrp}>
          <label>Término 🔒:</label>
          <input type="date" value={obra.dataTermino||''} readOnly className={styles.inputLocked} />
        </div>
        <div className={styles.configGrp}>
          <label>Tipologia:</label>
          <select value={obra.tipologia||''} onChange={e=>atualizarTipologia(obraAtual,e.target.value)}>
            {tipologias.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>

        <div className={styles.sepBar} />

        {/* Filtros */}
        <div className={styles.configGrp}>
          <label>Macrofluxo:</label>
          <select value={macroFluxo} onChange={e=>{setMacroFluxo(e.target.value);setMicroFluxo('Todos');}}>
            {macroOpcoes.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className={styles.configGrp}>
          <label>Microfluxo:</label>
          <select value={microFluxo} onChange={e=>setMicroFluxo(e.target.value)} style={{maxWidth:180}}>
            {microOpcoes.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className={styles.sepBar} />

        {/* Ocultar */}
        <label className={styles.checkLbl} style={{color:ocultarFds?'#dc2626':'#374151'}}>
          <input type="checkbox" checked={ocultarFds} onChange={e=>setOcultarFds(e.target.checked)} />
          Fins de semana
        </label>
        <label className={styles.checkLbl} style={{color:ocultarFer?'#dc2626':'#374151'}}>
          <input type="checkbox" checked={ocultarFer} onChange={e=>setOcultarFer(e.target.checked)} />
          Feriados
        </label>

        <div className={styles.sepBar} />

        {/* ── Seletor de período ── */}
        <div className={styles.periodoSel}>
          {[['dia','Dia'],['semana','Semana'],['mes','Mês'],['todos','Todos']].map(([k,l])=>(
            <button key={k}
              className={`${styles.periodoBtn} ${periodo===k?styles.periodoBtnAtivo:''}`}
              onClick={()=>setPeriodo(k)}>
              {l}
            </button>
          ))}
          {/* Quantidade — só aparece quando não é "todos" */}
          {periodo !== 'todos' && (
            <div className={styles.periodoQtd}>
              <input
                type="number"
                min={1}
                max={periodo==='dia'?90:periodo==='semana'?26:12}
                value={qtdPeriodo}
                onChange={e => setQtdPeriodo(Math.max(1, Number(e.target.value)))}
                className={styles.periodoInput}
                title={`Quantidade de ${periodo==='dia'?'dias':periodo==='semana'?'semanas':'meses'}`}
              />
              <span className={styles.periodoUnit}>
                {periodo==='dia'?'dia(s)':periodo==='semana'?'sem.':'mês/ses'}
              </span>
            </div>
          )}
        </div>

        {/* Botões à direita */}
        <div style={{marginLeft:'auto',display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
          <button className={styles.btnConfig} onClick={()=>setModalTip(true)}>⚙️ Tipologias</button>
          <button className={styles.btnAlerta} onClick={onAlerta}>🔔 80 Dias</button>
          <button className={`${styles.btnConfig} ${styles.btnVerde}`}
            onClick={()=>setModalSemanal(true)}>📅 Prog. Semanal</button>
          <button className={`${styles.btnConfig} ${styles.btnLaranja}`}
            title="Abrir tela de reprogramação de atividades em atraso"
            onClick={()=>setModalReprog(true)}>🔄 Reajustar Atrasos</button>
          <button className={`${styles.btnConfig}`} style={{background:'#b45309',color:'#fff',border:'none'}}
            onClick={()=>setModalFeriados(true)} title="Configurar dias não trabalhados">
            📅 Feriados
          </button>
          <button className={`${styles.btnConfig}`} style={{background:'#1d4ed8',color:'#fff',border:'none'}}
            onClick={()=>setModalHistorico(true)} title="Histórico de alterações">
            📋 Histórico
          </button>
          <button className={`${styles.btnConfig} ${styles.btnRoxo}`}
            onClick={()=>setModalExportar(true)}>📤 Exportar</button>
        </div>
      </div>

      {/* ── Legenda com badge de macrofluxo colorido ── */}
      <div className={styles.legenda}>
        {[
          ['Não Iniciada', styles.corNaoIniciada],
          ['Em Andamento', styles.corEmAndamento],
          ['Concluída',    styles.corConcluida  ],
          ['Em Atraso',    styles.corAtrasada   ],
          ['Dente 🦷',     styles.corDente      ],
          ['FVs ✓',        styles.corFvs        ],
          ['🔄 Reprog.',   styles.cellReprogramada],
          ['📅 Prog.',     styles.cellProgramada  ],
          ['⚠ GAP',        styles.cellGap       ],
        ].map(([label,cls])=>(
          <span key={label} className={styles.legendaItem}>
            <span className={`${styles.legendaCor} ${cls}`} />
            {label}
          </span>
        ))}
        <div className={styles.legendaSep}/>
        <span style={{marginLeft:'auto',fontSize:10,color:'#64748b',fontWeight:600}}>
          {colunas.length} dias · {pacotesFiltrados.length} pacotes
        </span>
      </div>

      {/* ── Quadro ── */}
      <div className={styles.scrollArea}>
        <div className={styles.wrapper}>

          {/* Header datas */}
          <div className={styles.headerDatas}>
            <div className={styles.headerFixed}>
              <div className={styles.hcfRow}>PACOTE DE TRABALHO</div>
              <div className={styles.hcfRow}>DESCRIÇÃO DAS METAS</div>
              <div className={styles.hcfRow}>EQUIPE</div>
            </div>
            <div className={styles.headerDatesScroll} ref={headerScrollRef}>
              {colunas.map((col,idx)=>(
                <div key={col.dateStr}
                  className={[
                    styles.dateCol,
                    col.isHoje      ? styles.hoje      : '',
                    col.isFimSemana ? styles.fimSemana : '',
                    col.isFeriado   ? styles.feriado   : '',
                  ].join(' ')}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>handleDrop(col.dateStr)}
                >
                  <span className={styles.dchNum}>{idx+1}</span>
                  <span className={styles.dchDia}>{col.dia}</span>
                  <span className={styles.dchDiaSem}>{col.diaSemana.slice(0,3)}</span>
                  <span className={styles.dchMes}>{col.mesNome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Corpo */}
          <div className={styles.quadroBody} ref={bodyRef}>
            {pacotesFiltrados.map(pacote=>{
              const planMeta = calcPlanejamento(pacote, false);
              const planFvs  = pacote.temFvs ? calcPlanejamento(pacote, true) : {};
              return (
                <div key={pacote.id} className={styles.grupo}>
                  <LinhaQuadro
                    pacote={pacote} isFvs={false} colunas={colunas}
                    planejamento={planMeta} hj={hj} obraAtual={obraAtual}
                    getEstado={getEstado} styles={styles}
                    zapLink={zapLinks[pacote.id]}
                    onZapLink={url=>salvarZapLink(pacote.id,url)}
                    onClickMeta={(p,u,ds,st)=>setModalMeta({pacote:p,unidade:u,dateStr:ds,status:st})}
                    onToggleFvs={abrirFvs}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                  />
                  {pacote.temFvs && (
                    <LinhaQuadro
                      pacote={pacote} isFvs={true} colunas={colunas}
                      planejamento={planFvs} hj={hj} obraAtual={obraAtual}
                      getEstado={getEstado} styles={styles}
                      onClickMeta={()=>{}}
                      onToggleFvs={abrirFvs}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className={styles.toast}>{toastMsg}</div>
      )}

      {/* ── Modais ── */}
      {modalMeta && (
        <ModalMeta {...modalMeta}
          getEstado={getEstado} obraAtual={obraAtual}
          onMudar={mudarStatus}
          onSalvarObs={(pid,cod,obs)=>setEstadoMeta(obraAtual,pid,cod,{observacao:obs})}
          onClose={()=>setModalMeta(null)}
          styles={styles}
        />
      )}

      {modalTip && (
        <ModalTipologias tipologias={tipologias}
          onAdicionar={adicionarTipologia} onRemover={removerTipologia}
          onClose={()=>setModalTip(false)}
        />
      )}

      {modalFvs && (
        <ModalFvs pacote={modalFvs.pacote} unidade={modalFvs.unidade}
          obraId={obraAtual} user={user}
          onClose={()=>setModalFvs(null)}
          onLiberar={(pid,uc)=>setEstadoMeta(obraAtual,pid+'_FVS',uc,{fvsStatus:'concluida'})}
        />
      )}

      {modalSemanal && (
        <ModalProgSemanal obraAtual={obraAtual} obras={obras} tipologias={tipologias}
          getEstado={getEstado} setEstadoMeta={setEstadoMeta} user={user}
          onClose={()=>setModalSemanal(false)}
        />
      )}

      {modalReprog && (
        <ModalReprogramacao obraAtual={obraAtual} obras={obras} tipologias={tipologias}
          getEstado={getEstado} setEstadoMeta={setEstadoMeta} user={user}
          onClose={()=>setModalReprog(false)}
        />
      )}

      {modalNovaObra && (
        <ModalNovaObra obras={obras} tipologias={tipologias}
          onSalvar={(novaObra) => { adicionarObra(novaObra); setModalNovaObra(false); showToast(`🏗 Obra "${novaObra.nome}" criada!`); }}
          onClose={()=>setModalNovaObra(false)}
        />
      )}

      {modalExportar && (
        <ModalExportar obraAtual={obraAtual} obras={obras}
          getEstado={getEstado} colunas={todasColunas}
          unidades={unidades} pacotesFiltrados={pacotesFiltrados}
          onClose={()=>setModalExportar(false)}
        />
      )}

      {modalHistorico && (
        <ModalHistorico
          obraAtual={obraAtual} obras={obras}
          getHistorico={getHistorico} limparHistorico={limparHistorico}
          onClose={()=>setModalHistorico(false)}
        />
      )}

      {modalBaseZero && (
        <ModalBaseZero
          obraAtual={obraAtual} obras={obras}
          estado={estado}
          salvarBaseZero={salvarBaseZero}
          getBaseZero={getBaseZero}
          temBaseZero={temBaseZero}
          unidades={unidades}
          getDiasUteisEntre={getDiasUteisEntre}
          onClose={()=>setModalBaseZero(false)}
          showToast={showToast}
        />
      )}

      {modalRestricoes && (
        <ModalRestricoes
          obraAtual={obraAtual} obras={obras}
          getRestricoes={getRestricoes}
          adicionarRestricao={adicionarRestricao}
          atualizarRestricao={atualizarRestricao}
          removerRestricao={removerRestricao}
          onClose={()=>setModalRestricoes(false)}
          showToast={showToast}
        />
      )}

      {modalFeriados && (
        <ModalFeriados
          feriadosCustom={feriadosCustom}
          adicionarFeriado={adicionarFeriado}
          removerFeriado={removerFeriado}
          onClose={()=>setModalFeriados(false)}
          showToast={showToast}
        />
      )}
    </div>
  );

  function abrirFvs(pacote, unidade) { setModalFvs({pacote,unidade}); }
}

// ── LinhaQuadro ───────────────────────────────────────────────
function LinhaQuadro({
  pacote, isFvs, colunas, planejamento, hj, obraAtual,
  getEstado, styles, onClickMeta, onToggleFvs,
  onDragStart, onDrop, zapLink, onZapLink,
}) {
  const [showZap, setShowZap] = useState(false);
  const [zapUrl,  setZapUrl]  = useState(zapLink||'');
  const cor = pacote.cor || '#888';

  return (
    <div className={`${styles.linha} ${isFvs?styles.linhaFvs:''}`}>
      <div className={styles.linhaFixed} style={!isFvs?{borderRightColor:cor}:{}}>

        {/* Nome do pacote */}
        <div className={`${styles.lfPacote} ${isFvs?styles.linhaFvs:''}`}
          style={!isFvs?{background:cor,color:'#fff',textShadow:'0 1px 2px rgba(0,0,0,.35)'}:{}}>
          {isFvs ? `FVs ${pacote.codigo}` : (
            <span style={{display:'flex',alignItems:'center',gap:4,width:'100%'}}>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{pacote.pacote}</span>
              <button
                title={zapLink ? `Zaproid: ${zapLink}` : 'Vincular Zaproid/Checklist'}
                onClick={e=>{e.stopPropagation();setShowZap(v=>!v);}}
                style={{
                  background:zapLink?'rgba(255,255,255,.35)':'rgba(255,255,255,.15)',
                  border:'none',borderRadius:3,padding:'0 4px',fontSize:10,
                  color:'#fff',cursor:'pointer',flexShrink:0,lineHeight:'16px',
                }}>
                {zapLink ? '🔗' : '＋'}
              </button>
            </span>
          )}
        </div>

        {/* Desc */}
        <div className={`${styles.lfDesc} ${isFvs?styles.linhaFvs:''}`}
          style={!isFvs?{background:cor+'22'}:{}}>
          {isFvs ? pacote.fvsDesc : pacote.descricao}
        </div>

        {/* Equipe */}
        <div className={styles.lfEquipe} style={!isFvs?{background:cor+'18'}:{}}>
          {isFvs ? '' : pacote.equipe}
        </div>
      </div>

      {/* Popup Zaproid */}
      {showZap && !isFvs && (
        <div style={{
          position:'absolute',left:4,top:'100%',zIndex:200,
          background:'#fff',border:'1px solid #dde4ec',borderRadius:8,
          padding:10,boxShadow:'0 8px 24px rgba(0,0,0,.15)',minWidth:280,
        }}>
          <div style={{fontSize:11,fontWeight:700,color:'#1e3a5f',marginBottom:6}}>
            🔗 Vincular Checklist / Zaproid
          </div>
          <input value={zapUrl} onChange={e=>setZapUrl(e.target.value)}
            placeholder="https://app.zaproid.com/checklist/..."
            style={{width:'100%',padding:'6px 8px',border:'1px solid #c8d4e0',borderRadius:5,fontSize:11,marginBottom:6}}
          />
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>{onZapLink?.(zapUrl);setShowZap(false);}}
              style={{flex:1,padding:'5px 0',background:'#1e3a5f',color:'#fff',border:'none',borderRadius:5,fontSize:11,fontWeight:700,cursor:'pointer'}}>
              Salvar
            </button>
            {zapLink && (
              <a href={zapLink} target="_blank" rel="noopener"
                style={{flex:1,padding:'5px 0',background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',borderRadius:5,fontSize:11,fontWeight:700,cursor:'pointer',textAlign:'center',textDecoration:'none'}}>
                Abrir ↗
              </a>
            )}
            <button onClick={()=>setShowZap(false)}
              style={{padding:'5px 10px',background:'#f4f7fb',border:'1px solid #dde4ec',borderRadius:5,fontSize:11,cursor:'pointer'}}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Células */}
      <div className={styles.linhaCelulas}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{
          const ds = e.currentTarget.dataset?.dropDate;
          if (ds) onDrop?.(ds);
        }}>
        {colunas.map(col=>{
          const unidade = planejamento[col.dateStr];
          if (!unidade) return (
            <div key={col.dateStr}
              className={`${styles.cell} ${styles.cellVazia}`}
              data-drop-date={col.dateStr}
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>onDrop?.(col.dateStr)}
            />
          );

          const chave = isFvs ? pacote.id+'_FVS' : pacote.id;
          const e     = getEstado(obraAtual, chave, unidade.cod);
          let st = isFvs
            ? (e.fvsStatus||'nao-iniciada')
            : (e.status   ||'nao-iniciada');
          if (!isFvs && st==='nao-iniciada' && col.dateStr<hj && col.isUtil) st='atrasada';

          const cls = isFvs
            ? (st==='concluida' ? styles.cellFvs : styles.cellNaoIniciada)
            : (STATUS_CLASS[st]||styles.cellNaoIniciada);

          // Se foi reprogramada via ModalReprogramacao (dataReprogramada sem flag de prog. manual)
          const isReprog = !isFvs && e.dataReprogramada && e.dataReprogramada === col.dateStr && e.status !== 'concluida' && !e.programadoManualmente;

          // Programado manualmente via ProgSemanal (azul claro)
          const isProgramado = !isFvs && e.programadoManualmente && col.dateStr === e.dataPlanejada && e.status !== 'concluida' && !isReprog;

          // GAP — planejado para data passada e não concluído (sem reprogramação)
          const isGap = !isFvs && !isReprog && !isProgramado && st === 'atrasada' && col.dateStr < hj;

          return (
            <div key={col.dateStr}
              className={`${styles.cell} ${isReprog ? styles.cellReprogramada : isProgramado ? styles.cellProgramada : cls} ${col.isHoje?styles.cellHoje:''} ${isGap?styles.cellGap:''}`}
              title={`${unidade.cod} | ${pacote.codigo} — ${col.dateStr}${isReprog?' 🔄 REPROGRAMADA':''}${isProgramado?' 📅 PROGRAMADA':''}${isGap?' ⚠️ GAP — não executado no prazo':''}\nArrastar para reprogramar`}
              draggable={!isFvs}
              onDragStart={()=>!isFvs&&onDragStart?.(pacote.id,unidade.cod,col.dateStr)}
              onDragOver={e=>e.preventDefault()}
              onDrop={()=>onDrop?.(col.dateStr)}
              onClick={()=>isFvs
                ? onToggleFvs(pacote,unidade,col.dateStr)
                : onClickMeta(pacote,unidade,col.dateStr,st)
              }
            >
              <span className={styles.cellText}>{isReprog ? '🔄' : isGap ? '⚠' : isProgramado ? '📅' : unidade.cod}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ModalMeta — tema claro ────────────────────────────────────
function ModalMeta({ pacote, unidade, dateStr, status, getEstado, obraAtual, onMudar, onSalvarObs, onClose }) {
  const e   = getEstado(obraAtual, pacote.id, unidade.cod);
  const [obs, setObs] = useState(e.observacao||'');
  const STATUS_LABELS = {'nao-iniciada':'Não Iniciada','em-andamento':'Em Andamento','concluida':'Concluída','atrasada':'Em Atraso','dente':'Dente'};
  const COR = {'nao-iniciada':'#f1f5f9','em-andamento':'#fef3c7','concluida':'#dcfce7','atrasada':'#fee2e2','dente':'#ffedd5'};
  const COR_T = {'nao-iniciada':'#374151','em-andamento':'#92400e','concluida':'#14532d','atrasada':'#7f1d1d','dente':'#7c2d12'};

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderTop:'3px solid #1e3a5f',borderRadius:10,minWidth:420,maxWidth:520,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#1e3a5f',color:'#fff',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',fontWeight:700,fontSize:13,borderBottom:'2px solid #f59e0b'}}>
          <span>
            <span style={{background:pacote.cor,padding:'1px 7px',borderRadius:3,fontSize:10,fontWeight:800,marginRight:8}}>{pacote.codigo}</span>
            Unidade {unidade.cod}
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
          {/* Info */}
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:7,padding:10,fontSize:12}}>
            <div style={{fontWeight:700,color:'#1e3a5f',marginBottom:3}}>{pacote.pacote}</div>
            <div style={{color:'#64748b'}}>Pav. {unidade.pav} · {unidade.ciclo ? 'APS 4' : 'Térreo'} · Data: {dateStr}</div>
            <div style={{marginTop:4,display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700,background:COR[status]||'#f1f5f9',color:COR_T[status]||'#374151'}}>
              {STATUS_LABELS[status]||status}
            </div>
          </div>

          {/* Botões de status */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#5a6a7e',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:7}}>Alterar Status</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[['▶ Iniciar','#92400e','#fef3c7','em-andamento'],['✓ Concluir','#14532d','#dcfce7','concluida'],
                ['⚠ Atraso','#7f1d1d','#fee2e2','atrasada'],['🦷 Dente','#7c2d12','#ffedd5','dente'],
                ['↺ Resetar','#374151','#f1f5f9','nao-iniciada']
              ].map(([label,cor,bg,st])=>(
                <button key={st} onClick={()=>onMudar(pacote.id,unidade.cod,st)}
                  style={{padding:'7px 12px',border:`1.5px solid ${cor}`,borderRadius:6,background:status===st?bg:'#fff',color:cor,fontWeight:700,fontSize:11,cursor:'pointer',transition:'all .15s'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#5a6a7e',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>Observação</div>
            <textarea value={obs} onChange={e=>setObs(e.target.value)}
              placeholder="Detalhes, pendências, etc."
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:6,padding:'8px 10px',fontSize:12,resize:'vertical',minHeight:56,fontFamily:'inherit',color:'#374151'}}
            />
          </div>

          {/* Footer */}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button onClick={onClose} style={{padding:'7px 14px',background:'#f4f7fb',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancelar</button>
            <button onClick={()=>onSalvarObs(pacote.id,unidade.cod,obs)}
              style={{padding:'7px 16px',background:'#16a34a',border:'none',borderRadius:6,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
              💾 Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ModalTipologias — tema claro ──────────────────────────────
function ModalTipologias({ tipologias, onAdicionar, onRemover, onClose }) {
  const [form, setForm] = useState({nome:'',pavimentos:17,aptos:8,ciclos:'A,B,C,D',diasPorMeta:1});
  function salvar() {
    if (!form.nome.trim()) return;
    onAdicionar({...form, ciclos:form.ciclos.split(',').map(s=>s.trim()).filter(Boolean)});
    setForm({nome:'',pavimentos:17,aptos:8,ciclos:'A,B,C,D',diasPorMeta:1});
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderTop:'3px solid #1e3a5f',borderRadius:10,minWidth:440,maxWidth:640,width:'90%',maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden'}}>
        <div style={{background:'#1e3a5f',color:'#fff',padding:'12px 16px',display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:14,borderBottom:'2px solid #f59e0b'}}>
          <span>⚙️ Cadastro de Tipologias</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:16,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
          {[['nome','Nome','text','Ex: Torre A'],['pavimentos','Pavimentos','number','17'],
            ['aptos','Aptos/Pav','number','8'],['ciclos','Ciclos','text','A,B,C,D'],['diasPorMeta','Dias/meta','number','1']
          ].map(([key,label,type,ph])=>(
            <div key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <label style={{width:120,color:'#5a6a7e',flexShrink:0,fontWeight:700}}>{label}:</label>
              <input type={type} placeholder={ph} value={form[key]}
                onChange={e=>setForm(f=>({...f,[key]:type==='number'?Number(e.target.value):e.target.value}))}
                style={{flex:1,background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:5,padding:'6px 8px',fontSize:12,color:'#374151'}}
              />
            </div>
          ))}
          <button onClick={salvar} style={{alignSelf:'flex-end',padding:'7px 16px',background:'#16a34a',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            ＋ Salvar Tipologia
          </button>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:6}}>
            {tipologias.map((t,idx)=>(
              <div key={t.id} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px',fontSize:11,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800,color:'#1e3a5f'}}>{t.nome}</div>
                  <div style={{color:'#5a6a7e'}}>{t.pavimentos} pav. · {t.aptos} aptos/pav. · Ciclos: {t.ciclos?.join?.(',')||t.ciclos} · {t.diasPorMeta} dia(s)/meta</div>
                </div>
                <button onClick={()=>onRemover(idx)} style={{background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:4,padding:'2px 8px',fontSize:10,cursor:'pointer',fontWeight:700}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ModalBaseZero ─────────────────────────────────────────────
function ModalBaseZero({ obraAtual, obras, estado, salvarBaseZero, getBaseZero, temBaseZero, unidades, getDiasUteisEntre, onClose, showToast }) {
  const obra    = obras[obraAtual] || {};
  const bz      = getBaseZero(obraAtual);
  const jaTemBZ = temBaseZero(obraAtual);
  const [confirmando, setConfirmando] = useState(false);

  // Calcula variação: fim estimado atual vs fim da Base Zero
  function calcVariacao() {
    if (!bz) return null;
    const fimBZ      = obra.dataTermino;   // data atual (Base Zero foi o primeiro término)
    const fimAtual   = obra.dataTermino;
    if (!fimBZ || !fimAtual) return null;
    const diff = getDiasUteisEntre(fimBZ, fimAtual) - 1;
    return diff;
  }

  function handleSalvar() {
    if (jaTemBZ) return;
    // Snapshot do estado atual da obra
    const snapshot = estado[obraAtual] || {};
    const res = salvarBaseZero(obraAtual, snapshot);
    if (res.ok) {
      showToast('🎯 Base Zero salva com sucesso!');
      onClose();
    } else {
      showToast('⚠️ ' + res.msg, 4000);
    }
  }

  const variacao = calcVariacao();

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #dde4ec',borderTop:'4px solid #0f766e',width:'100%',maxWidth:580,boxShadow:'0 28px 80px rgba(0,0,0,.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#0f766e',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>🎯 Base Zero — Planejamento Inicial</div>
            <div style={{fontSize:11,opacity:.7,marginTop:2}}>{obra.nome}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
          {jaTemBZ ? (
            <>
              <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:14,fontSize:13}}>
                <div style={{fontWeight:800,color:'#14532d',marginBottom:8}}>✅ Base Zero registrada</div>
                <div style={{color:'#166534',fontSize:12,lineHeight:1.8}}>
                  <strong>Criada em:</strong> {new Date(bz.criadaEm).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}<br/>
                  <strong>Término planejado:</strong> {obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—'}<br/>
                  <strong>Unidades:</strong> {unidades.length} · <strong>Pacotes:</strong> {PACOTES_BASE.length}
                </div>
              </div>

              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:14,fontSize:12}}>
                <div style={{fontWeight:800,color:'#1e3a5f',marginBottom:8}}>📊 Variação LB0</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[
                    ['Início',     obra.dataInicio  ? obra.dataInicio.split('-').reverse().join('/')  : '—', '#1d4ed8'],
                    ['Término LB0',obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—', '#dc2626'],
                  ].map(([lbl,val,cor])=>(
                    <div key={lbl} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'10px 12px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>{lbl}</div>
                      <div style={{fontSize:15,fontWeight:800,color:cor}}>{val}</div>
                    </div>
                  ))}
                </div>
                {variacao !== null && (
                  <div style={{marginTop:10,padding:'8px 12px',borderRadius:6,background:variacao===0?'#f0fdf4':variacao>0?'#fef2f2':'#fff7ed',border:`1px solid ${variacao===0?'#86efac':variacao>0?'#fca5a5':'#fed7aa'}`,fontSize:12,fontWeight:700,color:variacao===0?'#14532d':variacao>0?'#b91c1c':'#92400e',textAlign:'center'}}>
                    {variacao === 0 ? '✅ Sem variação em relação à Base Zero' : variacao > 0 ? `⚠️ +${variacao} dias úteis de atraso em relação à Base Zero` : `✅ ${Math.abs(variacao)} dias úteis adiantado em relação à Base Zero`}
                  </div>
                )}
              </div>

              <div style={{background:'#fef9c3',border:'1px solid #fde047',borderRadius:8,padding:12,fontSize:11,color:'#713f12'}}>
                ⚠️ <strong>A Base Zero é imutável.</strong> Uma nova Base Zero exige alinhamento conforme as orientações da metodologia e a elaboração de um novo arquivo.
              </div>
            </>
          ) : (
            <>
              <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:14,fontSize:13}}>
                <div style={{fontWeight:700,color:'#14532d',marginBottom:6}}>O que é a Base Zero?</div>
                <div style={{color:'#166534',fontSize:12,lineHeight:1.8}}>
                  A Base Zero é um snapshot imutável do planejamento inicial. Após criada, serve como referência para calcular variações e atrasos em relação ao plano original.<br/><br/>
                  <strong>⚠️ Só pode ser criada uma vez por obra.</strong>
                </div>
              </div>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:14,fontSize:12}}>
                <div style={{fontWeight:700,color:'#1e3a5f',marginBottom:6}}>Dados que serão gravados:</div>
                <div style={{color:'#374151',lineHeight:1.8}}>
                  Obra: <strong>{obra.nome}</strong><br/>
                  Início: <strong>{obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : 'Não definido'}</strong><br/>
                  Término: <strong>{obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : 'Não definido'}</strong><br/>
                  Unidades: <strong>{unidades.length}</strong> · Pacotes: <strong>{PACOTES_BASE.length}</strong>
                </div>
              </div>
              {!confirmando ? (
                <button onClick={()=>setConfirmando(true)}
                  style={{padding:'10px 20px',background:'#0f766e',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  🎯 Criar Base Zero agora
                </button>
              ) : (
                <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,padding:14,display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{fontWeight:700,color:'#92400e',fontSize:13}}>⚠️ Confirmar criação da Base Zero?</div>
                  <div style={{fontSize:12,color:'#78350f'}}>Esta ação não pode ser desfeita. A Base Zero só pode ser criada uma vez por obra.</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={handleSalvar} style={{flex:1,padding:'9px',background:'#0f766e',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>✅ Confirmar</button>
                    <button onClick={()=>setConfirmando(false)} style={{flex:1,padding:'9px',background:'#f4f7fb',border:'1px solid #dde4ec',borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancelar</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{padding:'10px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'8px 22px',background:'#1e3a5f',border:'none',borderRadius:7,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── ModalRestricoes ───────────────────────────────────────────
const TIPOS_RESTRICAO = ['Mão de obra','Material/Insumo','Equipamento','Acesso/Logística','Projeto/Aprovação','Subcontratado','Outro'];
const STATUS_RESTRICAO = { aberta:'🔴 Aberta', em_andamento:'🟡 Em andamento', removida:'🟢 Removida' };

function ModalRestricoes({ obraAtual, obras, getRestricoes, adicionarRestricao, atualizarRestricao, removerRestricao, onClose, showToast }) {
  const obra = obras[obraAtual] || {};
  const lista = getRestricoes(obraAtual);

  const FORM_VAZIO = { tipo: TIPOS_RESTRICAO[0], descricao: '', responsavel: '', prazo: '', pacoteId: '' };
  const [form, setForm]       = useState(FORM_VAZIO);
  const [filtroSt, setFiltroSt] = useState('');
  const [mostrando, setMostrando] = useState('lista'); // lista | form

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  function salvar() {
    if (!form.descricao.trim()) { showToast('⚠️ Descreva a restrição'); return; }
    adicionarRestricao(obraAtual, form);
    setForm(FORM_VAZIO);
    setMostrando('lista');
    showToast('🚧 Restrição registrada!');
  }

  const listaFiltrada = lista.filter(r => !filtroSt || r.status === filtroSt);

  const contadores = {
    aberta:        lista.filter(r=>r.status==='aberta').length,
    em_andamento:  lista.filter(r=>r.status==='em_andamento').length,
    removida:      lista.filter(r=>r.status==='removida').length,
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #dde4ec',borderTop:'4px solid #7c3aed',width:'100%',maxWidth:700,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 28px 80px rgba(0,0,0,.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#7c3aed',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>🚧 Análise de Restrições</div>
            <div style={{fontSize:11,opacity:.7,marginTop:2}}>{obra.nome} · {lista.length} restrição(ões)</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        {/* Contadores */}
        <div style={{display:'flex',gap:1,background:'#dde4ec',flexShrink:0}}>
          {[
            [contadores.aberta,       '#dc2626','Abertas'],
            [contadores.em_andamento, '#d97706','Em andamento'],
            [contadores.removida,     '#16a34a','Removidas'],
          ].map(([n,cor,lbl])=>(
            <div key={lbl} style={{flex:1,background:'#fff',padding:'8px 12px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:cor}}>{n}</div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:.7,color:'#5a6a7e',fontWeight:700,marginTop:2}}>{lbl}</div>
            </div>
          ))}
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',padding:'0 12px'}}>
            <button onClick={()=>setMostrando(m=>m==='form'?'lista':'form')}
              style={{padding:'6px 14px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {mostrando==='form'?'← Lista':'＋ Nova'}
            </button>
          </div>
        </div>

        {/* Filtro */}
        {mostrando === 'lista' && (
          <div style={{padding:'8px 16px',background:'#f4f7fb',borderBottom:'1px solid #dde4ec',display:'flex',gap:6,flexShrink:0}}>
            <span style={{fontSize:11,color:'#5a6a7e',fontWeight:700,alignSelf:'center'}}>Filtrar:</span>
            {[['','Todas'],['aberta','Abertas'],['em_andamento','Em andamento'],['removida','Removidas']].map(([k,l])=>(
              <button key={k} onClick={()=>setFiltroSt(k)}
                style={{padding:'4px 10px',border:'none',borderRadius:5,fontSize:11,fontWeight:700,cursor:'pointer',background:filtroSt===k?'#7c3aed':'#e5e7eb',color:filtroSt===k?'#fff':'#374151'}}>
                {l}
              </button>
            ))}
            <span style={{marginLeft:'auto',fontSize:11,color:'#64748b'}}>{listaFiltrada.length} item(s)</span>
          </div>
        )}

        {/* Conteúdo */}
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          {mostrando === 'form' ? (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{fontWeight:700,color:'#7c3aed',fontSize:13,marginBottom:4}}>Nova Restrição</div>
              {[
                ['Tipo',         <select value={form.tipo} onChange={e=>set('tipo',e.target.value)} style={{flex:1,padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12}}>
                  {TIPOS_RESTRICAO.map(t=><option key={t}>{t}</option>)}
                </select>],
                ['Descrição *',  <textarea value={form.descricao} onChange={e=>set('descricao',e.target.value)} rows={3} placeholder="Descreva a restrição detalhadamente..."
                  style={{flex:1,padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12,resize:'vertical',fontFamily:'inherit'}} />],
                ['Responsável',  <input value={form.responsavel} onChange={e=>set('responsavel',e.target.value)} placeholder="Nome do responsável pela remoção"
                  style={{flex:1,padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12}} />],
                ['Prazo',        <input type="date" value={form.prazo} onChange={e=>set('prazo',e.target.value)}
                  style={{flex:1,padding:'7px 10px',border:'1.5px solid #e2e8f0',borderRadius:6,fontSize:12}} />],
              ].map(([lbl,field])=>(
                <div key={lbl} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <label style={{width:110,fontSize:12,fontWeight:700,color:'#374151',paddingTop:8,flexShrink:0}}>{lbl}</label>
                  {field}
                </div>
              ))}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
                <button onClick={()=>setMostrando('lista')} style={{padding:'8px 16px',background:'#f4f7fb',border:'1px solid #dde4ec',borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancelar</button>
                <button onClick={salvar} style={{padding:'8px 20px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>🚧 Registrar Restrição</button>
              </div>
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
              <div style={{fontSize:36,marginBottom:8}}>✅</div>
              <div>{filtroSt ? 'Nenhuma restrição neste status.' : 'Nenhuma restrição registrada.'}</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {listaFiltrada.map(r => {
                const vencida = r.prazo && r.status !== 'removida' && r.prazo < new Date().toISOString().slice(0,10);
                return (
                  <div key={r.id} style={{border:`1px solid ${vencida?'#fca5a5':r.status==='removida'?'#86efac':'#e2e8f0'}`,borderLeft:`4px solid ${vencida?'#dc2626':r.status==='removida'?'#16a34a':r.status==='em_andamento'?'#d97706':'#7c3aed'}`,borderRadius:8,padding:12,background:vencida?'#fff5f5':r.status==='removida'?'#f0fdf4':'#fafafa'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                          <span style={{background:'#ede9fe',color:'#5b21b6',fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10}}>{r.tipo}</span>
                          <span style={{fontSize:10,color:'#64748b'}}>{STATUS_RESTRICAO[r.status]||r.status}</span>
                          {vencida && <span style={{background:'#fee2e2',color:'#b91c1c',fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10}}>⚠️ VENCIDA</span>}
                        </div>
                        <div style={{fontSize:12,color:'#1e3a5f',fontWeight:600,marginBottom:4}}>{r.descricao}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>
                          {r.responsavel && <span>👤 {r.responsavel} · </span>}
                          {r.prazo && <span>📅 Prazo: {r.prazo.split('-').reverse().join('/')} · </span>}
                          <span>Criada: {new Date(r.criadaEm).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        {r.status !== 'removida' && (
                          <button onClick={()=>{ atualizarRestricao(obraAtual,r.id,{status: r.status==='aberta'?'em_andamento':'removida'}); showToast('✅ Status atualizado'); }}
                            style={{padding:'4px 10px',background:'#ede9fe',color:'#5b21b6',border:'none',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer'}}>
                            {r.status==='aberta'?'▶ Iniciar':'✓ Remover'}
                          </button>
                        )}
                        <button onClick={()=>{ removerRestricao(obraAtual,r.id); showToast('🗑 Restrição excluída'); }}
                          style={{padding:'4px 8px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:5,fontSize:10,cursor:'pointer'}}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{padding:'10px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'8px 22px',background:'#7c3aed',border:'none',borderRadius:7,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── ModalFeriados ─────────────────────────────────────────────
function ModalFeriados({ feriadosCustom, adicionarFeriado, removerFeriado, onClose, showToast }) {
  const [novaData, setNovaData] = useState('');
  const [descricao, setDescricao] = useState('');

  const todosFeriados   = [...new Set([...FERIADOS, ...feriadosCustom])].sort();
  const feriadosPadrao  = [...FERIADOS].sort();
  const feriadosExtras  = feriadosCustom.sort();

  function adicionar() {
    if (!novaData) { showToast('⚠️ Selecione uma data'); return; }
    if (FERIADOS.has(novaData)) { showToast('⚠️ Já consta no calendário padrão'); return; }
    adicionarFeriado(novaData);
    showToast(`📅 ${novaData.split('-').reverse().join('/')} adicionado`);
    setNovaData('');
    setDescricao('');
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #dde4ec',borderTop:'4px solid #b45309',width:'100%',maxWidth:600,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 28px 80px rgba(0,0,0,.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#b45309',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>📅 Dias Não Trabalhados</div>
            <div style={{fontSize:11,opacity:.7,marginTop:2}}>{todosFeriados.length} datas · {feriadosExtras.length} customizadas</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        {/* Aviso sábado */}
        <div style={{padding:'10px 16px',background:'#fef3c7',borderBottom:'1px solid #fde68a',fontSize:11,color:'#92400e',flexShrink:0}}>
          ⚠️ <strong>Sábados</strong> são considerados dias úteis pelo sistema. Para não trabalhar em um sábado específico, adicione-o aqui.
        </div>

        {/* Adicionar */}
        <div style={{padding:'12px 16px',background:'#f4f7fb',borderBottom:'1px solid #dde4ec',display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
          <div style={{flex:1}}>
            <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Nova data não trabalhada</label>
            <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
              style={{width:'100%',padding:'7px 10px',border:'1.5px solid #c8d4e0',borderRadius:6,fontSize:12}} />
          </div>
          <button onClick={adicionar} style={{padding:'8px 16px',background:'#b45309',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>＋ Adicionar</button>
        </div>

        {/* Listas */}
        <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:16}}>
          {/* Customizados */}
          <div>
            <div style={{fontWeight:700,color:'#b45309',fontSize:12,marginBottom:8}}>📌 Datas adicionadas ({feriadosExtras.length})</div>
            {feriadosExtras.length === 0 ? (
              <div style={{color:'#94a3b8',fontSize:12,padding:'8px 0'}}>Nenhuma data customizada ainda.</div>
            ) : (
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {feriadosExtras.map(d => (
                  <div key={d} style={{display:'flex',alignItems:'center',gap:4,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:600,color:'#92400e'}}>
                    {d.split('-').reverse().join('/')}
                    <button onClick={()=>{ removerFeriado(d); showToast(`📅 ${d.split('-').reverse().join('/')} removido`); }}
                      style={{background:'none',border:'none',color:'#b45309',cursor:'pointer',fontSize:12,padding:0,marginLeft:2,lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Padrão */}
          <div>
            <div style={{fontWeight:700,color:'#374151',fontSize:12,marginBottom:8}}>📆 Feriados padrão ({feriadosPadrao.length}) — não editáveis</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {feriadosPadrao.map(d => (
                <div key={d} style={{background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 10px',fontSize:11,color:'#475569'}}>
                  {d.split('-').reverse().join('/')}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{padding:'10px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'8px 22px',background:'#b45309',border:'none',borderRadius:7,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
