// ================================================================
// ModalHistorico — Log de mudanças de status e programação
// ================================================================
import { useState, useMemo } from 'react';
import { PACOTES_BASE } from '../../data/pacotes';

const STATUS_LABEL = {
  'nao-iniciada': 'Não Iniciada',
  'em-andamento': 'Em Andamento',
  'concluida':    'Concluída',
  'atrasada':     'Em Atraso',
  'dente':        'Dente',
};
const STATUS_COR = {
  'nao-iniciada': { bg:'#f1f5f9', txt:'#475569' },
  'em-andamento': { bg:'#fef3c7', txt:'#92400e' },
  'concluida':    { bg:'#dcfce7', txt:'#14532d' },
  'atrasada':     { bg:'#fee2e2', txt:'#7f1d1d' },
  'dente':        { bg:'#ffedd5', txt:'#7c2d12' },
};

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

function formatDate(ds) {
  if (!ds) return '—';
  return ds.split('-').reverse().join('/');
}

function descricaoMudanca(campos) {
  const partes = [];
  if (campos.status)           partes.push(`Status → ${STATUS_LABEL[campos.status] || campos.status}`);
  if (campos.dataPlanejada)    partes.push(`Planejado → ${formatDate(campos.dataPlanejada)}`);
  if (campos.dataReprogramada) partes.push(`Reprogramado → ${formatDate(campos.dataReprogramada)}`);
  if (campos.dataReal)         partes.push(`Realizado → ${formatDate(campos.dataReal)}`);
  if (campos.observacao)       partes.push(`Obs: "${campos.observacao.slice(0,40)}${campos.observacao.length>40?'…':''}"`);
  return partes.join(' · ') || 'Atualização';
}

function iconeAcao(campos) {
  if (campos.status === 'concluida')    return '✅';
  if (campos.status === 'atrasada')     return '⚠️';
  if (campos.status === 'em-andamento') return '▶️';
  if (campos.status === 'dente')        return '🦷';
  if (campos.status === 'nao-iniciada') return '↺';
  if (campos.dataReprogramada)          return '🔄';
  if (campos.dataPlanejada)             return '📅';
  return '📝';
}

export default function ModalHistorico({
  obraAtual, obras, getHistorico, limparHistorico, onClose,
}) {
  const [filtroPacote,  setFiltroPacote]  = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroAcao,    setFiltroAcao]    = useState(''); // status | programacao | todos
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  const obra = obras[obraAtual] || {};

  // Todos os logs da obra atual
  const todos = useMemo(() => getHistorico(obraAtual), [obraAtual, getHistorico]);

  // Filtros
  const itens = useMemo(() => {
    return todos.filter(e => {
      const pacOk = !filtroPacote  || e.pacoteId === filtroPacote;
      const uniOk = !filtroUnidade || e.unidadeCod.toLowerCase().includes(filtroUnidade.toLowerCase());
      const acoOk =
        filtroAcao === '' ? true :
        filtroAcao === 'status' ? e.campos.status !== undefined :
        filtroAcao === 'programacao' ? (e.campos.dataPlanejada !== undefined || e.campos.dataReprogramada !== undefined) :
        true;
      return pacOk && uniOk && acoOk;
    });
  }, [todos, filtroPacote, filtroUnidade, filtroAcao]);

  // Contadores
  const stats = useMemo(() => ({
    total:      todos.length,
    concluidas: todos.filter(e => e.campos.status === 'concluida').length,
    atrasos:    todos.filter(e => e.campos.status === 'atrasada').length,
    reprog:     todos.filter(e => e.campos.dataReprogramada).length,
  }), [todos]);

  // Exportar CSV
  function exportarCSV() {
    const header = 'Data/Hora,Obra,Pacote,Unidade,Ação,Usuário';
    const linhas = itens.map(e =>
      `"${formatTs(e.ts)}","${e.obraId}","${e.pacoteId}","${e.unidadeCod}","${descricaoMudanca(e.campos)}","${e.usuario}"`
    );
    const blob = new Blob([header + '\n' + linhas.join('\n')], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historico-${obraAtual}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>

      <div style={{background:'#fff',borderRadius:14,border:'1px solid #dde4ec',borderTop:'4px solid #1e3a5f',width:'100%',maxWidth:900,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 28px 80px rgba(0,0,0,.25)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{background:'#1e3a5f',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>📋 Histórico de Alterações</div>
            <div style={{fontSize:11,opacity:.65,marginTop:2}}>{obra.nome} · {stats.total} registros</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>

        {/* Cards de resumo */}
        <div style={{display:'flex',gap:1,background:'#dde4ec',flexShrink:0}}>
          {[
            [stats.total,      '#1d4ed8', 'Total'],
            [stats.concluidas, '#16a34a', 'Concluídas'],
            [stats.atrasos,    '#dc2626', 'Atrasos registrados'],
            [stats.reprog,     '#f59e0b', 'Reprogramações'],
          ].map(([n,cor,lbl])=>(
            <div key={lbl} style={{flex:1,background:'#fff',padding:'8px 12px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:cor}}>{n}</div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:.7,color:'#5a6a7e',fontWeight:700,marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{padding:'10px 16px',background:'#f4f7fb',borderBottom:'1px solid #dde4ec',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
          {/* Filtro por pacote */}
          <select value={filtroPacote} onChange={e=>setFiltroPacote(e.target.value)}
            style={{padding:'5px 8px',border:'1px solid #c8d4e0',borderRadius:6,fontSize:11,background:'#fff',minWidth:160}}>
            <option value="">Todos os pacotes</option>
            {PACOTES_BASE.map(p=>(
              <option key={p.id} value={p.id}>{p.codigo} — {p.pacote.replace(/^[A-Z-]+ - /,'').slice(0,30)}</option>
            ))}
          </select>

          {/* Filtro por unidade */}
          <input placeholder="Unidade (ex: 3A)" value={filtroUnidade} onChange={e=>setFiltroUnidade(e.target.value)}
            style={{padding:'5px 9px',border:'1px solid #c8d4e0',borderRadius:6,fontSize:11,width:130,outline:'none'}} />

          {/* Filtro por tipo de ação */}
          <div style={{display:'flex',gap:2,background:'#e8ecf1',borderRadius:6,padding:2}}>
            {[['','Tudo'],['status','Status'],['programacao','Programação']].map(([k,l])=>(
              <button key={k} onClick={()=>setFiltroAcao(k)}
                style={{padding:'4px 10px',border:'none',borderRadius:4,fontSize:11,fontWeight:700,cursor:'pointer',background:filtroAcao===k?'#1e3a5f':'transparent',color:filtroAcao===k?'#fff':'#374151',transition:'all .15s'}}>
                {l}
              </button>
            ))}
          </div>

          <span style={{marginLeft:'auto',fontSize:11,color:'#64748b',fontWeight:600}}>{itens.length} registro{itens.length!==1?'s':''}</span>

          {/* Exportar */}
          <button onClick={exportarCSV}
            style={{padding:'5px 12px',background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:6,fontSize:11,fontWeight:700,color:'#1d4ed8',cursor:'pointer'}}>
            📥 CSV
          </button>

          {/* Limpar */}
          {!confirmarLimpar ? (
            <button onClick={()=>setConfirmarLimpar(true)}
              style={{padding:'5px 12px',background:'#fff',border:'1px solid #fca5a5',borderRadius:6,fontSize:11,fontWeight:700,color:'#dc2626',cursor:'pointer'}}>
              🗑 Limpar
            </button>
          ) : (
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <span style={{fontSize:11,color:'#dc2626',fontWeight:700}}>Confirmar?</span>
              <button onClick={()=>{limparHistorico();setConfirmarLimpar(false);}}
                style={{padding:'4px 10px',background:'#dc2626',border:'none',borderRadius:5,fontSize:11,fontWeight:700,color:'#fff',cursor:'pointer'}}>Sim</button>
              <button onClick={()=>setConfirmarLimpar(false)}
                style={{padding:'4px 10px',background:'#f4f7fb',border:'1px solid #dde4ec',borderRadius:5,fontSize:11,cursor:'pointer'}}>Não</button>
            </div>
          )}
        </div>

        {/* Lista de eventos */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {itens.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:14}}>
              <div style={{fontSize:40,marginBottom:8}}>📋</div>
              <div>Nenhum registro encontrado</div>
            </div>
          ) : (
            // Agrupar por data
            (() => {
              const grupos = {};
              itens.forEach(e => {
                const dia = e.ts.slice(0,10);
                if (!grupos[dia]) grupos[dia] = [];
                grupos[dia].push(e);
              });
              return Object.entries(grupos).map(([dia, eventos]) => {
                const [y,m,d] = dia.split('-');
                const dLabel = `${d}/${m}/${y}`;
                const ehHoje = dia === new Date().toISOString().slice(0,10);
                return (
                  <div key={dia}>
                    {/* Separador de data */}
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:'#f8fafc',borderBottom:'1px solid #e8eef2',borderTop:'1px solid #e8eef2',position:'sticky',top:0,zIndex:2}}>
                      <span style={{fontWeight:800,fontSize:12,color:'#1e3a5f'}}>{dLabel}</span>
                      {ehHoje && <span style={{background:'#f59e0b',color:'#1e3a5f',fontSize:9,fontWeight:800,padding:'1px 7px',borderRadius:10}}>HOJE</span>}
                      <span style={{fontSize:10,color:'#94a3b8'}}>{eventos.length} evento{eventos.length!==1?'s':''}</span>
                    </div>

                    {/* Eventos do dia */}
                    {eventos.map((e, idx) => {
                      const pacote = PACOTES_BASE.find(p => p.id === e.pacoteId);
                      const sc     = STATUS_COR[e.campos.status] || null;
                      const hora   = new Date(e.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
                      return (
                        <div key={idx} style={{
                          display:'flex',alignItems:'flex-start',gap:12,
                          padding:'10px 16px',borderBottom:'1px solid #f0f4f8',
                          background:'#fff',transition:'background .1s',
                        }}
                          onMouseEnter={el=>el.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={el=>el.currentTarget.style.background='#fff'}>

                          {/* Ícone */}
                          <div style={{
                            width:32,height:32,borderRadius:8,flexShrink:0,
                            background: sc ? sc.bg : '#f1f5f9',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:16,marginTop:1,
                          }}>
                            {iconeAcao(e.campos)}
                          </div>

                          {/* Conteúdo */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                              {/* Badge pacote */}
                              <span style={{background:pacote?.cor||'#888',color:'#fff',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:3,flexShrink:0}}>
                                {e.pacoteId}
                              </span>
                              {/* Unidade */}
                              <span style={{fontWeight:800,fontSize:13,color:'#1e3a5f'}}>
                                {e.unidadeCod}
                              </span>
                              {/* Status badge */}
                              {e.campos.status && sc && (
                                <span style={{background:sc.bg,color:sc.txt,fontSize:10,fontWeight:700,padding:'1px 8px',borderRadius:10,border:`1px solid ${sc.bg}`}}>
                                  {STATUS_LABEL[e.campos.status] || e.campos.status}
                                </span>
                              )}
                            </div>

                            {/* Descrição da mudança */}
                            <div style={{fontSize:11,color:'#5a6a7e',marginTop:3,lineHeight:1.5}}>
                              {descricaoMudanca(e.campos)}
                            </div>

                            {/* Nome do pacote */}
                            {pacote && (
                              <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>
                                {pacote.pacote.replace(/^[A-Z-]+ - /,'')}
                              </div>
                            )}
                          </div>

                          {/* Meta info: hora + usuário */}
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>{hora}</div>
                            <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{e.usuario}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'10px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:11,color:'#64748b'}}>
            Últimos {Math.min(stats.total,500)} registros · Histórico salvo localmente
          </span>
          <button onClick={onClose}
            style={{padding:'8px 22px',background:'#1e3a5f',border:'none',borderRadius:7,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
