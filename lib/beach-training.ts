import {teamNames} from './teams.ts';

// Training minigames for futevôlei, beach tennis and soccer (vôlei has its own in lib/training.ts).
// One drill per attribute, in the order of statLabels: 5 tries, 3 hits raise that attribute of your duo/trio by 1
// (once per drill and team, never above 5).
export const BEACH_TRAINING_KEY='shoreline-beach-training';
export const DRILL_TRIES=5,DRILL_GOAL=3;
export const beachDrills=(soccer:boolean)=>soccer?[
 {name:'Arrancada',hint:'Faça o gol em até 3,5 segundos'},
 {name:'Alvos no gol',hint:'Chute no canto aceso (direcional ↑/↓)'},
 {name:'Tabela',hint:'Passe com B e finalize de primeira com A'},
 {name:'Paredão',hint:'Você é o goleiro: não deixe a bola entrar'},
]:[
 {name:'Corre-corre',hint:'Bola nos cantos: chegue e devolva no alvo'},
 {name:'Bomba no fundo',hint:'Segure acima de 70% de força e acerte o fundo'},
 {name:'Curtinha',hint:'Curta com B no alvo junto à rede (↑/↓ escolhe o lado)'},
 {name:'Alvos na areia',hint:'Coloque a bola no alvo dourado (direcional mira)'},
];
export function createDrill(){return {drill:-1,drillHits:0,drillTries:0,drillTime:0,drillTarget:{x:0,z:0,r:0}};}
type Drill=ReturnType<typeof createDrill>&{message:string};
// Counts one try; true when the drill is over.
export function scoreTry(g:Drill,success:boolean){
 g.drillTries++;if(success)g.drillHits++;g.drillTime=0;
 g.message=`${success?'ACERTOU!':'ERROU'} · ${g.drillHits} de ${g.drillTries}`;
 return g.drillTries>=DRILL_TRIES;
}

// Saved per team and sport family: {"Muralha": [0,1,0,0], "Muralha·futebol": [...]}.
export type TrainingSave=Record<string,number[]>;
export const trainingKey=(team:string,soccer:boolean)=>soccer?`${team}·futebol`:team;
export function readTraining(raw:string|null):TrainingSave{
 const save:TrainingSave={};
 try{
  const data=JSON.parse(raw||'{}');
  for(const team of teamNames)for(const key of [trainingKey(team,false),trainingKey(team,true)])
   if(Array.isArray(data?.[key])&&data[key].length===4)save[key]=data[key].map((n:unknown)=>n===1?1:0);
 }catch{/* A broken save starts fresh. */}
 return save;
}
export const trainedStats=(stats:number[],save:TrainingSave,key:string)=>stats.map((s,i)=>Math.min(5,s+(save[key]?.[i]??0)));
export function recordDrill(save:TrainingSave,key:string,stats:number[],drill:number,hits:number,label:string){
 const done=save[key]?.[drill]===1;
 if(hits<DRILL_GOAL||done||stats[drill]>=5)return {save,note:hits<DRILL_GOAL?`Faltou pouco: ${DRILL_GOAL} acertos sobem ${label}`:done?`${label} já foi treinado neste time`:`${label} já está no máximo`};
 const row=[...(save[key]??[0,0,0,0])];row[drill]=1;
 return {save:{...save,[key]:row},note:`+1 ${label}!`};
}
