// ================================================================
// ModalExportar — Layout EXATO modelo Porto Aruana
//
// Estrutura do arquivo gerado:
//
//   Linhas 1-2  : vazias (espaço topo)
//   Linhas 3-7  : painel roxo escuro com KPIs (METAS EM ATRASO, ATIVIDADES DO DIA, etc.)
//   Linha  8    : separador roxo
//   Linha  9    : DATA PLANEJADA + datas de cada unidade em roxo
//   Linha  10   : DIA DA SEMANA + dia abreviado de cada unidade em roxo
//   Linhas 11-12: vazias
//   Linha  13   : CABEÇALHO — SEQ | ATIVIDADES | DESCRIÇÃO | _ | START | 1 | 2 | 3...
//   Linhas 14+  : PARES por atividade:
//                   linha PAR  = atividade  → células com "Pav. X\nCiclo Y", cor única da atividade
//                   linha ÍMPAR= FVS row    → células com "FVS" nas unidades já liberadas
// ================================================================
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { PACOTES_BASE } from '../../data/pacotes';

// Cor por pacote (igual às cores definidas em pacotes.js, convertida para ARGB)
// Cada pacote tem sua cor única — usamos diretamente p.cor
function hexToArgb(hex) {
  if (!hex) return 'FFE2E8F0';
  const h = hex.replace('#', '');
  if (h.length === 6) return 'FF' + h.toUpperCase();
  return 'FFE2E8F0';
}

// Cor do texto (auto contraste)
function textColor(argb) {
  const r = parseInt(argb.slice(2, 4), 16);
  const g = parseInt(argb.slice(4, 6), 16);
  const b = parseInt(argb.slice(6, 8), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? 'FF1E293B' : 'FFFFFFFF';
}

const COR_ROXO_ESCURO = 'FF2B0C3D';  // roxo escuro do topo (painel KPIs)
const COR_ROXO_MED   = 'FF7030A0';  // roxo médio das datas
const COR_BRANCO     = 'FFFFFFFF';
const COR_PRETO      = 'FF000000';
const COR_AMARELO    = 'FFFFFF00';  // amarelo do START
const COR_CINZA_CLR  = 'FFF4F7FB';
const COR_FVS_BG     = 'FF166534';  // verde escuro FVS confirmada
const COR_FVS_PEND   = 'FFD1FAE5';  // verde claríssimo FVS pendente

function makeStyle(bg, fg, bold = false, sz = 9, wrap = false, halign = 'center', valign = 'center') {
  return {
    fill: { type: 'pattern', patternType: 'solid', fgColor: { argb: bg } },
    font: { name: 'Calibri', sz, bold, color: { argb: fg } },
    alignment: { horizontal: halign, vertical: valign, wrapText: wrap },
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
  ws[addr] = { t: typeof value === 'number' ? 'n' : 's', v: value ?? '' };
  if (style) ws[addr].s = style;
}

function fmtDataLong(ds) {
  if (!ds) return '';
  const [y, m, d] = ds.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDiaSem(ds) {
  if (!ds) return '';
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const d = new Date(ds + 'T12:00:00');
  return dias[d.getDay()];
}

export default function ModalExportar({ obraAtual, obras, getEstado, unidades, pacotesFiltrados, onClose }) {
  const [statusExp, setStatusExp] = useState('idle');
  const [msg,       setMsg]       = useState('');
  const [formato,   setFormato]   = useState('excel');

  const obra = obras[obraAtual] || {};
  const pacs = pacotesFiltrados || PACOTES_BASE;

  // Ordenar unidades: pav asc, ciclo asc
  const unis = (unidades || []).slice().sort((a, b) => {
    if (a.pav !== b.pav) return a.pav - b.pav;
    return a.ciclo.localeCompare(b.ciclo);
  });

  // Colunas fixas
  const C_SEQ   = 0;  // A
  const C_NOME  = 1;  // B
  const C_DESC  = 2;  // C
  const C_VAZIO = 3;  // D (vazio — igual ao original)
  const C_START = 4;  // E (START / observação)
  const C_UNI0  = 5;  // F em diante — unidades

  async function exportarExcel() {
    setStatusExp('loading');
    try {
      const wb   = XLSX.utils.book_new();
      const ws   = {};
      const merges = [];
      const totalCols = C_UNI0 + unis.length;

      // ── Calcular KPIs ──────────────────────────────────────
      let kAtrasos = 0, kAtivDia = 0, kDentes = 0, kConc = 0, kTotal = 0;
      const hoje = new Date().toISOString().slice(0, 10);
      pacs.forEach(p => {
        unis.forEach(u => {
          const e  = getEstado(obraAtual, p.id, u.cod);
          const st = e.status || 'nao-iniciada';
          kTotal++;
          if (st === 'concluida')    kConc++;
          if (st === 'atrasada')     kAtrasos++;
          if (st === 'dente')        kDentes++;
          if (e.dataPlanejada === hoje) kAtivDia++;
        });
      });
      const ritmo = kTotal > 0 ? (kConc / Math.max(1, pacs.length)).toFixed(1) : '0';

      // ── LINHAS 1-2: vazias ─────────────────────────────────
      // (deixamos em branco — igual ao original)

      // ── LINHAS 3-7: painel roxo escuro com KPIs ───────────
      const KPI_ROWS = [
        [3, 'METAS EM ATRASO:', kAtrasos],
        [4, 'ATIVIDADES DO DIA:', kAtivDia],
        [5, 'DENTES:', kDentes],
        [6, 'RITMO:', ritmo],
      ];
      KPI_ROWS.forEach(([r1, label, val]) => {
        const r = r1 - 1; // 0-based
        // Colunas A-C em roxo escuro
        for (let c = 0; c < 3; c++) {
          setCell(ws, r, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
        }
        // Col D = label
        setCell(ws, r, 3, label, makeStyle(COR_ROXO_ESCURO, COR_BRANCO, true, 10, false, 'left'));
        // Col E = valor
        setCell(ws, r, 4, typeof val === 'number' ? val : val,
          makeStyle(COR_ROXO_ESCURO, COR_AMARELO, true, 12));
        // Resto
        for (let c = 5; c < totalCols; c++) {
          setCell(ws, r, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
        }
        merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
      });

      // Linha 7 (r=6): separador roxo cheio
      for (let c = 0; c < totalCols; c++) {
        setCell(ws, 6, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
      }

      // ── LINHA 8: DATA REAL (r=7) — vazia por enquanto ─────
      for (let c = 0; c < 3; c++) {
        setCell(ws, 7, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
      }
      setCell(ws, 7, 3, 'DATA REAL:', makeStyle(COR_ROXO_ESCURO, COR_BRANCO, true, 9, false, 'left'));
      for (let c = 4; c < totalCols; c++) {
        setCell(ws, 7, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
      }
      merges.push({ s: { r: 7, c: 0 }, e: { r: 7, c: 2 } });

      // ── LINHA 9: DATA PLANEJADA + datas das unidades (r=8) ─
      for (let c = 0; c < 3; c++) {
        setCell(ws, 8, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
      }
      setCell(ws, 8, 3, 'DATA PLANEJADA:', makeStyle(COR_ROXO_ESCURO, COR_BRANCO, true, 9, false, 'left'));
      merges.push({ s: { r: 8, c: 0 }, e: { r: 8, c: 2 } });
      // Preenche com a data planejada de cada unidade no primeiro pacote (ex.: primeiro pacote da lista)
      // O Porto Aruana usa a data da primeira atividade de cada unidade
      unis.forEach((u, i) => {
        let dataRef = '';
        // Pega a primeira data planejada encontrada para esta unidade
        for (const p of pacs) {
          const e = getEstado(obraAtual, p.id, u.cod);
          if (e.dataPlanejada) { dataRef = e.dataPlanejada; break; }
        }
        setCell(ws, 8, C_UNI0 + i, fmtDataLong(dataRef),
          makeStyle(COR_ROXO_MED, COR_BRANCO, false, 8));
      });

      // ── LINHA 10: DIA DA SEMANA (r=9) ─────────────────────
      for (let c = 0; c < 3; c++) {
        setCell(ws, 9, c, '', makeStyle(COR_ROXO_ESCURO, COR_BRANCO));
      }
      setCell(ws, 9, 3, 'DIA DA SEMANA', makeStyle(COR_ROXO_ESCURO, COR_BRANCO, true, 9, false, 'left'));
      merges.push({ s: { r: 9, c: 0 }, e: { r: 9, c: 2 } });
      unis.forEach((u, i) => {
        let dataRef = '';
        for (const p of pacs) {
          const e = getEstado(obraAtual, p.id, u.cod);
          if (e.dataPlanejada) { dataRef = e.dataPlanejada; break; }
        }
        setCell(ws, 9, C_UNI0 + i, fmtDiaSem(dataRef),
          makeStyle(COR_ROXO_MED, COR_BRANCO, false, 8));
      });

      // ── LINHAS 11-12: vazias (r=10,11) ────────────────────
      // deixadas em branco

      // ── LINHA 13: CABEÇALHO (r=12) ─────────────────────────
      setCell(ws, 12, C_SEQ,   'CÓD.',              makeStyle('FF1E3A5F', COR_BRANCO, true, 9));
      setCell(ws, 12, C_NOME,  'PACOTE',            makeStyle('FF1E3A5F', COR_BRANCO, true, 9, false, 'left'));
      setCell(ws, 12, C_DESC,  'DESCRIÇÃO DA META', makeStyle('FF1E3A5F', COR_BRANCO, true, 9, false, 'left'));
      setCell(ws, 12, C_VAZIO, '',                  makeStyle('FF1E3A5F', COR_BRANCO));
      setCell(ws, 12, C_START, '',                  makeStyle('FF1E3A5F', COR_BRANCO));
      // Colunas de unidades: número sequencial na linha 13
      unis.forEach((u, i) => {
        setCell(ws, 12, C_UNI0 + i, i + 1,
          makeStyle('FF334155', COR_BRANCO, true, 8));
      });

      // ── LINHA 14: sub-cabeçalho PAV+CICLO (r=13) ──────────
      setCell(ws, 13, C_SEQ,   '', makeStyle('FF1E3A5F', COR_BRANCO));
      setCell(ws, 13, C_NOME,  '', makeStyle('FF1E3A5F', COR_BRANCO));
      setCell(ws, 13, C_DESC,  '', makeStyle('FF1E3A5F', COR_BRANCO));
      setCell(ws, 13, C_VAZIO, '', makeStyle('FF1E3A5F', COR_BRANCO));
      setCell(ws, 13, C_START, '', makeStyle('FF1E3A5F', COR_BRANCO));
      unis.forEach((u, i) => {
        // Formato compacto: "1A", "1B", "2A"...
        setCell(ws, 13, C_UNI0 + i, `${u.pav}${u.ciclo}`,
          makeStyle('FF475569', COR_BRANCO, false, 7));
      });

      // Dados começam na linha 15 (r=14)
      let ROW = 14;

      pacs.forEach((p, pi) => {
        const corBg   = hexToArgb(p.cor);
        const corTxt  = textColor(corBg);
        const nomeCurto = p.pacote.replace(/^[A-Z-]+ - /, '');

        // ── Linha da ATIVIDADE ────────────────────────────
        const rAT = ROW;
        setCell(ws, rAT, C_SEQ,   pi + 1,     makeStyle(COR_CINZA_CLR, 'FF374151', true, 9));
        setCell(ws, rAT, C_NOME,  nomeCurto,  makeStyle(corBg, corTxt, true, 9, true, 'left'));
        setCell(ws, rAT, C_DESC,  p.descricao || '', makeStyle('FFFAFAFA', 'FF374151', false, 8, true, 'left'));
        setCell(ws, rAT, C_VAZIO, '',         makeStyle('FFFAFAFA', 'FF374151'));
        // Col START: observação ou vazio
        setCell(ws, rAT, C_START, '',         makeStyle('FFFAFAFA', 'FF374151'));

        // Células das unidades — conteúdo = data DD/MM (igual ao Porto Aruana)
        unis.forEach((u, i) => {
          const e  = getEstado(obraAtual, p.id, u.cod);
          const dp = e.dataPlanejada;
          const st = e.status || 'nao-iniciada';

          // Cor da célula: cor base do pacote, ajustada pelo status
          let bg = corBg;
          if (st === 'concluida')         bg = 'FF16A34A';
          else if (st === 'atrasada')     bg = 'FFDC2626';
          else if (st === 'em-andamento') bg = 'FFF59E0B';
          else if (st === 'dente')        bg = 'FFEA580C';

          const txt = textColor(bg);

          if (dp) {
            // Data compacta DD/MM — igual ao Porto Aruana
            const [y, m, d] = dp.split('-');
            setCell(ws, rAT, C_UNI0 + i, `${d}/${m}`,
              makeStyle(bg, txt, false, 8, false, 'center'));
          } else {
            setCell(ws, rAT, C_UNI0 + i, '',
              makeStyle('FFFFFFFF', 'FFCBD5E1'));
          }
        });

        // ── Linha FVS ─────────────────────────────────────
        const rFV = ROW + 1;
        setCell(ws, rFV, C_SEQ,   '', makeStyle('FFE8F5E9', 'FF166534'));
        setCell(ws, rFV, C_NOME,  `FVs ${p.codigo}`, makeStyle('FFE8F5E9', 'FF166534', false, 8, false, 'left'));
        setCell(ws, rFV, C_DESC,  p.fvsDesc || 'Ficha de Verificação de Serviço',
          makeStyle('FFE8F5E9', 'FF166534', false, 7, false, 'left'));
        setCell(ws, rFV, C_VAZIO, '', makeStyle('FFE8F5E9', 'FF166534'));
        setCell(ws, rFV, C_START, '', makeStyle('FFE8F5E9', 'FF166534'));

        unis.forEach((u, i) => {
          const ef  = getEstado(obraAtual, p.id + '_FVS', u.cod);
          const dp  = getEstado(obraAtual, p.id, u.cod).dataPlanejada;
          if (!dp) {
            setCell(ws, rFV, C_UNI0 + i, '', makeStyle('FFFFFFFF', 'FFCBD5E1'));
            return;
          }
          const stf  = ef.fvsStatus || 'nao-iniciada';
          const isOk = stf === 'concluida';
          setCell(ws, rFV, C_UNI0 + i, isOk ? 'FVS ✓' : 'FVS',
            makeStyle(isOk ? COR_FVS_BG : COR_FVS_PEND,
                      isOk ? COR_BRANCO : 'FF166534',
                      isOk, 7));
        });

        ROW += 2;
      });

      // ── Range e configurações ──────────────────────────────
      const lastRow = ROW;
      ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: lastRow + 1, c: totalCols - 1 });
      ws['!merges'] = merges;

      // Larguras das colunas
      ws['!cols'] = [
        { wch: 5  },   // A — CÓD
        { wch: 22 },   // B — PACOTE
        { wch: 30 },   // C — DESCRIÇÃO
        { wch: 3  },   // D — vazio
        { wch: 3  },   // E — vazio
        ...unis.map(() => ({ wch: 7 })),  // unidades — compacto DD/MM
      ];

      // Alturas das linhas
      const rowH = [];
      for (let i = 0; i < 13; i++) rowH.push({ hpt: i < 2 ? 5 : i < 10 ? 13 : 5 });
      rowH.push({ hpt: 14 }); // linha 13 — número seq
      rowH.push({ hpt: 11 }); // linha 14 — pav+ciclo
      pacs.forEach(() => {
        rowH.push({ hpt: 14 }); // atividade
        rowH.push({ hpt: 10 }); // FVS
      });
      ws['!rows'] = rowH;

      // Congela 5 colunas fixas e 2 linhas de cabeçalho
      ws['!freeze'] = { xSplit: 5, ySplit: 14, activeCell: 'F15', sqref: 'F15' };

      XLSX.utils.book_append_sheet(wb, ws, `Quadro_${obra.nome || obraAtual}`);

      // ── ABA 2: RESUMO ─────────────────────────────────────
      const ws2 = {};
      const cab = ['SEQ.', 'Pacote', 'Total', 'Concluídas', 'Em Andamento', 'Em Atraso', 'Dentes', 'Não Iniciadas', '% Concluído'];
      cab.forEach((v, c) => setCell(ws2, 0, c, v, makeStyle('FF1E3A5F', COR_BRANCO, true, 9)));
      pacs.forEach((p, ri) => {
        let tot = 0, conc = 0, and = 0, atr = 0, den = 0, ni = 0;
        unis.forEach(u => {
          const e = getEstado(obraAtual, p.id, u.cod);
          tot++;
          const st = e.status || 'nao-iniciada';
          if (st === 'concluida')         conc++;
          else if (st === 'em-andamento') and++;
          else if (st === 'atrasada')     atr++;
          else if (st === 'dente')        den++;
          else                            ni++;
        });
        const pct  = tot > 0 ? Math.round((conc / tot) * 100) : 0;
        const bgRow = ri % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
        const corBg = hexToArgb(p.cor);
        [ri + 1, p.pacote.replace(/^[A-Z-]+ - /, ''), tot, conc, and, atr, den, ni, `${pct}%`].forEach((v, c) => {
          const bg = c === 0 ? corBg : c === 3 ? (conc === tot ? 'FFD1FAE5' : bgRow) : c === 5 ? (atr > 0 ? 'FFFEE2E2' : bgRow) : bgRow;
          setCell(ws2, ri + 1, c, v, makeStyle(bg, c === 0 ? textColor(corBg) : 'FF1E293B', c === 8, 9, false, c < 2 ? 'left' : 'center'));
        });
      });
      ws2['!ref']  = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: pacs.length, c: 8 });
      ws2['!cols'] = [{ wch: 5 }, { wch: 42 }, { wch: 7 }, { wch: 11 }, { wch: 13 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 11 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

      // ── Salvar ─────────────────────────────────────────────
      const dataHoje = new Date().toISOString().slice(0, 10);
      const nomeArq  = `Quadro-de-Produtividade-${(obra.nome || obraAtual).replace(/\s+/g, '-')}-${dataHoje}.xlsx`;
      XLSX.writeFile(wb, nomeArq);
      setMsg(`✅ "${nomeArq}" gerado!`);
      setStatusExp('ok');
    } catch (err) {
      setMsg('❌ Erro: ' + err.message);
      setStatusExp('erro');
      console.error(err);
    }
  }

  // ── PDF ──────────────────────────────────────────────────────
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

    const thUnis = unis.map((u, i) =>
      `<th style="min-width:26px;padding:1px 0;font-size:6px;background:#334155;color:#fff;border:1px solid #475569;white-space:nowrap;text-align:center">${i+1}<br><span style="font-size:5px;opacity:.8">${u.pav}${u.ciclo}</span></th>`
    ).join('');

    const linhas = pacs.map(p => {
      const cor = p.cor || '#e2e8f0';
      const nome = p.pacote.replace(/^[A-Z-]+ - /, '');
      const cellsAT = unis.map(u => {
        const e  = getEstado(obraAtual, p.id, u.cod);
        const dp = e.dataPlanejada;
        if (!dp) return `<td style="background:#fff;border:1px solid #e2e8f0;min-width:26px"></td>`;
        const st = e.status || 'nao-iniciada';
        let bg = cor;
        if (st === 'concluida')         bg = '#16a34a';
        else if (st === 'atrasada')     bg = '#dc2626';
        else if (st === 'em-andamento') bg = '#f59e0b';
        else if (st === 'dente')        bg = '#ea580c';
        const dd = dp.slice(8) + '/' + dp.slice(5, 7);
        return `<td style="min-width:26px;padding:1px 0;font-size:6.5px;background:${bg};color:#fff;text-align:center;border:1px solid rgba(0,0,0,.1);font-weight:600">${dd}</td>`;
      }).join('');
      const cellsFVS = unis.map(u => {
        const e  = getEstado(obraAtual, p.id, u.cod);
        if (!e.dataPlanejada) return `<td style="background:#fff;border:1px solid #e2e8f0"></td>`;
        const ef = getEstado(obraAtual, p.id + '_FVS', u.cod);
        const ok = ef.fvsStatus === 'concluida';
        return `<td style="font-size:6px;background:${ok ? '#166534' : '#d1fae5'};color:${ok ? '#fff' : '#166534'};text-align:center;border:1px solid rgba(0,0,0,.1)">${ok ? '✓' : ''}</td>`;
      }).join('');
      return `
        <tr>
          <td style="padding:2px 4px;font-size:8px;font-weight:700;background:${cor};color:#fff;border:1px solid rgba(0,0,0,.15);white-space:nowrap">${nome}</td>
          ${cellsAT}
        </tr>
        <tr style="height:10px">
          <td style="font-size:6px;background:#e8f5e9;color:#166534;padding:0 4px;border:1px solid #c8e6c9">FVs</td>
          ${cellsFVS}
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Quadro de Produtividade — ${obra.nome || obraAtual}</title>
<style>
  @page { size: A3 landscape; margin: 6mm; }
  body { font-family: Arial,sans-serif; font-size:8px; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; margin:0; padding:0; }
  .header { background:#2b0c3d; color:#fff; padding:6px 10px; margin-bottom:6px; display:flex; gap:20px; align-items:center; }
  .kpi { text-align:center; }
  .kpi-v { font-size:14px; font-weight:800; color:#fbbf24; }
  .kpi-l { font-size:7px; text-transform:uppercase; opacity:.8; }
  table { border-collapse:collapse; width:100%; }
</style></head><body>
<div class="header">
  <div style="flex:1"><strong style="font-size:11px">QUADRO DE PRODUTIVIDADE — ${(obra.nome || obraAtual).toUpperCase()}</strong><br>
  <span style="font-size:8px;opacity:.8">Início: ${obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'} · Término: ${obra.dataTermino ? obra.dataTermino.split('-').reverse().join('/') : '—'} · ${hj}</span></div>
  <div class="kpi"><div class="kpi-v">${atrGeral}</div><div class="kpi-l">Em Atraso</div></div>
  <div class="kpi"><div class="kpi-v">${concGeral}</div><div class="kpi-l">Concluídas</div></div>
  <div class="kpi"><div class="kpi-v">${pctGeral}%</div><div class="kpi-l">% Concluído</div></div>
  <div class="kpi"><div class="kpi-v">${unis.length}</div><div class="kpi-l">Unidades</div></div>
</div>
<table>
  <thead><tr>
    <th style="padding:3px 5px;font-size:8px;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;text-align:left;min-width:100px">Atividade</th>
    ${thUnis}
  </tr></thead>
  <tbody>${linhas}</tbody>
</table>
<p style="margin-top:8px;font-size:7px;color:#94a3b8">Metodologia Linha Verde · ${pacs.length} pacotes · ${unis.length} unidades · ${hj}</p>
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

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #dde4ec', borderTop:'4px solid #7030a0', width:'100%', maxWidth:540, boxShadow:'0 24px 80px rgba(0,0,0,.22)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'#2b0c3d', color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>📤 Exportar Quadro de Produtividade</div>
            <div style={{ fontSize:11, opacity:.65, marginTop:2 }}>Modelo Porto Aruana · {pacs.length} atividades · {unis.length} unidades</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Formato */}
          <div style={{ display:'flex', gap:1, background:'#e2e8f0', borderRadius:8, overflow:'hidden' }}>
            {[['excel','📊 Excel (.xlsx)'], ['pdf','🖨 PDF / Impressão']].map(([k, l]) => (
              <button key={k} onClick={() => setFormato(k)}
                style={{ flex:1, padding:'10px 0', background:formato===k?'#fff':'transparent', border:'none', cursor:'pointer', fontWeight:formato===k?700:500, color:formato===k?'#2b0c3d':'#5a6a7e', fontSize:12 }}>
                {l}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:8, padding:'11px 14px', fontSize:12, color:'#4c1d95', lineHeight:1.8 }}>
            {formato === 'excel' ? (
              <>
                <strong>Layout idêntico ao quadro impresso do Porto Aruana:</strong><br/>
                <span>• Painel roxo topo: metas em atraso, atividades do dia, ritmo</span><br/>
                <span>• Linha de datas planejadas por unidade (roxo)</span><br/>
                <span>• Atividades com cor única + células "Pav. X / Ciclo Y"</span><br/>
                <span>• Linha FVS abaixo de cada atividade</span>
              </>
            ) : (
              'Abre quadro matricial A3 paisagem para impressão física. Layout igual ao quadro de obra.'
            )}
          </div>

          {/* Info */}
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'9px 13px', fontSize:11, color:'#5a6a7e', lineHeight:1.8 }}>
            <strong style={{ color:'#2b0c3d' }}>Obra:</strong> {obra.nome || obraAtual}<br/>
            <strong style={{ color:'#2b0c3d' }}>Unidades:</strong> {unis.length} &nbsp;·&nbsp;
            <strong style={{ color:'#2b0c3d' }}>Atividades:</strong> {pacs.length} &nbsp;·&nbsp;
            <strong style={{ color:'#2b0c3d' }}>Início:</strong> {obra.dataInicio ? obra.dataInicio.split('-').reverse().join('/') : '—'}
          </div>

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
            style={{ padding:'8px 22px', background:'#7030a0', border:'none', borderRadius:7, fontSize:12, fontWeight:800, color:'#fff', cursor:'pointer', opacity:statusExp==='loading'?.6:1, boxShadow:'0 4px 14px rgba(112,48,160,.4)' }}>
            {statusExp === 'loading' ? '⏳ Gerando...' : formato === 'excel' ? '📊 Baixar Excel' : '🖨 Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
