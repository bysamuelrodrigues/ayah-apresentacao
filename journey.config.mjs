// One registry for the presentation journeys. These roles grant no server permissions.
export const JOURNEYS=Object.freeze({
 ceo:{name:'CEO',eyebrow:'Uma visão do todo',title:'Crescer com clareza.',description:'Pessoas, operação e resultados no mesmo lugar.',icon:'chart',home:'Visão geral',tabs:[['overview','Visão geral'],['team','Agentes e criadores'],['customers','Assinantes'],['earnings','Comissões'],['launch','Próximos passos'],['settings','Minha operação']]},
 agent:{name:'Agente',eyebrow:'Sua equipe, mais perto',title:'Gente boa cresce junto.',description:'Acompanhe seus criadores e ajude cada um a começar.',icon:'heart',home:'Minha equipe',tabs:[['overview','Minha equipe'],['invites','Convites'],['campaigns','Campanhas'],['earnings','Meus ganhos'],['materials','Materiais']]},
 influencer:{name:'Influenciador',eyebrow:'Uma indicação que faz sentido',title:'Mostre o que faz parte do seu dia.',description:'Sua experiência vira uma indicação útil para quem te acompanha.',icon:'gift',home:'Meu desempenho',tabs:[['overview','Meu desempenho'],['invites','Minha divulgação'],['materials','Materiais'],['earnings','Meus ganhos'],['campaigns','Minha rotina']]},
 user:{name:'Usuário',eyebrow:'Um espaço só seu',title:'Menos na cabeça. Mais na vida.',description:'Guarde o que importa e encontre um ritmo que cabe no seu dia.',icon:'sun',home:'Meu dia',tabs:[]}
});
export const PRESENTATION_POLICY=Object.freeze({label:'Proposta para revisão',poolPercent:30,creatorPercent:25,agentPercent:5,directCreatorPercent:30,recurrence:'A definir com os parceiros',salesGoal:30,goalDays:30});
export const ONBOARDING_STEPS=Object.freeze(['Seu espaço','Seu jeito','Primeiro passo']);
export const ROLE_PATHS=Object.freeze({ceo:'ceo',agent:'agente',influencer:'influenciador',user:'usuario'});
export const REVIEW_STORAGE_KEY='ayah-presentation-v1';
export function emptyReview(){return {version:1,organization:'AYAH',ownerName:'',agentName:'Minha agência',creatorName:'Meu perfil',roleProfiles:{},people:[],campaigns:[],checklist:[],notes:[],selectedPlan:null};}
export function commissionSplit(receiptMinor,{hasAgent=false}={}){
 if(!Number.isSafeInteger(receiptMinor)||receiptMinor<0)throw Error('Valor inválido.');
 const total=Math.floor(receiptMinor*PRESENTATION_POLICY.poolPercent/100);
 const agent=hasAgent?Math.floor(receiptMinor*PRESENTATION_POLICY.agentPercent/100):0;
 return {total,agent,creator:total-agent,companyBeforeCosts:receiptMinor-total};
}
export function addReviewPerson(review,input){
 const name=String(input.name||'').trim(),channel=String(input.channel||'').trim();
 if(!name||name.length>60||!/^@[a-zA-Z0-9._]{1,30}$/.test(channel))throw Error('Informe um nome e um perfil válido, como @seuperfil.');
 if(review.people.some(p=>p.channel.toLowerCase()===channel.toLowerCase()))throw Error('Esse perfil já está na sua lista.');
 if(review.people.length>=30)throw Error('A lista de apresentação tem limite de 30 perfis.');
 return {...review,people:[...review.people,{id:crypto.randomUUID(),name,channel,status:'draft',agentId:'presentation-agent',createdAt:new Date().toISOString()}]};
}
export const REVIEW_MATERIALS=Object.freeze([
 {id:'primeiro-dia',tag:'STORIES · 3 CENAS',title:'Uma coisa a menos na cabeça.',text:'Parceria com AYAH.\n\n1. Mostre uma tarefa que costuma esquecer.\n2. Grave você registrando e encontrando essa informação na AYAH.\n3. Conte com suas palavras como foi usar. Convide quem se identificou a conhecer.\n\nUse apenas experiências que você realmente teve. Identifique a parceria. Não prometa ganhos ou resultados garantidos.'},
 {id:'fechamento',tag:'REELS · 20 SEGUNDOS',title:'Antes de encerrar o dia.',text:'Parceria com AYAH.\n\nMostre seu fechamento do dia. Conte o que conseguiu fazer e o que resolveu deixar para amanhã. Termine com uma pequena decisão real para o dia seguinte.\n\nNão exponha compromissos, documentos ou dados de outras pessoas.'},
 {id:'memoria',tag:'STORIES · TUTORIAL',title:'Onde foi que eu guardei?',text:'Parceria com AYAH.\n\nUse um exemplo que não contenha dados privados. Guarde uma informação na memória, procure pela mesma informação e mostre como editar. Convide a comunidade a testar com um lembrete simples.'},
 {id:'rotina-leve',tag:'CARROSSEL · 4 IDEIAS',title:'Um dia difícil também cabe.',text:'Parceria com AYAH.\n\n1. Hoje não coube tudo.\n2. Escolhi uma prioridade menor.\n3. Reorganizei o restante.\n4. Amanhã eu continuo.\n\nA AYAH ajuda a organizar a rotina. Evite alegações de tratamento de saúde ou dependência.'}
]);
