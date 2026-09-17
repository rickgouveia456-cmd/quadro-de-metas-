// ================================================================
// ModalExportar — Excel modelo Porto Aruana
// Layout: linhas = unidades (pav + ciclo), colunas = pacotes de trabalho
// Célula = data planejada  |  cor = status
// ================================================================
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { PACOTES_BASE, MACROFLUXOS } from '../../data/pacotes';

const STATUS_LABEL = {
  'nao-iniciada': 'NÃO INICIADA',
  'em-andamento': 'EM ANDAMENTO',
  'concluida':    'CONCLUÍDA',
  'atrasada':     'EM ATRASO',
  'dente':        'DENTE',
};

// Cores ARGB para xlsx (formato AARRGGBB)
const STATUS_COR_ARGB = {
  'nao-iniciada': 'FFE8ECF1',   // cinza claro
  'em-andamento': 'FFFDE68A',   // amarelo
  'concluida':    'FFBBF7D0',   // verde claro
  'atrasada':     'FFFECACA',   // vermelho claro
  'dente':        'FFFED7AA',   // laranja claro
};

// Cor de fundo do cabeçalho de cada macrofluxo
const MACRO_COR_ARGB = {
  EST:  'FF94A3B8',
  GRA:  'FFFBBF24',
  ESQ:  'FFD8B4FE',
  INST: 'FF86EFAC',
  HSD:  'FF86EFAC',
  ELE:  'FF86EFAC',
  DRY:  'FFFDE68A',
  EMA:  'FFFCA5A5',
  IMP:  'FF6EE7B7',
  CER:  'FFFBBF24',
  FOR:  'FFFDE68A',
  POR:  'FFD8B4FE',
  PIN:  'FFFCA5A5',
  LOU:  'FF93C5FD',
  GAS:  'FF86EFAC',
  LAM:  'FFBEF264',
  LIM:  'FFE2E8F0',
};

function fmtData(ds) {
  if (!ds) return '';
  const [y, m, d] = ds.split('-');
  return `${d}/${m}/${y}`;
}

function cellStyle(argbFill, bold = false, fontSize = 9, wrapText = false, horizontal = 'center') {
  return {
    fill: { fgColor: { argb: argbFill }, type: 'pattern', patternType: 'solid' },
    font: { bold, sz: fontSize, color: { argb: 'FF1E293B' }, name: 'Arial' },
    alignment: { horizontal, vertical: 'center', wrapText },
    border: {
      top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };
}

function applyStyle(ws, addr, style) {
  if (!ws[addr]) ws[addr] = { t: 's', v: ws[addr]?.v ?? '' };
  ws[addr].s = style;
}

export default function ModalExportar({ obraAtual, obras, getEstado, unidades, pacotesFiltrados, onClose }) {
  const [statusExp, setStatusExp] = useState('idle');
  const [msg,       setMsg]       = useState('');
  const obra = obras[obraAtual] || {};
  const pacs = pacotesFiltrados || PACOTES_BASE;
  const unis = (unidades || []).sort((a, b) => {
    if (a.pav !== b.pav) return a.pav - b.pav;
    return a.ciclo.localeCompare(b.ciclo);
  });

  // ── Excel modelo Porto Aruana ───────────────────────────────
  async function exportarExcel() {
    setStatusExp('loading');
    try {
      const wb = XLSX.utils.book_new();

      // ══════════════════════════════════════════════════════
      // ABA 1 — QUADRO DE PRODUTIVIDADE (layout Porto Aruana)
      // Linhas: unidades (pav+ciclo)
      // Colunas: pacotes de trabalho
      // Célula: data planejada + status como cor
      // ══════════════════════════════════════════════════════
      const ws1 = {};

      // ── Linha 0: Título da obra ──
      const tituloCell = 'A1';
      ws1[tituloCell] = { t: 's', v: `QUADRO DE PRODUTIVIDADE — ${(obra.nome || obraAtual).toUpperCase()}` };
      ws1[tituloCell].s = {
        fill: { fgColor: { argb: 'FF1E3A5F' }, type: 'pattern', patternType: 'solid' },
        font: { bold: true, sz: 13, color: { argb: 'FFFFFFFF' }, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      // ── Linha 1: Subtítulo / info ──
      const subCell = 'A2';
      const hoje = new Date().toLocaleDateString('pt-BR');
      const infoTexto = `Início: ${fmtData(obra.dataInicio) || '—'}   |   Término: ${fmtData(obra.dataTermino) || '—'}   |   Gerado em: ${hoje}   |   ${unis.length} unidades · ${pacs.length} pacotes`;
      ws1[subCell] = { t: 's', v: infoTexto };
      ws1[subCell].s = {
        fill: { fgColor: { argb: 'FFFB923C' }, type: 'pattern', patternType: 'solid' },
        font: { bold: false, sz: 9, color: { argb: 'FFFFFFFF' }, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' },
      };

      // ── Linha 2: Cabeçalho de macrofluxos (agrupamento) ──
      const ROW_MACRO   = 3;  // linha Excel (1-based)
      const ROW_PACOTE  = 4;  // linha com nome do pacote
      const ROW_CODIGO  = 5;  // linha com código
      const ROW_DADOS   = 6;  // linha onde começam as unidades

      // Coluna A = PAV, Coluna B = CICLO, colunas C em diante = pacotes
      const COL_PAV   = 0; // índice 0 = coluna A
      const COL_CICLO = 1; // índice 1 = coluna B
      const COL_BASE  = 2; // índice 2 = coluna C (primeiro pacote)

      // ── Cabeçalhos fixos ──
      const h_pav   = XLSX.utils.encode_cell({ r: ROW_MACRO - 1,  c: COL_PAV   });
      const h_ciclo = XLSX.utils.encode_cell({ r: ROW_MACRO - 1,  c: COL_CICLO });
      ws1[h_pav]   = { t: 's', v: 'PAV' };
      ws1[h_ciclo] = { t: 's', v: 'CICLO' };
      ws1[h_pav].s   = cellStyle('FF1E3A5F', true, 9, false, 'center');
      ws1[h_ciclo].s = cellStyle('FF1E3A5F', true, 9, false, 'center');
      ws1[h_pav].s.font.color   = { argb: 'FFFFFFFF' };
      ws1[h_ciclo].s.font.color = { argb: 'FFFFFFFF' };

      // linha ROW_PACOTE e ROW_CODIGO para colunas A/B
      for (const r of [ROW_PACOTE - 1, ROW_CODIGO - 1]) {
        const ca = XLSX.utils.encode_cell({ r, c: COL_PAV });
        const cb = XLSX.utils.encode_cell({ r, c: COL_CICLO });
        ws1[ca] = { t: 's', v: '' };
        ws1[cb] = { t: 's', v: '' };
        ws1[ca].s = cellStyle('FF1E3A5F', false, 9);
        ws1[cb].s = cellStyle('FF1E3A5F', false, 9);
      }

      // ── Cabeçalhos dos pacotes (linhas 3, 4, 5) ──
      pacs.forEach((p, ci) => {
        const col    = COL_BASE + ci;
        const macro  = MACROFLUXOS[p.codigo] || p.codigo;
        const corMac = MACRO_COR_ARGB[p.codigo] || 'FFE2E8F0';

        // Linha 3 — Macrofluxo
        const addrM = XLSX.utils.encode_cell({ r: ROW_MACRO - 1, c: col });
        ws1[addrM]   = { t: 's', v: macro };
        ws1[addrM].s = cellStyle(corMac, true, 8, false, 'center');

        // Linha 4 — Nome do pacote (abreviado, sem prefixo)
        const nomeCurto = p.pacote.replace(/^[A-Z-]+ - /, '');
        const addrP = XLSX.utils.encode_cell({ r: ROW_PACOTE - 1, c: col });
        ws1[addrP]   = { t: 's', v: nomeCurto };
        ws1[addrP].s = cellStyle(corMac + '88', true, 8, true, 'center');

        // Linha 5 — Código
        const addrC = XLSX.utils.encode_cell({ r: ROW_CODIGO - 1, c: col });
        ws1[addrC]   = { t: 's', v: p.codigo };
        ws1[addrC].s = cellStyle(corMac, true, 8, false, 'center');
      });

      // ── Dados: uma linha por unidade ──
      unis.forEach((u, ri) => {
        const row = ROW_DADOS - 1 + ri; // índice 0-based

        // Coluna PAV
        const addrPav = XLSX.utils.encode_cell({ r: row, c: COL_PAV });
        ws1[addrPav] = { t: 'n', v: u.pav };
        ws1[addrPav].s = cellStyle(
          ri % 2 === 0 ? 'FFF8FAFC' : 'FFEFF6FF',
          true, 9, false, 'center'
        );

        // Coluna CICLO
        const addrCiclo = XLSX.utils.encode_cell({ r: row, c: COL_CICLO });
        ws1[addrCiclo] = { t: 's', v: u.ciclo };
        ws1[addrCiclo].s = cellStyle(
          ri % 2 === 0 ? 'FFF8FAFC' : 'FFEFF6FF',
          true, 9, false, 'center'
        );

        // Colunas dos pacotes
        pacs.forEach((p, ci) => {
          const col  = COL_BASE + ci;
          const e    = getEstado(obraAtual, p.id, u.cod);
          const st   = e.status || 'nao-iniciada';
          const dp   = e.dataPlanejada;
          const dr   = e.dataReprogramada;
          const dr_  = dr && dr !== dp ? dr : null;
          const dataExib = dp ? fmtData(dp) : '';
          const dataRep  = dr_ ? ` (R: ${fmtData(dr_)})` : '';

          const addr = XLSX.utils.encode_cell({ r: row, c: col });
          ws1[addr] = { t: 's', v: dataExib + dataRep };
          ws1[addr].s = cellStyle(
            STATUS_COR_ARGB[st] || STATUS_COR_ARGB['nao-iniciada'],
            st === 'concluida',
            8,
            false,
            'center'
          );
        });
      });

      // ── Linha de totais (última linha) ──
      const rowTotais = ROW_DADOS - 1 + unis.length;
      const lbPav = XLSX.utils.encode_cell({ r: rowTotais, c: COL_PAV });
      ws1[lbPav] = { t: 's', v: 'TOTAL' };
      ws1[lbPav].s = cellStyle('FF1E3A5F', true, 9);
      ws1[lbPav].s.font.color = { argb: 'FFFFFFFF' };

      const lbCiclo = XLSX.utils.encode_cell({ r: rowTotais, c: COL_CICLO });
      ws1[lbCiclo] = { t: 's', v: '' };
      ws1[lbCiclo].s = cellStyle('FF1E3A5F', true, 9);

      pacs.forEach((p, ci) => {
        const col = COL_BASE + ci;
        let conc = 0, total = 0;
        unis.forEach(u => {
          const e = getEstado(obraAtual, p.id, u.cod);
          total++;
          if ((e.status || 'nao-iniciada') === 'concluida') conc++;
        });
        const pct = total > 0 ? Math.round((conc / total) * 100) : 0;
        const addr = XLSX.utils.encode_cell({ r: rowTotais, c: col });
        ws1[addr] = { t: 's', v: `${conc}/${total} (${pct}%)` };
        ws1[addr].s = cellStyle(
          pct === 100 ? 'FF86EFAC' : pct >= 50 ? 'FFFDE68A' : 'FFFECACA',
          true, 8
        );
      });

      // ── Refs do range ──
      const totalRows = rowTotais + 1;
      const totalCols = COL_BASE + pacs.length;
      ws1['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: totalRows, c: totalCols - 1 });

      // ── Mesclagens de título/subtítulo ──
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },  // título
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },  // subtítulo
      ];

      // ── Larguras das colunas ──
      ws1['!cols'] = [
        { wch: 6  },   // PAV
        { wch: 7  },   // CICLO
        ...pacs.map(() => ({ wch: 14 })),  // pacotes
      ];

      // ── Alturas das linhas de cabeçalho ──
      ws1['!rows'] = [
        { hpt: 24 },  // título
        { hpt: 14 },  // subtítulo
        { hpt: 16 },  // macrofluxo
        { hpt: 28 },  // nome pacote (wrap)
        { hpt: 14 },  // código
        ...unis.map(() => ({ hpt: 14 })),
        { hpt: 16 },  // totais
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Quadro de Produtividade');

      // ══════════════════════════════════════════════════════
      // ABA 2 — RESUMO POR PACOTE
      // ══════════════════════════════════════════════════════
      const ws2 = {};
      const cab2 = ['Código', 'Macrofluxo', 'Pacote de Trabalho', 'Total', 'Concluídas', 'Em Andamento', 'Em Atraso', 'Não Iniciadas', 'Dentes', '% Concluído'];
      cab2.forEach((v, c) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        ws2[addr] = { t: 's', v };
        ws2[addr].s = cellStyle('FF1E3A5F', true, 9);
        ws2[addr].s.font.color = { argb: 'FFFFFFFF' };
      });

      pacs.forEach((p, ri) => {
        let total = 0, conc = 0, and = 0, atr = 0, ni = 0, den = 0;
        unis.forEach(u => {
          const e = getEstado(obraAtual, p.id, u.cod);
          total++;
          const st = e.status || 'nao-iniciada';
          if (st === 'concluida')    conc++;
          else if (st === 'em-andamento') and++;
          else if (st === 'atrasada')     atr++;
          else if (st === 'dente')        den++;
          else                            ni++;
        });
        const pct  = total > 0 ? Math.round((conc / total) * 100) : 0;
        const bgRow = ri % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
        const row   = ri + 1;
        const vals  = [p.codigo, MACROFLUXOS[p.codigo] || p.codigo, p.pacote, total, conc, and, atr, ni, den, `${pct}%`];
        vals.forEach((v, c) => {
          const addr = XLSX.utils.encode_cell({ r: row, c });
          ws2[addr] = { t: typeof v === 'number' ? 'n' : 's', v };
          const bg  = c === 4 ? (conc === total ? 'FF86EFAC' : bgRow) : c === 6 ? (atr > 0 ? 'FFFECACA' : bgRow) : bgRow;
          ws2[addr].s = cellStyle(bg, false, 9, false, c < 3 ? 'left' : 'center');
        });
      });

      ws2['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: pacs.length, c: 9 });
      ws2['!cols'] = [{ wch: 7 }, { wch: 16 }, { wch: 46 }, { wch: 7 }, { wch: 11 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Pacote');

      // ══════════════════════════════════════════════════════
      // ABA 3 — CRONOGRAMA (pacote × unidade com datas)
      // ══════════════════════════════════════════════════════
      const ws3 = {};

      // Cabeçalho: Pacote | unidade1 | unidade2 | ...
      const cab3h = ['Pacote de Trabalho', ...unis.map(u => u.cod)];
      cab3h.forEach((v, c) => {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        ws3[addr] = { t: 's', v };
        ws3[addr].s = cellStyle(c === 0 ? 'FF1E3A5F' : 'FF1E3A5F', true, 9);
        ws3[addr].s.font.color = { argb: 'FFFFFFFF' };
      });

      pacs.forEach((p, ri) => {
        const row    = ri + 1;
        const bgBase = ri % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
        // Coluna 0 = nome pacote
        const addrP = XLSX.utils.encode_cell({ r: row, c: 0 });
        ws3[addrP]   = { t: 's', v: p.pacote };
        ws3[addrP].s = cellStyle(MACRO_COR_ARGB[p.codigo] || 'FFE2E8F0', true, 9, false, 'left');

        unis.forEach((u, ci) => {
          const e    = getEstado(obraAtual, p.id, u.cod);
          const st   = e.status || 'nao-iniciada';
          const dp   = e.dataPlanejada ? fmtData(e.dataPlanejada) : '';
          const addr = XLSX.utils.encode_cell({ r: row, c: ci + 1 });
          ws3[addr] = { t: 's', v: dp };
          ws3[addr].s = cellStyle(STATUS_COR_ARGB[st] || bgBase, st === 'concluida', 8, false, 'center');
        });
      });

      ws3['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: pacs.length, c: unis.length });
      ws3['!cols'] = [{ wch: 46 }, ...unis.map(() => ({ wch: 8 }))];
      XLSX.utils.book_append_sheet(wb, ws3, 'Cronograma');

      // ── Salvar arquivo ──
      const dataNome = new Date().toISOString().slice(0, 10);
      const nomeArq  = `Quadro-de-Produtividade-${(obra.nome || obraAtual).replace(/\s+/g, '-')}-${dataNome}.xlsx`;
      XLSX.writeFile(wb, nomeArq);
      setMsg(`✅ "${nomeArq}" baixado com sucesso!`);
      setStatusExp('ok');
    } catch (err) {
      setMsg('❌ Erro ao gerar: ' + err.message);
      setStatusExp('erro');
      console.error(err);
    }
  }

  // ── PDF — relatório resumido ───────────────────────────────
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

    const linhasPacote = pacs.map(p => {
      let conc = 0, and = 0, atr = 0, ni = 0, total = 0;
      unis.forEach(u => {
        const e = getEstado(obraAtual, p.id, u.cod);
        total++;
        const st = e.status || 'nao-iniciada';
        if (st === 'concluida')    conc++;
        else if (st === 'em-andamento') and++;
        else if (st === 'atrasada')     atr++;
        else ni++;
      });
      const pct    = total > 0 ? Math.round((conc / total) * 100) : 0;
      const barCor = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
      return `
        <tr>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px;font-weight:700;color:#1e3a5f;white-space:nowrap">${p.codigo}</td>
          <td style="padding:5px 8px;border:1px solid #dde4ec;font-size:10px">${p.pacote.replace(/^[A-Z-]+ - /, '')}</td>
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
              <span style="font-weight:700;color:${barCor};min-width:32px">${pct}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Quadro de Produtividade — ${obra.nome || obraAtual}</title>
<style>
  @page { size: A3 landscape; margin: 12mm; }
  body { font-family: Arial,sans-serif; font-size:10px; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  h1 { font-size:16px; color:#1e3a5f; margin:0 0 4px 0; }
  .sub { font-size:11px; color:#64748b; margin-bottom:16px; }
  table { border-collapse:collapse; width:100%; }
  thead th { background:#1e3a5f; color:#fff; padding:6px 8px; font-size:10px; text-align:left; border:1px solid #1e3a5f; }
  .kpis { display:flex; gap:12px; margin-bottom:16px; }
  .kpi { flex:1; border:1px solid #dde4ec; border-radius:6px; padding:8px 12px; text-align:center; }
  .kpi-val { font-size:20px; font-weight:800; }
  .kpi-lbl { font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700; margin-top:2px; letter-spacing:.5px; }
</style></head><body>
<h1>📋 Quadro de Produtividade — ${obra.nome || obraAtual}</h1>
<div class="sub">Início: <strong>${fmtData(obra.dataInicio) || '—'}</strong> &nbsp;|&nbsp;
  Término: <strong>${fmtData(obra.dataTermino) || '—'}</strong> &nbsp;|&nbsp;
  Gerado: <strong>${hj}</strong></div>
<div class="kpis">
  <div class="kpi"><div class="kpi-val" style="color:#1d4ed8">${totalGeral}</div><div class="kpi-lbl">Total Metas</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#16a34a">${concGeral}</div><div class="kpi-lbl">Concluídas</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#dc2626">${atrGeral}</div><div class="kpi-lbl">Em Atraso</div></div>
  <div class="kpi"><div class="kpi-val" style="color:${pctGeral>=80?'#16a34a':pctGeral>=50?'#d97706':'#dc2626'}">${pctGeral}%</div><div class="kpi-lbl">% Concluído</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#374151">${unis.length}</div><div class="kpi-lbl">Unidades</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#374151">${pacs.length}</div><div class="kpi-lbl">Pacotes</div></div>
</div>
<table>
  <thead><tr>
    <th>Cód.</th><th>Pacote de Trabalho</th><th>Total</th>
    <th style="color:#86efac">Concluídas</th><th style="color:#fde68a">Em Andamento</th>
    <th style="color:#fca5a5">Em Atraso</th><th>Não Iniciadas</th><th style="min-width:120px">% Concluído</th>
  </tr></thead>
  <tbody>${linhasPacote}</tbody>
</table>
<p style="margin-top:20px;font-size:9px;color:#94a3b8">
  Quadro de Metas · Metodologia Linha Verde · ${pacs.length} pacotes · ${unis.length} unidades · ${hj}
</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=1400,height=900');
    if (!w) { setMsg('⚠ Permita pop-ups neste site.'); setStatusExp('erro'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
    setMsg('✅ Janela de impressão aberta.');
    setStatusExp('ok');
  }

  const [formato, setFormato] = useState('excel');

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #dde4ec', borderTop:'4px solid #f97316', width:'100%', maxWidth:520, boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'#1e3a5f', color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800, fontSize:15 }}>📤 Exportar Quadro</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Seletor formato */}
          <div style={{ display:'flex', gap:1, background:'#dde4ec', borderRadius:8, overflow:'hidden' }}>
            {[['excel','📊 Excel (.xlsx)'], ['pdf','🖨 PDF / Impressão']].map(([k, l]) => (
              <button key={k} onClick={() => setFormato(k)}
                style={{ flex:1, padding:'10px 0', background:formato===k?'#fff':'transparent', border:'none', cursor:'pointer', fontWeight:formato===k?700:500, color:formato===k?'#1e3a5f':'#5a6a7e', fontSize:12, transition:'all .15s' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:7, padding:'10px 14px', fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            {formato === 'excel' ? (
              <>
                <strong>3 abas no modelo Porto Aruana:</strong><br/>
                <span>① Quadro de Produtividade — matriz unidades × pacotes com datas e cores por status</span><br/>
                <span>② Resumo por Pacote — totais e % concluído com cores</span><br/>
                <span>③ Cronograma — pacote × unidade com data planejada</span>
              </>
            ) : (
              'Relatório PDF com KPIs gerais e tabela de progresso por pacote. Abre janela de impressão.'
            )}
          </div>

          {/* Info obra */}
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'9px 13px', fontSize:11, color:'#5a6a7e', lineHeight:1.7 }}>
            <strong style={{ color:'#1e3a5f' }}>Obra:</strong> {obra.nome || obraAtual}<br/>
            <strong style={{ color:'#1e3a5f' }}>Unidades:</strong> {unis.length} &nbsp;·&nbsp;
            <strong style={{ color:'#1e3a5f' }}>Pacotes:</strong> {pacs.length} &nbsp;·&nbsp;
            <strong style={{ color:'#1e3a5f' }}>Início:</strong> {fmtData(obra.dataInicio) || '—'}
          </div>

          {/* Legenda cores */}
          {formato === 'excel' && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', fontSize:10, color:'#5a6a7e' }}>
              {[
                ['Não Iniciada', '#E8ECF1'],
                ['Em Andamento', '#FDE68A'],
                ['Concluída',    '#BBF7D0'],
                ['Em Atraso',    '#FECACA'],
                ['Dente',        '#FED7AA'],
              ].map(([lbl, cor]) => (
                <span key={lbl} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:12, height:12, borderRadius:2, background:cor, border:'1px solid #cbd5e1', flexShrink:0 }} />
                  {lbl}
                </span>
              ))}
            </div>
          )}

          {/* Mensagem resultado */}
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
            style={{ padding:'8px 22px', background:'linear-gradient(135deg, #ea580c, #f97316)', border:'none', borderRadius:7, fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', opacity:statusExp==='loading'?.6:1, boxShadow:'0 4px 12px rgba(234,88,12,.35)' }}>
            {statusExp === 'loading' ? '⏳ Gerando...' : formato === 'excel' ? '📊 Baixar Excel' : '🖨 Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
