import {newCareer,readCareer,reward,events,canEnter} from './career.ts';
import {createGame, startPractice, type Game} from './game.ts';

export {rivals as opponents} from './rivals.ts';
import {rivals} from './rivals.ts';
export function eventOpponents(event:number){return rivals.slice(event*3,event*3+3);}
export const lessons=['Movimento: chegue ao círculo','Cortada: envie uma bola para o outro lado','Largadinha: escolha Largadinha e envie uma bola curta'];
export function newProgress(){return {career:newCareer(),event:0,completed:[] as number[],matchSerial:0,lastRecorded:-1,contacts:[0,0],stage:0,score:[0,0],server:0,champion:false,gold:false,training:0};}
export type Progress=ReturnType<typeof newProgress>;
export function readProgress(raw:string|null):Progress{
  try{
    const p=JSON.parse(raw||'null');
    if(!p||!Number.isInteger(p.stage)||p.stage<0||p.stage>3||!Array.isArray(p.score)||p.score.length!==2||
      !p.score.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=10000)||
      ![0,1].includes(p.server)||typeof p.champion!=='boolean'||typeof p.gold!=='boolean'||
      !Number.isInteger(p.training)||p.training<0||p.training>3||p.stage===3&&!p.champion)return newProgress();
    return {career:readCareer(p.career),contacts:Array.isArray(p.contacts)&&p.contacts.length===2&&p.contacts.every((n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0)?[...p.contacts]:[0,0],event:Number.isInteger(p.event)&&p.event>=0&&p.event<events.length?p.event:0,completed:Array.isArray(p.completed)?[...new Set<number>(p.completed.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<events.length))]:[],matchSerial:Number.isSafeInteger(p.matchSerial)&&p.matchSerial>=0?p.matchSerial:0,lastRecorded:Number.isSafeInteger(p.lastRecorded)&&p.lastRecorded>=-1?p.lastRecorded:-1,stage:p.stage,score:[...p.score],server:p.server,champion:p.champion,gold:p.gold&&p.champion,training:p.training};
  }catch{return newProgress();}
}
export function applyCareer(g:Game,p:Progress):Game{
 g.country=p.career.country;g.names=p.career.players.map(player=>player.name);g.attributes=p.career.players.map(player=>({...player.stats}));g.gold=p.gold;return g;
}
export function beginEvent(p:Progress,event:number):Progress{
 if(!canEnter(p.career,event)||(event!==p.event&&p.stage<3&&(p.stage>0||p.score.some(Boolean))))return p;
 return {...p,event,stage:0,score:[0,0],contacts:[0,0],server:0,matchSerial:p.matchSerial+1};
}
export function rematch(p:Progress):Progress{return {...p,score:[0,0],contacts:[0,0],server:0,matchSerial:p.matchSerial+1};}
export function cupGame(p:Progress):Game{
  const g=applyCareer(createGame(),p),stage=Math.min(p.stage,2),opponent=eventOpponents(p.event)[stage];
  g.opponentCountry=opponent.country;g.opponentPlayers=[...opponent.players];g.cpuTier=p.event;g.opponentName=opponent.name;g.event=p.event;g.matchSerial=p.matchSerial;g.cupStage=stage;g.cpuStyle=opponent.style;g.pointGoal=7;g.gold=p.gold;g.windEnabled=false;
  g.playerContacts=[...p.contacts];g.score=[...p.score];g.server=p.server;
  if(Math.max(...g.score)>=7&&Math.abs(g.score[0]-g.score[1])>=2)g.status='over';
  g.message=`${events[p.event].name} · Etapa ${stage+1}/3 · ${opponent.name}`;
  return g;
}
export function recordProgress(p:Progress,g:Game):Progress{
  if(g.status==='challenge-complete')return {...p,training:Math.max(p.training,g.challenge+1)};
  if(g.cupStage<0||g.cupStage!==p.stage||g.event!==p.event||g.matchSerial!==p.matchSerial)return p;
  if(g.status==='over'&&p.lastRecorded!==g.matchSerial)p={...p,lastRecorded:g.matchSerial,career:reward(p.career,events[p.event].name,eventOpponents(p.event)[g.cupStage].name,g.score,g.playerContacts)};
  if(g.status==='over'&&g.score[0]>g.score[1]){
    const stage=p.stage+1;
    return {...p,career:stage===3?{...p.career,ranking:p.career.ranking+30}:p.career,stage,matchSerial:p.matchSerial+1,completed:stage===3?[...new Set([...p.completed,p.event])]:p.completed,contacts:[0,0],score:[0,0],server:0,champion:p.champion||stage===3,gold:p.gold||stage===3};
  }
  return {...p,contacts:[...g.playerContacts],score:[...g.score],server:g.server};
}
export function challengeGame(index:number,gold=false):Game{
  const g=createGame();startPractice(g);g.challenge=Math.max(0,Math.min(2,index));g.gold=gold;
  // Lessons teach the choice: the tip lesson starts with a spike selected.
  if(index===0){g.assist=false;g.autoSwitch=false;g.ball={x:350,z:225,y:437,vx:0,vz:0,vy:0};}
  return g;
}

export function achievements(p:Progress){
 return [
  {id:'first-match',title:'Estreia no circuito',detail:'Complete uma partida de carreira',unlocked:p.career.matches>0},
  {id:'training',title:'Domínio da areia',detail:'Complete os três desafios de treino',unlocked:p.training===3},
  {id:'level-up',title:'Dupla em evolução',detail:'Conquiste 100 XP com um atleta',unlocked:p.career.players.some(player=>player.xp>=100)},
  ...events.map((event,i)=>({id:'trophy-'+i,title:event.name,detail:'Conquiste o título',unlocked:p.completed.includes(i)})),
  {id:'gold-uniform',title:'Brilho de campeão',detail:'Uniforme dourado desbloqueado',unlocked:p.champion},
 ];
}
export function newAchievements(before:Progress,after:Progress){
 const earned=new Set(achievements(before).filter(a=>a.unlocked).map(a=>a.id));
 return achievements(after).filter(a=>a.unlocked&&!earned.has(a.id));
}
