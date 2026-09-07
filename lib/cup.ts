import {createGame, startPractice, type Game} from './game.ts';

export const opponents=[
  {name:'Maré',style:'defense',description:'Defesa rápida. Alterne curto e fundo.'},
  {name:'Muralha',style:'block',description:'Bloqueio na rede. Explore a diagonal.'},
  {name:'Tempestade',style:'attack',description:'Ataque veloz. Prepare a recepção cedo.'},
] as const;
export const lessons=['Movimento: chegue ao círculo','Cortada: envie uma bola para o outro lado','Largadinha: escolha Golpe e envie uma bola curta'];
export function newProgress(){return {stage:0,score:[0,0],server:0,champion:false,gold:false,training:0};}
export type Progress=ReturnType<typeof newProgress>;
export function readProgress(raw:string|null):Progress{
  try{
    const p=JSON.parse(raw||'null');
    if(!p||!Number.isInteger(p.stage)||p.stage<0||p.stage>3||!Array.isArray(p.score)||p.score.length!==2||
      !p.score.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=10000)||
      ![0,1].includes(p.server)||typeof p.champion!=='boolean'||typeof p.gold!=='boolean'||
      !Number.isInteger(p.training)||p.training<0||p.training>3||p.stage===3&&!p.champion)return newProgress();
    return {stage:p.stage,score:[...p.score],server:p.server,champion:p.champion,gold:p.gold&&p.champion,training:p.training};
  }catch{return newProgress();}
}
export function cupGame(p:Progress):Game{
  const g=createGame(),stage=Math.min(p.stage,2);
  g.cupStage=stage;g.cpuStyle=opponents[stage].style;g.pointGoal=7;g.gold=p.gold;g.windEnabled=false;
  g.score=[...p.score];g.server=p.server;
  if(Math.max(...g.score)>=7&&Math.abs(g.score[0]-g.score[1])>=2)g.status='over';
  g.message=`Etapa ${stage+1}/3 · ${opponents[stage].name}`;
  return g;
}
export function recordProgress(p:Progress,g:Game):Progress{
  if(g.status==='challenge-complete')return {...p,training:Math.max(p.training,g.challenge+1)};
  if(g.cupStage<0||g.cupStage!==p.stage)return p;
  if(g.status==='over'&&g.score[0]>g.score[1]){
    const stage=p.stage+1;
    return {...p,stage,score:[0,0],server:0,champion:p.champion||stage===3,gold:p.gold||stage===3};
  }
  return {...p,score:[...g.score],server:g.server};
}
export function challengeGame(index:number,gold=false):Game{
  const g=createGame();startPractice(g);g.challenge=Math.max(0,Math.min(2,index));g.gold=gold;
  // Lessons teach the choice: the tip lesson starts with a spike selected.
  if(index===0){g.assist=false;g.autoSwitch=false;g.ball={x:350,z:225,y:437,vx:0,vz:0,vy:0};}
  return g;
}
