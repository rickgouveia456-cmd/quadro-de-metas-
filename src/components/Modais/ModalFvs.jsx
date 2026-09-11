// ================================================================
// Modal FVs — Ficha de Verificação de Serviço
// ================================================================
import { useState, useMemo } from 'react';
import styles from './ModalFvs.module.css';
import { hoje } from '../../data/datas';

// Checklists por código de pacote
const CHECKLISTS = {
  EST: [
    { id:1, item:'Estrutura sem bicheiras ou falhas de concretagem', resp:'Engenheiro' },
    { id:2, item:'Limpeza da laje concluída (sem entulho)', resp:'Encarregado' },
    { id:3, item:'Cimbramento retirado ou autorizado', resp:'Engenheiro' },
    { id:4, item:'Escoramento removido conforme projeto', resp:'Mestre' },
    { id:5, item:'Geometria das peças dentro dos limites toleráveis', resp:'Engenheiro' },
  ],
  GRA: [
    { id:1, item:'Peitoris assentados com nível e prumo', resp:'Mestre' },
    { id:2, item:'Proteção com papel contact aplicada', resp:'Encarregado' },
    { id:3, item:'Junta de PU aplicada nas bordas', resp:'Encarregado' },
    { id:4, item:'Soleiras da varanda alinhadas', resp:'Mestre' },
  ],
  ESQ: [
    { id:1, item:'Janelas assentadas com nível e prumo', resp:'Encarregado' },
    { id:2, item:'PU aplicado em todo o perímetro', resp:'Encarregado' },
    { id:3, item:'Folgas dentro do tolerável', resp:'Mestre' },
    { id:4, item:'Guarda-corpo fixado corretamente', resp:'Engenheiro' },
    { id:5, item:'Vidros sem trincas ou risco', resp:'Encarregado' },
  ],
  INST: [
    { id:1, item:'Prumada de esgoto instalada e fixada', resp:'Encarregado' },
    { id:2, item:'Prumada de água instalada e fixada', resp:'Encarregado' },
    { id:3, item:'Passantes chumbados', resp:'Mestre' },
    { id:4, item:'Teste de vedação realizado', resp:'Engenheiro' },
    { id:5, item:'Cabos de prumada passados', resp:'Encarregado' },
  ],
  HSD: [
    { id:1, item:'Ramal aéreo de esgoto fixado', resp:'Encarregado' },
    { id:2, item:'Ramal aéreo de água fixado', resp:'Encarregado' },
    { id:3, item:'Teste de estanqueidade aprovado', resp:'Engenheiro' },
    { id:4, item:'Caimento correto nas peças de esgoto', resp:'Mestre' },
  ],
  ELE: [
    { id:1, item:'Eletrocalha instalada e fixada', resp:'Encarregado' },
    { id:2, item:'Cabos cortados no comprimento correto', resp:'Encarregado' },
    { id:3, item:'Passagem dos cabos concluída', resp:'Mestre' },
    { id:4, item:'Identificação dos cabos realizada', resp:'Encarregado' },
  ],
  DRY: [
    { id:1, item:'Estrutura metálica do drywall nivelada', resp:'Mestre' },
    { id:2, item:'Placas parafusadas corretamente', resp:'Encarregado' },
    { id:3, item:'Fita telada aplicada em todas as juntas', resp:'Encarregado' },
    { id:4, item:'Massa corrida aplicada nas juntas', resp:'Encarregado' },
  ],
  IMP: [
    { id:1, item:'Superfície limpa e seca antes da aplicação', resp:'Encarregado' },
    { id:2, item:'PU aplicado nas juntas', resp:'Encarregado' },
    { id:3, item:'1ª demão aplicada uniformemente', resp:'Mestre' },
    { id:4, item:'Tela asfáltica fixada (2ª demão)', resp:'Encarregado' },
    { id:5, item:'Teste de estanqueidade aprovado (48h)', resp:'Engenheiro' },
  ],
  CER: [
    { id:1, item:'Assentamento nivelado e alinhado', resp:'Mestre' },
    { id:2, item:'Juntas uniformes', resp:'Encarregado' },
    { id:3, item:'Argamassa sem vazios sob as peças', resp:'Mestre' },
    { id:4, item:'Rejunte aplicado e curado', resp:'Encarregado' },
    { id:5, item:'Peças sem trincas ou lascas', resp:'Encarregado' },
  ],
  FOR: [
    { id:1, item:'Forro instalado no nível correto', resp:'Mestre' },
    { id:2, item:'Sanca executada conforme projeto', resp:'Encarregado' },
    { id:3, item:'Fixações adequadas', resp:'Encarregado' },
    { id:4, item:'Emendas acabadas e sem frestas', resp:'Encarregado' },
  ],
  PIN: [
    { id:1, item:'Superfície lixada e limpa', resp:'Encarregado' },
    { id:2, item:'Selador aplicado uniformemente', resp:'Encarregado' },
    { id:3, item:'Massa corrida sem irregularidades', resp:'Mestre' },
    { id:4, item:'1ª demão sem falhas', resp:'Encarregado' },
    { id:5, item:'2ª demão com acabamento uniforme', resp:'Mestre' },
    { id:6, item:'Textura de varandas aplicada', resp:'Encarregado' },
  ],
  LOU: [
    { id:1, item:'Louças fixadas sem folga', resp:'Encarregado' },
    { id:2, item:'Registros e válvulas funcionando', resp:'Mestre' },
    { id:3, item:'Teste de estanqueidade aprovado', resp:'Engenheiro' },
    { id:4, item:'Pia e Cuba niveladas', resp:'Encarregado' },
  ],
  LAM: [
    { id:1, item:'Manta instalada sem sobreposição', resp:'Encarregado' },
    { id:2, item:'Piso laminado assentado sem folgas', resp:'Mestre' },
    { id:3, item:'Perfis de transição instalados', resp:'Encarregado' },
    { id:4, item:'Rodapé fixado e acabado', resp:'Encarregado' },
  ],
  LIM: [
    { id:1, item:'Resíduos removidos do apartamento', resp:'Encarregado' },
    { id:2, item:'Pisos e paredes limpos', resp:'Encarregado' },
    { id:3, item:'Janelas e vidros limpos', resp:'Encarregado' },
    { id:4, item:'Banheiros higienizados', resp:'Encarregado' },
  ],
};

const STATUS_ITEM = {
  'pendente':  { label:'Pendente',  cor:'#dc2626', bg:'#fee2e2' },
  'ok':        { label:'Conforme',  cor:'#16a34a', bg:'#dcfce7' },
  'parcial':   { label:'Parcial',   cor:'#d97706', bg:'#fef3c7' },
  'na':        { label:'N/A',       cor:'#64748b', bg:'#f1f5f9' },
};

const LS_FVS = 'quadroMetas_fvs';

function carregarFvs() {
  try { return JSON.parse(localStorage.getItem(LS_FVS) || '{}'); }
  catch { return {}; }
}
function salvarFvs(data) {
  localStorage.setItem(LS_FVS, JSON.stringify(data));
}

export default function ModalFvs({ pacote, unidade, obraId, onClose, onLiberar, user }) {
  const cod = pacote.codigo;
  const checklist = CHECKLISTS[cod] || [];
  const fvsKey = `${obraId}__${pacote.id}__${unidade.cod}`;

  const [fvsData, setFvsData] = useState(() => {
    const all = carregarFvs();
    return all[fvsKey] || { itens: {}, obs: '', liberadoPor: null, liberadoEm: null };
  });

  function setItem(id, status) {
    setFvsData(prev => ({
      ...prev,
      itens: { ...prev.itens, [id]: { status, atualizadoPor: user?.label, em: hoje() } }
    }));
  }

  function setObs(v) { setFvsData(prev => ({ ...prev, obs: v })); }

  const tudo = checklist.every(item => {
    const st = fvsData.itens[item.id]?.status;
    return st === 'ok' || st === 'na';
  });

  function liberar() {
    const novo = {
      ...fvsData,
      liberadoPor: user?.label || 'Sistema',
      liberadoEm: hoje(),
    };
    setFvsData(novo);
    const all = carregarFvs();
    all[fvsKey] = novo;
    salvarFvs(all);
    onLiberar?.(pacote.id, unidade.cod);
    onClose();
  }

  function salvar() {
    const all = carregarFvs();
    all[fvsKey] = fvsData;
    salvarFvs(all);
    onClose();
  }

  const total = checklist.length;
  const concluidos = checklist.filter(i => {
    const st = fvsData.itens[i.id]?.status;
    return st === 'ok' || st === 'na';
  }).length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.headerCod}>{cod}</span>
            <div>
              <div className={styles.headerTitulo}>FVs — {pacote.pacote}</div>
              <div className={styles.headerSub}>Unidade {unidade.cod} · Pav. {unidade.pav === 'T' ? 'Térreo' : `${unidade.pav}°`}</div>
            </div>
          </div>
          <button className={styles.btnFechar} onClick={onClose}>✕</button>
        </div>

        {/* Barra de progresso */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: pct + '%', background: pct === 100 ? '#16a34a' : '#1a56db' }} />
          <span className={styles.progressLabel}>{concluidos}/{total} itens ({pct}%)</span>
        </div>

        {/* Tabela de checklist */}
        <div className={styles.tabelaWrap}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>#</th>
                <th>Item de Verificação</th>
                <th>Responsável</th>
                <th>Status</th>
                <th>Por</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map(item => {
                const reg = fvsData.itens[item.id];
                const st = reg?.status || 'pendente';
                const si = STATUS_ITEM[st];
                return (
                  <tr key={item.id} className={styles.tr}>
                    <td className={styles.tdNum}>{item.id}</td>
                    <td className={styles.tdItem}>{item.item}</td>
                    <td className={styles.tdResp}>{item.resp}</td>
                    <td className={styles.tdStatus}>
                      <div className={styles.statusGroup}>
                        {Object.entries(STATUS_ITEM).map(([key, si]) => (
                          <button
                            key={key}
                            className={styles.statusBtn}
                            style={{
                              background: st === key ? si.bg : '#f4f7fb',
                              color: st === key ? si.cor : '#94a3b8',
                              borderColor: st === key ? si.cor : '#dde4ec',
                              fontWeight: st === key ? 800 : 500,
                            }}
                            onClick={() => setItem(item.id, key)}
                          >
                            {si.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className={styles.tdPor}>{reg?.atualizadoPor || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {checklist.length === 0 && (
            <div className={styles.semChecklist}>
              Checklist não configurado para este pacote ({cod}).
            </div>
          )}
        </div>

        {/* Observações */}
        <div className={styles.obsArea}>
          <label className={styles.obsLabel}>Observações gerais</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={fvsData.obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Registre pendências, não conformidades, etc."
          />
        </div>

        {/* Liberação anterior */}
        {fvsData.liberadoPor && (
          <div className={styles.liberado}>
            ✅ Liberado por <strong>{fvsData.liberadoPor}</strong> em {fvsData.liberadoEm}
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnCancelar} onClick={onClose}>Fechar</button>
          <button className={styles.btnSalvar} onClick={salvar}>💾 Salvar Rascunho</button>
          <button
            className={styles.btnLiberar}
            onClick={liberar}
            disabled={!tudo}
            title={!tudo ? 'Conclua todos os itens antes de liberar' : 'Liberar serviço'}
          >
            🔓 Liberar Serviço
          </button>
        </div>

      </div>
    </div>
  );
}
