export interface ManualCaseProduct { sku:string; title:string; maxQuantity:number }
export type ManualCaseState='OPEN'|'IN_PROGRESS'|'CLOSED'|'CANCELLED';
export interface ManualCase {
  id:string; playerId:string; sku:string; title:string; quantity:number;
  state:ManualCaseState; revision:number; openingActorPrincipalId:string;
  createdAt:string;updatedAt:string;
}
export interface ManualCaseEvent {
  id:string;caseId:string;actorPrincipalId:string;
  nextState:ManualCaseState;note:string;createdAt:string;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isObject(v:unknown):v is Record<string,unknown> {
  return typeof v==='object'&&v!==null&&!Array.isArray(v);
}
function checkCase(value:unknown): value is ManualCase {
  return isObject(value)&&UUID.test(String(value.id))&&UUID.test(String(value.playerId))&&
    typeof value.sku==='string'&&typeof value.title==='string'&&
    Number.isSafeInteger(value.quantity)&&Number.isSafeInteger(value.revision)&&
    ['OPEN','IN_PROGRESS','CLOSED','CANCELLED'].includes(String(value.state))&&
    UUID.test(String(value.openingActorPrincipalId))&&
    typeof value.createdAt==='string'&&typeof value.updatedAt==='string';
}
const base='/api/hub/admin/premium/delivery/cases';
async function request(url:string,method:'GET'|'POST',body?:unknown,fetcher:typeof fetch=fetch) {
  const response=await fetcher(url,{
    method,credentials:'include',cache:'no-store',
    headers:{accept:'application/json',...(method==='POST'?{'content-type':'application/json'}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  if(!response.ok)throw new Error(`Operação não confirmada (HTTP ${response.status}). Confira o histórico antes de repetir.`);
  return response.json() as Promise<unknown>;
}
export async function readCaseCatalog(fetcher:typeof fetch=fetch):Promise<ManualCaseProduct[]> {
  const r=await request(base+'/catalog','GET',undefined,fetcher);
  if(!isObject(r)||!Array.isArray(r.products)||
     !r.products.every((x:unknown)=>isObject(x)&&typeof x.sku==='string'&&
       typeof x.title==='string'&&Number.isSafeInteger(x.maxQuantity))) throw new Error('Catálogo de casos inválido.');
  return r.products as ManualCaseProduct[];
}
export async function readPlayerCases(playerId:string,fetcher:typeof fetch=fetch):Promise<ManualCase[]> {
  if(!UUID.test(playerId))throw new Error('Jogador inválido.');
  const r=await request(base+'?playerId='+encodeURIComponent(playerId),'GET',undefined,fetcher);
  if(!isObject(r)||!Array.isArray(r.cases)||!r.cases.every(checkCase))throw new Error('Resposta de casos inválida.');
  return r.cases as ManualCase[];
}
export async function readCaseEvents(caseId:string,fetcher:typeof fetch=fetch):Promise<ManualCaseEvent[]> {
  if(!UUID.test(caseId))throw new Error('Caso inválido.');
  const r=await request(base+'/'+caseId+'/events','GET',undefined,fetcher);
  if(!isObject(r)||!Array.isArray(r.events)||!r.events.every((x:unknown)=>isObject(x)&&
    UUID.test(String(x.id))&&UUID.test(String(x.caseId))&&UUID.test(String(x.actorPrincipalId))&&
    typeof x.note==='string'&&typeof x.createdAt==='string'&&
    ['OPEN','IN_PROGRESS','CLOSED','CANCELLED'].includes(String(x.nextState))))
    throw new Error('Histórico de caso inválido.');
  return r.events as ManualCaseEvent[];
}
export async function openManualCase(
  input:{caseId:string;eventId:string;playerId:string;sku:string;quantity:number;note:string},
  fetcher:typeof fetch=fetch,
):Promise<{replayed:boolean;case:ManualCase}> {
  if(!UUID.test(input.caseId)||!UUID.test(input.eventId)||!UUID.test(input.playerId)||
    input.caseId===input.eventId||!Number.isSafeInteger(input.quantity)||input.quantity<1||
    input.quantity>99||input.note.trim().length<8||input.note.trim().length>1400)
    throw new Error('Confira os dados do caso.');
  const r=await request(base,'POST',input,fetcher);
  if(!isObject(r)||typeof r.replayed!=='boolean'||!checkCase(r.case)||
     r.case.id!==input.caseId||r.case.playerId!==input.playerId)
    throw new Error('Abertura não confirmada. Confira os casos antes de tentar novamente.');
  return {replayed:r.replayed,case:r.case};
}
export async function updateManualCase(
  input:{caseId:string;eventId:string;expectedRevision:number;nextState:ManualCaseState;
    note:string;attested:boolean},
  fetcher:typeof fetch=fetch,
):Promise<{replayed:boolean;case:ManualCase}> {
  if(!UUID.test(input.caseId)||!UUID.test(input.eventId)||!Number.isSafeInteger(input.expectedRevision)||
    input.expectedRevision<0||input.note.trim().length<8||input.note.trim().length>1400||
    (input.nextState==='CLOSED'&&(!input.attested||input.note.trim().length<20))||
    (input.nextState!=='CLOSED'&&input.attested))
    throw new Error('Confira a mudança e a justificativa.');
  const r=await request(base+'/'+input.caseId+'/transition','POST',input,fetcher);
  if(!isObject(r)||typeof r.replayed!=='boolean'||!checkCase(r.case)||r.case.id!==input.caseId)
    throw new Error('Atualização não confirmada. Confira o histórico antes de tentar novamente.');
  return {replayed:r.replayed,case:r.case};
}
