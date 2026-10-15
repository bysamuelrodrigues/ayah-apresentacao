// Shared validation for saved personal records, browser and server.
import {TIMEZONE_CONFIG} from './runtime.config.mjs';
import {CONVERSATION_STYLES} from './conversation.config.mjs';
export const WORKSPACE_LIMITS=Object.freeze({bytes:400000,records:1000,name:60,title:500,memory:1500,source:4000,water:6000,amount:99999999});
const recordFields=['id','title','source','createdAt','kind','status','priority','date','time','due','amount','currency','direction','category','completedAt','notifiedAt','updatedAt','timezone','warnings','reviewRequired'];
const collections=['tasks','memories','expenses','water','closings','activity','routines','routineChecks'];
const currencies=['BRL','EUR','USD'];
const categories=['Mercado','Alimentação','Transporte','Saúde','Casa','Viagem','Outros'];
const timezones=Object.keys(TIMEZONE_CONFIG);
export class WorkspaceError extends Error {
  constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
const invalid=field=>{throw new WorkspaceError(400,'INVALID_WORKSPACE',`Formato inválido em ${field}. Confira os dados antes de salvar.`);};
const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function object(value,allowed,field){
  if(!value||typeof value!=='object'||Array.isArray(value))invalid(field);
  if(Object.keys(value).some(key=>!allowed.includes(key)))invalid(field);
}
function string(value,max,field,{empty=false}={}){
  if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))invalid(field);
}
function number(value,min,max,field,{integer=false,decimals=false}={}){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value))||(decimals&&Math.abs(value*100-Math.round(value*100))>1e-5))invalid(field);
}
function date(value,field,empty=false){
  if(empty&&value==='')return;
  if(typeof value!=='string'||!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value))invalid(field);
  const [year,month,day]=value.split('-').map(Number),parsed=new Date(Date.UTC(year,month-1,day));
  if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()!==month-1||parsed.getUTCDate()!==day)invalid(field);
}
function time(value,field,empty=false){
  if(empty&&value==='')return;
  if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))invalid(field);
}
function timestamp(value,field,{nullable=false}={}){
  if(nullable&&value===null)return;
  if(typeof value!=='string'||! /^(19|20|21)\d{2}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||!Number.isFinite(Date.parse(value)))invalid(field);
  date(value.slice(0,10),field);
}
function common(record,field,kind,{title=true,source=true}={}){
  object(record,recordFields,field);
  if(typeof record.id!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(record.id))invalid(`${field}.id`);
  timestamp(record.createdAt,`${field}.createdAt`);
  if(title||has(record,'title'))string(record.title,kind==='memory'?WORKSPACE_LIMITS.memory:WORKSPACE_LIMITS.title,`${field}.title`);
  if(source||has(record,'source'))string(record.source,WORKSPACE_LIMITS.source,`${field}.source`);
  if(has(record,'kind')&&record.kind!==kind)invalid(`${field}.kind`);
  if(has(record,'status')&&!['pending','done'].includes(record.status))invalid(`${field}.status`);
  if(has(record,'priority')&&typeof record.priority!=='boolean')invalid(`${field}.priority`);
  if(has(record,'date'))date(record.date,`${field}.date`,true);
  if(has(record,'time'))time(record.time,`${field}.time`,true);
  for(const key of ['due','completedAt','notifiedAt','updatedAt'])if(has(record,key))timestamp(record[key],`${field}.${key}`,{nullable:true});
  if(record.due&&(!record.date||!record.time))invalid(`${field}.due`);
  if(has(record,'warnings')){
    if(!Array.isArray(record.warnings)||record.warnings.length>12)invalid(`${field}.warnings`);
    record.warnings.forEach((warning,index)=>string(warning,250,`${field}.warnings[${index}]`));
  }
  if(has(record,'reviewRequired')&&typeof record.reviewRequired!=='boolean')invalid(`${field}.reviewRequired`);
  if(has(record,'timezone')&&!timezones.includes(record.timezone))invalid(`${field}.timezone`);
  if(has(record,'amount'))number(record.amount,0.01,kind==='water'?WORKSPACE_LIMITS.water:WORKSPACE_LIMITS.amount,`${field}.amount`,{decimals:true});
  if(has(record,'currency')&&!currencies.includes(record.currency))invalid(`${field}.currency`);
  if(has(record,'direction')&&!['income','expense'].includes(record.direction))invalid(`${field}.direction`);
  if(has(record,'category')&&!categories.includes(record.category))invalid(`${field}.category`);
}
export function validateWorkspace(state){
  object(state,['version','name','onboarded',...collections,'settings','planInterest'],'workspace');
  if(state.version!==1)invalid('version');
  string(state.name,WORKSPACE_LIMITS.name,'name',{empty:true});
  if(typeof state.onboarded!=='boolean')invalid('onboarded');
  if(![null,'monthly','annual','rhythm','rhythm_annual','founder'].includes(state.planInterest))invalid('planInterest');
  object(state.settings,['waterGoal','quietStart','quietEnd','closingTime','followUp','timezone','conversationStyle','dayMode','dayModeDate','foodBudget'],'settings');
  if(has(state.settings,'conversationStyle')&&!has(CONVERSATION_STYLES,state.settings.conversationStyle))invalid('settings.conversationStyle');
  if(has(state.settings,'dayMode')&&!['gentle','balanced','focus'].includes(state.settings.dayMode))invalid('settings.dayMode');
  if(has(state.settings,'dayModeDate'))date(state.settings.dayModeDate,'settings.dayModeDate');
  if(has(state.settings,'foodBudget'))number(state.settings.foodBudget,1,999999,'settings.foodBudget',{decimals:true});
  number(state.settings.waterGoal,250,WORKSPACE_LIMITS.water,'settings.waterGoal',{integer:true});
  for(const key of ['quietStart','quietEnd','closingTime'])time(state.settings[key],`settings.${key}`);
  if(typeof state.settings.followUp!=='boolean')invalid('settings.followUp');
  if(has(state.settings,'timezone')&&!timezones.includes(state.settings.timezone))invalid('settings.timezone');
  const ids=new Set();
  for(const collection of collections){
    if(['routines','routineChecks'].includes(collection)&&!has(state,collection))state[collection]=[];
    const records=state[collection];
    if(!Array.isArray(records))invalid(collection);
    if(records.length>WORKSPACE_LIMITS.records)throw new WorkspaceError(413,'RECORD_LIMIT','Limite de registros atingido. Exporte antes de continuar.');
    records.forEach((record,index)=>{
      const field=`${collection}[${index}]`;
      if(collection==='routines'){
        object(record,['id','title','time','weekdays','enabled','createdAt'],'routines');
        if(!/^[A-Za-z0-9_-]{1,128}$/.test(record.id||''))invalid(field+'.id');
        string(record.title,160,field+'.title');time(record.time,field+'.time');timestamp(record.createdAt,field+'.createdAt');
        if(typeof record.enabled!=='boolean'||!Array.isArray(record.weekdays)||!record.weekdays.length||record.weekdays.length>7||new Set(record.weekdays).size!==record.weekdays.length||record.weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))invalid(field+'.weekdays');
        if(records.length>30)invalid(collection);
      }else if(collection==='routineChecks'){
        object(record,['id','routineId','date','createdAt'],'routineChecks');
        if(!/^[A-Za-z0-9_-]{1,128}$/.test(record.id||'')||!state.routines.some(r=>r.id===record.routineId))invalid(field+'.id');
        date(record.date,field+'.date');timestamp(record.createdAt,field+'.createdAt');
        if(records.slice(0,index).some(c=>c.routineId===record.routineId&&c.date===record.date))invalid(field+'.duplicate');
      }else if(collection==='closings'||collection==='activity'){
        object(record,collection==='closings'?['id','createdAt','done','total','note']:['id','createdAt','title'],field);
        if(typeof record.id!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(record.id))invalid(`${field}.id`);
        timestamp(record.createdAt,`${field}.createdAt`);
        if(collection==='activity')string(record.title,650,`${field}.title`);
        else{
          number(record.total,0,WORKSPACE_LIMITS.records,`${field}.total`,{integer:true});
          number(record.done,0,record.total,`${field}.done`,{integer:true});
          string(record.note,1000,`${field}.note`,{empty:true});
        }
      }else{
        const kind={tasks:'task',memories:'memory',expenses:'expense',water:'water'}[collection];
        common(record,field,kind,{title:collection!=='water',source:collection!=='water'});
        if(collection==='tasks'){
          if(!['pending','done'].includes(record.status)||typeof record.priority!=='boolean')invalid(field);
          date(record.date,`${field}.date`,true);time(record.time,`${field}.time`,true);
        }
        if(collection==='expenses'){
          number(record.amount,0.01,WORKSPACE_LIMITS.amount,`${field}.amount`,{decimals:true});
          if(!currencies.includes(record.currency)||!['income','expense'].includes(record.direction)||!categories.includes(record.category))invalid(field);
        }
        if(collection==='water')number(record.amount,0.01,WORKSPACE_LIMITS.water,`${field}.amount`,{decimals:true});
      }
      if(ids.has(record.id))invalid(`${field}.id`);
      ids.add(record.id);
    });
  }
  if(state.tasks.filter(task=>task.priority&&task.status==='pending').length>3)invalid('tasks.priority');
  return state;
}
