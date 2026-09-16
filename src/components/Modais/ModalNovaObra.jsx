// ModalNovaObra — wizard simples
import { useState } from 'react';
import { addDiasUteis, hoje } from '../../data/datas';

export default function ModalNovaObra({ obras, tipologias, onSalvar, onClose }) {
  const [form, setForm] = useState({ codigo:'', nome:'', tipologiaId: tipologias[0]?.id||'', dataInicio: hoje(), diasUteis:177 });
  const [erro, setErro] = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const dataTermino = form.dataInicio ? addDiasUteis(form.dataInicio, Number(form.diasUteis)||177) : '—';

  function salvar() {
    if (!form.codigo.trim()) { setErro('Informe o código.'); return; }
    if (!form.nome.trim())   { setErro('Informe o nome.'); return; }
    if (obras[form.codigo.toUpperCase()]) { setErro(`Código "${form.codigo.toUpperCase()}" já existe.`); return; }
    onSalvar?.({ ...form, codigo: form.codigo.toUpperCase(), dataTermino });
    onClose();
  }

  const ov = { position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 };
  const box = { background:'#fff',borderRadius:12,border:'1px solid #dde4ec',borderTop:'4px solid #1a56db',width:'100%',maxWidth:480,boxShadow:'0 24px 80px rgba(0,0,0,.22)',overflow:'hidden' };
  const inp = { padding:'9px 12px',border:'1.5px solid #c8d4e0',borderRadius:6,fontSize:13,width:'100%',fontFamily:'inherit' };
  const lbl = { fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5 };

  return (
    <div style={ov} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={box}>
        <div style={{background:'#1e3a5f',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontWeight:800,fontSize:15}}>🏗 Nova Obra</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:18,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={lbl}>Código *</label>
            <input style={inp} placeholder="Ex: TB, TA, BLOCO-A" value={form.codigo} onChange={e=>set('codigo',e.target.value.toUpperCase())} maxLength={12} />
          </div>
          <div>
            <label style={lbl}>Nome *</label>
            <input style={inp} placeholder="Ex: Torre B — Ventura Patamares" value={form.nome} onChange={e=>set('nome',e.target.value)} maxLength={60} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label style={lbl}>Tipologia</label>
              <select style={{...inp}} value={form.tipologiaId} onChange={e=>set('tipologiaId',e.target.value)}>
                {tipologias.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Dias úteis</label>
              <input style={inp} type="number" min={30} max={500} value={form.diasUteis} onChange={e=>set('diasUteis',e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Data de Início *</label>
            <input style={inp} type="date" value={form.dataInicio} onChange={e=>set('dataInicio',e.target.value)} />
          </div>
          <div style={{background:'#f4f7fb',border:'1px solid #dde4ec',borderRadius:8,padding:12,fontSize:12,display:'flex',gap:20}}>
            <div><span style={{color:'#5a6a7e'}}>Início:</span> <strong>{form.dataInicio||'—'}</strong></div>
            <div><span style={{color:'#5a6a7e'}}>Término est.:</span> <strong style={{color:'#dc2626'}}>{dataTermino}</strong></div>
          </div>
          {erro && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'8px 12px',fontSize:12,color:'#b91c1c',fontWeight:600}}>⚠ {erro}</div>}
        </div>
        <div style={{padding:'12px 20px',background:'#f4f7fb',borderTop:'1px solid #dde4ec',display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={onClose} style={{padding:'8px 16px',background:'#fff',border:'1px solid #c8d4e0',borderRadius:6,fontSize:12,cursor:'pointer'}}>Cancelar</button>
          <button onClick={salvar} style={{padding:'8px 20px',background:'#16a34a',border:'none',borderRadius:6,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>🏗 Criar Obra</button>
        </div>
      </div>
    </div>
  );
}
