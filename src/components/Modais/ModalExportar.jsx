// ================================================================
// ModalExportar — Excel (3 abas) + PDF com dados reais
// ================================================================
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { PACOTES_BASE } from '../../data/pacotes';
import { formatDate } from '../../data/datas';

const STATUS_LABEL = {
  'nao-iniciada': 'Não Iniciada',
  'em-andamento': 'Em Andamento',
  'concluida':    'Concluída',
  'atrasada':     'Em Atraso',
  'dente':        'Dente',
};

export default function ModalExportar({ obraAtual, obras, getEstado, unidades, pacotesFiltrados, onClose }) {
  const [statusExp, setStatusExp] = useState('idle');
  const [msg,       setMsg]       = useState('');
  const [formato,   setFormato]   = useState('excel');
  const obra = obras[obraAtual] || {};

  // ── Excel — 3 abas ──────────────────────────────────────────
  async function exportarExcel() {
    setStatusExp('loading');
    try {
      const wb   = XLSX.utils.book_new();
      const pacs = pacotesFiltrados || PACOTES_BASE;
      const unis = unidades || [];

      // ── ABA 1: Status Detalhado ──
      const rowsDetalhe = [['Macrofluxo','Código','Pacote','Unidade','Pavimento','Ciclo','Status','Data Planejada','Data Reprogramada','Data Real','FVs','Observação']];
      pacs.forEach(p => {
        unis.forEach(u => {
          const e  = getEstado(obraAtual, p.id, u.cod);
          const ef = p.temFvs ? getEstado(obraAtual, p.id+'_FVS', u.cod) : null;
          rowsDetalhe.push([
            p.codigo, p.codigo, p.pacote, u.cod,
            u.pav, u.ciclo,
            STATUS_LABEL[e.status] || e.status || 'Não Iniciada',
            e.dataPlanejada    ? e.dataPlanejada.split('-').reverse().join('/')    : '',
            e.dataReprogramada ? e.dataReprogramada.split('-').reverse().join('/') : '',
            e.dataReal         ? e.dataReal.split('-').reverse().join('/')         : '',
            ef ? (ef.fvsStatus === 'concluida' ? '✓ Conforme' : '— Pendente') : 'N/A',
            e.observacao || '',
          ]);
        });
      });
      const ws1 = XLSX.utils.aoa_to_sheet(rowsDetalhe);
      ws1['!cols'] = [{wch:16},{wch:8},{wch:42},{wch:7},{wch:8},{wch:7},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:40}];
      XLSX.utils.book_append_sheet(wb, ws1, 'Status Detalhado');

      // ── ABA 2: Resumo por Pacote ──
      const rowsResumo = [['Código','Pacote','Total','Concluídas','Em Andamento','Não Iniciadas','Em Atraso','Dentes','% Concluído']];
      pacs.forEach(p => {
        let total=0, conc=0, and=0, ni=0, atr=0, den=0;
        unis.forEach(u => {
          const e = getEstado(obraAtual, p.id, u.cod);
          total++;
          const st = e.status || 'nao-iniciada';
          if (st==='concluida')    conc++;
          else if (st==='em-andamento') and++;
          else if (st==='atrasada')     atr++;
          else if (st==='dente')        den++;
          else                          ni++;
        });
        rowsResumo.push([
          p.codigo, p.pacote, total, conc, and, ni, atr, den,
          total > 0 ? `${Math.round((conc/total)*100)}%` : '0%',
        ]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(rowsResumo);
      ws2['!cols'] = [{wch:8},{wch:42},{wch:7},{wch:12},{wch:14},{wch:14},{wch:10},{wch:8},{wch:12}];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Pacote');

      // ── ABA 3: Quadro Matricial (pacote × unidade) ──
      const cabUnidades = ['Pacote / Unidade', ...unis.map(u => u.cod)];
      const rowsMatriz  = [cabUnidades];
      pacs.forEach(p => {
        const linha = [p.pacote];
        unis.forEach(u => {
          const e  = getEstado(obraAtual, p.id, u.cod);
          const st = e.status || 'nao-iniciada';
          linha.push(STATUS_LABEL[st] || st);
        });
        rowsMatriz.push(linha);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(rowsMatriz);
      ws3['!cols'] = [{wch:42}, ...unis.map(()=>({wch:6}))];
      XLSX.utils.book_append_sheet(wb, ws3, 'Quadro Matricial');

      const nome = `quadro-metas-${obraAtual}-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, nome);
      setMsg(`✅ Arquivo "${nome}" salvo com 3 abas!`);
      setStatusExp('ok');
    } catch(e) {
      setMsg('❌ Erro: ' + e.message);
      setStatusExp('erro');
    }
  }

  // ── PDF — quadro completo com status real ───────────────────
  function exportarPDF() {
    const pacs = pacotesFiltrados || PACOTES_BASE;
    const unis = unidades || [];
    const hj   = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });

    // Monta tabela de resumo por pacote
    const linhasPacote = pacs.map(p => {
      let conc=0, and=0, atr=0, ni=0, den=0, total=0;
      unis.forEach(u => {
        const e = getEstado(obraAtual, p.id, u.cod);
        total++;
        const st = e.status || 'nao-iniciada';
        if (st==='concluida') conc++;
        else if (st==='em-andamento') and++;
        else if (st==='atrasada') atr++;
        else if (st==='dente') den++;
        else ni++;
      });
      const pct = total > 0 ? Math.round((conc/total)*100) : 0;
      const barCor = pct===100?'#16a34a':pct>=50?'#d97706':'#dc2626';
      return `
        <tr>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;font-weight:700;color:#1e3a5f;white-space:nowrap">${p.codigo}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px">${p.pacote.replace(/^[A-Z-]+ - /,'')}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center">${total}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center;color:#16a34a;font-weight:700">${conc}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center;color:#d97706">${and}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center;color:#dc2626">${atr}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center;color:#475569">${ni}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;text-align:center">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px">
                <div style="height:6px;width:${pct}%;background:${barCor};border-radius:3px"></div>
              </div>
              <span style="font-weight:700;color:${barCor};min-width:30px">${pct}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Estatísticas gerais
    let totalGeral=0, concGeral=0, atrGeral=0;
    pacs.forEach(p => unis.forEach(u => {
      const e = getEstado(obraAtual, p.id, u.cod);
      totalGeral++;
      if ((e.status||'nao-iniciada')==='concluida') concGeral++;
      if ((e.status||'nao-iniciada')==='atrasada')  atrGeral++;
    }));
    const pctGeral = totalGeral > 0 ? Math.round((concGeral/totalGeral)*100) : 0;

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Quadro de Metas — ${obra.nome || obraAtual}</title>
  <style>
    @page { size: A3 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1 { font-size: 16px; color: #1e3a5f; margin: 0 0 4px 0; }
    .sub { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    thead th { background: #1e3a5f; color: #fff; padding: 6px 8px; font-size: 10px; text-align: left; border: 1px solid #1e3a5f; }
    .kpis { display: flex; gap: 12px; margin-bottom: 16px; }
    .kpi { flex: 1; border: 1px solid #dde4ec; border-radius: 6px; padding: 8px 12px; text-align: center; }
    .kpi-val { font-size: 20px; font-weight: 800; }
    .kpi-lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-top: 2px; letter-spacing: .5px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>📋 Quadro de Metas — ${obra.nome || obraAtual}</h1>
  <div class="sub">
    Obra: <strong>${obra.nome || obraAtual}</strong> &nbsp;|&nbsp;
    Início: <strong>${obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'}</strong> &nbsp;|&nbsp;
    Término: <strong>${obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—'}</strong> &nbsp;|&nbsp;
    Gerado em: <strong>${hj}</strong>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val" style="color:#1d4ed8">${totalGeral}</div><div class="kpi-lbl">Total de Metas</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#16a34a">${concGeral}</div><div class="kpi-lbl">Concluídas</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#dc2626">${atrGeral}</div><div class="kpi-lbl">Em Atraso</div></div>
    <div class="kpi"><div class="kpi-val" style="color:${pctGeral>=80?'#16a34a':pctGeral>=50?'#d97706':'#dc2626'}">${pctGeral}%</div><div class="kpi-lbl">% Concluído</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#374151">${unis.length}</div><div class="kpi-lbl">Unidades</div></div>
    <div class="kpi"><div class="kpi-val" style="color:#374151">${pacs.length}</div><div class="kpi-lbl">Pacotes</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Cód.</th><th>Pacote de Trabalho</th><th>Total</th>
        <th style="color:#86efac">Concluídas</th><th style="color:#fde68a">Em Andamento</th>
        <th style="color:#fca5a5">Em Atraso</th><th>Não Iniciadas</th><th style="min-width:120px">% Concluído</th>
      </tr>
    </thead>
    <tbody>${linhasPacote}</tbody>
  </table>

  <p style="margin-top:20px;font-size:9px;color:#94a3b8">
    Quadro de Metas — Metodologia Linha Verde · ${pacs.length} pacotes · ${unis.length} unidades · ${hj}
  </p>
</body></html>`;

    const w = window.open('', '_blank', 'width=1400,height=900');
    if (!w) { setMsg('⚠ Permita pop-ups para este site.'); setStatusExp('erro'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
    setMsg('✅ Janela de impressão aberta.');
    setStatusExp('ok');
  }

  const ov  = { position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 };
  const box = { background:'#fff',borderRadius:12,border:'1px solid #dde4ec',borderTop:'4px solid #1a56db',width:'100%',maxWidth:500,boxShadow:'0 24px 80px rgba(0,0,0,.22)',overflow:'hidden' };

  return (
    <div style={ov} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={box}>
        <div style={{background:'#1e3a5f',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontWeight:800,fontSize:15}}>📤 Exportar Quadro</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>

          {/* Seletor de formato */}
          <div style={{display:'flex',gap:1,background:'#dde4ec',borderRadius:8,overflow:'hidden'}}>
            {[['excel','📊 Excel (.xlsx)'],['pdf','🖨 PDF / Impressão']].map(([k,l])=>(
              <button key={k} onClick={()=>setFormato(k)}
                style={{flex:1,padding:'10px 0',background:formato===k?'#fff':'transparent',border:'none',cursor:'pointer',fontWeight:formato===k?700:500,color:formato===k?'#1e3a5f':'#5a6a7e',fontSize:12,transition:'all .15s'}}>
                {l}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,padding:'10px 14px',fontSize:12,color:'#1e40af'}}>
            {formato === 'excel'
              ? '3 abas: (1) Status Detalhado com FVs e datas; (2) Resumo por Pacote com % concluído; (3) Quadro Matricial pacote × unidade.'
              : 'Exporta PDF com KPIs gerais, tabela completa de pacotes com barra de progresso, status e totais por pacote.'}
          </div>

          {/* Info */}
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px',fontSize:11,color:'#5a6a7e',lineHeight:1.7}}>
            <strong style={{color:'#1e3a5f'}}>Obra:</strong> {obra.nome || obraAtual}<br/>
            <strong style={{color:'#1e3a5f'}}>Pacotes:</strong> {(pacotesFiltrados||PACOTES_BASE).length} &nbsp;·&nbsp;
            <strong style={{color:'#1e3a5f'}}>Unidades:</strong> {(unidades||[]).length}
          </div>

          {/* Mensagem de resultado */}
          {msg && (
            <div style={{background:statusExp==='ok'?'#f0fdf4':'#fef2f2',border:`1px solid ${statusExp==='ok'?'#86efac':'#fca5a5'}`,borderRadius:6,padding:'8px 12px',fontSize:12,color:statusExp==='ok'?'#14532d':'#b91c1c',fontWeight:600}}>
              {msg}
            </div>
          )}

        </div>
        <div style={{padding:'12px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={onClose} style={{padding:'8px 16px',background:'#fff',border:'1px solid #c8d4e0',borderRadius:6,fontSize:12,cursor:'pointer'}}>Fechar</button>
          <button
            onClick={formato==='excel' ? exportarExcel : exportarPDF}
            disabled={statusExp==='loading'}
            style={{padding:'8px 20px',background:'#1a56db',border:'none',borderRadius:6,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer',opacity:statusExp==='loading'?.6:1}}>
            {statusExp === 'loading' ? '⏳ Gerando...' : formato === 'excel' ? '📊 Baixar Excel' : '🖨 Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
