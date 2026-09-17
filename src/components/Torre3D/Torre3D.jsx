// ================================================================
// Torre3D.jsx — 3 torres no condomínio, animação ao trocar
// ================================================================
import { useEffect, useRef, useState } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';
import styles from './Torre3D.module.css';
import { buildTorre3D } from './torre3d.engine';

const PAVIMENTOS = [
  { num:'T', label:'Térreo', idx:0 },
  ...Array.from({length:15},(_,i)=>({ num:i+1, label:`${i+1}º Pavimento`, idx:i+1 })),
  { num:'COB', label:'Cobertura', idx:16 },
];
const CICLOS = [
  {ciclo:'A',tipo:'Tipo 4',area:'56,69m²'},
  {ciclo:'B',tipo:'Tipo 3',area:'48,31m²'},
  {ciclo:'C',tipo:'Tipo 3',area:'48,31m²'},
  {ciclo:'D',tipo:'Tipo 4',area:'56,69m²'},
];
const STATUS_CSS   = {livre:'#64748b',andamento:'#f59e0b',concluido:'#16a34a',atrasado:'#dc2626'};
const STATUS_LABEL = {livre:'Não Iniciado',andamento:'Em Andamento',concluido:'Concluído',atrasado:'Em Atraso'};

// IDs das obras → índice da torre no cenário (0=TC, 1=TB, 2=TA)
const OBRA_TORRE_IDX = { TC:0, TB:1, TA:2 };

export default function Torre3D({ obraAtual, obras, getEstado }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [aptoInfo, setAptoInfo] = useState(null);
  const [torreAtiva, setTorreAtiva] = useState(OBRA_TORRE_IDX[obraAtual] ?? 0);

  // ── Helpers de status ──────────────────────────────────────
  function getStatusApto(obraId, pav, ciclo) {
    const cod = (pav==='T'?'T':String(pav))+ciclo;
    let conc=0,atr=0,and=0;
    PACOTES_BASE.forEach(p => {
      const st = getEstado(obraId, p.id, cod).status||'nao-iniciada';
      if (st==='concluida')      conc++;
      else if (st==='atrasada')  atr++;
      else if (st==='em-andamento') and++;
    });
    if (atr>0) return 'atrasado';
    if (conc===PACOTES_BASE.length) return 'concluido';
    if (conc>0||and>0) return 'andamento';
    return 'livre';
  }

  function getProgresso(obraId, pav, ciclo) {
    const cod=(pav==='T'?'T':String(pav))+ciclo;
    const total=PACOTES_BASE.length;
    const conc=PACOTES_BASE.filter(p=>getEstado(obraId,p.id,cod).status==='concluida').length;
    return {total,conc,pct:Math.round((conc/total)*100)};
  }

  // ── Inicializar engine ─────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current||!canvasRef.current) return;

    const obraIds = ['TC','TB','TA'];

    try {
      engineRef.current = buildTorre3D({
        wrapper:    wrapRef.current,
        canvas:     canvasRef.current,
        pavimentos: PAVIMENTOS,
        ciclos:     CICLOS,
        obraIds,
        getStatus: (torreIdx, pav, ciclo) =>
          getStatusApto(obraIds[torreIdx]||'TC', pav, ciclo),
        onClickApto: (ud) => {
          const obraId = obraIds[ud.torreIdx]||'TC';
          const prog   = getProgresso(obraId, ud.pav, ud.ciclo);
          const cod    = (ud.pav==='T'?'T':String(ud.pav))+ud.ciclo;
          const st     = getStatusApto(obraId, ud.pav, ud.ciclo);
          const pkHtml = PACOTES_BASE.map(p => {
            const pst=getEstado(obraId,p.id,cod).status||'nao-iniciada';
            const icons={concluida:'✅',atrasada:'🔴','em-andamento':'🟡',dente:'🦷','nao-iniciada':'⚪'};
            return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #e8eef2;font-size:11px;">
              <span style="color:#374151;font-weight:600">${p.codigo}</span>
              <span>${icons[pst]||'⚪'}</span></div>`;
          }).join('');
          setAptoInfo({cod,ud,prog,st,pkHtml,obraId});
        },
      });
    } catch(err) {
      console.error('Torre3D engine error:', err);
    }

    return () => engineRef.current?.dispose();
  }, []);

  // Refresh cores ao mudar estado
  useEffect(() => {
    const obraIds=['TC','TB','TA'];
    engineRef.current?.refresh((tIdx,pav,ciclo)=>
      getStatusApto(obraIds[tIdx]||'TC',pav,ciclo)
    );
  });

  // ── Trocar torre com animação ──────────────────────────────
  function trocarTorre(idx) {
    if (idx===torreAtiva) return;
    setTorreAtiva(idx);
    setAptoInfo(null);
    engineRef.current?.flyToTorre(idx);
  }

  const nomesTorre = ['Torre C', 'Torre B', 'Torre A'];
  const coresTorre = ['#1e3a5f','#0f4c8c','#0a3060'];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>

        {/* Seletor de torre */}
        <div className={styles.torreSel}>
          <div className={styles.torreSelTitle}>🏢 Torres do Condomínio</div>
          {[0,1,2].map(idx => (
            <button key={idx}
              className={`${styles.torreBtn} ${torreAtiva===idx?styles.torreBtnAtivo:''}`}
              onClick={() => trocarTorre(idx)}>
              <span className={styles.torreBtnIcon}>🏗</span>
              <div>
                <div className={styles.torreBtnNome}>{nomesTorre[idx]}</div>
                <div className={styles.torreBtnSub}>17 pav · 136 aptos</div>
              </div>
              {torreAtiva===idx && <span className={styles.torreBtnCheck}>●</span>}
            </button>
          ))}
        </div>

        <div className={styles.legBox}>
          <div className={styles.legTitle}>Legenda</div>
          {[['livre','#94a3b8','Não Iniciado'],['andamento','#f59e0b','Em Andamento'],
            ['concluido','#16a34a','Concluído'],['atrasado','#dc2626','Em Atraso']].map(([k,c,l])=>(
            <div key={k} className={styles.legItem}>
              <span className={styles.legCor} style={{background:c}}/>
              {l}
            </div>
          ))}
        </div>

        <div className={styles.pavSel}>
          <div className={styles.pavSelTitle}>Focar Pavimento</div>
          <div className={styles.pavBtns}>
            {PAVIMENTOS.map(p=>(
              <button key={p.idx} className={styles.pavBtn}
                onClick={()=>engineRef.current?.focusPav(torreAtiva,p.idx)}
                title={p.label}>
                {p.num==='T'?'Tér':p.num==='COB'?'Cob':String(p.num)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.aptoInfo}>
          <div className={styles.aptoInfoTitle}>Apartamento</div>
          {aptoInfo ? (
            <div>
              <div style={{fontSize:22,fontWeight:900,color:'#1e3a5f',marginBottom:2}}>{aptoInfo.cod}</div>
              <div style={{fontSize:11,color:'#5a6a7e',marginBottom:2}}>{aptoInfo.ud.tipo} · {aptoInfo.ud.area}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginBottom:6}}>
                {aptoInfo.ud.pavLabel} · {aptoInfo.ud.fachada==='frente'?'Fachada Sul':'Fachada Norte'}
              </div>
              <div style={{fontSize:13,fontWeight:800,color:STATUS_CSS[aptoInfo.st],marginBottom:6}}>
                {STATUS_LABEL[aptoInfo.st]}
              </div>
              <div style={{fontSize:11,color:'#374151',marginBottom:4}}>
                {aptoInfo.prog.conc}/{aptoInfo.prog.total} metas · {aptoInfo.prog.pct}%
              </div>
              <div style={{height:6,background:'#e2e8f0',borderRadius:3,marginBottom:10,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${aptoInfo.prog.pct}%`,background:STATUS_CSS[aptoInfo.st],borderRadius:3,transition:'width .4s'}}/>
              </div>
              <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:4,textTransform:'uppercase',letterSpacing:'.5px'}}>Metas por Pacote</div>
              <div style={{maxHeight:200,overflowY:'auto',fontSize:11}} dangerouslySetInnerHTML={{__html:aptoInfo.pkHtml}}/>
            </div>
          ) : (
            <div className={styles.aptoInfoEmpty}>Clique em um apartamento para ver os detalhes.</div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas id="canvas3d" ref={canvasRef} className={styles.canvas}/>
        <div className={styles.hint}>🖱 Arrastar para girar · Scroll para zoom · Clique no apartamento</div>
        <div id="tooltip3d"/>
        <div id="label3d"/>
        <div className={styles.controls}>
          <div className={styles.ctrlRow}>
            <button className={styles.ctrlBtn} onClick={()=>engineRef.current?.rotateLeft()}>◀</button>
            <button className={styles.ctrlBtn} onClick={()=>engineRef.current?.resetCamera()}>⌖</button>
            <button className={styles.ctrlBtn} onClick={()=>engineRef.current?.rotateRight()}>▶</button>
          </div>
          <div className={styles.ctrlRow}>
            <button className={styles.ctrlBtn} onClick={()=>engineRef.current?.zoomIn()}>+</button>
            <button className={styles.ctrlBtn} onClick={()=>engineRef.current?.zoomOut()}>−</button>
          </div>
        </div>
      </div>
    </div>
  );
}
