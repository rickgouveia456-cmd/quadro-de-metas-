// ================================================================
// ModalExportar — Excel EXATO modelo Porto Aruana / Linha Verde
//
// Layout:
//   Col A  = Macrofluxo (agrupado, mesclado verticalmente)
//   Col B  = Nome do pacote de trabalho
//   Col C  = Descrição / FVs
//   Cols D+ = Unidades ordenadas: 1A,1B,1C,1D, 2A,2B,...  NpavCiclo
//
//   Linha 1 = Título
//   Linha 2 = PAV label (1,1,1,1, 2,2,...)
//   Linha 3 = CICLO label (A,B,C,D, A,B,...)
//   Linha 4+ = Um par de linhas por pacote:
//               linha par   = ATIVIDADE  → data planejada, cor do macrofluxo
//               linha ímpar = FVs        → data planejada FVs, verde escuro
//
// A cor de cada célula de dado = cor do macrofluxo do pacote
// ================================================================
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { PACOTES_BASE, MACROFLUXOS } from '../../data/pacotes';

// ── Cor ARGB por código de macrofluxo (igual ao quadro impresso) ──
const COR_MACRO = {
  GRA:  'FFFBBF24',  // amarelo ouro
  ESQ:  'FFB07FEA',  // roxo
  INST: 'FF57B87A',  // verde médio
  HSD:  'FF57B87A',  // verde médio
  ELE:  'FF57B87A',  // verde médio
  DRY:  'FFF0C030',  // amarelo escuro
  EMA:  'FFF0737A',  // salmão/rosa
  IMP:  'FF3DAA6A',  // verde escuro
  CER:  'FFFBBF24',  // amarelo
  FOR:  'FFF0C030',  // amarelo escuro
  ESQ2: 'FFB07FEA',  // roxo (portas vidro)
  POR:  'FFB07FEA',  // roxo
  PIN:  'FFF0737A',  // salmão
  LOU:  'FF4AA8D8',  // azul claro
  GAS:  'FF57B87A',  // verde
  LAM:  'FF8FC44A',  // verde limão
  LIM:  'FFB0B8C0',  // cinza claro
};

function getCorMacro(codigo) {
  return COR_MACRO[codigo] || 'FFE2E8F0';
}

// Cor texto: escuro se fundo claro, branco se fundo escuro
function getCorTexto(argb) {
  // converte ARGB hex → R, G, B
  const r = parseInt(argb.slice(2, 4), 16);
  const g = parseInt(argb.slice(4, 6), 16);
  const b = parseInt(argb.slice(6, 8), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? 'FF1E293B' : 'FFFFFFFF';
}

// ── Cor FVs (verde escuro fixo) ──
const COR_FVS       = 'FF166534';
const COR_FVS_TEXT  = 'FFFFFFFF';

// ── Cor cabeçalho fixo ──
const COR_HEADER    = 'FF1E3A5F';
const COR_HEADER_T  = 'FFFFFFFF';
const COR_PAV       = 'FF334155';
const COR_CICLO     = 'FF475569';

function fmtData(ds) {
  if (!ds) return '';
  const [y, m, d] = ds.split('-');
  return `${d}/${m}`;   // formato compacto DD/MM para caber na célula
}

function makeStyle(bgArgb, textArgb, bold = false, sz = 8, wrap = false, halign = 'center') {
  return {
    fill: { type: 'pattern', patternType: 'solid', fgColor: { argb: bgArgb } },
    font: { name: 'Calibri', sz, bold, color: { argb: textArgb } },
    alignment: { horizontal: halign, vertical: 'center', wrapText: wrap },
    border: {
      top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };
}

function setCell(ws, r, c, value, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const tipo = typeof value === 'number' ? 'n' : 's';
  ws[addr] = { t: tipo, v: value ?? '' };
  if (style) ws[addr].s = style;
}

export default function ModalExportar({ obraAtual, obras, getEstado, unidades, pacotesFiltrados, onClose }) {
  const [statusExp, setStatusExp] = useState('idle');
  const [msg,       setMsg]       = useState('');
  const obra = obras[obraAtual] || {};
  const pacs = pacotesFiltrados || PACOTES_BASE;

  // Ordena unidades: pav asc, ciclo asc
  const unis = (unidades || []).slice().sort((a, b) => {
    if (a.pav !== b.pav) return a.pav - b.pav;
    return a.ciclo.localeCompare(b.ciclo);
  });

  // ── Exportar Excel ─────────────────────────────────────────
  async function exportarExcel() {
    setStatusExp('loading');
    try {
      const wb = XLSX.utils.book_new();

      // ══════════════════════════════════════════════════════
      // ABA 1 — QUADRO DE PRODUTIVIDADE
      // ══════════════════════════════════════════════════════
      const ws = {};
      const merges = [];

      // Colunas fixas: A=Macrofluxo, B=Pacote, C=Descrição/FVs
      const C_MACRO = 0;
      const C_NOME  = 1;
      const C_DESC  = 2;
      const C_DATA0 = 3; // primeira coluna de unidade

      // ── Linha 0: Título ──────────────────────────────────
      const totalCols = C_DATA0 + unis.length;
      setCell(ws, 0, 0,
        `QUADRO DE PRODUTIVIDADE — ${(obra.nome || obraAtual).toUpperCase()}   |   Início: ${obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'}   |   Término: ${obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—'}   |   Gerado: ${new Date().toLocaleDateString('pt-BR')}`,
        makeStyle(COR_HEADER, COR_HEADER_T, true, 11, false, 'left')
      );
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

      // ── Linha 1: Cabeçalhos fixos + PAV ─────────────────
      setCell(ws, 1, C_MACRO, 'MACRO',    makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      setCell(ws, 1, C_NOME,  'PACOTE',   makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      setCell(ws, 1, C_DESC,  'DESCRIÇÃO',makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      unis.forEach((u, i) => {
        setCell(ws, 1, C_DATA0 + i, u.pav,
          makeStyle(COR_PAV, COR_HEADER_T, true, 7));
      });

      // ── Linha 2: CICLO ───────────────────────────────────
      setCell(ws, 2, C_MACRO, '',  makeStyle(COR_HEADER, COR_HEADER_T, false, 8));
      setCell(ws, 2, C_NOME,  '',  makeStyle(COR_HEADER, COR_HEADER_T, false, 8));
      setCell(ws, 2, C_DESC,  '',  makeStyle(COR_HEADER, COR_HEADER_T, false, 8));
      unis.forEach((u, i) => {
        setCell(ws, 2, C_DATA0 + i, u.ciclo,
          makeStyle(COR_CICLO, COR_HEADER_T, true, 7));
      });

      // ── Dados: 2 linhas por pacote (atividade + FVs) ────
      let ROW = 3;
      let macroPrev   = null;
      let macroRowIni = ROW;

      pacs.forEach((p, pi) => {
        const corBg   = getCorMacro(p.codigo);
        const corTxt  = getCorTexto(corBg);
        const macro   = MACROFLUXOS[p.codigo] || p.codigo;
        const nomeCurto = p.pacote.replace(/^[A-Z-]+ - /, '');

        // ── Linha da ATIVIDADE ──────────────────────────
        const rAT = ROW;

        // Macrofluxo: acumula para mesclar verticalmente
        if (macro !== macroPrev) {
          // Fecha mesclagem anterior
          if (macroPrev !== null && rAT > macroRowIni) {
            merges.push({ s: { r: macroRowIni, c: C_MACRO }, e: { r: rAT - 1, c: C_MACRO } });
          }
          macroPrev   = macro;
          macroRowIni = rAT;
        }

        setCell(ws, rAT, C_MACRO, macro,
          makeStyle(corBg, corTxt, true, 8, false, 'center'));
        setCell(ws, rAT, C_NOME, nomeCurto,
          makeStyle(corBg + 'CC', corTxt, true, 8, true, 'left'));
        setCell(ws, rAT, C_DESC, p.descricao || '',
          makeStyle('FFFAFAFA', 'FF374151', false, 7, true, 'left'));

        unis.forEach((u, i) => {
          const e  = getEstado(obraAtual, p.id, u.cod);
          const dp = e.dataPlanejada;
          const st = e.status || 'nao-iniciada';

          // Cor da célula: se concluída fica mais escura, se atrasada vermelho
          let bg = corBg;
          if (st === 'concluida')    bg = 'FF16A34A';
          else if (st === 'atrasada')bg = 'FFDC2626';
          else if (st === 'dente')   bg = 'FFEA580C';
          else if (st === 'em-andamento') bg = 'FFF59E0B';
          // se não iniciada: cor padrão do macrofluxo

          const txt = getCorTexto(bg);
          setCell(ws, rAT, C_DATA0 + i, fmtData(dp),
            makeStyle(bg, txt, false, 7));
        });

        // ── Linha das FVs ──────────────────────────────
        if (p.temFvs) {
          const rFV = ROW + 1;
          setCell(ws, rFV, C_MACRO, '',
            makeStyle(COR_FVS, COR_FVS_TEXT, false, 7));
          setCell(ws, rFV, C_NOME, `FVs ${p.codigo}`,
            makeStyle(COR_FVS, COR_FVS_TEXT, false, 7, false, 'left'));
          setCell(ws, rFV, C_DESC, p.fvsDesc || 'Ficha de Verificação',
            makeStyle('FFF0FDF4', 'FF166534', false, 7, false, 'left'));

          unis.forEach((u, i) => {
            const ef  = getEstado(obraAtual, p.id + '_FVS', u.cod);
            const dpf = ef.dataPlanejada;
            const stf = ef.fvsStatus || 'nao-iniciada';
            const bg  = stf === 'concluida' ? 'FF22C55E' : COR_FVS;
            const txt = COR_FVS_TEXT;
            setCell(ws, rFV, C_DATA0 + i, fmtData(dpf),
              makeStyle(bg, txt, false, 7));
          });
          ROW += 2;
        } else {
          ROW += 1;
        }
      });

      // Fecha última mesclagem de macrofluxo
      if (macroPrev !== null) {
        merges.push({ s: { r: macroRowIni, c: C_MACRO }, e: { r: ROW - 1, c: C_MACRO } });
      }

      // ── Linha de totais finais ──────────────────────────
      const rTOT = ROW;
      setCell(ws, rTOT, C_MACRO, 'TOTAL', makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      setCell(ws, rTOT, C_NOME,  '',      makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      setCell(ws, rTOT, C_DESC,  '',      makeStyle(COR_HEADER, COR_HEADER_T, true, 8));
      merges.push({ s: { r: rTOT, c: C_MACRO }, e: { r: rTOT, c: C_DESC } });

      unis.forEach((u, i) => {
        let conc = 0, tot = 0;
        pacs.forEach(p => {
          const e = getEstado(obraAtual, p.id, u.cod);
          tot++;
          if ((e.status || '') === 'concluida') conc++;
        });
        const pct = tot > 0 ? Math.round((conc / tot) * 100) : 0;
        const bg  = pct === 100 ? 'FF16A34A' : pct >= 50 ? 'FFF59E0B' : 'FFDC2626';
        setCell(ws, rTOT, C_DATA0 + i, `${pct}%`,
          makeStyle(bg, 'FFFFFFFF', true, 7));
      });

      // ── Range, merges, col widths, row heights ──────────
      ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rTOT, c: totalCols - 1 });
      ws['!merges'] = merges;
      ws['!cols'] = [
        { wch: 12 },   // Macrofluxo
        { wch: 28 },   // Pacote
        { wch: 36 },   // Descrição
        ...unis.map(() => ({ wch: 8 })),  // Unidades (DD/MM)
      ];
      // Alturas das linhas
      const rowHeights = [
        { hpt: 20 },  // título
        { hpt: 14 },  // PAV
        { hpt: 14 },  // CICLO
      ];
      pacs.forEach(p => {
        rowHeights.push({ hpt: 16 });  // atividade
        if (p.temFvs) rowHeights.push({ hpt: 12 }); // FVs
      });
      rowHeights.push({ hpt: 16 }); // totais
      ws['!rows'] = rowHeights;

      XLSX.utils.book_append_sheet(wb, ws, 'Quadro de Produtividade');

      // ══════════════════════════════════════════════════════
      // ABA 2 — RESUMO POR PACOTE
      // ══════════════════════════════════════════════════════
      const ws2 = {};
      const cab2 = ['Código', 'Macrofluxo', 'Pacote de Trabalho', 'Total', 'Concluídas', 'Em Andamento', 'Em Atraso', 'Não Iniciadas', 'Dentes', '% Concluído'];
      cab2.forEach((v, c) => {
        setCell(ws2, 0, c, v, makeStyle(COR_HEADER, COR_HEADER_T, true, 9));
      });

      pacs.forEach((p, ri) => {
        let total = 0, conc = 0, and = 0, atr = 0, ni = 0, den = 0;
        unis.forEach(u => {
          const e = getEstado(obraAtual, p.id, u.cod);
          total++;
          const st = e.status || 'nao-iniciada';
          if (st === 'concluida')         conc++;
          else if (st === 'em-andamento') and++;
          else if (st === 'atrasada')     atr++;
          else if (st === 'dente')        den++;
          else                            ni++;
        });
        const pct    = total > 0 ? Math.round((conc / total) * 100) : 0;
        const bgRow  = ri % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
        const bgConc = conc === total ? 'FFD1FAE5' : bgRow;
        const bgAtr  = atr > 0       ? 'FFFEE2E2' : bgRow;
        const row    = ri + 1;
        const vals   = [p.codigo, MACROFLUXOS[p.codigo] || p.codigo, p.pacote, total, conc, and, atr, ni, den, `${pct}%`];
        vals.forEach((v, c) => {
          const bg = c === 4 ? bgConc : c === 6 ? bgAtr : bgRow;
          const bold = c === 9;
          const halign = c < 3 ? 'left' : 'center';
          setCell(ws2, row, c, v, makeStyle(bg, 'FF1E293B', bold, 9, false, halign));
        });
      });

      ws2['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: pacs.length, c: 9 });
      ws2['!cols'] = [{ wch: 7 }, { wch: 16 }, { wch: 46 }, { wch: 7 }, { wch: 11 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Pacote');

      // ── Salvar arquivo ──────────────────────────────────
      const dataHoje = new Date().toISOString().slice(0, 10);
      const nomeArq  = `Quadro-de-Produtividade-${(obra.nome || obraAtual).replace(/\s+/g, '-')}-${dataHoje}.xlsx`;
      XLSX.writeFile(wb, nomeArq);
      setMsg(`✅ "${nomeArq}" gerado com sucesso!`);
      setStatusExp('ok');
    } catch (err) {
      setMsg('❌ Erro: ' + err.message);
      setStatusExp('erro');
      console.error(err);
    }
  }

  // ── PDF impressão ──────────────────────────────────────────
  function exportarPDF() {
    const hj = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });
    let totalGeral = 0, concGeral = 0, atrGeral = 0;
    pacs.forEach(p => unis.forEach(u => {
      const e = getEstado(obraAtual, p.id, u.cod);
      totalGeral++;
      const st = e.status || 'nao-iniciada';
      if (st === 'concluida') concGeral++;
      if (st === 'atrasada')  atrGeral++;
    }));
    const pctGeral = totalGeral > 0 ? Math.round((concGeral / totalGeral) * 100) : 0;

    // Cores CSS (mesmo mapeamento do Excel)
    const COR_CSS = {
      GRA:'#fbbf24', ESQ:'#b07fea', INST:'#57b87a', HSD:'#57b87a', ELE:'#57b87a',
      DRY:'#f0c030', EMA:'#f0737a', IMP:'#3daa6a', CER:'#f6b84b', FOR:'#f0c030',
      POR:'#b07fea', PIN:'#f0737a', LOU:'#4aa8d8', GAS:'#57b87a', LAM:'#8fc44a', LIM:'#b0b8c0',
    };

    // Monta as linhas do quadro matricial (pacote × unidade)
    const colsUni = unis.map(u => `<th style="min-width:28px;padding:1px 2px;font-size:7px;border:1px solid #cbd5e1;background:#334155;color:#fff;writing-mode:vertical-rl;transform:rotate(180deg);height:48px">${u.pav}${u.ciclo}</th>`).join('');

    const linhasPacotes = pacs.map(p => {
      const cor = COR_CSS[p.codigo] || '#e2e8f0';
      const nomeCurto = p.pacote.replace(/^[A-Z-]+ - /, '');
      const cellsAT = unis.map(u => {
        const e  = getEstado(obraAtual, p.id, u.cod);
        const dp = e.dataPlanejada;
        const st = e.status || 'nao-iniciada';
        let bg = cor;
        if (st === 'concluida')         bg = '#16a34a';
        else if (st === 'atrasada')     bg = '#dc2626';
        else if (st === 'em-andamento') bg = '#f59e0b';
        else if (st === 'dente')        bg = '#ea580c';
        const data = dp ? `${dp.slice(8)}/${dp.slice(5,7)}` : '';
        return `<td style="min-width:28px;padding:1px 2px;font-size:6px;border:1px solid rgba(0,0,0,.1);background:${bg};color:#fff;text-align:center;white-space:nowrap">${data}</td>`;
      }).join('');

      return `<tr>
        <td style="padding:2px 5px;font-size:8px;font-weight:700;white-space:nowrap;background:${cor};color:#fff;border:1px solid rgba(0,0,0,.15)">${p.codigo}</td>
        <td style="padding:2px 5px;font-size:8px;border:1px solid #e2e8f0;min-width:120px">${nomeCurto}</td>
        ${cellsAT}
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Quadro de Produtividade — ${obra.nome || obraAtual}</title>
<style>
  @page { size: A3 landscape; margin: 8mm; }
  body { font-family: Arial,sans-serif; font-size:9px; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; margin:0; padding:0; }
  h1 { font-size:13px; color:#1e3a5f; margin:0 0 2px 0; }
  .sub { font-size:9px; color:#64748b; margin-bottom:8px; }
  .kpis { display:flex; gap:8px; margin-bottom:8px; }
  .kpi { border:1px solid #dde4ec; border-radius:4px; padding:5px 10px; text-align:center; flex:1; }
  .kpi-val { font-size:16px; font-weight:800; }
  .kpi-lbl { font-size:8px; text-transform:uppercase; color:#64748b; font-weight:700; }
  table { border-collapse:collapse; }
  @media print { .no-print { display:none; } }
</style></head><body>
<h1>QUADRO DE PRODUTIVIDADE — ${(obra.nome || obraAtual).toUpperCase()}</h1>
<div class="sub">Início: <strong>${obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'}</strong> &nbsp;|&nbsp; Término: <strong>${obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—'}</strong> &nbsp;|&nbsp; Gerado: <strong>${hj}</strong> &nbsp;|&nbsp; ${unis.length} unidades · ${pacs.length} pacotes</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-val" style="color:#1d4ed8">${totalGeral}</div><div class="kpi-lbl">Total</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#16a34a">${concGeral}</div><div class="kpi-lbl">Concluídas</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#dc2626">${atrGeral}</div><div class="kpi-lbl">Em Atraso</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${pctGeral>=80?'#16a34a':pctGeral>=50?'#d97706':'#dc2626'}">${pctGeral}%</div><div class="kpi-lbl">% Concluído</div></div>
</div>
<table style="width:100%">
  <thead><tr>
    <th style="padding:3px 5px;font-size:8px;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;min-width:36px">Cód.</th>
    <th style="padding:3px 5px;font-size:8px;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;min-width:120px;text-align:left">Pacote</th>
    ${colsUni}
  </tr></thead>
  <tbody>${linhasPacotes}</tbody>
</table>
<p style="margin-top:10px;font-size:8px;color:#94a3b8">Metodologia Linha Verde · ${pacs.length} pacotes · ${unis.length} unidades · ${hj}</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=1600,height=1000');
    if (!w) { setMsg('⚠ Permita pop-ups neste site.'); setStatusExp('erro'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 800);
    setMsg('✅ Janela de impressão aberta.');
    setStatusExp('ok');
  }

  const [formato, setFormato] = useState('excel');

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #dde4ec', borderTop:'4px solid #f97316', width:'100%', maxWidth:540, boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'#1e3a5f', color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800, fontSize:15 }}>📤 Exportar Quadro de Produtividade</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Formato */}
          <div style={{ display:'flex', gap:1, background:'#e2e8f0', borderRadius:8, overflow:'hidden' }}>
            {[['excel','📊 Excel (.xlsx)'],['pdf','🖨 PDF / Impressão']].map(([k,l])=>(
              <button key={k} onClick={()=>setFormato(k)}
                style={{ flex:1, padding:'10px 0', background:formato===k?'#fff':'transparent', border:'none', cursor:'pointer', fontWeight:formato===k?700:500, color:formato===k?'#1e3a5f':'#5a6a7e', fontSize:12 }}>
                {l}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'11px 14px', fontSize:12, color:'#92400e', lineHeight:1.7 }}>
            {formato === 'excel' ? (
              <>
                <strong>Layout igual ao quadro impresso da obra:</strong><br/>
                <span>• Linhas = pacotes (Atividade + linha FVs)</span><br/>
                <span>• Colunas = unidades (1A, 1B, 1C, 1D, 2A, 2B...)</span><br/>
                <span>• Células = data DD/MM com cor do macrofluxo</span><br/>
                <span>• Status: 🟢 concluída · 🔴 atrasada · 🟡 andamento · 🟠 dente</span>
              </>
            ) : (
              'Abre quadro matricial A3 paisagem para impressão física na obra. Células coloridas por macrofluxo.'
            )}
          </div>

          {/* Info */}
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'9px 13px', fontSize:11, color:'#5a6a7e', lineHeight:1.8 }}>
            <strong style={{ color:'#1e3a5f' }}>Obra:</strong> {obra.nome || obraAtual}<br/>
            <strong style={{ color:'#1e3a5f' }}>Unidades:</strong> {unis.length} &nbsp;·&nbsp;
            <strong style={{ color:'#1e3a5f' }}>Pacotes:</strong> {pacs.length} &nbsp;·&nbsp;
            <strong style={{ color:'#1e3a5f' }}>Início:</strong> {obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'}
          </div>

          {/* Legenda cores */}
          {formato === 'excel' && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:11, color:'#374151', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:10, color:'#64748b' }}>Células:</span>
              {[['Cor macrofluxo','#57b87a'],['Concluída','#16a34a'],['Em Atraso','#dc2626'],['Em Andamento','#f59e0b'],['Dente','#ea580c']].map(([l,c])=>(
                <span key={l} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:12, height:12, borderRadius:2, background:c, border:'1px solid #cbd5e1', flexShrink:0 }}/>
                  <span style={{ fontSize:10 }}>{l}</span>
                </span>
              ))}
            </div>
          )}

          {msg && (
            <div style={{ background:statusExp==='ok'?'#f0fdf4':'#fef2f2', border:`1px solid ${statusExp==='ok'?'#86efac':'#fca5a5'}`, borderRadius:6, padding:'9px 13px', fontSize:12, color:statusExp==='ok'?'#14532d':'#b91c1c', fontWeight:600 }}>
              {msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', background:'#f4f7fb', borderTop:'1px solid #dde4ec', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:'1px solid #c8d4e0', borderRadius:7, fontSize:12, cursor:'pointer' }}>Fechar</button>
          <button
            onClick={formato === 'excel' ? exportarExcel : exportarPDF}
            disabled={statusExp === 'loading'}
            style={{ padding:'8px 22px', background:'linear-gradient(135deg,#ea580c,#f97316)', border:'none', borderRadius:7, fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', opacity:statusExp==='loading'?.6:1, boxShadow:'0 4px 14px rgba(234,88,12,.4)' }}>
            {statusExp === 'loading' ? '⏳ Gerando...' : formato === 'excel' ? '📊 Baixar Excel' : '🖨 Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
