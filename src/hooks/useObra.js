// ================================================================
// useObra — estado global de obras, tipologias e metas
//
// PERSISTÊNCIA: usa localStorage com debounce de 300ms para evitar
// gravações excessivas. O estado é lido UMA VEZ na inicialização
// (função lazy do useState) e salvo a cada mudança.
//
// FORMATO DO ESTADO:
//   estado = {
//     "TC": {
//       "TC__GRA-VAO__1A": { status, dataPlanejada, ... },
//       ...
//     }
//   }
// ================================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { OBRAS_PADRAO, TIPOLOGIAS_PADRAO, FERIADOS } from '../data/pacotes';
import { addDiasUteis, toDateStr } from '../data/datas';

const LS_ESTADO     = 'quadroMetas_estado';
const LS_OBRAS      = 'quadroMetas_obras';
const LS_TIPOLOGIAS = 'quadroMetas_tipologias';
const LS_HISTORICO  = 'quadroMetas_historico';
const LS_BASE_ZERO  = 'quadroMetas_baseZero';
const LS_FERIADOS   = 'quadroMetas_feriados';
const LS_RESTRICOES = 'quadroMetas_restricoes';
const MAX_LOG = 500;

// ── Leitura segura do localStorage ──────────────────────────────
function lerLS(chave, fallback) {
  try {
    const raw = localStorage.getItem(chave);
    if (raw === null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

// ── Inicialização lazy (chamada só uma vez) ─────────────────────
function initObras() {
  const salvo = lerLS(LS_OBRAS, null);
  if (!salvo) return { ...OBRAS_PADRAO };
  // Mescla com OBRAS_PADRAO para garantir campos novos
  return Object.fromEntries(
    Object.keys(OBRAS_PADRAO).map(k => [k, { ...OBRAS_PADRAO[k], ...(salvo[k] || {}) }])
  );
}

function initTipologias() {
  return lerLS(LS_TIPOLOGIAS, null) ?? [...TIPOLOGIAS_PADRAO];
}

function initEstado() {
  return lerLS(LS_ESTADO, {});
}

function initFeriados() {
  return lerLS(LS_FERIADOS, []);
}

function initRestricoes() {
  return lerLS(LS_RESTRICOES, {});
}

// ── Histórico (não fica no state — direto no LS) ────────────────
function carregarHistorico() {
  return lerLS(LS_HISTORICO, []);
}
function salvarHistorico(log) {
  try { localStorage.setItem(LS_HISTORICO, JSON.stringify(log.slice(-MAX_LOG))); } catch {}
}

// ── Hook principal ──────────────────────────────────────────────
export function useObra() {
  // Lazy initializers — só executam na primeira renderização
  const [obras,      setObras]      = useState(initObras);
  const [tipologias, setTipologias] = useState(initTipologias);
  const [estado,     setEstado]     = useState(initEstado);
  const [feriadosCustom, setFeriadosCustom] = useState(initFeriados);
  const [restricoes, setRestricoes] = useState(initRestricoes);
  const [obraAtual,  setObraAtual]  = useState('TC');

  // ── Persistência com debounce para evitar excesso de gravações ─
  const debounceRef = useRef({});

  function salvarComDebounce(chave, valor, delay = 300) {
    clearTimeout(debounceRef.current[chave]);
    debounceRef.current[chave] = setTimeout(() => {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch {}
    }, delay);
  }

  useEffect(() => { salvarComDebounce(LS_OBRAS,      obras);      }, [obras]);
  useEffect(() => { salvarComDebounce(LS_TIPOLOGIAS, tipologias); }, [tipologias]);
  useEffect(() => { salvarComDebounce(LS_ESTADO,     estado, 150);}, [estado]);
  useEffect(() => { salvarComDebounce(LS_FERIADOS,   feriadosCustom); }, [feriadosCustom]);
  useEffect(() => { salvarComDebounce(LS_RESTRICOES, restricoes); }, [restricoes]);

  // ── getEstado ────────────────────────────────────────────────
  const getEstado = useCallback((obraId, pacoteId, unidadeCod) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;
    return estado[obraId]?.[key] ?? {
      status:               'nao-iniciada',
      dataPlanejada:        null,
      dataReprogramada:     null,
      dataReal:             null,
      programadoManualmente: false,
      observacao:           '',
    };
  }, [estado]);

  // ── setEstadoMeta ────────────────────────────────────────────
  const setEstadoMeta = useCallback((obraId, pacoteId, unidadeCod, novo, userLabel) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;

    // Histórico para mudanças relevantes
    if (
      novo.status            !== undefined ||
      novo.dataPlanejada     !== undefined ||
      novo.dataReprogramada  !== undefined ||
      novo.dataReal          !== undefined
    ) {
      const log = carregarHistorico();
      log.push({
        ts: new Date().toISOString(),
        obraId, pacoteId, unidadeCod,
        campos:  novo,
        usuario: userLabel || 'Sistema',
      });
      salvarHistorico(log);
    }

    setEstado(prev => ({
      ...prev,
      [obraId]: {
        ...prev[obraId],
        [key]: { ...(prev[obraId]?.[key] ?? {}), ...novo },
      },
    }));
  }, []);

  // ── Histórico ────────────────────────────────────────────────
  const getHistorico = useCallback((obraId, pacoteId, unidadeCod) => {
    return carregarHistorico()
      .filter(e =>
        (!obraId     || e.obraId     === obraId)   &&
        (!pacoteId   || e.pacoteId   === pacoteId) &&
        (!unidadeCod || e.unidadeCod === unidadeCod)
      )
      .reverse();
  }, []);

  const limparHistorico = useCallback(() => {
    try { localStorage.removeItem(LS_HISTORICO); } catch {}
  }, []);

  // ── Obras ────────────────────────────────────────────────────
  const atualizarObra = useCallback((obraId, campos) => {
    setObras(prev => ({ ...prev, [obraId]: { ...prev[obraId], ...campos } }));
  }, []);

  const adicionarObra = useCallback((novaObra) => {
    const id = novaObra.codigo.toUpperCase();
    setObras(prev => ({
      ...prev,
      [id]: {
        nome:        novaObra.nome,
        codigo:      id,
        pavimentos:  17,
        aptosPosPav: 8,
        ciclos:      ['A','B','C','D'],
        diasPorMeta: 1,
        tipologia:   novaObra.tipologiaId || 'TC',
        dataInicio:  novaObra.dataInicio  || null,
        dataTermino: novaObra.dataTermino || null,
        obraAnterior: null,
        sequencia:   'ABCD',
      },
    }));
  }, []);

  const atualizarDatas = useCallback((obraId, dataInicio) => {
    const termino = addDiasUteis(dataInicio, 177);
    atualizarObra(obraId, { dataInicio, dataTermino: termino });
  }, [atualizarObra]);

  const atualizarTipologia = useCallback((obraId, tipId) => {
    const tip = tipologias.find(t => t.id === tipId);
    const diasNecessarios = tip
      ? Math.ceil((tip.pavimentos - 1) * tip.ciclos.length * (tip.diasPorMeta || 1))
      : 177;
    const obra    = obras[obraId];
    const termino = obra?.dataInicio ? addDiasUteis(obra.dataInicio, diasNecessarios) : obra?.dataTermino;
    atualizarObra(obraId, {
      tipologia:   tipId,
      diasPorMeta: tip?.diasPorMeta || 1,
      dataTermino: termino,
    });
  }, [tipologias, obras, atualizarObra]);

  // ── Tipologias ───────────────────────────────────────────────
  const adicionarTipologia = useCallback((nova) => {
    const id = nova.nome.replace(/\s+/g, '_').toUpperCase();
    setTipologias(prev => [...prev, { ...nova, id }]);
  }, []);

  const removerTipologia = useCallback((idx) => {
    setTipologias(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── inicializarDatas — só seta data se a obra não tiver ──────
  // IMPORTANTE: não sobrescreve datas já salvas
  const inicializarDatas = useCallback(() => {
    const hj = toDateStr(new Date());
    setObras(prev => {
      let mudou = false;
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (!next[id].dataInicio) {
          next[id] = { ...next[id], dataInicio: hj, dataTermino: addDiasUteis(hj, 177) };
          mudou = true;
        }
      });
      return mudou ? next : prev; // retorna o mesmo objeto se nada mudou
    });
  }, []);

  // ── Base Zero ────────────────────────────────────────────────
  const salvarBaseZero = useCallback((obraId, planejamento) => {
    try {
      const existente = lerLS(LS_BASE_ZERO, {});
      if (existente[obraId]) return { ok: false, msg: 'Base Zero já existe para esta obra.' };
      existente[obraId] = { criadaEm: new Date().toISOString(), planejamento };
      localStorage.setItem(LS_BASE_ZERO, JSON.stringify(existente));
      return { ok: true };
    } catch {
      return { ok: false, msg: 'Erro ao salvar Base Zero.' };
    }
  }, []);

  const getBaseZero  = useCallback((obraId) => lerLS(LS_BASE_ZERO, {})[obraId] ?? null, []);
  const temBaseZero  = useCallback((obraId) => !!lerLS(LS_BASE_ZERO, {})[obraId],        []);

  // ── Feriados ─────────────────────────────────────────────────
  const adicionarFeriado = useCallback((dateStr) => {
    setFeriadosCustom(prev => prev.includes(dateStr) ? prev : [...prev, dateStr]);
  }, []);

  const removerFeriado = useCallback((dateStr) => {
    setFeriadosCustom(prev => prev.filter(d => d !== dateStr));
  }, []);

  const getFeriadosCustom = useCallback(() => feriadosCustom, [feriadosCustom]);

  // ── Restrições ───────────────────────────────────────────────
  const getRestricoes = useCallback((obraId) => restricoes[obraId] ?? [], [restricoes]);

  const adicionarRestricao = useCallback((obraId, restricao) => {
    const nova = { ...restricao, id: Date.now(), criadaEm: new Date().toISOString(), status: 'aberta' };
    setRestricoes(prev => ({ ...prev, [obraId]: [...(prev[obraId] ?? []), nova] }));
    return nova.id;
  }, []);

  const atualizarRestricao = useCallback((obraId, id, campos) => {
    setRestricoes(prev => ({
      ...prev,
      [obraId]: (prev[obraId] ?? []).map(r => r.id === id ? { ...r, ...campos } : r),
    }));
  }, []);

  const removerRestricao = useCallback((obraId, id) => {
    setRestricoes(prev => ({
      ...prev,
      [obraId]: (prev[obraId] ?? []).filter(r => r.id !== id),
    }));
  }, []);

  // ── getDiasUteisEntre (exposto para App.jsx) ─────────────────
  // Importado diretamente via import no topo do arquivo
  return {
    obraAtual, setObraAtual,
    obras,
    tipologias,
    estado,
    getEstado,
    setEstadoMeta,
    atualizarObra,
    adicionarObra,
    atualizarDatas,
    atualizarTipologia,
    adicionarTipologia,
    removerTipologia,
    inicializarDatas,
    getHistorico,
    limparHistorico,
    salvarBaseZero,
    getBaseZero,
    temBaseZero,
    feriadosCustom,
    adicionarFeriado,
    removerFeriado,
    getFeriadosCustom,
    getRestricoes,
    adicionarRestricao,
    atualizarRestricao,
    removerRestricao,
  };
}
