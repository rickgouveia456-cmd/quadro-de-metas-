// ================================================================
// ModalProgSemanal — arrastar UNIDADE para programar no dia
// ================================================================
import { useState, useMemo } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';
import { hoje, toDateStr, isUtilDay, gerarUnidades } from '../../data/datas';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function getSemana(ref) {
  const d   = new Date(ref + 'T12:00:00');
  const dow = d.getDay();
  const seg = new Date(d);
  seg.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({length:7}, (_, i) => {
    const c  = new Date(seg);
    c.setDate(seg.getDate() + i);
    const ds = c.toISOString().slice(0, 10);
    return {
      ds,
      dia:  c.getDate(),
      mes:  MESES_PT[c.getMonth()],
      sem:  ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][c.getDay()],
      fds:  c.getDay() === 0 || c.getDay() === 6,
      util: isUtilDay(ds),
      hoje: ds === hoje(),
    };
  });
}

function navSemana(ref, delta) {
  const dt = new Date(ref + 'T12:00:00');
  dt.setDate(dt.getDate() + delta * 7);
  return dt.toISOString().slice(0, 10);
}

const ST_COR = {
  'nao-iniciada': { bg:'#e8ecf1', brd:'#9baab8', txt:'#4a5568' },
  'em-andamento': { bg:'#fde68a', brd:'#d97706', txt:'#78350f' },
  'concluida':    { bg:'#bbf7d0', brd:'#16a34a', txt:'#14532d' },
  'atrasada':     { bg:'#fecaca', brd:'#dc2626', txt:'#7f1d1d' },
  'dente':        { bg:'#fed7aa', brd:'#ea580c', txt:'#7c2d12' },
};

export default function ModalProgSemanal({
  obraAtual, obras, tipologias,
  getEstado, setEstadoMeta,
  user, onClose,
}) {
  const [ref,      setRef]      = useState(hoje());
  const [dragging, setDragging] = useState(null);  // {pacoteId, pacote, unidade, cor}
  const [dropOver, setDropOver] = useState(null);  // "pacoteId|ds"
  const [toast,    setToast]    = useState('');
  const [filtro,   setFiltro]   = useState('');
  const [macroFil, setMacroFil] = useState('');    // filtro por código

  const obra     = obras[obraAtual] || {};
  const semana   = useMemo(() => getSemana(ref), [ref]);
  const uteis    = semana.filter(d => d.util);
  const label    = `${semana[0].dia} ${semana[0].mes} – ${semana[6].dia} ${semana[6].mes}`;
  const unidades = useMemo(() => {
    try { return gerarUnidades(obra, tipologias); } catch { return []; }
  }, [obra, tipologias]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // ── Unidades não programadas nesta semana (painel esquerdo) ───
  // Para cada pacote: lista de unidades que NÃO têm dataPlanejada nesta semana
  const pacotesFiltrados = useMemo(() =>
    PACOTES_BASE.filter(p =>
      (!filtro   || p.pacote.toLowerCase().includes(filtro.toLowerCase()) || p.codigo.toLowerCase().includes(filtro.toLowerCase())) &&
      (!macroFil || p.codigo === macroFil)
    ), [filtro, macroFil]);

  // Unidades disponíveis por pacote (sem data na semana atual ou sem data nenhuma)
  function getUnidadesDisponiveis(pacoteId) {
    return unidades.filter(u => {
      const e = getEstado(obraAtual, pacoteId, u.cod);
      if (e.status === 'concluida') return false; // já concluída não mostra
      const dp = e.dataPlanejada;
      // mostra se não tem data ou a data está fora da semana atual
      return !dp || !uteis.some(d => d.ds === dp);
    });
  }

  // ── Programação da semana: pacoteId → ds → [unidades] ─────────
  const programacao = useMemo(() => {
    const map = {};
    PACOTES_BASE.forEach(p => {
      map[p.id] = {};
      uteis.forEach(d => { map[p.id][d.ds] = []; });
      unidades.forEach(u => {
        const e = getEstado(obraAtual, p.id, u.cod);
        if (e.dataPlanejada && map[p.id][e.dataPlanejada] !== undefined) {
          map[p.id][e.dataPlanejada].push({ cod: u.cod, status: e.status || 'nao-iniciada' });
        }
      });
    });
    return map;
  }, [uteis, unidades, obraAtual, getEstado]);

  // ── Drag start (por unidade) ──────────────────────────────────
  function onDragStart(pacote, unidade) {
    setDragging({ pacoteId: pacote.id, pacote, unidade, cor: pacote.cor });
  }

  // ── Drop na célula dia de um pacote ───────────────────────────
  function onDrop(pacoteId, ds) {
    if (!dragging) return;
    if (dragging.pacoteId !== pacoteId) {
      showToast('⚠ Solte na linha do mesmo pacote');
      setDragging(null); setDropOver(null); return;
    }
    if (!isUtilDay(ds)) {
      showToast('⚠ Só dias úteis');
      setDragging(null); setDropOver(null); return;
    }
    setEstadoMeta(obraAtual, pacoteId, dragging.unidade.cod, {
      dataPlanejada:        ds,
      dataReprogramada:     ds,
      programadoManualmente: true,
    });
    showToast(`📅 ${dragging.unidade.cod} → ${ds.split('-').reverse().join('/')}`);
    setDragging(null);
    setDropOver(null);
  }

  // ── Remover unidade de um dia ─────────────────────────────────
  function removerUnidade(pacoteId, unidadeCod) {
    setEstadoMeta(obraAtual, pacoteId, unidadeCod, { dataPlanejada: null, dataReprogramada: null });
    showToast('🗑 Removido');
  }

  // Códigos únicos para filtro rápido
  const codigos = useMemo(() => [...new Set(PACOTES_BASE.map(p => p.codigo))], []);

  return (
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:12}}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{background:'#fff',borderRadius:14,border:'1px solid #dde4ec',borderTop:'4px solid #1a56db',width:'100%',maxWidth:1100,height:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 28px 80px rgba(0,0,0,.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#1e3a5f',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>📅 Programação Semanal por Unidade</div>
            <div style={{fontSize:11,opacity:.65,marginTop:2}}>{obra.nome} · {label}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        {/* Nav */}
        <div style={{padding:'10px 20px',background:'#f4f7fb',borderBottom:'1px solid #dde4ec',display:'flex',gap:8,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
          <button onClick={()=>setRef(navSemana(ref,-1))}
            style={{padding:'6px 14px',background:'#fff',border:'1px solid #c8d4e0',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>‹ Ant.</button>
          <button onClick={()=>setRef(hoje())}
            style={{padding:'6px 14px',background:'#1a56db',border:'none',borderRadius:6,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>Semana Atual</button>
          <button onClick={()=>setRef(navSemana(ref,1))}
            style={{padding:'6px 14px',background:'#fff',border:'1px solid #c8d4e0',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>Próx. ›</button>

          <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto',flexWrap:'wrap'}}>
            {/* Filtro rápido por macrofluxo */}
            <select value={macroFil} onChange={e=>setMacroFil(e.target.value)}
              style={{padding:'5px 8px',border:'1px solid #c8d4e0',borderRadius:6,fontSize:11,background:'#fff'}}>
              <option value="">Todos os pacotes</option>
              {codigos.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="🔍 Buscar pacote..."
              value={filtro} onChange={e=>setFiltro(e.target.value)}
              style={{padding:'5px 10px',border:'1px solid #c8d4e0',borderRadius:6,fontSize:11,width:160,outline:'none'}}
            />
            <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>{uteis.length} dias úteis</span>
          </div>
        </div>

        {/* Dica */}
        <div style={{padding:'7px 20px',background: dragging?'#eff6ff':'#fafbff',borderBottom:'1px solid #e2e8f0',fontSize:11,color:dragging?'#1d4ed8':'#64748b',flexShrink:0,transition:'background .2s'}}>
          {dragging
            ? `🖱 Arraste a unidade ${dragging.unidade.cod} (${dragging.pacote.codigo}) até o dia desejado na mesma linha`
            : '💡 Arraste uma unidade da coluna esquerda até o dia da semana para programar'}
        </div>

        {/* Corpo: dois painéis */}
        <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>

          {/* ── Painel esquerdo: unidades disponíveis ── */}
          <div style={{width:220,minWidth:220,borderRight:'2px solid #e2e8f0',overflowY:'auto',background:'#f8fafc',flexShrink:0}}>
            <div style={{padding:'8px 12px',background:'#1e3a5f',color:'rgba(255,255,255,.7)',fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:.6,position:'sticky',top:0,zIndex:5}}>
              Unidades disponíveis
            </div>
            {pacotesFiltrados.map(pacote => {
              const disp = getUnidadesDisponiveis(pacote.id);
              if (disp.length === 0) return null;
              return (
                <div key={pacote.id} style={{borderBottom:'1px solid #e8eef2'}}>
                  {/* Label do pacote */}
                  <div style={{padding:'5px 10px',background:pacote.cor+'18',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{background:pacote.cor||'#888',color:'#fff',fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:3,flexShrink:0}}>{pacote.codigo}</span>
                    <span style={{fontSize:10,color:'#374151',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pacote.pacote.replace(/^[A-Z-]+ - /,'')}</span>
                  </div>
                  {/* Chips de unidades arrastáveis */}
                  <div style={{padding:'6px 8px',display:'flex',flexWrap:'wrap',gap:4}}>
                    {disp.map(u => {
                      const e  = getEstado(obraAtual, pacote.id, u.cod);
                      const st = e.status || 'nao-iniciada';
                      const sc = ST_COR[st] || ST_COR['nao-iniciada'];
                      const isDragging = dragging?.pacoteId===pacote.id && dragging?.unidade?.cod===u.cod;
                      return (
                        <div key={u.cod}
                          draggable
                          onDragStart={() => onDragStart(pacote, u)}
                          onDragEnd={() => { setDragging(null); setDropOver(null); }}
                          title={`${u.cod} — Pav. ${u.pav}, Ciclo ${u.ciclo}\nArraste para programar`}
                          style={{
                            background: isDragging ? '#1a56db' : sc.bg,
                            border:     `1px solid ${isDragging?'#1a56db':sc.brd}`,
                            color:      isDragging ? '#fff' : sc.txt,
                            borderRadius: 5,
                            padding: '3px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'grab',
                            userSelect: 'none',
                            transition: 'all .12s',
                            opacity: isDragging ? 0.5 : 1,
                          }}>
                          {u.cod}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {pacotesFiltrados.every(p => getUnidadesDisponiveis(p.id).length === 0) && (
              <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>
                ✅ Todas as unidades já programadas
              </div>
            )}
          </div>

          {/* ── Painel direito: tabela semana ── */}
          <div style={{flex:1,overflow:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>
                  <th style={{background:'#1e3a5f',color:'#fff',padding:'10px 14px',textAlign:'left',fontSize:10,textTransform:'uppercase',letterSpacing:.5,minWidth:200,position:'sticky',top:0,left:0,zIndex:7}}>
                    Pacote
                  </th>
                  {uteis.map(d => (
                    <th key={d.ds}
                      style={{
                        background: d.hoje ? '#f59e0b' : '#1e3a5f',
                        color:      d.hoje ? '#1e3a5f' : '#fff',
                        padding:'8px 6px',textAlign:'center',
                        minWidth:110,fontSize:10,
                        borderLeft:'1px solid rgba(255,255,255,.1)',
                        position:'sticky',top:0,zIndex:5,
                      }}>
                      <div style={{fontWeight:800,fontSize:14}}>{d.dia}</div>
                      <div style={{opacity:.75}}>{d.sem}</div>
                      <div style={{opacity:.5,fontSize:9}}>{d.mes}</div>
                      {d.hoje && <div style={{fontSize:8,fontWeight:800,marginTop:2}}>HOJE</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pacotesFiltrados.map((pacote, idx) => {
                  const temAlgum = uteis.some(d => (programacao[pacote.id]?.[d.ds]?.length||0) > 0);
                  // Mostra linha só se tem programação na semana OU se há unidades disponíveis
                  const disponiveis = getUnidadesDisponiveis(pacote.id);
                  if (!temAlgum && disponiveis.length === 0) return null;

                  return (
                    <tr key={pacote.id} style={{borderBottom:'1px solid #e8eef2',background:idx%2===0?'#fff':'#fafbfc'}}>
                      {/* Nome do pacote */}
                      <td style={{padding:'7px 12px',position:'sticky',left:0,zIndex:3,background:idx%2===0?'#fff':'#fafbfc',borderLeft:`3px solid ${pacote.cor||'#888'}`,boxShadow:'2px 0 4px rgba(0,0,0,.04)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{background:pacote.cor||'#888',color:'#fff',fontSize:9,fontWeight:800,padding:'2px 5px',borderRadius:3,flexShrink:0}}>{pacote.codigo}</span>
                          <span style={{fontSize:11,color:'#374151',fontWeight:600}}>{pacote.pacote.replace(/^[A-Z-]+ - /,'')}</span>
                        </div>
                      </td>

                      {/* Células dos dias */}
                      {uteis.map(d => {
                        const items  = programacao[pacote.id]?.[d.ds] || [];
                        const key    = `${pacote.id}|${d.ds}`;
                        const isOver = dropOver === key && dragging?.pacoteId === pacote.id;

                        return (
                          <td key={d.ds}
                            onDragOver={e => { e.preventDefault(); setDropOver(key); }}
                            onDragLeave={() => setDropOver(null)}
                            onDrop={() => onDrop(pacote.id, d.ds)}
                            style={{
                              padding:'5px 4px',
                              textAlign:'center',
                              borderLeft:'1px solid #e8eef2',
                              background: isOver ? '#dbeafe' : 'inherit',
                              outline:    isOver ? '2px dashed #1a56db' : 'none',
                              outlineOffset: '-2px',
                              verticalAlign:'top',
                              minHeight:42,
                              transition:'background .1s',
                            }}>
                            {/* Zona de drop vazia */}
                            {isOver && items.length === 0 && (
                              <div style={{color:'#1a56db',fontSize:20,fontWeight:800,lineHeight:'32px'}}>+</div>
                            )}
                            {/* Chips das unidades programadas */}
                            <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',padding:2}}>
                              {items.map(item => {
                                const sc = ST_COR[item.status] || ST_COR['nao-iniciada'];
                                return (
                                  <div key={item.cod}
                                    style={{
                                      background: sc.bg,
                                      border:    `1px solid ${sc.brd}`,
                                      color:      sc.txt,
                                      borderRadius:4,
                                      padding:'2px 5px',
                                      fontSize:9,
                                      fontWeight:700,
                                      display:'flex',
                                      alignItems:'center',
                                      gap:2,
                                      whiteSpace:'nowrap',
                                    }}>
                                    {item.cod}
                                    <button
                                      onClick={() => removerUnidade(pacote.id, item.cod)}
                                      title="Remover"
                                      style={{background:'none',border:'none',cursor:'pointer',color:sc.txt,fontSize:9,padding:0,opacity:.6,lineHeight:1}}>
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Drop hint quando vazio */}
                            {!isOver && items.length === 0 && dragging?.pacoteId === pacote.id && (
                              <div style={{color:'#c8d4e0',fontSize:10,lineHeight:'32px'}}>↓</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'10px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:11,color:'#64748b'}}>
            💡 Arraste as unidades do painel esquerdo para os dias da semana
          </span>
          <button onClick={onClose}
            style={{padding:'8px 22px',background:'#1e3a5f',border:'none',borderRadius:7,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
            Fechar
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{position:'absolute',bottom:70,right:20,background:'#1e3a5f',color:'#fff',padding:'9px 18px',borderRadius:8,fontSize:12,fontWeight:600,boxShadow:'0 6px 20px rgba(0,0,0,.2)',zIndex:10}}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
