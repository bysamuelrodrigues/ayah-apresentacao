import {validateWorkspace,WORKSPACE_LIMITS} from './workspace.schema.mjs';
import {emptyReview} from './journey.config.mjs';

export const PERSONAL_STORAGE_KEY='ayah-personal-preview';
export function parseWorkspaceBackup(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>WORKSPACE_LIMITS.bytes)throw Error('O arquivo ultrapassa o limite de 400 KB.');
 let state;try{state=JSON.parse(raw);}catch{throw Error('Escolha um arquivo JSON exportado pela AYAH.');}
 return validateWorkspace(state);
}
export function validateReview(value){
 if(!value||value.version!==1||!Array.isArray(value.people)||value.people.length>30||!Array.isArray(value.checklist)||value.checklist.length>100||!value.roleProfiles||typeof value.roleProfiles!=='object')throw Error('Não foi possível recuperar a apresentação.');
 const result={...emptyReview(),organization:String(value.organization||'AYAH').slice(0,80),people:[],checklist:value.checklist.filter(v=>typeof v==='string'&&/^(ceo|agent|influencer)-[0-9]{1,2}$/.test(v))};
 for(const role of ['ceo','agent','influencer']){const p=value.roleProfiles[role];if(!p)continue;if(typeof p.name!=='string'||typeof p.organization!=='string'||typeof p.goal!=='string')throw Error('Perfil de apresentação inválido.');result.roleProfiles[role]={name:p.name.slice(0,60),organization:p.organization.slice(0,80),goal:p.goal.slice(0,100)};}
 for(const p of value.people){if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!/^@[a-zA-Z0-9._]{1,30}$/.test(p.channel||'')||!['draft','ready'].includes(p.status))throw Error('Perfil de apresentação inválido.');result.people.push({id:p.id,name:p.name,channel:p.channel,status:p.status,agentId:'presentation-agent',createdAt:typeof p.createdAt==='string'?p.createdAt:''});}
 return result;
}

// Writes are checked against the last read. Another tab cannot be silently overwritten.
export function createLocalRepository(storage){
 const observed=new Map();
 return {
  read(key,validate,fallback){
   let raw=null;
   try{raw=storage.getItem(key);observed.set(key,raw);return {value:raw?validate(JSON.parse(raw)):fallback(),error:null};}
   catch(error){observed.set(key,raw);return {value:fallback(),error:raw?'Os registros anteriores foram preservados. Importe uma cópia válida para recuperá-los.':'O navegador não disponibilizou o armazenamento. Exporte seus dados antes de sair.'};}
  },
  write(key,value,validate){
   validate(value);const raw=JSON.stringify(value);
   if(new TextEncoder().encode(raw).length>WORKSPACE_LIMITS.bytes)throw Error('Seu espaço atingiu 400 KB. Exporte os registros antes de continuar.');
   const current=storage.getItem(key);
   if(observed.has(key)&&current!==observed.get(key))throw Error('Seus registros mudaram em outra aba. Reabra o espaço para carregar a versão mais recente.');
   try{if(current)storage.setItem(key+'.backup',current);storage.setItem(key,raw);}catch{throw Error('O navegador não conseguiu salvar. Exporte seus dados para continuar com segurança.');}
   observed.set(key,raw);return true;
  }
 };
}
