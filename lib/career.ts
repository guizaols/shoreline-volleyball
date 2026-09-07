export const nations=[['BR','Brasil'],['PT','Portugal'],['US','Estados Unidos'],['CA','Canadá'],['FR','França'],['IT','Itália'],['DE','Alemanha'],['NO','Noruega'],['JP','Japão'],['AU','Austrália'],['AR','Argentina']] as const;
export const attributes={serve:'Saque',attack:'Ataque',defense:'Defesa',mobility:'Mobilidade'};
export type Attribute=keyof typeof attributes;
export function athlete(name:string){return {name,xp:0,points:0,stats:{serve:50,attack:50,defense:50,mobility:50}};}
export function newCareer(){return {country:'BR',players:[athlete('Alex'),athlete('Dani')],ranking:0,history:[] as {event:string;opponent:string;score:string;won:boolean}[]};}
export type Career=ReturnType<typeof newCareer>;
export const events=[
 {name:'Copa de Praia',location:'Brasil',required:0},
 {name:'Circuito Mundial · Lisboa',location:'Portugal',required:90},
 {name:'Circuito Mundial · Sydney',location:'Austrália',required:180},
 {name:'Jogos Olímpicos',location:'Final da temporada',required:300},
];
export function readCareer(value:unknown):Career{
 const base=newCareer(),v=value as Partial<Career>|null;
 if(!v||typeof v!=='object')return base;
 const bounded=(n:unknown,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=max?n:0;
 if(nations.some(([code])=>code===v.country))base.country=v.country!;
 base.ranking=bounded(v.ranking,10000000);
 base.players=base.players.map((fallback,i)=>{
  const p=v.players?.[i];if(!p||typeof p!=='object')return fallback;
  fallback.name=typeof p.name==='string'?p.name.trim().slice(0,24)||fallback.name:fallback.name;
  fallback.xp=bounded(p.xp,10000000);fallback.points=Math.min(bounded(p.points,100000),Math.floor(fallback.xp/100));
  for(const key of Object.keys(attributes) as Attribute[])fallback.stats[key]=Math.max(50,Math.min(100,bounded(p.stats?.[key],100)));
  return fallback;
 });
 if(Array.isArray(v.history))base.history=v.history.filter(h=>h&&typeof h.event==='string'&&typeof h.opponent==='string'&&typeof h.score==='string'&&typeof h.won==='boolean').slice(-30).map(h=>({event:h.event.slice(0,70),opponent:h.opponent.slice(0,30),score:h.score.slice(0,20),won:h.won}));
 return base;
}
export function improve(c:Career,index:number,attribute:Attribute):Career{
 const player=c.players[index];
 if(!player||!Object.hasOwn(attributes,attribute)||player.points<1||player.stats[attribute]>=100)return c;
 return {...c,players:c.players.map((p,i)=>i===index?{...p,points:p.points-1,stats:{...p.stats,[attribute]:Math.min(100,p.stats[attribute]+5)}}:p)};
}
export function reward(c:Career,event:string,opponent:string,score:number[],contacts:number[]):Career{
 const won=score[0]>score[1];
 return {...c,ranking:c.ranking+(won?30:5),history:[...c.history,{event,opponent,score:score.join('–'),won}].slice(-30),
  players:c.players.map((p,i)=>{
   const xp=p.xp+(won?40:20)+Math.min(30,Math.max(0,contacts[i]||0)*2);
   return {...p,xp,points:p.points+Math.floor(xp/100)-Math.floor(p.xp/100)};
  })};
}
