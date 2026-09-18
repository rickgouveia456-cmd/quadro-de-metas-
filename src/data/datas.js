// ================================================================
// DATAS.JS — utilitários de calendário
// ================================================================
import { FERIADOS, MESES_PT } from './pacotes';

export function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function hoje() {
  return toDateStr(new Date());
}

export function isUtilDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (d.getDay() === 0) return false;
  if (FERIADOS.has(dateStr)) return false;
  return true;
}

export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export function addDiasUteis(dateStr, dias) {
  let d = new Date(dateStr + 'T12:00:00');
  let count = 0;
  while (count < dias) {
    d.setDate(d.getDate() + 1);
    if (isUtilDay(toDateStr(d))) count++;
  }
  return toDateStr(d);
}

export function getDiasUteisEntre(d1, d2) {
  let count = 0;
  let cur = new Date(d1 + 'T12:00:00');
  const fim = new Date(d2 + 'T12:00:00');
  while (cur <= fim) {
    if (isUtilDay(toDateStr(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function formatDate(ds) {
  if (!ds) return '—';
  const [y, m, d] = ds.split('-');
  return `${d}/${m}/${y}`;
}

export function gerarColunasDatas(dataInicio, qtdColunas = 177) {
  const cols = [];
  let cur = new Date(dataInicio + 'T12:00:00');
  let diasUteis = 0;
  const hj = hoje();
  while (diasUteis < qtdColunas) {
    const ds = toDateStr(cur);
    const isUtil = isUtilDay(ds);
    cols.push({
      dateStr:     ds,
      dia:         cur.getDate(),
      mes:         cur.getMonth() + 1,
      mesNome:     MESES_PT[cur.getMonth()],
      ano:         cur.getFullYear(),
      diaSemana:   ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][cur.getDay()],
      isUtil,
      isFimSemana: isWeekend(ds),
      isFeriado:   FERIADOS.has(ds),
      isHoje:      ds === hj,
    });
    if (isUtil) diasUteis++;
    cur.setDate(cur.getDate() + 1);
    if (cols.length >= 250) break;
  }
  return cols;
}

export function gerarUnidades(obra, tipologias) {
  const tip = tipologias.find(t => t.id === obra.tipologia) || tipologias[0] || null;
  const totalPav = tip ? tip.pavimentos : (obra.pavimentos || 17);
  const ciclos   = tip ? tip.ciclos     : (obra.ciclos     || ['A','B','C','D']);
  const unidades = [];

  for (let p = 0; p < totalPav; p++) {
    // Ultimo pavimento é cobertura — pula
    if (p === totalPav - 1) continue;

    // Pavimento 0 = Térreo (T), demais = número
    const codPav = p === 0 ? 'T' : String(p);
    const numPav = p === 0 ? 'T' : p;

    ciclos.forEach(ciclo => {
      unidades.push({
        pav:   numPav,
        ciclo,
        cod:   `${codPav}${ciclo}`,   // TA, TB, TC, TD, 1A, 1B... 17D
        label: `${codPav} · Ciclo ${ciclo} (4 aptos)`,
        tipo:  'Takt 4',
      });
    });
  }
  return unidades;
}
