// ================================================================
// ModalReprogramacao — mesmo layout da ProgSemanal
// Painel esquerdo: atividades em atraso / GAP (agrupadas por pacote)
// Painel direito:  tabela semana com drop zones para nova data
// Ao soltar: grava dataReprogramada e mantém status 'nao-iniciada'
// ================================================================
import { useState, useMemo } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';
import { hoje, toDateStr, isUtilDay, gerarUnidades } from '../../data/datas';

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Utilitários de semana ─────────────────────────────────────
function getSemana(ref) {
  const d   = new Date(ref + 'T12:00:00');
  const dow = d.getDay();
  const seg = new Date(d);
  seg.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
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

// ── Cores por status ──────────────────────────────────────────
const ST_COR = {
  'nao-iniciada': { bg:'#e8ecf1', brd:'#9baab8', txt:'#4a5568' },
  'em-andamento': { bg:'#fde68a', brd:'#d97706', txt:'#78350f' },
  'concluida':    { bg:'#bbf7d0', brd:'#16a34a', txt:'#14532d' },
  'atrasada':     { bg:'#fecaca', brd:'#dc2626', txt:'#7f1d1d' },
  'dente':        { bg:'#fed7aa', brd:'#ea580c', txt:'#7c2d12' },
  'reprogramada': { bg:'#ede9fe', brd:'#7c3aed', txt:'#5b21b6' },
};

const NIVEL_OPCOES = [
  { key: 'atividade', label: '📌 Atividade',  desc: 'Somente a atividade selecionada'             },
  { key: 'pacote',    label: '🎨 Pacote',      desc: 'Todo o Pacote de Atividades (mesma cor)'    },
  { key: 'geral',     label: '🌐 Geral',       desc: 'Todos os blocos a partir desta atividade'   },
];

export default function ModalReprogramacao({
  obraAtual, obras, tipologias,
  getEstado, setEstadoMeta,
  user, onClose,
}) {
  const hj = hoje();

  const [ref,      setRef]      = useState(hj);
  const [dragging, setDragging] = useState(null);   // { pacoteId, pacote, unidade, cor, statusOrig }
  const [dropOver, setDropOver] = useState(null);   // "pacoteId|ds"
  const [toast,    setToast]    = useState('');
  const [filtro,   setFiltro]   = useState('');
  const [macroFil, setMacroFil] = useState('');
  const [nivel,    setNivel]    = useState('atividade');  // nível de reprogramação
  const [soAtrasos, setSoAtrasos] = useState(true);       // toggle filtro de atrasos

  const obra     = obras[obraAtual] || {};
  const semana   = useMemo(() => getSemana(ref), [ref]);
  const uteis    = semana.filter(d => d.util);
  const label    = `${semana[0].dia} ${semana[0].mes} – ${semana[6].dia} ${semana[6].mes}`;
  const unidades = useMemo(() => {
    try { return gerarUnidades(obra, tipologias); } catch { return []; }
  }, [obra, tipologias]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  // ── Pacotes filtrados ────────────────────────────────────────
  const codigos = useMemo(() => [...new Set(PACOTES_BASE.map(p => p.codigo))], []);

  const pacotesFiltrados = useMemo(() =>
    PACOTES_BASE.filter(p =>
      (!filtro   || p.pacote.toLowerCase().includes(filtro.toLowerCase()) || p.codigo.toLowerCase().includes(filtro.toLowerCase())) &&
      (!macroFil || p.codigo === macroFil)
    ), [filtro, macroFil]);

  // ── Determina se uma meta está "para reprogramar" ─────────────
  // Critério: atrasada OU (nao-iniciada com dataPlanejada no passado)
  function precisaReprogramar(pacoteId, unidadeCod) {
    const e  = getEstado(obraAtual, pacoteId, unidadeCod);
    const st = e.status || 'nao-iniciada';
    if (st === 'concluida') return false;
    if (st === 'atrasada')  return true;
    if (st === 'dente')     return true;
    if (st === 'nao-iniciada' && e.dataPlanejada && e.dataPlanejada < hj) return true;
    if (!soAtrasos && st !== 'concluida') return true;  // modo "todas"
    return false;
  }

  // Unidades pendentes de reprogramação por pacote
  function getUnidadesPendentes(pacoteId) {
    return unidades.filter(u => precisaReprogramar(pacoteId, u.cod));
  }

  // ── Programação atual na semana: pacoteId → ds → [items] ────
  // Mostra o que já está reprogramado para essa semana
  const programacaoSemana = useMemo(() => {
    const map = {};
    PACOTES_BASE.forEach(p => {
      map[p.id] = {};
      uteis.forEach(d => { map[p.id][d.ds] = []; });
      unidades.forEach(u => {
        const e  = getEstado(obraAtual, p.id, u.cod);
        // mostra na célula se dataReprogramada está nessa semana
        const dr = e.dataReprogramada || e.dataPlanejada;
        if (dr && map[p.id][dr] !== undefined) {
          map[p.id][dr].push({
            cod:         u.cod,
            status:      e.status || 'nao-iniciada',
            reprogramada: !!e.dataReprogramada,
          });
        }
      });
    });
    return map;
  }, [uteis, unidades, obraAtual, getEstado]);

  // ── Contadores ───────────────────────────────────────────────
  const totalPendentes = useMemo(() =>
    PACOTES_BASE.reduce((acc, p) => acc + getUnidadesPendentes(p.id).length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unidades, obraAtual, getEstado, soAtrasos, hj]
  );

  // ── Drag start ───────────────────────────────────────────────
  function onDragStart(pacote, unidade, statusOrig) {
    setDragging({ pacoteId: pacote.id, pacote, unidade, cor: pacote.cor, statusOrig });
  }

  // ── Executa a reprogramação conforme o nível selecionado ─────
  function executarReprog(pacoteId, unidadeCod, novaData) {
    const pacote = PACOTES_BASE.find(p => p.id === pacoteId);

    if (nivel === 'atividade') {
      // Somente esta atividade
      setEstadoMeta(obraAtual, pacoteId, unidadeCod, {
        dataReprogramada: novaData,
        dataPlanejada:    novaData,
        status:           'nao-iniciada',
      }, user?.label || 'Reprogramação');
      return 1;

    } else if (nivel === 'pacote') {
      // Todo o Pacote de Atividades (mesma cor = mesmo codigo)
      const corPacote = pacote?.cor;
      let count = 0;
      PACOTES_BASE
        .filter(p => p.cor === corPacote)
        .forEach(p => {
          unidades.forEach(u => {
            if (!precisaReprogramar(p.id, u.cod)) return;
            setEstadoMeta(obraAtual, p.id, u.cod, {
              dataReprogramada: novaData,
              dataPlanejada:    novaData,
              status:           'nao-iniciada',
            }, user?.label || 'Reprogramação');
            count++;
          });
        });
      return count;

    } else if (nivel === 'geral') {
      // Todos os pacotes com pendências
      let count = 0;
      PACOTES_BASE.forEach(p => {
        unidades.forEach(u => {
          if (!precisaReprogramar(p.id, u.cod)) return;
          setEstadoMeta(obraAtual, p.id, u.cod, {
            dataReprogramada: novaData,
            dataPlanejada:    novaData,
            status:           'nao-iniciada',
          }, user?.label || 'Reprogramação');
          count++;
        });
      });
      return count;
    }
    return 0;
  }

  // ── Drop na célula ───────────────────────────────────────────
  function onDrop(pacoteId, ds) {
    if (!dragging) return;
    if (!isUtilDay(ds)) {
      showToast('⚠ Apenas dias úteis');
      setDragging(null); setDropOver(null); return;
    }

    const count = executarReprog(pacoteId, dragging.unidade.cod, ds);
    const dataFmt = ds.split('-').reverse().join('/');

    if (nivel === 'atividade') {
      showToast(`🔄 ${dragging.unidade.cod} → ${dataFmt} reprogramado`);
    } else if (nivel === 'pacote') {
      showToast(`🎨 ${count} atividade(s) do pacote reprogramadas → ${dataFmt}`);
    } else {
      showToast(`🌐 ${count} atividade(s) reprogramadas → ${dataFmt}`);
    }

    setDragging(null);
    setDropOver(null);
  }

  // ── Remover reprogramação (volta ao estado original) ─────────
  function desfazerReprog(pacoteId, unidadeCod) {
    const e = getEstado(obraAtual, pacoteId, unidadeCod);
    setEstadoMeta(obraAtual, pacoteId, unidadeCod, {
      dataReprogramada: null,
      dataPlanejada:    e.dataPlanejada || null,
      status:           'atrasada',
    }, user?.label || 'Desfazer reprogramação');
    showToast('↩ Reprogramação desfeita');
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #dde4ec', borderTop:'4px solid #dc2626', width:'100%', maxWidth:1140, height:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 28px 80px rgba(0,0,0,.25)', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background:'#7f1d1d', color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>🔄 Reprogramação de Atividades</div>
            <div style={{ fontSize:11, opacity:.65, marginTop:2 }}>{obra.nome} · {label} · {totalPendentes} atividade(s) pendente(s)</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        {/* ── Barra de navegação + controles ── */}
        <div style={{ padding:'10px 20px', background:'#f4f7fb', borderBottom:'1px solid #dde4ec', display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>

          {/* Nav semana */}
          <button onClick={() => setRef(navSemana(ref, -1))}
            style={{ padding:'6px 14px', background:'#fff', border:'1px solid #c8d4e0', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer' }}>‹ Ant.</button>
          <button onClick={() => setRef(hj)}
            style={{ padding:'6px 14px', background:'#dc2626', border:'none', borderRadius:6, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>Semana Atual</button>
          <button onClick={() => setRef(navSemana(ref, 1))}
            style={{ padding:'6px 14px', background:'#fff', border:'1px solid #c8d4e0', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer' }}>Próx. ›</button>

          {/* Separador */}
          <div style={{ width:1, height:28, background:'#dde4ec', margin:'0 4px' }} />

          {/* Nível de reprogramação */}
          <div style={{ display:'flex', gap:2, background:'#fee2e2', borderRadius:7, padding:3 }}>
            {NIVEL_OPCOES.map(op => (
              <button key={op.key}
                onClick={() => setNivel(op.key)}
                title={op.desc}
                style={{
                  padding:'5px 12px', border:'none', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer',
                  background: nivel === op.key ? '#dc2626' : 'transparent',
                  color:      nivel === op.key ? '#fff'    : '#7f1d1d',
                  transition: 'all .15s',
                }}>
                {op.label}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div style={{ width:1, height:28, background:'#dde4ec', margin:'0 4px' }} />

          {/* Toggle: só atrasos ou todas */}
          <button onClick={() => setSoAtrasos(v => !v)}
            style={{
              padding:'5px 12px', border:`1px solid ${soAtrasos?'#dc2626':'#c8d4e0'}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
              background: soAtrasos ? '#fee2e2' : '#fff',
              color:      soAtrasos ? '#b91c1c' : '#374151',
            }}>
            {soAtrasos ? '⚠️ Só atrasos' : '📋 Todas'}
          </button>

          {/* Filtros à direita */}
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto', flexWrap:'wrap' }}>
            <select value={macroFil} onChange={e => setMacroFil(e.target.value)}
              style={{ padding:'5px 8px', border:'1px solid #c8d4e0', borderRadius:6, fontSize:11, background:'#fff' }}>
              <option value="">Todos os pacotes</option>
              {codigos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="🔍 Buscar pacote..."
              value={filtro} onChange={e => setFiltro(e.target.value)}
              style={{ padding:'5px 10px', border:'1px solid #c8d4e0', borderRadius:6, fontSize:11, width:155, outline:'none' }}
            />
            <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{uteis.length} dias úteis</span>
          </div>
        </div>

        {/* ── Dica dinâmica ── */}
        <div style={{
          padding:'7px 20px', background: dragging ? '#fef2f2' : '#fffbfb',
          borderBottom:'1px solid #e2e8f0', fontSize:11,
          color: dragging ? '#b91c1c' : '#94a3b8',
          flexShrink:0, transition:'background .2s',
        }}>
          {dragging
            ? `🔄 Reprogramando "${dragging.unidade.cod}" (${dragging.pacote.codigo}) — nível: ${NIVEL_OPCOES.find(o=>o.key===nivel)?.label} — solte no dia desejado`
            : `💡 Arraste uma atividade do painel esquerdo para o novo dia · Nível atual: ${NIVEL_OPCOES.find(o=>o.key===nivel)?.label} — ${NIVEL_OPCOES.find(o=>o.key===nivel)?.desc}`}
        </div>

        {/* ── Corpo: dois painéis ── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

          {/* ── Painel esquerdo: atividades pendentes ── */}
          <div style={{ width:230, minWidth:230, borderRight:'2px solid #e2e8f0', overflowY:'auto', background:'#fff5f5', flexShrink:0 }}>
            <div style={{ padding:'8px 12px', background:'#7f1d1d', color:'rgba(255,255,255,.8)', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:.6, position:'sticky', top:0, zIndex:5 }}>
              Atividades para reprogramar
            </div>

            {pacotesFiltrados.map(pacote => {
              const pendentes = getUnidadesPendentes(pacote.id);
              if (pendentes.length === 0) return null;
              return (
                <div key={pacote.id} style={{ borderBottom:'1px solid #fee2e2' }}>
                  {/* Label do pacote */}
                  <div style={{ padding:'5px 10px', background: pacote.cor + '22', borderBottom:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'space-between', gap:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                      <span style={{ background:pacote.cor||'#888', color:'#fff', fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:3, flexShrink:0 }}>{pacote.codigo}</span>
                      <span style={{ fontSize:10, color:'#374151', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pacote.pacote.replace(/^[A-Z-]+ - /,'')}</span>
                    </div>
                    <span style={{ background:'#dc2626', color:'#fff', fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:10, flexShrink:0 }}>{pendentes.length}</span>
                  </div>
                  {/* Chips arrastáveis */}
                  <div style={{ padding:'6px 8px', display:'flex', flexWrap:'wrap', gap:4 }}>
                    {pendentes.map(u => {
                      const e   = getEstado(obraAtual, pacote.id, u.cod);
                      const st  = e.status || 'nao-iniciada';
                      const sc  = ST_COR[st] || ST_COR['nao-iniciada'];
                      const isDragging = dragging?.pacoteId === pacote.id && dragging?.unidade?.cod === u.cod;
                      const dpOrig = e.dataPlanejada;
                      return (
                        <div key={u.cod}
                          draggable
                          onDragStart={() => onDragStart(pacote, u, st)}
                          onDragEnd={() => { setDragging(null); setDropOver(null); }}
                          title={`${u.cod} — Pav. ${u.pav}, Ciclo ${u.ciclo}\nStatus: ${st}${dpOrig ? '\nPlanejado: '+dpOrig.split('-').reverse().join('/') : ''}\nArraste para nova data`}
                          style={{
                            background:   isDragging ? '#dc2626' : sc.bg,
                            border:       `1px solid ${isDragging ? '#dc2626' : sc.brd}`,
                            color:        isDragging ? '#fff' : sc.txt,
                            borderRadius: 5,
                            padding:      '3px 7px',
                            fontSize:     10,
                            fontWeight:   700,
                            cursor:       'grab',
                            userSelect:   'none',
                            transition:   'all .12s',
                            opacity:      isDragging ? 0.45 : 1,
                          }}>
                          {u.cod}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Vazio */}
            {pacotesFiltrados.every(p => getUnidadesPendentes(p.id).length === 0) && (
              <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:12 }}>
                <div style={{ fontSize:32, marginBottom:6 }}>✅</div>
                <div>Nenhuma atividade pendente de reprogramação</div>
              </div>
            )}
          </div>

          {/* ── Painel direito: tabela semana ── */}
          <div style={{ flex:1, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ background:'#7f1d1d', color:'#fff', padding:'10px 14px', textAlign:'left', fontSize:10, textTransform:'uppercase', letterSpacing:.5, minWidth:210, position:'sticky', top:0, left:0, zIndex:7 }}>
                    Pacote
                  </th>
                  {uteis.map(d => (
                    <th key={d.ds}
                      style={{
                        background: d.hoje ? '#f59e0b' : '#7f1d1d',
                        color:      d.hoje ? '#1e3a5f' : '#fff',
                        padding:'8px 6px', textAlign:'center',
                        minWidth:110, fontSize:10,
                        borderLeft:'1px solid rgba(255,255,255,.15)',
                        position:'sticky', top:0, zIndex:5,
                      }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{d.dia}</div>
                      <div style={{ opacity:.8 }}>{d.sem}</div>
                      <div style={{ opacity:.55, fontSize:9 }}>{d.mes}</div>
                      {d.hoje && <div style={{ fontSize:8, fontWeight:800, marginTop:2 }}>HOJE</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pacotesFiltrados.map((pacote, idx) => {
                  // Mostra a linha se tem pendentes OU se tem algo reprogramado na semana
                  const temProgNaSemana = uteis.some(d => (programacaoSemana[pacote.id]?.[d.ds]?.length || 0) > 0);
                  const temPendentes   = getUnidadesPendentes(pacote.id).length > 0;
                  if (!temProgNaSemana && !temPendentes) return null;

                  return (
                    <tr key={pacote.id} style={{ borderBottom:'1px solid #fce7e7', background: idx % 2 === 0 ? '#fff' : '#fff8f8' }}>

                      {/* Nome do pacote */}
                      <td style={{ padding:'7px 12px', position:'sticky', left:0, zIndex:3, background: idx % 2 === 0 ? '#fff' : '#fff8f8', borderLeft:`3px solid ${pacote.cor||'#888'}`, boxShadow:'2px 0 4px rgba(0,0,0,.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ background:pacote.cor||'#888', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 5px', borderRadius:3, flexShrink:0 }}>{pacote.codigo}</span>
                          <span style={{ fontSize:11, color:'#374151', fontWeight:600 }}>{pacote.pacote.replace(/^[A-Z-]+ - /,'')}</span>
                          {getUnidadesPendentes(pacote.id).length > 0 && (
                            <span style={{ background:'#fee2e2', color:'#dc2626', fontSize:9, fontWeight:800, padding:'1px 5px', borderRadius:10, marginLeft:'auto' }}>
                              {getUnidadesPendentes(pacote.id).length}⚠
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Células dos dias */}
                      {uteis.map(d => {
                        const items  = programacaoSemana[pacote.id]?.[d.ds] || [];
                        const key    = `${pacote.id}|${d.ds}`;
                        const isOver = dropOver === key && dragging;

                        return (
                          <td key={d.ds}
                            onDragOver={e => { e.preventDefault(); setDropOver(key); }}
                            onDragLeave={() => setDropOver(null)}
                            onDrop={() => onDrop(pacote.id, d.ds)}
                            style={{
                              padding:'5px 4px',
                              textAlign:'center',
                              borderLeft:'1px solid #fce7e7',
                              background: isOver ? '#fee2e2' : 'inherit',
                              outline:    isOver ? '2px dashed #dc2626' : 'none',
                              outlineOffset: '-2px',
                              verticalAlign:'top',
                              minHeight:42,
                              transition:'background .1s',
                            }}>

                            {/* Indicador de drop hover */}
                            {isOver && items.length === 0 && (
                              <div style={{ color:'#dc2626', fontSize:22, fontWeight:800, lineHeight:'34px' }}>+</div>
                            )}

                            {/* Chips das unidades reprogramadas para este dia */}
                            <div style={{ display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', padding:2 }}>
                              {items.map(item => {
                                const sc = item.reprogramada ? ST_COR['reprogramada'] : (ST_COR[item.status] || ST_COR['nao-iniciada']);
                                return (
                                  <div key={item.cod}
                                    style={{
                                      background: sc.bg, border:`1px solid ${sc.brd}`, color:sc.txt,
                                      borderRadius:4, padding:'2px 5px', fontSize:9, fontWeight:700,
                                      display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap',
                                    }}>
                                    {item.reprogramada ? '🔄' : ''}{item.cod}
                                    <button
                                      onClick={() => desfazerReprog(pacote.id, item.cod)}
                                      title="Desfazer reprogramação"
                                      style={{ background:'none', border:'none', cursor:'pointer', color:sc.txt, fontSize:9, padding:0, opacity:.65, lineHeight:1 }}>
                                      ↩
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Seta hint quando há dragging nesta linha */}
                            {!isOver && items.length === 0 && dragging && (
                              <div style={{ color:'#fca5a5', fontSize:11, lineHeight:'34px' }}>↓</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mensagem quando não há nada para mostrar */}
            {pacotesFiltrados.every(p => {
              const temProg = uteis.some(d => (programacaoSemana[p.id]?.[d.ds]?.length || 0) > 0);
              return !temProg && getUnidadesPendentes(p.id).length === 0;
            }) && (
              <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:14, fontWeight:600 }}>Nenhuma atividade pendente nesta semana</div>
                <div style={{ fontSize:12, marginTop:4 }}>Navegue para outras semanas ou desative o filtro de atrasos</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'10px 20px', background:'#fff5f5', borderTop:'1px solid #fecaca', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:11, color:'#7f1d1d', display:'flex', gap:16, flexWrap:'wrap' }}>
            <span>🔄 <strong>{totalPendentes}</strong> atividade(s) pendente(s)</span>
            <span style={{ color:'#5b21b6' }}>🔄 = Reprogramada</span>
            <span style={{ color:'#dc2626' }}>⚠️ = Atrasada / GAP</span>
            <span style={{ color:'#ea580c' }}>🦷 = Dente</span>
          </div>
          <button onClick={onClose}
            style={{ padding:'8px 22px', background:'#7f1d1d', border:'none', borderRadius:7, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>
            Fechar
          </button>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ position:'absolute', bottom:70, right:20, background:'#7f1d1d', color:'#fff', padding:'9px 18px', borderRadius:8, fontSize:12, fontWeight:600, boxShadow:'0 6px 20px rgba(0,0,0,.25)', zIndex:10 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
