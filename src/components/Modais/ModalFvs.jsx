// ================================================================
// ModalFvs — Ficha de Verificação de Serviço
// ================================================================
import { useState, useMemo } from 'react';
import { hoje } from '../../data/datas';
import styles from './ModalFvs.module.css';

// ── Checklists por código de pacote ──────────────────────────
const CHECKLISTS = {
  EST:[
    { id:1, item:'Estrutura sem bicheiras ou falhas de concretagem', resp:'Engenheiro', critico:true,
      dica:'Inspecione toda a face da laje. Som oco ao bater = bicheira. Picote, limpe e aplique graute. Tolerância NBR 14931: desvio máx. L/600.' },
    { id:2, item:'Limpeza da laje concluída (sem entulho)', resp:'Encarregado', critico:false,
      dica:'Verifique toda a laje sem resíduos de concretagem. Entulho causa sobrecarga e dificulta serviços seguintes.' },
    { id:3, item:'Cimbramento retirado ou autorizado pelo Engenheiro', resp:'Engenheiro', critico:true,
      dica:'Só retire após concreto atingir resistência mínima (14 dias para lajes, 28 para peças protendidas). Exige autorização escrita.' },
    { id:4, item:'Escoramento removido conforme cronograma', resp:'Mestre', critico:true,
      dica:'Siga o cronograma de desforma. Em edifícios altos, o escoramento é calculado para distribuir a carga. Retire somente as peças autorizadas.' },
    { id:5, item:'Geometria das peças dentro dos limites toleráveis', resp:'Engenheiro', critico:true,
      dica:'Use nível e prumo. Desvio máx. de prumo: L/600 ou 20mm. Desvio de planicidade: máx. 6mm em 2m.' },
  ],
  GRA:[
    { id:1, item:'Peitoris assentados com nível e prumo', resp:'Mestre', critico:true,
      dica:'Use nível de bolha 60cm. Inclinação mínima 2% para fora (escoamento). Engaste mínimo 2cm na alvenaria em cada lado.' },
    { id:2, item:'Proteção com papel contact aplicada', resp:'Encarregado', critico:false,
      dica:'Deve cobrir 100% da face superior e bordas. Remova só na entrega do apartamento.' },
    { id:3, item:'Junta de PU aplicada em todo o perímetro', resp:'Encarregado', critico:true,
      dica:'Junta mín. 8mm totalmente preenchida. Use fita crepe para acabamento limpo. Evita infiltração.' },
    { id:4, item:'Soleiras da varanda alinhadas e fixas', resp:'Mestre', critico:false,
      dica:'Alinhadas com piso interno, inclinação mín. 0,5% para fora. Toque: não deve soar oco. Rejunte completo.' },
  ],
  ESQ:[
    { id:1, item:'Janelas assentadas com nível e prumo', resp:'Encarregado', critico:true,
      dica:'Use nível alumínio e régua 1,2m. Folga máx. entre batente e vão: 10mm. Janela abre/fecha sem esforço.' },
    { id:2, item:'PU aplicado em todo o perímetro', resp:'Encarregado', critico:true,
      dica:'Preencha por dentro e por fora. Cure mín. 2h antes de cortar. Cubra com argamassa para proteção UV.' },
    { id:3, item:'Folgas dentro do tolerável (máx. 5mm)', resp:'Mestre', critico:false,
      dica:'Verifique folga entre folha e batente em toda a volta. Folga > 5mm indica desalinhamento.' },
    { id:4, item:'Guarda-corpo fixado conforme projeto', resp:'Engenheiro', critico:true,
      dica:'Deve suportar 0,8 kN/m horizontal (NBR 6118). Altura mínima: 1,05m do piso acabado.' },
    { id:5, item:'Vidros sem trincas, riscos ou bolhas', resp:'Encarregado', critico:true,
      dica:'Inspecione com lanterna em ângulo rasante. Trincas nas bordas = tensão → substituir antes de fixar definitivamente.' },
  ],
  INST:[
    { id:1, item:'Prumada de esgoto instalada e fixada', resp:'Encarregado', critico:true,
      dica:'Colares de fixação a cada 1,5m máx. Caimento derivações horizontais: mín. 1% (primário) ou 2% (secundário). NBR 8160.' },
    { id:2, item:'Prumada de água instalada e fixada', resp:'Encarregado', critico:true,
      dica:'Água fria (azul) e quente (vermelho). Pressão de teste: 1,5x a de trabalho por 1h. Fixações a cada 1,2m.' },
    { id:3, item:'Passantes chumbados corretamente', resp:'Mestre', critico:true,
      dica:'Preencha o espaço entre passante e estrutura com argamassa. Não deixe folga: passagem de baratas e umidade.' },
    { id:4, item:'Teste de vedação realizado e aprovado', resp:'Engenheiro', critico:true,
      dica:'Tampe todos os pontos, pressurize 1,5x por mín. 1h. Queda de pressão = vazamento. Localize com água+sabão.' },
    { id:5, item:'Cabos de prumada passados e identificados', resp:'Encarregado', critico:false,
      dica:'Etiqueta com identificação no início e fim. Raio mín. de curvatura = 10x diâmetro externo do cabo.' },
  ],
  HSD:[
    { id:1, item:'Ramal aéreo de esgoto instalado e fixado', resp:'Encarregado', critico:true,
      dica:'Caimento mín. 1 a 3% (10 a 30mm/m). Use nível e mangueira de nível. Fixações com colar a cada 1,5m.' },
    { id:2, item:'Ramal aéreo de água instalado e fixado', resp:'Encarregado', critico:true,
      dica:'Água quente: isolamento térmico em áreas não aquecidas. Fixações a cada 1,2m. Identifique com fita colorida.' },
    { id:3, item:'Teste de estanqueidade aprovado', resp:'Engenheiro', critico:true,
      dica:'Para esgoto: tampe ramais, encha e verifique nível após 24h. Para água: pressão 1,5x por 1h. Registre no diário.' },
    { id:4, item:'Caimento correto em todas as peças de esgoto', resp:'Mestre', critico:true,
      dica:'Use régua de nível em mm/m. Caimento insuficiente causa entupimento. Excesso (>3%) esgota a fase líquida.' },
  ],
  ELE:[
    { id:1, item:'Eletrocalha instalada e fixada corretamente', resp:'Encarregado', critico:false,
      dica:'Taxa de ocupação máx.: 40% da seção. Fixações a cada 1,2m. Tampas fechando sem forçar.' },
    { id:2, item:'Cabos cortados no comprimento especificado', resp:'Encarregado', critico:false,
      dica:'Folga mín. 50cm nos QDs. Sem emendas no percurso. Após corte, sele as extremidades.' },
    { id:3, item:'Passagem dos cabos de prumada concluída', resp:'Mestre', critico:true,
      dica:'Raio mín. de curvatura = 10x diâmetro externo. Verifique todos os pavimentos previstos.' },
    { id:4, item:'Identificação dos cabos realizada', resp:'Encarregado', critico:false,
      dica:'Etiquetas alfanuméricas no início E fim. Corresponde ao diagrama unifilar. Fotografe para registro.' },
  ],
  DRY:[
    { id:1, item:'Estrutura metálica do drywall nivelada', resp:'Mestre', critico:true,
      dica:'Prumo e nível de bolha. Montantes verticais: tolerância máx. 2mm/m. Guia inferior: fixações a cada 60cm.' },
    { id:2, item:'Placas parafusadas corretamente (sem falhas)', resp:'Encarregado', critico:true,
      dica:'Parafusos afundados 1mm (não atravessar). Espaçamento: 20cm nas bordas, 30cm no campo. Placa RU em áreas úmidas.' },
    { id:3, item:'Fita telada aplicada em todas as juntas', resp:'Encarregado', critico:true,
      dica:'Aplique massa antes da fita, depois passe a fita e nova camada. Sem fita = rachado garantido.' },
    { id:4, item:'Massa corrida aplicada nas juntas e acabada', resp:'Encarregado', critico:false,
      dica:'Mínimo 2 camadas, lixando entre elas. Use cantoneira metálica nos cantos. Superfície lisa ao toque.' },
  ],
  IMP:[
    { id:1, item:'Superfície limpa e completamente seca', resp:'Encarregado', critico:true,
      dica:'Plástico colado por 24h: condensação por baixo = substrato úmido. Use soprador térmico se necessário.' },
    { id:2, item:'PU aplicado em juntas e arremates', resp:'Encarregado', critico:true,
      dica:'Ralos, cantos, tubulações passantes e juntas de dilatação são os pontos críticos. Manta sobe 15cm nas paredes.' },
    { id:3, item:'1ª demão aplicada uniformemente (sem falhas)', resp:'Mestre', critico:true,
      dica:'Consumo médio: 1,5 a 2 kg/m². Rolo de lã de carneiro. Aguarde secagem mín. 4h antes da 2ª demão.' },
    { id:4, item:'Tela asfáltica fixada corretamente (2ª demão)', resp:'Encarregado', critico:true,
      dica:'Embutir entre demãos enquanto a 1ª está fresca. Sobreposição mín. 10cm. Estique sem dobrar.' },
    { id:5, item:'Teste de estanqueidade aprovado (mín. 48h)', resp:'Engenheiro', critico:true,
      dica:'Tampe os ralos, encha com água 5cm por 72h. Verifique mancha de umidade no pavimento abaixo.' },
  ],
  CER:[
    { id:1, item:'Assentamento nivelado e alinhado', resp:'Mestre', critico:true,
      dica:'Régua alumínio 2m. Desníveis > 3mm em 2m inaceitáveis (NBR 13753). Paginamento: peças cortadas nas bordas.' },
    { id:2, item:'Juntas uniformes conforme especificado', resp:'Encarregado', critico:false,
      dica:'Use espaçadores plásticos. Junta uniforme absorve dilatação térmica.' },
    { id:3, item:'Argamassa sem vazios sob as peças', resp:'Mestre', critico:true,
      dica:'Som oco ao bater = vazio. Cobertura mín. 80% em área seca, 95% em área molhada (NBR 14081).' },
    { id:4, item:'Rejunte aplicado, curado e limpo', resp:'Encarregado', critico:false,
      dica:'Aguarde mín. 24h após assentamento. Remova excesso antes de secar. Cure com água por 24h.' },
    { id:5, item:'Peças sem trincas, lascas ou manchas', resp:'Encarregado', critico:true,
      dica:'Boa iluminação + som oco = descolamento. Manchas de argamassa: ácido muriático (1:10) após 7 dias do rejunte.' },
  ],
  FOR:[
    { id:1, item:'Forro instalado no nível correto (a prumo)', resp:'Mestre', critico:true,
      dica:'Use fio de nível ou mangueira de nível. Tolerância ±2mm. Pé-direito final conforme projeto arquitetônico.' },
    { id:2, item:'Sanca executada conforme projeto', resp:'Encarregado', critico:false,
      dica:'Confira medidas no projeto. Reforço interno com aramado se vão > 1,5m. Deixe abertura para manutenção elétrica.' },
    { id:3, item:'Fixações adequadas (espaçamento e ancoragem)', resp:'Encarregado', critico:true,
      dica:'Pendurais a cada 1,2m máx. e a 15cm das bordas. Bucha de nylon na laje, nunca só cola.' },
    { id:4, item:'Emendas acabadas, sem frestas visíveis', resp:'Encarregado', critico:false,
      dica:'Juntas tratadas com fita telada e massa. Passe a mão: sem degrau. Frestas = movimentação estrutural.' },
  ],
  PIN:[
    { id:1, item:'Superfície lixada e limpa antes da pintura', resp:'Encarregado', critico:true,
      dica:'Lixa 80 para imperfeições, depois 120. Remova todo o pó com pano úmido. Use detergente neutro se houver gordura.' },
    { id:2, item:'Selador aplicado uniformemente', resp:'Encarregado', critico:false,
      dica:'Dilua conforme bula (geralmente 20%). Aguarde secagem total (2-4h). Selador mal seco cria bolhas na massa.' },
    { id:3, item:'Massa corrida sem irregularidades visíveis', resp:'Mestre', critico:true,
      dica:'2 demãos, lixando (lixa 120) entre elas. Verifique com luz rasante. Ondulações ficam evidentes com luz solar.' },
    { id:4, item:'1ª demão sem falhas, bolhas ou escorridos', resp:'Encarregado', critico:false,
      dica:'Temperatura entre 10°C e 35°C. Dilua máx. 10%. Bolhas = superfície úmida ou contaminada.' },
    { id:5, item:'2ª demão com acabamento uniforme e cobertura', resp:'Mestre', critico:true,
      dica:'Aguarde mín. 2h entre demãos. Aplique perpendicularmente à 1ª (rolo horizontal/vertical) para uniformidade.' },
    { id:6, item:'Textura de varandas aplicada e uniforme', resp:'Encarregado', critico:false,
      dica:'Rolo específico de textura. Produto com proteção UV e anti-fungos. Aguarde 24h entre demãos.' },
  ],
  EMA:[
    { id:1, item:'Selador aplicado antes da massa', resp:'Encarregado', critico:true,
      dica:'Sem selador = massa absorve água irregular → pintas, enrugamento, descolamento. Dilua 1:1 e aguarde secar.' },
    { id:2, item:'1ª demão nivelada, sem bolhas', resp:'Mestre', critico:false,
      dica:'Espessura máx. por demão: 1mm. Bolhas indicam selador mal seco ou superfície úmida.' },
    { id:3, item:'2ª demão com acabamento liso e uniforme', resp:'Encarregado', critico:true,
      dica:'Lixe a 1ª (lixa 120) antes de aplicar a 2ª. Espessura total máx. 2mm — mais grossa racha.' },
    { id:4, item:'Lixamento final aprovado pelo Mestre', resp:'Mestre', critico:false,
      dica:'Use lixa 180 ou 220. Passe a mão: sem asperezas. Pronto para receber tinta sem nova massa.' },
  ],
  LOU:[
    { id:1, item:'Louças fixadas sem folga ou desnivelamento', resp:'Encarregado', critico:true,
      dica:'Vaso: 4 parafusos, nenhum solto. Pia: suporte adequado + silicone no perímetro. Desnível máx.: 2mm.' },
    { id:2, item:'Registros e válvulas funcionando corretamente', resp:'Mestre', critico:true,
      dica:'Abra/feche cada registro 10 vezes. Descarga: enche em ≤ 3 minutos. Teste válvula de pressão do chuveiro.' },
    { id:3, item:'Teste de estanqueidade aprovado (sem vazamento)', resp:'Engenheiro', critico:true,
      dica:'Abra o registro geral e inspecione CADA conexão. Use papel toalha para micro-vazamentos. Aguarde 30min.' },
    { id:4, item:'Pia e cuba niveladas e siliconeadas', resp:'Encarregado', critico:false,
      dica:'Silicone neutro (não ácido) em toda a junta. Use fita crepe para linha reta. Cure 24h antes de usar.' },
  ],
  GAS:[
    { id:1, item:'Ramais internos instalados conforme projeto', resp:'Encarregado', critico:true,
      dica:'Tubulações de cobre com suportes a cada 1,5m. Sem emendas em pontos ocultos. Identifique todos os pontos.' },
    { id:2, item:'Teste de estanqueidade aprovado', resp:'Engenheiro', critico:true,
      dica:'Pressurize com nitrogênio a 1,5x por 30min. Aplique água+sabão em TODAS as conexões. NUNCA teste com GLP.' },
    { id:3, item:'Pontos identificados com etiqueta', resp:'Encarregado', critico:false,
      dica:'Cada ponto (fogão, aquecedor) com etiqueta. Registro de corte individual acessível. Exigido pela concessionária.' },
  ],
  LAM:[
    { id:1, item:'Manta instalada sem sobreposição ou emenda', resp:'Encarregado', critico:true,
      dica:'Bordas encostadas, sem sobreposição nem folga. Manta sobe 5cm nas paredes (aparar depois do piso).' },
    { id:2, item:'Piso laminado assentado sem folgas ou ruídos', resp:'Mestre', critico:true,
      dica:'Bata em cada régua após encaixar: sem clique solto. Folga de dilatação nas paredes: 8-10mm (use espaçadores).' },
    { id:3, item:'Perfis de transição instalados', resp:'Encarregado', critico:false,
      dica:'Perfil T nas portas, redutor nas mudanças de nível, acabamento nas paredes sem rodapé.' },
    { id:4, item:'Rodapé fixado, colado e acabado', resp:'Encarregado', critico:false,
      dica:'Cola de madeira ou silicone. Cortes a 45° nos cantos. Preencha furos de grampos com massa da cor do rodapé.' },
  ],
  POR:[
    { id:1, item:'Portas instaladas com nível e prumo', resp:'Mestre', critico:true,
      dica:'Nível 1,2m e prumo de centro. Folga inferior: 5-8mm (circulação de ar). Folga lateral/superior: máx. 3mm.' },
    { id:2, item:'Alisares fixados sem folgas visíveis', resp:'Encarregado', critico:false,
      dica:'Cola PU + pinos de acabamento. Junta com parede: selante acrílico pintável.' },
    { id:3, item:'Fechaduras e dobradiças funcionando', resp:'Encarregado', critico:true,
      dica:'Teste 10 vezes: lingueta entra/sai suavemente. Dobradiça: todos os parafusos apertados.' },
    { id:4, item:'PU aplicado no perímetro da porta', resp:'Encarregado', critico:false,
      dica:'Espuma PU de baixa expansão. Fita crepe nos dois lados. Não exagere: PU expande até 3x.' },
  ],
  LIM:[
    { id:1, item:'Resíduos e entulho removidos do apartamento', resp:'Encarregado', critico:true,
      dica:'Inclui: argamassa, tintas, papel, cimento, rejunte, pedaços de fio. Use sacos resistentes.' },
    { id:2, item:'Pisos e paredes limpos e sem manchas', resp:'Encarregado', critico:false,
      dica:'Tinta: removedor ou álcool isopropílico. Argamassa: ácido muriático (1:10), 5min, esfregue. NUNCA em granito.' },
    { id:3, item:'Janelas, vidros e esquadrias limpos', resp:'Encarregado', critico:false,
      dica:'Remova películas protetoras. Limpador de vidros + microfibra. Limpe os trilhos das janelas.' },
    { id:4, item:'Banheiros higienizados e secos', resp:'Encarregado', critico:false,
      dica:'Desincustante nas louças. Retire a grelha dos ralos e limpe. Verifique pó de gesso ou rejunte nos sifões.' },
  ],
};

const STATUS_DEF = {
  pendente:   { label:'Pendente',    icone:'⏳', cor:'#dc2626', bg:'#fee2e2', brd:'#fca5a5' },
  ok:         { label:'Conforme',    icone:'✅', cor:'#16a34a', bg:'#dcfce7', brd:'#86efac' },
  parcial:    { label:'Parcial',     icone:'⚠️',  cor:'#d97706', bg:'#fef3c7', brd:'#fde68a' },
  inconforme: { label:'Inconforme',  icone:'❌', cor:'#7c3aed', bg:'#f5f3ff', brd:'#c4b5fd' },
};

const LS_FVS = 'quadroMetas_fvs';
function carregarFvs()    { try { return JSON.parse(localStorage.getItem(LS_FVS)||'{}'); } catch { return {}; } }
function salvarFvs(data)  { localStorage.setItem(LS_FVS, JSON.stringify(data)); }

export default function ModalFvs({ pacote, unidade, obraId, onClose, onLiberar, user }) {
  const cod       = pacote.codigo;
  const checklist = CHECKLISTS[cod] || [];
  const fvsKey    = `${obraId}__${pacote.id}__${unidade.cod}`;

  const [itens, setItens] = useState(() => {
    const all = carregarFvs();
    return all[fvsKey]?.itens || {};
  });
  const [obs,         setObs]         = useState(() => carregarFvs()[fvsKey]?.obs || '');
  const [liberadoPor, setLiberadoPor] = useState(() => carregarFvs()[fvsKey]?.liberadoPor || null);
  const [liberadoEm,  setLiberadoEm]  = useState(() => carregarFvs()[fvsKey]?.liberadoEm  || null);
  const [pescaId,     setPescaId]     = useState(null);

  function setItem(id, status) {
    setItens(prev => ({ ...prev, [id]: { status, por: user?.label||'Sistema', em: hoje() } }));
  }

  // Contadores
  const { nOk, nPend, nParcial, nInconf, nCrit, pct, tudo } = useMemo(() => {
    let nOk=0, nPend=0, nParcial=0, nInconf=0, nCrit=0;
    checklist.forEach(item => {
      const st = itens[item.id]?.status || 'pendente';
      if      (st==='ok')         nOk++;
      else if (st==='parcial')    nParcial++;
      else if (st==='inconforme') nInconf++;
      else                        nPend++;
      if (item.critico && st!=='ok') nCrit++;
    });
    const total = checklist.length;
    const pct   = total > 0 ? Math.round((nOk/total)*100) : 0;
    const tudo  = total > 0 && nPend===0 && nParcial===0 && nInconf===0;
    return { nOk, nPend, nParcial, nInconf, nCrit, pct, tudo };
  }, [itens, checklist]);

  const corPct = pct===100 ? '#16a34a' : pct>=60 ? '#d97706' : '#dc2626';

  function salvarRascunho() {
    const all = carregarFvs();
    all[fvsKey] = { itens, obs, liberadoPor, liberadoEm };
    salvarFvs(all);
    onClose();
  }

  function liberar() {
    const lPor = user?.label || 'Sistema';
    const lEm  = hoje();
    const all  = carregarFvs();
    all[fvsKey] = { itens, obs, liberadoPor: lPor, liberadoEm: lEm };
    salvarFvs(all);
    setLiberadoPor(lPor);
    setLiberadoEm(lEm);
    onLiberar?.(pacote.id, unidade.cod);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* ── Header ── */}
        <div className={styles.header} style={{ background: pacote.cor || '#1e3a5f' }}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>{tudo ? '✅' : '📋'}</div>
            <div>
              <div className={styles.titulo}>Ficha de Verificação de Serviço</div>
              <div className={styles.sub}>
                <span className={styles.codBadge}>{cod}</span>
                {pacote.pacote}
                <span style={{ opacity:.7 }}> · Unidade <strong>{unidade.cod}</strong></span>
              </div>
            </div>
          </div>
          <button className={styles.btnFechar} onClick={onClose}>✕</button>
        </div>

        {/* ── Resumo ── */}
        <div className={styles.resumo}>
          <div className={styles.resumoProg}>
            <div className={styles.progWrap}>
              <div className={styles.progBar}>
                <div className={styles.progFill} style={{ width:pct+'%', background:corPct }} />
              </div>
              <span style={{ fontSize:14, fontWeight:800, color:corPct, minWidth:36 }}>{pct}%</span>
            </div>
            <div className={styles.progLabel}>{nOk} de {checklist.length} itens conformes</div>
          </div>
          <div className={styles.cards}>
            {[
              [nPend,    '#dc2626', '#fee2e2', '#fca5a5', 'Pend.'],
              [nParcial, '#d97706', '#fef3c7', '#fde68a', 'Parcial'],
              [nOk,      '#16a34a', '#dcfce7', '#86efac', 'Conf.'],
              [nInconf,  '#7c3aed', '#f5f3ff', '#c4b5fd', 'Inconf.'],
            ].map(([n,cor,bg,brd,lbl],i) => (
              <div key={i} className={styles.card} style={{ borderColor:brd }}>
                <div className={styles.cardNum} style={{ color:cor }}>{n}</div>
                <div className={styles.cardLbl}>{lbl}</div>
              </div>
            ))}
            {nCrit>0 && (
              <div className={styles.card} style={{ borderColor:'#dc2626', background:'#fff5f5' }}>
                <div className={styles.cardNum} style={{ color:'#dc2626' }}>⚑ {nCrit}</div>
                <div className={styles.cardLbl}>Crítico</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Corpo: tabela + pesca ── */}
        <div className={styles.corpo}>

          {/* Tabela */}
          <div className={styles.tabelaWrap}>
            {checklist.length === 0 ? (
              <div className={styles.semChecklist}>
                Checklist não configurado para o pacote <strong>{cod}</strong>.
              </div>
            ) : (
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th style={{ width:36 }}>#</th>
                    <th>Item de Verificação</th>
                    <th style={{ width:110 }}>Responsável</th>
                    <th style={{ width:30 }} title="Crítico">⚑</th>
                    <th style={{ width:315 }}>Status</th>
                    <th style={{ width:40 }}>💡</th>
                    <th style={{ width:110 }}>Por</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.map(item => {
                    const reg = itens[item.id];
                    const st  = reg?.status || 'pendente';
                    const sd  = STATUS_DEF[st] || STATUS_DEF.pendente;
                    const rowBg =
                      st==='ok'         ? '#f0fdf4' :
                      st==='inconforme' ? '#faf5ff' :
                      st==='parcial'    ? '#fffbeb' :
                      item.critico      ? '#fff8f8' : '#fff';
                    return (
                      <tr key={item.id} style={{ background:rowBg, borderBottom:'1px solid #e8eef2' }}>
                        <td className={styles.tdNum}>{item.id}</td>
                        <td className={styles.tdItem}>
                          <span className={styles.itemIcone}>{sd.icone}</span>
                          {item.item}
                        </td>
                        <td className={styles.tdResp}>
                          <span className={styles.respBadge}>{item.resp}</span>
                        </td>
                        <td className={styles.tdCrit}>
                          {item.critico && <span style={{ color:'#dc2626' }} title="Item crítico — obrigatório">⚑</span>}
                        </td>
                        <td className={styles.tdStatus}>
                          <div className={styles.stGrp}>
                            {Object.entries(STATUS_DEF).map(([key,s]) => (
                              <button key={key}
                                className={`${styles.stBtn} ${st===key ? styles.stAtivo : ''}`}
                                style={{
                                  background:  st===key ? s.bg  : '#f4f7fb',
                                  color:       st===key ? s.cor : '#94a3b8',
                                  borderColor: st===key ? s.brd : '#e2e8f0',
                                  fontWeight:  st===key ? 700   : 500,
                                }}
                                onClick={() => setItem(item.id, key)}>
                                {s.icone} {s.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className={styles.tdPesca}>
                          <button
                            className={`${styles.btnPesca} ${pescaId===item.id ? styles.btnPescaAtivo : ''}`}
                            onClick={() => setPescaId(pescaId===item.id ? null : item.id)}
                            title="Ver dica técnica">💡</button>
                        </td>
                        <td className={styles.tdPor}>{reg?.por || <span style={{ color:'#cbd5e1' }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Painel pesca */}
          {pescaId !== null && (() => {
            const item = checklist.find(i => i.id === pescaId);
            if (!item) return null;
            return (
              <div className={styles.pescaPanel}>
                <div className={styles.pescaHeader}>
                  <span className={styles.pescaTitulo}>💡 Dica Técnica</span>
                  <button className={styles.pescaFechar} onClick={() => setPescaId(null)}>✕</button>
                </div>
                <div className={styles.pescaBody}>
                  <div className={styles.pescaItemTitulo} style={{ borderLeft:`4px solid ${pacote.cor||'#1e3a5f'}` }}>
                    <div className={styles.pescaNum} style={{ background:pacote.cor||'#1e3a5f' }}>{item.id}</div>
                    <div>
                      {item.critico && <span className={styles.pescaCriticoBadge}>⚑ Item Crítico</span>}
                      <div className={styles.pescaItemNome}>{item.item}</div>
                      <div className={styles.pescaResp}>👷 <strong>{item.resp}</strong></div>
                    </div>
                  </div>
                  <div className={styles.pescaDica}>
                    <div className={styles.pescaDicaTitulo}>📖 Como verificar</div>
                    <div className={styles.pescaDicaTexto}>{item.dica || 'Sem dica cadastrada.'}</div>
                  </div>
                  <div className={styles.pescaStatusRef}>
                    <div className={styles.pescaDicaTitulo}>🔖 Referência de status</div>
                    {Object.entries(STATUS_DEF).map(([k,s]) => (
                      <div key={k} className={styles.pescaStLinha} style={{ borderLeft:`3px solid ${s.brd}` }}>
                        <span style={{ color:s.cor, fontWeight:700 }}>{s.icone} {s.label}</span>
                        <span className={styles.pescaStDesc}>{
                          k==='pendente'   ? 'Não verificado ou com problema não tratado.' :
                          k==='ok'         ? 'Verificado e aprovado dentro dos padrões.' :
                          k==='parcial'    ? 'Parcialmente correto — requer complemento.' :
                                             'Fora do padrão técnico — requer retrabalho.'
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Observações ── */}
        <div className={styles.obsArea}>
          <label className={styles.obsLabel}>📝 Observações e pendências</label>
          <textarea className={styles.obsTextarea} rows={2}
            value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Registre não conformidades, prazos para resolução, etc." />
        </div>

        {liberadoPor && (
          <div className={styles.liberadoBadge}>
            ✅ Liberado por <strong>{liberadoPor}</strong> em <strong>{liberadoEm}</strong>
          </div>
        )}
        {!liberadoPor && nCrit>0 && (
          <div className={styles.alertaCrit}>
            ⚑ {nCrit} item(s) crítico(s) pendente(s). Resolva antes de liberar.
          </div>
        )}

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button className={styles.btnCancelar} onClick={onClose}>Fechar</button>
          <button className={styles.btnRascunho} onClick={salvarRascunho}>💾 Salvar Rascunho</button>
          <button className={styles.btnLiberar}
            onClick={liberar}
            disabled={!tudo}
            style={{ opacity:tudo?1:0.4, cursor:tudo?'pointer':'not-allowed' }}
            title={tudo?'Liberar serviço':'Conclua todos os itens antes de liberar'}>
            🔓 Liberar Serviço
          </button>
        </div>

      </div>
    </div>
  );
}
