import { useEffect, useRef, useState } from 'react';
import {
  readCaseCatalog, readPlayerCases, readCaseEvents, openManualCase, updateManualCase,
  type ManualCase, type ManualCaseEvent, type ManualCaseProduct, type ManualCaseState,
} from '../../player-api/manualPremiumCasesClient';

const STATE:Record<ManualCaseState,string>={
  OPEN:'ABERTO',IN_PROGRESS:'EM ATENDIMENTO',CLOSED:'ENCERRADO PELO ADM',CANCELLED:'CANCELADO',
};
export function AdminPremiumCasesPanel({playerId}:{playerId:string|null}) {
  const [catalog,setCatalog]=useState<ManualCaseProduct[]>([]);
  const [cases,setCases]=useState<ManualCase[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [timeline,setTimeline]=useState<ManualCaseEvent[]>([]);
  const [sku,setSku]=useState('');
  const [quantity,setQuantity]=useState(1);
  const [note,setNote]=useState('');
  const [comment,setComment]=useState('');
  const [next,setNext]=useState<'IN_PROGRESS'|'CLOSED'|'CANCELLED'|'OPEN'>('IN_PROGRESS');
  const [attested,setAttested]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const openIntent=useRef<{caseId:string;eventId:string}|null>(null);
  const transitionId=useRef<string|null>(null);
  const selected=cases.find(c=>c.id===selectedId);
  const product=catalog.find(c=>c.sku===sku);

  useEffect(()=>{
    let active=true;
    void readCaseCatalog().then(rows=>{
      if(active){setCatalog(rows);setSku(rows[0]?.sku??'');}
    }).catch(()=>{if(active)setNotice('Catálogo de atendimento indisponível no staging.');});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true;
    if(!playerId)return;
    void readPlayerCases(playerId).then(rows=>{
      if(active){setCases(rows);setSelectedId(rows[0]?.id??'');}
    }).catch(()=>{if(active)setNotice('Não foi possível consultar os casos deste jogador.');});
    return()=>{active=false;};
  },[playerId]);
  useEffect(()=>{
    let active=true;
    setTimeline([]);
    if(selectedId)void readCaseEvents(selectedId).then(rows=>{
      if(active)setTimeline(rows);
    }).catch(()=>{if(active)setNotice('Histórico deste caso indisponível.');});
    return()=>{active=false;};
  },[selectedId]);

  const resetOpen=()=>{openIntent.current=null;setNotice('');};
  const resetTransition=()=>{transitionId.current=null;setAttested(false);setNotice('');};
  const create=async()=>{
    if(!playerId||!product||busy||!note.trim()||quantity<1||quantity>product.maxQuantity)return;
    setBusy(true);setNotice('');
    try{
      openIntent.current??={caseId:crypto.randomUUID(),eventId:crypto.randomUUID()};
      const created=await openManualCase({
        ...openIntent.current,playerId,sku:product.sku,quantity,note:note.trim(),
      });
      const updated=await readPlayerCases(playerId);
      setCases(updated);setSelectedId(created.case.id);
      setNotice(created.replayed?'Este caso já estava registrado.':'Caso aberto. Nenhum benefício foi concedido automaticamente.');
      setNote('');
      openIntent.current=null;
    }catch{setNotice('Abertura não confirmada. Confira a lista; tente novamente sem alterar os dados para preservar a chave.');}
    finally{setBusy(false);}
  };
  const advance=async()=>{
    if(!selected||busy||comment.trim().length<8)return;
    setBusy(true);setNotice('');
    try{
      transitionId.current??=crypto.randomUUID();
      const result=await updateManualCase({
        caseId:selected.id,eventId:transitionId.current,expectedRevision:selected.revision,
        nextState:next,note:comment.trim(),attested:next==='CLOSED'?attested:false,
      });
      setCases(rows=>rows.map(c=>c.id===result.case.id?result.case:c));
      setTimeline(await readCaseEvents(selected.id));
      setNotice(result.replayed?'Atualização já registrada.':'Etapa registrada no histórico do caso.');
      setComment('');setAttested(false);transitionId.current=null;
    }catch{setNotice('Atualização não confirmada. Confira o histórico; não gere um novo evento sem verificação.');}
    finally{setBusy(false);}
  };

  return (
    <section className="premium-delivery-console" aria-label="Acompanhamento manual de gamepasses">
      <header><div><small>GAMEPASSES · ENTREGA ASSISTIDA</small><h3>Casos de atendimento</h3></div><span>OWNER</span></header>
      <p>Abra um caso para Pokémon Gênesis, ovos, saves, packs e benefícios que exigem etapas humanas.
        Um caso <strong>não confirma compra</strong>, não entrega automaticamente recompensas e não altera pagamentos.
        Encerrar significa apenas que o ADM declarou ter concluído o acompanhamento.</p>
      {!playerId?<p className="premium-delivery-notice">Selecione primeiro um treinador.</p>:(
        <>
          <form className="premium-delivery-form" onSubmit={e=>{e.preventDefault();void create();}}>
            <label>Gamepass / variante
              <select value={sku} disabled={busy} onChange={e=>{resetOpen();setSku(e.target.value);setQuantity(1);}}>
                {catalog.map(c=><option key={c.sku} value={c.sku}>{c.title} · {c.sku}</option>)}
              </select>
            </label>
            <label>Quantidade
              <input type="number" min={1} max={product?.maxQuantity??1} step={1} value={quantity}
                disabled={busy} onChange={e=>{resetOpen();setQuantity(Number(e.target.value));}} />
            </label>
            <label className="premium-delivery-reason">O que precisa ser entregue / próximo passo
              <textarea rows={3} minLength={8} maxLength={1400} value={note} disabled={busy}
                placeholder="Ex.: Gênesis — receber conceito, validar espécie e publicar após revisão"
                onChange={e=>{resetOpen();setNote(e.target.value);}} />
            </label>
            <button type="submit" disabled={busy||!product||quantity<1||quantity>product.maxQuantity||
              note.trim().length<8||note.trim().length>1400}>
              {busy?'ABRINDO…':'ABRIR CASO DE ENTREGA'}
            </button>
          </form>
          <div className="premium-delivery-history">
            <h4>Casos deste treinador</h4>
            {cases.length===0?<p>Nenhum caso registrado.</p>:
              <div className="premium-case-selector">
                {cases.map(c=><button type="button" key={c.id} aria-pressed={selectedId===c.id}
                  onClick={()=>{setSelectedId(c.id);resetTransition();}}>
                  <strong>{c.quantity}× {c.title}</strong>
                  <small>{STATE[c.state]} · revisão {c.revision}</small>
                </button>)}
              </div>}
          </div>
          {selected?<div className="premium-delivery-form">
            <p className="premium-delivery-preview"><strong>{selected.title}</strong>
              <small>Estado: {STATE[selected.state]} · Caso: {selected.id}</small>
            </p>
            <div className="premium-delivery-history premium-case-timeline">
              <h4>Registro auditável</h4>
              {timeline.map(e=><p key={e.id}><strong>{STATE[e.nextState as ManualCaseState]}</strong>
                {' — '}{e.note} <small>ADM {e.actorPrincipalId} · {new Date(e.createdAt).toLocaleString('pt-BR')}</small>
              </p>)}
            </div>
            {selected.state==='OPEN'||selected.state==='IN_PROGRESS'?<>
              <label>Próximo estado
                <select value={next} disabled={busy} onChange={e=>{resetTransition();setNext(e.target.value as typeof next);}}>
                  <option value="IN_PROGRESS">Em atendimento</option>
                  <option value="OPEN">Voltar para aberto</option>
                  <option value="CLOSED">Encerrar acompanhamento</option>
                  <option value="CANCELLED">Cancelar caso</option>
                </select>
              </label>
              <label className="premium-delivery-reason">Relato da etapa / evidência da conclusão
                <textarea rows={3} value={comment} minLength={8} maxLength={1400}
                  disabled={busy} onChange={e=>{resetTransition();setComment(e.target.value);}} />
              </label>
              {next==='CLOSED'?<label className="premium-delivery-confirm">
                <input type="checkbox" checked={attested} disabled={busy}
                  onChange={e=>setAttested(e.target.checked)}/>
                <span>Atesto pessoalmente que conferi a conclusão. Isso não executa nem prova uma concessão automática.</span>
              </label>:null}
              <button type="button" onClick={()=>void advance()}
                disabled={busy||next===selected.state||comment.trim().length<(next==='CLOSED'?20:8)||
                  comment.trim().length>1400||(next==='CLOSED'&&!attested)}>
                {busy?'SALVANDO…':'REGISTRAR ETAPA'}
              </button>
            </>:null}
          </div>:null}
        </>
      )}
      {notice?<p className="premium-delivery-notice" role="status">{notice}</p>:null}
    </section>
  );
}
