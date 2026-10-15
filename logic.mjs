import {TIMEZONE_CONFIG} from './runtime.config.mjs';
export {TIMEZONE_CONFIG};
export const uid = () => crypto.randomUUID();
export const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const TIMEZONES=Object.keys(TIMEZONE_CONFIG);
export function localDay(now=new Date(),timezone='America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function isCalendarDate(date) {
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date||''))return false;
  const d=new Date(date+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
function calendarParts(epoch,timezone){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(epoch));
  return Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
}
export function dateTimeToISO(date,time,timezone='America/Sao_Paulo') {
  if(!isCalendarDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')||!TIMEZONES.includes(timezone))return null;
  const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const target=Date.UTC(year,month-1,day,hour,minute);let epoch=target;
  for(let i=0;i<4;i++){const p=calendarParts(epoch,timezone),local=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);const next=epoch+target-local;if(next===epoch)break;epoch=next;}
  const matches=[-7200000,-3600000,0,3600000,7200000].map(delta=>epoch+delta).filter(v=>{const p=calendarParts(v,timezone);return p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute;});
  return matches.length===1?new Date(matches[0]).toISOString():null;
}
export function emptyState() {
  return {version:1,name:'',onboarded:false,tasks:[],memories:[],expenses:[],water:[],closings:[],activity:[],routines:[],routineChecks:[],settings:{waterGoal:2000,quietStart:'21:00',quietEnd:'08:00',closingTime:'20:30',followUp:true,timezone:'America/Sao_Paulo',conversationStyle:'warm'},planInterest:null};
}
export function parseDate(text,now=new Date(),timezone='America/Sao_Paulo') {
  const t=normalize(text),base=localDay(now,timezone),day=new Date(base+'T12:00:00Z'),warnings=[];
  let found=false;
  const iso=t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const dm=t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  if(iso||dm){
    const requested=iso?iso[0]:`${dm[3]||base.slice(0,4)}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
    if(!isCalendarDate(requested))warnings.push('A data informada não existe. Confira o dia e o mês.');
    else {day.setTime(Date.parse(requested+'T12:00:00Z'));found=true;}
  }
  else if(t.includes('amanha')){day.setUTCDate(day.getUTCDate()+1);found=true;}
  else if(t.includes('hoje'))found=true;
  else {
    const weekdays=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
    const w=weekdays.findIndex(x=>t.includes(x));
    if(w>=0){let n=(w-day.getUTCDay()+7)%7;if(n===0)n=7;day.setUTCDate(day.getUTCDate()+n);found=true;}
  }
  const tm=t.match(/\b([01]?\d|2[0-3])(?:h(?:(\d{2}))?|:(\d{2}))\b/)||t.match(/\bas\s+([01]?\d|2[0-3])(?:\s+horas?)?\b/);
  const time=tm?`${tm[1].padStart(2,'0')}:${tm[2]||tm[3]||'00'}`:'';
  if(!Number.isFinite(day.getTime()))return {date:'',time:'',due:null,warnings,reviewRequired:true};
  const date=found?day.toISOString().slice(0,10):'',due=date&&time?dateTimeToISO(date,time,timezone):null;
  if(date&&time&&!due)warnings.push('Horário inválido ou ambíguo neste fuso. Escolha outro horário.');
  if(/todo dia|todos os dias|toda semana|toda segunda|toda terca|toda quarta|toda quinta|toda sexta|todo sabado|todo domingo|todo mes|todo ano/.test(t))warnings.push('Este registro não cria repetição automática. Confira a data de uma ocorrência.');
  return {date,time,due,warnings,reviewRequired:warnings.length>0};
}
export function inferCategory(t) {
  const n=normalize(t);
  if(/mercado|supermercado|feira/.test(n))return 'Mercado';
  if(/uber|gasolina|transporte|taxi|combustivel/.test(n))return 'Transporte';
  if(/almoco|jantar|cafe|restaurante|comida|ifood/.test(n))return 'Alimentação';
  if(/farmacia|dentista|medic|consulta/.test(n))return 'Saúde';
  if(/aluguel|luz|energia|internet|casa/.test(n))return 'Casa';
  if(/hotel|viagem|passagem/.test(n))return 'Viagem';
  return 'Outros';
}
export function parseCapture(text,now=new Date(),timezone='America/Sao_Paulo') {
  const parts=text.trim().split(/\n+|;|\.(?=\s+[A-ZÀ-Ú])|[, ]+(?:e\s+)?(?=(?:me\s+lembra|lembre|gastei|paguei|guarda|guarde|bebi|recebi)\b)/i).filter(Boolean);
  return parts.slice(0,12).map(raw=>{
    const source=raw.trim(), n=normalize(source);
    const base={id:uid(),title:source,source,createdAt:now.toISOString(),kind:'task',status:'pending',priority:false,timezone,...parseDate(source,now,timezone)};
    if(/\b(senha|password|token|chave secreta)\b/.test(n)){base.warnings.push('Não guarde senhas ou credenciais. Este espaço não é um cofre de segredos.');base.reviewRequired=true;}
    if(/^(onde|qual|quanto|quando|o que)|\?$/.test(n))return {...base,kind:'query'};
    if(/\b(bebi|tomei)\b/.test(n)&&/agua/.test(n)){
      const ml=n.match(/([+-]?\d+(?:[,.]\d+)?)\s*(ml|litros?|l)\b/);
      const amount=ml?Number(ml[1].replace(',','.'))*(ml[2]==='ml'?1:1000):null;
      if(!Number.isFinite(amount)||amount<=0||amount>6000){base.warnings.push('Informe uma quantidade de água válida em ml.');base.reviewRequired=true;}
      return {...base,kind:'water',amount:Number.isFinite(amount)&&amount>0&&amount<=6000?Math.round(amount*100)/100:null,title:'Água registrada'};
    }
    if(/\b(gastei|paguei|comprei|recebi|ganhei|entrou)\b/.test(n)){
      const m=source.match(/(?:R\$\s*|US\$\s*|€\s*)?([+-]?\s*\d{1,3}(?:\.\d{3})+(?:,\d+)?|[+-]?\s*\d+(?:[,.]\d+)?)(?:\s*(?:reais|euros|dolares|dólares))?/i);
      const amount=m?Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.')):null;
      const negative=/[-−]\s*(?:R\$|US\$|€)?\s*\d/.test(source);
      const valid=Number.isFinite(amount)&&amount>0&&amount<=99999999&&!negative&&Math.abs(amount*100-Math.round(amount*100))<0.000001;
      if(!valid){base.warnings.push('Confira o valor. Use um número positivo com até duas casas decimais.');base.reviewRequired=true;}
      return {...base,kind:'expense',amount:valid?amount:null,currency:/€|euros?/i.test(source)?'EUR':/US\$|dolares|dólares/i.test(source)?'USD':'BRL',direction:/recebi|ganhei|entrou/.test(n)?'income':'expense',category:inferCategory(source)};
    }
    if(/\b(guarda|guarde|salva|salve|anota que|lembre que|aniversario|endereco|senha|guardado|guardei)\b/.test(n))return {...base,kind:'memory',title:source.replace(/^(guarda|guarde|salva|salve|anota que|lembre que)\s*/i,'')};
    return {...base,title:source.replace(/^(aya[, ]*|me lembra de |lembre de |lembra de |preciso |cria uma tarefa para |anota )/i,'')};
  });
}
export function queryMemory(query,state) {
  const words=normalize(query).replace(/[^\w ]/g,' ').split(/\s+/).filter(x=>x.length>2&&!['onde','qual','quando','esta','fica','meu','minha','que','uma','para','foi','quanto'].includes(x));
  const all=[...state.memories,...state.tasks];
  return all.map(x=>({...x,score:words.filter(w=>normalize(x.title+' '+x.source).includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
}
export function dailyStats(state,day,timezone=state.settings?.timezone||'America/Sao_Paulo') {
  day=day||localDay(new Date(),timezone);
  const tasks=state.tasks.filter(t=>(t.due?localDay(new Date(t.due),timezone):t.date)===day);
  const done=tasks.filter(t=>t.status==='done').length;
  const water=state.water.filter(t=>localDay(new Date(t.createdAt),timezone)===day).reduce((s,t)=>s+t.amount,0);
  return {tasks:tasks.length,done,water,progress:tasks.length?Math.round(done/tasks.length*100):0};
}
