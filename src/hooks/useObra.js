// ================================================================
// useObra — estado global de obras, tipologias e metas
//
// PERSISTÊNCIA HÍBRIDA:
//   1. Lê do localStorage na inicialização (instantâneo)
//   2. Tenta sincronizar com a API em background
//   3. Salva no localStorage a cada mudança (imediato)
//   4. Salva na API a cada mudança (async, sem bloquear UI)
//   5. No beforeunload: flush síncrono para localStorage
// ================================================================
import { useState, useCallback, useEffect, useRef } from 'react';
import { OBRAS_PADRAO, TIPOLOGIAS_PADRAO, FERIADOS } from '../data/pacotes';
import { addDiasUteis, toDateStr } from '../data/datas';
import { metas as apiMetas, obras as apiObras, feriados as apiFeriados, restricoes as apiRestricoes, healthCheck } from '../services/api';

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
  // Mescla TODAS as obras salvas (incluindo customizadas) com os padrões
  const todasChaves = new Set([...Object.keys(OBRAS_PADRAO), ...Object.keys(salvo)]);
  return Object.fromEntries(
    [...todasChaves].map(k => [k, { ...(OBRAS_PADRAO[k] || {}), ...(salvo[k] || {}) }])
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

  // ── Persistência: imediata + flush garantido no F5/fechar ─────
  // Refs para acesso síncrono no beforeunload (sem closure stale)
  const estadoRef     = useRef(estado);
  const obrasRef      = useRef(obras);
  const tipologiasRef = useRef(tipologias);
  const feriadosRef   = useRef(feriadosCustom);
  const restricoesRef = useRef(restricoes);

  useEffect(() => { estadoRef.current     = estado;       }, [estado]);
  useEffect(() => { obrasRef.current      = obras;        }, [obras]);
  useEffect(() => { tipologiasRef.current = tipologias;   }, [tipologias]);
  useEffect(() => { feriadosRef.current   = feriadosCustom; }, [feriadosCustom]);
  useEffect(() => { restricoesRef.current = restricoes;   }, [restricoes]);

  // Salva imediatamente a cada mudança
  useEffect(() => {
    try { localStorage.setItem(LS_ESTADO,     JSON.stringify(estado));      } catch {}
  }, [estado]);
  useEffect(() => {
    try { localStorage.setItem(LS_OBRAS,      JSON.stringify(obras));       } catch {}
  }, [obras]);
  useEffect(() => {
    try { localStorage.setItem(LS_TIPOLOGIAS, JSON.stringify(tipologias));  } catch {}
  }, [tipologias]);
  useEffect(() => {
    try { localStorage.setItem(LS_FERIADOS,   JSON.stringify(feriadosCustom)); } catch {}
  }, [feriadosCustom]);
  useEffect(() => {
    try { localStorage.setItem(LS_RESTRICOES, JSON.stringify(restricoes));  } catch {}
  }, [restricoes]);

  // Flush síncrono no F5 / fechar aba — garante que nada se perde
  useEffect(() => {
    function flush() {
      try {
        localStorage.setItem(LS_ESTADO,     JSON.stringify(estadoRef.current));
        localStorage.setItem(LS_OBRAS,      JSON.stringify(obrasRef.current));
        localStorage.setItem(LS_TIPOLOGIAS, JSON.stringify(tipologiasRef.current));
        localStorage.setItem(LS_FERIADOS,   JSON.stringify(feriadosRef.current));
        localStorage.setItem(LS_RESTRICOES, JSON.stringify(restricoesRef.current));
      } catch {}
    }
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []); // monta uma vez — usa refs para sempre ter dados atuais

  // ── Sync com API em background ────────────────────────────────
  // Ao montar: tenta carregar estado do banco (se API disponível)
  const [apiOnline, setApiOnline] = useState(false);
  const apiOnlineRef = useRef(false);
  const obraAtualRef = useRef(obraAtual);
  useEffect(() => { obraAtualRef.current = obraAtual; }, [obraAtual]);
  useEffect(() => { apiOnlineRef.current = apiOnline; }, [apiOnline]);

  useEffect(() => {
    async function syncDobanco() {
      const ok = await healthCheck();
      setApiOnline(ok);
      if (!ok) return;

      try {
        // Carrega obras do banco
        const resObras = await apiObras.listar();
        if (resObras.ok && Array.isArray(resObras.data)) {
          const obrasDoB = {};
          resObras.data.forEach(o => {
            obrasDoB[o.codigo] = {
              ...OBRAS_PADRAO[o.codigo],
              ...o,
              ciclos:      Array.isArray(o.ciclos) ? o.ciclos : (o.ciclos||'A,B,C,D').split(','),
              aptosPosPav: o.aptosPorPav || o.aptos_por_pav || 4,
              diasPorMeta: o.diasPorMeta || o.dias_por_meta || 1,
            };
          });
          if (Object.keys(obrasDoB).length > 0) {
            setObras(prev => ({ ...prev, ...obrasDoB }));
          }
        }

        // Carrega estado das metas da obra atual
        const obraId = obraAtualRef.current;
        const resMetas = await apiMetas.carregar(obraId);
        if (resMetas.ok && resMetas.data) {
          const mapaApi = resMetas.data;
          // Converte formato API { "pacote|unidade": {...} } para formato interno { obraId: { "obraId__pacote__unidade": {...} } }
          const estadoConvertido = {};
          Object.entries(mapaApi).forEach(([chave, val]) => {
            const [pacote, unidade] = chave.split('|');
            const keyInterna = `${obraId}__${pacote}__${unidade}`;
            estadoConvertido[keyInterna] = val;
          });
          if (Object.keys(estadoConvertido).length > 0) {
            setEstado(prev => ({
              ...prev,
              [obraId]: { ...(prev[obraId] || {}), ...estadoConvertido },
            }));
          }
        }
      } catch { /* silencioso */ }
    }
    syncDobanco();
  }, []); // roda só uma vez ao montar

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

    // Salva na API em background (sem bloquear UI)
    if (apiOnlineRef.current) {
      apiMetas.salvar(obraId, pacoteId, unidadeCod, novo, null).catch(() => {});
    }
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
