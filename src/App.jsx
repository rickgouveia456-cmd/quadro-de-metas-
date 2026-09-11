import { useState, useEffect } from 'react';
import Header       from './components/Header/Header';
import Quadro       from './components/Quadro/Quadro';
import Torre3D      from './components/Torre3D/Torre3D';
import ControleDiario from './components/ControleDiario/ControleDiario';
import Login        from './components/Login/Login';
import { useObra }  from './hooks/useObra';
import { useAuth }  from './hooks/useAuth';
import { getDiasUteisEntre, hoje, formatDate } from './data/datas';
import './styles/global.css';

export default function App() {
  const [tela, setTela] = useState('quadro');

  // Auth
  const { user, login, logout } = useAuth();

  // Obra
  const {
    obraAtual, setObraAtual,
    obras, tipologias,
    getEstado, setEstadoMeta,
    atualizarDatas, atualizarTipologia,
    adicionarTipologia, removerTipologia,
    inicializarDatas,
  } = useObra();

  useEffect(() => { inicializarDatas(); }, []);

  // Alerta 80 dias
  const [alerta, setAlerta] = useState(null);

  function abrirAlerta() {
    const obra = obras[obraAtual];
    if (!obra?.dataInicio) { setAlerta({ tipo: 'sem-data' }); return; }
    const hj   = hoje();
    const dec  = getDiasUteisEntre(obra.dataInicio, hj);
    const rest = Math.max(0, 177 - dec);
    const pct  = Math.min(100, Math.round((dec / 177) * 100));
    const proxId = obraAtual === 'TC' ? 'TB' : obraAtual === 'TB' ? 'TA' : null;
    const prox   = proxId ? tipologias.find(t => t.id === proxId) : null;
    setAlerta({ tipo: rest <= 80 ? 'alerta' : 'ok', dec, rest, pct, prox, proxId, dataInicio: obra.dataInicio, dataTermino: obra.dataTermino });
  }

  // — Tela de login —
  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <Header
        obraAtual={obraAtual} obras={obras}
        tela={tela} setTela={setTela}
        setObraAtual={setObraAtual}
        user={user} onLogout={logout}
      />

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {tela === 'quadro' && (
          <Quadro
            obraAtual={obraAtual} obras={obras} tipologias={tipologias}
            getEstado={getEstado} setEstadoMeta={setEstadoMeta}
            atualizarDatas={atualizarDatas} atualizarTipologia={atualizarTipologia}
            adicionarTipologia={adicionarTipologia} removerTipologia={removerTipologia}
            onAlerta={abrirAlerta}
            user={user}
          />
        )}

        {tela === 'torre' && (
          <Torre3D obraAtual={obraAtual} getEstado={getEstado} />
        )}

        {tela === 'diario' && (
          <ControleDiario
            obraAtual={obraAtual} obras={obras} tipologias={tipologias}
            getEstado={getEstado} setEstadoMeta={setEstadoMeta}
            user={user}
          />
        )}

      </div>

      {/* Modal Alerta 80 Dias */}
      {alerta && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)' }}
             onClick={e => e.target === e.currentTarget && setAlerta(null)}>
          <div style={{ background:'#111827',border:'1px solid #2a3a4a',borderTop:'3px solid #f39c12',borderRadius:10,minWidth:420,maxWidth:600,width:'90%' }}>
            <div style={{ background:'#2d1800',color:'#fff',padding:'12px 16px',display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:14,borderBottom:'1px solid #2a3a4a' }}>
              <span>🔔 Verificação de 80 Dias</span>
              <button onClick={() => setAlerta(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.6)',fontSize:16,cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:16,color:'#e2e8f0' }}>
              {alerta.tipo === 'sem-data' ? (
                <div style={{ background:'#1a1200',border:'1px solid #f59e0b',borderRadius:6,padding:12 }}>
                  <div style={{ fontWeight:700,marginBottom:6 }}>⚠️ Data de Início não configurada</div>
                  <div style={{ fontSize:12,color:'#8899aa' }}>Configure a data de início na barra do quadro.</div>
                </div>
              ) : (
                <>
                  <div style={{ background:alerta.tipo==='alerta'?'#1a0000':'#001a0a',border:`1px solid ${alerta.tipo==='alerta'?'#dc2626':'#22c55e'}`,borderRadius:6,padding:12,marginBottom:12 }}>
                    <div style={{ fontWeight:700,fontSize:13,marginBottom:6 }}>{alerta.tipo==='alerta'?'🔴 ATENÇÃO — Menos de 80 dias!':'🟢 Dentro do Prazo'}</div>
                    <div style={{ fontSize:12,lineHeight:1.8,color:'#8899aa' }}>
                      <strong style={{ color:'#e2e8f0' }}>Início:</strong> {formatDate(alerta.dataInicio)}<br/>
                      <strong style={{ color:'#e2e8f0' }}>Término:</strong> {formatDate(alerta.dataTermino)}<br/>
                      <strong style={{ color:'#e2e8f0' }}>Decorridos:</strong> {alerta.dec} de 177 dias úteis ({alerta.pct}%)<br/>
                      <strong style={{ color:'#e2e8f0' }}>Restantes:</strong> <span style={{ fontSize:15,fontWeight:700,color:'#fff' }}>{alerta.rest}</span> dias úteis
                    </div>
                    <div style={{ height:8,background:'rgba(255,255,255,.1)',borderRadius:4,marginTop:8,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${alerta.pct}%`,background:alerta.tipo==='alerta'?'#dc3545':'#28a745',borderRadius:4 }} />
                    </div>
                  </div>
                  {alerta.tipo === 'alerta' && alerta.prox && (
                    <div style={{ background:'#1a1200',border:'1px solid #f59e0b',borderRadius:6,padding:12 }}>
                      <div style={{ fontWeight:700,marginBottom:6 }}>📋 Próxima Obra Sugerida</div>
                      <div style={{ fontSize:12,color:'#8899aa',lineHeight:1.8 }}>
                        <strong style={{ color:'#e2e8f0' }}>Tipologia:</strong> {alerta.prox.nome}<br/>
                        <strong style={{ color:'#e2e8f0' }}>Pavimentos:</strong> {alerta.prox.pavimentos}
                      </div>
                      <button onClick={() => { setObraAtual(alerta.proxId); setAlerta(null); }}
                        style={{ marginTop:10,width:'100%',padding:'8px',background:'#166534',color:'#4ade80',border:'1px solid #22c55e',borderRadius:4,fontSize:12,fontWeight:600,cursor:'pointer' }}>
                        🚀 Iniciar Planejamento da Próxima Obra
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
