import {rivals} from './rivals.ts';

export const BEACH_PROGRESS_KEY='shoreline-beach';
export const beachSports=[
 {id:'footvolley',name:'Futevôlei',path:'/futevolei'},
 {id:'tennis',name:'Beach tennis',path:'/beach-tennis'},
 {id:'soccer',name:'Futebol 3×3',path:'/beach-soccer'},
] as const;
// Ball skins earned across futevôlei, beach tennis and soccer; the best unlocked one is used in every match.
export const ballSkins=[
 {id:'classic',name:'Bola clássica',metric:'matches',target:0,goal:''},
 {id:'gold',name:'Bola dourada',metric:'perfects',target:20,goal:'golpes perfeitos'},
 {id:'fire',name:'Bola de fogo',metric:'specials',target:5,goal:'especiais'},
 {id:'champion',name:'Bola campeã',metric:'titles',target:1,goal:'circuito vencido'},
] as const;
export const CIRCUIT_STAGES=5;
const numbers=['matches','wins','perfects','specials','titles','circuit','challengeDay','streak'] as const;
export function newBeachProgress(){return {matches:0,wins:0,perfects:0,specials:0,titles:0,circuit:0,challengeDay:-1,streak:0};}
export type BeachProgress=ReturnType<typeof newBeachProgress>;
export function readBeachProgress(raw:string|null):BeachProgress{
 const p=newBeachProgress();
 try{const data=JSON.parse(raw||'null');for(const key of numbers)if(Number.isSafeInteger(data?.[key])&&data[key]>=-1&&data[key]<=10_000_000)p[key]=data[key];}catch{/* A broken save starts fresh. */}
 p.circuit=Math.max(0,Math.min(CIRCUIT_STAGES-1,p.circuit));return p;
}
const unlocked=(p:BeachProgress,s:typeof ballSkins[number])=>p[s.metric]>=s.target;
export const bestSkin=(p:BeachProgress)=>[...ballSkins].reverse().find(s=>unlocked(p,s))?.id??'classic';
export const nextSkin=(p:BeachProgress)=>ballSkins.find(s=>!unlocked(p,s));

// The circuit: five stages against rivals of rising strength, rotating through the three sports.
const ladder=rivals.map((r,i)=>({i,points:r.points})).sort((a,b)=>a.points-b.points);
export function circuitStage(p:BeachProgress){
 const stage=p.circuit,rival=ladder[Math.min(ladder.length-1,stage*Math.floor(ladder.length/CIRCUIT_STAGES)+p.titles%3)].i;
 return {stage,sport:beachSports[stage%3],rival};
}
// Same challenge for everyone on a given local day.
export function dailyChallenge(day:number){
 return {day,sport:beachSports[day%3],rival:day%rivals.length,goal:3+day%3};
}
export const localDay=(now=new Date())=>Math.floor((now.getTime()-now.getTimezoneOffset()*60_000)/864e5);

export type MatchResult={won:boolean;perfects:number;specials:number;circuit?:boolean;challenge?:{day:number;goal:number}};
export function recordBeachMatch(p:BeachProgress,r:MatchResult){
 const next={...p,matches:p.matches+1,wins:p.wins+Number(r.won),perfects:p.perfects+r.perfects,specials:p.specials+r.specials};
 const notes:string[]=[];
 if(r.circuit&&r.won){
  if(p.circuit+1>=CIRCUIT_STAGES){next.circuit=0;next.titles++;notes.push('CAMPEÃO DO CIRCUITO!');}
  else{next.circuit=p.circuit+1;notes.push(`Circuito: etapa ${next.circuit+1} de ${CIRCUIT_STAGES} liberada`);}
 }
 if(r.challenge&&r.won&&r.perfects>=r.challenge.goal&&p.challengeDay!==r.challenge.day){
  next.streak=p.challengeDay===r.challenge.day-1?p.streak+1:1;next.challengeDay=r.challenge.day;notes.push(`Desafio do dia cumprido · sequência de ${next.streak}`);
 }
 const before=bestSkin(p),after=bestSkin(next);
 if(after!==before)notes.push(`Desbloqueou: ${ballSkins.find(s=>s.id===after)?.name}`);
 return {progress:next,notes};
}

// URL options for a match link: ?rival=N fixes the rival (so server and browser agree), &meta=N is the daily goal, &circuito=1 a circuit stage.
export function matchOptions(q:Record<string,string|string[]|undefined>){
 const int=(v:unknown,lo:number,hi:number)=>typeof v==='string'&&/^\d+$/.test(v)&&Number(v)>=lo&&Number(v)<=hi?Number(v):undefined;
 return {rival:int(q.rival,0,rivals.length-1),goal:int(q.meta,1,9),day:int(q.dia,0,1_000_000),circuit:q.circuito==='1'};
}
