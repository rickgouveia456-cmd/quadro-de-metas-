// ================================================================
// useObra — estado global de obras, tipologias e metas
// ================================================================
import { useState, useCallback, useEffect } from 'react';
import { OBRAS_PADRAO, TIPOLOGIAS_PADRAO, FERIADOS } from '../data/pacotes';
import { addDiasUteis, toDateStr } from '../data/datas';

const LS_ESTADO      = 'quadroMetas_estado';
const LS_OBRAS       = 'quadroMetas_obras';
const LS_TIPOLOGIAS  = 'quadroMetas_tipologias';
const LS_HISTORICO   = 'quadroMetas_historico';
const LS_BASE_ZERO   = 'quadroMetas_baseZero';
const LS_FERIADOS    = 'quadroMetas_feriados';
const LS_RESTRICOES  = 'quadroMetas_restricoes';

const MAX_LOG = 500;

// ── Carregar localStorage ──────────────────────────────────────
function carregarLS() {
  try {
    const obras = JSON.parse(localStorage.getItem(LS_OBRAS) || 'null');
    const tips  = JSON.parse(localStorage.getItem(LS_TIPOLOGIAS) || 'null');
    const est   = JSON.parse(localStorage.getItem(LS_ESTADO) || 'null');
    return {
      obras: obras
        ? Object.fromEntries(Object.keys(OBRAS_PADRAO).map(k => [k, { ...OBRAS_PADRAO[k], ...(obras[k] || {}) }]))
        : { ...OBRAS_PADRAO },
      tipologias: tips || [...TIPOLOGIAS_PADRAO],
      estado:     est  || {},
    };
  } catch {
    return { obras: { ...OBRAS_PADRAO }, tipologias: [...TIPOLOGIAS_PADRAO], estado: {} };
  }
}

function carregarHistorico() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORICO) || '[]'); }
  catch { return []; }
}

function salvarHistorico(log) {
  try { localStorage.setItem(LS_HISTORICO, JSON.stringify(log.slice(-MAX_LOG))); }
  catch {}
}

function carregarFeriadosCustom() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_FERIADOS) || 'null');
    // Retorna union do Set padrão com os feriados customizados
    return saved ? new Set([...FERIADOS, ...saved]) : new Set([...FERIADOS]);
  } catch {
    return new Set([...FERIADOS]);
  }
}

// ── Hook principal ─────────────────────────────────────────────
export function useObra() {
  const init = carregarLS();

  const [obraAtual,   setObraAtual]   = useState('TC');
  const [obras,       setObras]       = useState(init.obras);
  const [tipologias,  setTipologias]  = useState(init.tipologias);
  const [estado,      setEstado]      = useState(init.estado);
  const [feriadosCustom, setFeriadosCustom] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_FERIADOS) || '[]');
    } catch { return []; }
  });
  const [restricoes, setRestricoes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_RESTRICOES) || '{}'); }
    catch { return {}; }
  });

  // Persistir sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(LS_OBRAS,      JSON.stringify(obras));
      localStorage.setItem(LS_TIPOLOGIAS, JSON.stringify(tipologias));
      localStorage.setItem(LS_ESTADO,     JSON.stringify(estado));
    } catch {}
  }, [obras, tipologias, estado]);

  useEffect(() => {
    try { localStorage.setItem(LS_FERIADOS, JSON.stringify(feriadosCustom)); }
    catch {}
  }, [feriadosCustom]);

  useEffect(() => {
    try { localStorage.setItem(LS_RESTRICOES, JSON.stringify(restricoes)); }
    catch {}
  }, [restricoes]);

  // ── Getters de meta ──────────────────────────────────────────
  const getEstado = useCallback((obraId, pacoteId, unidadeCod) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;
    return estado[obraId]?.[key] || { status: 'nao-iniciada', dataReal: null, observacao: '' };
  }, [estado]);

  const setEstadoMeta = useCallback((obraId, pacoteId, unidadeCod, novo, userLabel) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;

    // Gravar histórico para mudanças relevantes
    const temMudancaRelevante =
      novo.status !== undefined ||
      novo.dataPlanejada !== undefined ||
      novo.dataReprogramada !== undefined ||
      novo.dataReal !== undefined;

    if (temMudancaRelevante) {
      const log = carregarHistorico();
      log.push({
        ts:         new Date().toISOString(),
        obraId,
        pacoteId,
        unidadeCod,
        campos:     novo,
        usuario:    userLabel || 'Sistema',
      });
      salvarHistorico(log);
    }

    setEstado(prev => ({
      ...prev,
      [obraId]: {
        ...prev[obraId],
        [key]: { ...(prev[obraId]?.[key] || {}), ...novo },
      },
    }));
  }, []);

  // ── Histórico ────────────────────────────────────────────────
  const getHistorico = useCallback((obraId, pacoteId, unidadeCod) => {
    const log = carregarHistorico();
    return log
      .filter(e =>
        (!obraId     || e.obraId     === obraId)     &&
        (!pacoteId   || e.pacoteId   === pacoteId)   &&
        (!unidadeCod || e.unidadeCod === unidadeCod)
      )
      .reverse();
  }, []);

  const limparHistorico = useCallback(() => {
    localStorage.removeItem(LS_HISTORICO);
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
        dataInicio:  novaObra.dataInicio || null,
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
    const termino = obra.dataInicio ? addDiasUteis(obra.dataInicio, diasNecessarios) : obra.dataTermino;
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

  // ── Datas default ────────────────────────────────────────────
  const inicializarDatas = useCallback(() => {
    const hj = toDateStr(new Date());
    setObras(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (!next[id].dataInicio) {
          next[id] = { ...next[id], dataInicio: hj, dataTermino: addDiasUteis(hj, 177) };
        }
      });
      return next;
    });
  }, []);

  // ── Base Zero ────────────────────────────────────────────────
  const salvarBaseZero = useCallback((obraId, planejamento) => {
    try {
      const existente = JSON.parse(localStorage.getItem(LS_BASE_ZERO) || '{}');
      if (existente[obraId]) return { ok: false, msg: 'Base Zero já existe para esta obra. Uma nova Base Zero exige alinhamento e um novo arquivo.' };
      existente[obraId] = {
        criadaEm: new Date().toISOString(),
        planejamento,  // snapshot do estado { key: { dataPlanejada, ... } }
      };
      localStorage.setItem(LS_BASE_ZERO, JSON.stringify(existente));
      return { ok: true };
    } catch {
      return { ok: false, msg: 'Erro ao salvar Base Zero.' };
    }
  }, []);

  const getBaseZero = useCallback((obraId) => {
    try {
      const data = JSON.parse(localStorage.getItem(LS_BASE_ZERO) || '{}');
      return data[obraId] || null;
    } catch { return null; }
  }, []);

  const temBaseZero = useCallback((obraId) => {
    try {
      const data = JSON.parse(localStorage.getItem(LS_BASE_ZERO) || '{}');
      return !!data[obraId];
    } catch { return false; }
  }, []);

  // ── Feriados customizados ────────────────────────────────────
  const adicionarFeriado = useCallback((dateStr) => {
    setFeriadosCustom(prev => prev.includes(dateStr) ? prev : [...prev, dateStr]);
  }, []);

  const removerFeriado = useCallback((dateStr) => {
    setFeriadosCustom(prev => prev.filter(d => d !== dateStr));
  }, []);

  const getFeriadosCustom = useCallback(() => feriadosCustom, [feriadosCustom]);

  // ── Restrições ───────────────────────────────────────────────
  const getRestricoes = useCallback((obraId) => {
    return restricoes[obraId] || [];
  }, [restricoes]);

  const adicionarRestricao = useCallback((obraId, restricao) => {
    const nova = {
      ...restricao,
      id:       Date.now(),
      criadaEm: new Date().toISOString(),
      status:   'aberta',
    };
    setRestricoes(prev => ({
      ...prev,
      [obraId]: [...(prev[obraId] || []), nova],
    }));
    return nova.id;
  }, []);

  const atualizarRestricao = useCallback((obraId, id, campos) => {
    setRestricoes(prev => ({
      ...prev,
      [obraId]: (prev[obraId] || []).map(r => r.id === id ? { ...r, ...campos } : r),
    }));
  }, []);

  const removerRestricao = useCallback((obraId, id) => {
    setRestricoes(prev => ({
      ...prev,
      [obraId]: (prev[obraId] || []).filter(r => r.id !== id),
    }));
  }, []);

  return {
    obraAtual,  setObraAtual,
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
    // Base Zero
    salvarBaseZero,
    getBaseZero,
    temBaseZero,
    // Feriados
    feriadosCustom,
    adicionarFeriado,
    removerFeriado,
    getFeriadosCustom,
    // Restrições
    getRestricoes,
    adicionarRestricao,
    atualizarRestricao,
    removerRestricao,
  };
}
