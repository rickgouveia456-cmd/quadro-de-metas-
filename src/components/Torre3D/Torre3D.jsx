import { useEffect, useRef, useState } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';
import styles from './Torre3D.module.css';
import { buildTorre3D } from './torre3d.engine';

// Constantes da torre
const PAVIMENTOS = [
  { num:'T',   label:'Térreo',                   idx:0  },
  ...Array.from({length:15},(_,i)=>({ num:i+1, label:`${i+1}º Pavimento`, idx:i+1 })),
  { num:'COB', label:'Cobertura / Laje Técnica',  idx:16 },
];

const CICLOS = [
  { ciclo:'A', tipo:'Tipo 4', area:'56,69m²' },
  { ciclo:'B', tipo:'Tipo 3', area:'48,31m²' },
  { ciclo:'C', tipo:'Tipo 3', area:'48,31m²' },
  { ciclo:'D', tipo:'Tipo 4', area:'56,69m²' },
];

const STATUS_CSS = { livre:'#94a3b8', andamento:'#fbbf24', concluido:'#4ade80', atrasado:'#f87171' };
const STATUS_LABEL = { livre:'Não Iniciado', andamento:'Em Andamento', concluido:'Concluído', atrasado:'Em Atraso' };

export default function Torre3D({ obraAtual, getEstado }) {
  const wrapRef    = useRef(null);
  const canvasRef  = useRef(null);
  const engineRef  = useRef(null);
  const [aptoInfo, setAptoInfo] = useState(null);

  function getStatusApto(pav, ciclo) {
    const cod = (pav === 'T' ? 'T' : String(pav)) + ciclo;
    let total=0, conc=0, atr=0, and=0;
    PACOTES_BASE.forEach(p => {
      total++;
      const st = getEstado(obraAtual, p.id, cod).status || 'nao-iniciada';
      if (st === 'concluida')      conc++;
      else if (st === 'atrasada')  atr++;
      else if (st === 'em-andamento') and++;
    });
    if (!total)           return 'livre';
    if (atr > 0)          return 'atrasado';
    if (conc === total)   return 'concluido';
    if (conc > 0 || and > 0) return 'andamento';
    return 'livre';
  }

  function getProgresso(pav, ciclo) {
    const cod = (pav === 'T' ? 'T' : String(pav)) + ciclo;
    const total = PACOTES_BASE.length;
    const conc  = PACOTES_BASE.filter(p => getEstado(obraAtual, p.id, cod).status === 'concluida').length;
    return { total, conc, pct: total > 0 ? Math.round((conc/total)*100) : 0 };
  }

  useEffect(() => {
    if (!wrapRef.current || !canvasRef.current) return;
    engineRef.current = buildTorre3D({
      wrapper:  wrapRef.current,
      canvas:   canvasRef.current,
      pavimentos: PAVIMENTOS,
      ciclos:     CICLOS,
      getStatus:  (pav, ciclo) => getStatusApto(pav, ciclo),
      onClickApto: (ud) => {
        const prog = getProgresso(ud.pav, ud.ciclo);
        const cod  = (ud.pav === 'T' ? 'T' : String(ud.pav)) + ud.ciclo;
        const st   = getStatusApto(ud.pav, ud.ciclo);
        const pkHtml = PACOTES_BASE.map(p => {
          const pst = getEstado(obraAtual, p.id, cod).status || 'nao-iniciada';
          const icons = { concluida:'✅', atrasada:'🔴','em-andamento':'🟡', dente:'🦷','nao-iniciada':'⚪' };
          return `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:10px;">
            <span style="color:rgba(255,255,255,.65)">${p.codigo}</span><span>${icons[pst]||'⚪'}</span></div>`;
        }).join('');
        setAptoInfo({ cod, ud, prog, st, pkHtml });
      },
    });
    return () => engineRef.current?.dispose();
  }, []);

  // Refresh cores quando muda estado
  useEffect(() => {
    engineRef.current?.refresh(getStatusApto);
  });

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <h3 className={styles.sideTitle}>🏢 Ventura Patamares</h3>
        <div className={styles.infoGrid}>
          {[['Pavimentos','17'],['Apartamentos','136'],['Aptos/Pav','8 (4F+4F)'],['Núcleo','ELV + ESC PCF']].map(([l,v])=>(
            <div key={l} className={styles.infoRow}>
              <span className={styles.infoLabel}>{l}:</span>
              <span className={styles.infoVal}>{v}</span>
            </div>
          ))}
        </div>

        <div className={styles.legBox}>
          <div className={styles.legTitle}>Legenda</div>
          {[['livre','#4a5568','Não Iniciado'],['andamento','#d97706','Em Andamento'],
            ['concluido','#16a34a','Concluído'],['atrasado','#dc2626','Em Atraso']].map(([k,c,l])=>(
            <div key={k} className={styles.legItem}>
              <span className={styles.legCor} style={{ background:c }} />
              {l}
            </div>
          ))}
        </div>

        <div className={styles.pavSel}>
          <div className={styles.pavSelTitle}>Focar Pavimento</div>
          <div className={styles.pavBtns}>
            {PAVIMENTOS.map(p => (
              <button key={p.idx} className={styles.pavBtn}
                onClick={() => engineRef.current?.focusPav(p.idx)}
                title={p.label}>
                {p.num === 'T' ? 'Tér' : p.num === 'COB' ? 'Cob' : String(p.num)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.aptoInfo}>
          <div className={styles.aptoInfoTitle}>Apartamento</div>
          {aptoInfo ? (
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:'#ffd600',marginBottom:3 }}>{aptoInfo.cod}</div>
              <div style={{ fontSize:11,marginBottom:1 }}>{aptoInfo.ud.tipo} · {aptoInfo.ud.area}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:8 }}>
                {aptoInfo.ud.pavLabel} · {aptoInfo.ud.fachada==='frente'?'Fachada Sul':'Fachada Norte'}
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:STATUS_CSS[aptoInfo.st],marginBottom:4 }}>{STATUS_LABEL[aptoInfo.st]}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:3 }}>
                {aptoInfo.prog.conc}/{aptoInfo.prog.total} metas · {aptoInfo.prog.pct}%
              </div>
              <div style={{ height:5,background:'rgba(255,255,255,.08)',borderRadius:2,marginBottom:10,overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${aptoInfo.prog.pct}%`,background:STATUS_CSS[aptoInfo.st],borderRadius:2 }} />
              </div>
              <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.4)',marginBottom:4,textTransform:'uppercase' }}>Metas</div>
              <div style={{ maxHeight:200,overflowY:'auto' }} dangerouslySetInnerHTML={{ __html: aptoInfo.pkHtml }} />
            </div>
          ) : (
            <div className={styles.aptoInfoEmpty}>Clique em um apartamento para ver os detalhes.</div>
          )}
        </div>
      </div>

      {/* Canvas 3D */}
      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas id="canvas3d" ref={canvasRef} className={styles.canvas} />
        <div className={styles.hint}>🖱 Arrastar para girar · Scroll para zoom · Clique no apto para detalhes</div>
        <div id="tooltip3d" />
        <div id="label3d" />
        <div className={styles.controls}>
          <div className={styles.ctrlRow}>
            <button className={styles.ctrlBtn} onClick={() => engineRef.current?.rotateLeft()}>◀</button>
            <button className={styles.ctrlBtn} onClick={() => engineRef.current?.resetCamera()}>⌖</button>
            <button className={styles.ctrlBtn} onClick={() => engineRef.current?.rotateRight()}>▶</button>
          </div>
          <div className={styles.ctrlRow}>
            <button className={styles.ctrlBtn} onClick={() => engineRef.current?.zoomIn()}>+</button>
            <button className={styles.ctrlBtn} onClick={() => engineRef.current?.zoomOut()}>−</button>
          </div>
        </div>
      </div>
    </div>
  );
}
