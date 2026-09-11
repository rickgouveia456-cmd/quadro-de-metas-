// ================================================================
// useObra — estado global de obras, tipologias e metas
// ================================================================
import { useState, useCallback, useEffect } from 'react';
import { OBRAS_PADRAO, TIPOLOGIAS_PADRAO } from '../data/pacotes';
import { addDiasUteis, toDateStr } from '../data/datas';

const LS_ESTADO    = 'quadroMetas_estado';
const LS_OBRAS     = 'quadroMetas_obras';
const LS_TIPOLOGIAS = 'quadroMetas_tipologias';

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

export function useObra() {
  const init = carregarLS();

  const [obraAtual,  setObraAtual]  = useState('TC');
  const [obras,      setObras]      = useState(init.obras);
  const [tipologias, setTipologias] = useState(init.tipologias);
  const [estado,     setEstado]     = useState(init.estado);

  // Persistir sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(LS_OBRAS,      JSON.stringify(obras));
      localStorage.setItem(LS_TIPOLOGIAS, JSON.stringify(tipologias));
      localStorage.setItem(LS_ESTADO,     JSON.stringify(estado));
    } catch {}
  }, [obras, tipologias, estado]);

  // ── Getters de meta ─────────────────────────────────────────
  const getEstado = useCallback((obraId, pacoteId, unidadeCod) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;
    return estado[obraId]?.[key] || { status: 'nao-iniciada', dataReal: null, observacao: '' };
  }, [estado]);

  const setEstadoMeta = useCallback((obraId, pacoteId, unidadeCod, novo) => {
    const key = `${obraId}__${pacoteId}__${unidadeCod}`;
    setEstado(prev => ({
      ...prev,
      [obraId]: {
        ...prev[obraId],
        [key]: { ...(prev[obraId]?.[key] || {}), ...novo },
      },
    }));
  }, []);

  // ── Obras ────────────────────────────────────────────────────
  const atualizarObra = useCallback((obraId, campos) => {
    setObras(prev => ({ ...prev, [obraId]: { ...prev[obraId], ...campos } }));
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
    const obra = obras[obraId];
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

  // ── Setters default datas ────────────────────────────────────
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

  return {
    obraAtual,  setObraAtual,
    obras,
    tipologias,
    estado,
    getEstado,
    setEstadoMeta,
    atualizarObra,
    atualizarDatas,
    atualizarTipologia,
    adicionarTipologia,
    removerTipologia,
    inicializarDatas,
  };
}
