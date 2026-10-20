import {moveRunner} from './net.ts';
import {FLOOR,type Player} from './game.ts';
import {pressTiming} from './arcade.ts';

// Altinha: five friends in a circle keep the ball up. Player 0 is the human; the others are CPU friends.
// One roda score for everyone (grows while the ball stays up) and one score per player.
export type AltinhaInput={x:number;z:number;jump:boolean};
const MAX_COMBO=10,GRAVITY=620,CONTACT=60,REACH=45,ROUND=120,KEEP_FLIGHT=1.3,PASS_FLIGHT=1.5,QUEUE=.5;
const spotsFor=(n:number)=>Array.from({length:n},(_,i)=>{const a=(90+i*72)*Math.PI/180;return {x:500+Math.cos(a)*150,z:225+Math.sin(a)*150};});
const runner=(x:number,z:number):Player=>({x,z,y:FLOOR,vx:0,vz:0,vy:0,team:0,action:'idle',actionTime:0,stride:0,landing:0,windup:0,jumpBuffer:0,jumpHeld:false,diveHeld:false,diveX:1,diveZ:0,preparation:0});
// Tricks: the held direction, holding J (charge over 65%) and jumping pick one. Risk narrows the timing that works
// (shown on the timing meter), so a hard trick fails on timing, never on a hidden roll.
export type TrickId='embaixadinha'|'cabeca'|'coxa'|'peito'|'ombro'|'letra'|'volta'|'carretilha'|'tesoura';
type Dir='none'|'up'|'down'|'side';
export const tricks:{id:TrickId;name:string;points:number;risk:number;dir:Dir;hold:boolean;jump:boolean;height:number;unlockAt:number}[]=[
 {id:'embaixadinha',name:'EMBAIXADINHA',points:10,risk:0,dir:'none',hold:false,jump:false,height:60,unlockAt:0},
 {id:'cabeca',name:'CABEÇA',points:15,risk:.05,dir:'up',hold:false,jump:false,height:150,unlockAt:0},
 {id:'coxa',name:'COXA',points:15,risk:.05,dir:'down',hold:false,jump:false,height:85,unlockAt:0},
 {id:'peito',name:'PEITO',points:20,risk:.08,dir:'side',hold:false,jump:false,height:115,unlockAt:300},
 {id:'ombro',name:'OMBRO',points:30,risk:.12,dir:'side',hold:true,jump:false,height:130,unlockAt:800},
 {id:'letra',name:'LETRA',points:50,risk:.2,dir:'down',hold:true,jump:false,height:55,unlockAt:1500},
 {id:'volta',name:'VOLTA AO MUNDO',points:70,risk:.28,dir:'none',hold:true,jump:false,height:65,unlockAt:2500},
 {id:'carretilha',name:'CARRETILHA',points:90,risk:.35,dir:'up',hold:true,jump:false,height:60,unlockAt:4000},
 {id:'tesoura',name:'TESOURA NO AR',points:120,risk:.4,dir:'none',hold:false,jump:true,height:170,unlockAt:6000},
];
export const STARTING_TRICKS:TrickId[]=['embaixadinha','cabeca','coxa'];
const dirOf=(i:{x:number;z:number}):Dir=>Math.abs(i.z)>.5&&Math.abs(i.z)>=Math.abs(i.x)?i.z<0?'up':'down':Math.abs(i.x)>.5?'side':'none';
export function trickFor(input:{x:number;z:number},hold:boolean,jump:boolean,unlocked:readonly TrickId[]):TrickId{
 const t=jump?tricks.find(t=>t.jump):tricks.find(t=>!t.jump&&t.dir===dirOf(input)&&t.hold===hold);
 return t&&unlocked.includes(t.id)?t.id:'embaixadinha';
}
const trickById=(id:TrickId)=>tricks.find(t=>t.id===id)!;
export function createAltinha(opts:{maxTouches?:1|2|3;random?:()=>number;unlocked?:TrickId[]}={}){
 const spots=spotsFor(5);
 return {status:'ready' as 'ready'|'playing'|'paused'|'over',resumeStatus:'playing' as 'ready'|'playing'|'paused'|'over',clock:0,timeLeft:ROUND,
  spots,players:spots.map(s=>runner(s.x,s.z)),ball:{x:spots[0].x,z:spots[0].z,y:FLOOR-CONTACT,vx:0,vz:0,vy:0},
  receiver:0,holder:0,touchesThisTurn:0,maxTouches:opts.maxTouches??3,rodaScore:0,rodaStreak:0,rodaBest:0,individual:[0,0,0,0,0],combo:[0,0,0,0,0],drops:0,dropTimer:0,
  charge:0,holding:false,queued:null as null|{kind:'keep'|'pass';target:number;trick:TrickId;age:number},
  unlocked:opts.unlocked??STARTING_TRICKS,lastTricks:[[],[],[],[],[]] as TrickId[][],style:0,perfects:0,saves:0,run:0,gamebreaker:0,gamebreakers:0,badPass:false,
  cpu:null as null|{trick:TrickId;miss:boolean},cpuTouches:1,
  feedback:'',feedbackTime:0,contactSerial:0,timing:null as number|null,random:opts.random??Math.random};
}
export type Altinha=ReturnType<typeof createAltinha>;
// Sends the ball so it comes down to contact height over `to` after `flight` seconds.
const gravity=(g:Altinha)=>GRAVITY*(g.gamebreaker>0?.6:1);
function launchTo(g:Altinha,to:{x:number;z:number},flight:number){
 const b=g.ball,GRAVITY=gravity(g);b.vx=(to.x-b.x)/flight;b.vz=(to.z-b.z)/flight;b.vy=(FLOOR-CONTACT-b.y-.5*GRAVITY*flight*flight)/flight;
}
function toss(g:Altinha){const p=g.players[g.receiver];Object.assign(g.ball,{x:p.x,z:p.z,y:FLOOR-CONTACT});g.touchesThisTurn=0;g.cpu=null;launchTo(g,p,KEEP_FLIGHT);}
export function startAltinha(g:Altinha){if(g.status!=='ready')return;g.status='playing';toss(g);}
export function pauseAltinha(g:Altinha){if(g.status==='paused')g.status=g.resumeStatus;else if(g.status==='playing'){g.resumeStatus=g.status;g.status='paused';g.holding=false;}}
// Where and when the falling ball reaches contact height (the landing ring and the timing both use it).
export function altinhaGuide(g:Altinha,height=CONTACT){
 const b=g.ball,GRAVITY=gravity(g),c=b.y-(FLOOR-height),disc=b.vy*b.vy-2*GRAVITY*c,time=disc<0?0:Math.max(0,(-b.vy+Math.sqrt(disc))/GRAVITY);
 return {x:b.x+b.vx*time,z:b.z+b.vz*time,time,height};
}
// The friend in the held direction; no direction passes to the next friend clockwise.
export function passTarget(g:Altinha,input:{x:number;z:number}){
 if(Math.hypot(input.x,input.z)<.2)return 1;
 const me=g.players[0],want=Math.atan2(input.z,input.x);let best=1,gap=Infinity;
 for(let i=1;i<g.spots.length;i++){const s=g.spots[i],d=Math.abs(Math.atan2(Math.sin(Math.atan2(s.z-me.z,s.x-me.x)-want),Math.cos(Math.atan2(s.z-me.z,s.x-me.x)-want)));if(d<gap){gap=d;best=i;}}
 return best;
}
const mine=(g:Altinha)=>g.status==='playing'&&g.receiver===0&&!g.dropTimer;
export function pressAltinha(g:Altinha){if(!mine(g))return;g.holding=true;g.charge=0;}
export function releaseAltinha(g:Altinha,input:{x:number;z:number;jump?:boolean},kind:'keep'|'pass'){
 const hold=g.charge>=.65;g.holding=false;g.charge=0;
 if(!mine(g)||g.queued)return;
 g.queued={kind,target:passTarget(g,input),trick:trickFor(input,hold,!!input.jump,g.unlocked),age:0};
}
// The human's trick: combo first (a trick not among your last two raises it), then points.
function scoreTrick(g:Altinha,t:typeof tricks[number],offset:number,save:boolean){
 const id=t.id,perfect=Math.abs(offset)<=.36;
 if(!g.lastTricks[0].includes(id))g.combo[0]=Math.min(MAX_COMBO,g.combo[0]+1);g.lastTricks[0]=[id,...g.lastTricks[0]].slice(0,2);
 let points=Math.round(t.points*(1+.5*g.combo[0])*(perfect?1.5:1))*(g.gamebreaker>0?2:1);
 if(perfect)g.perfects++;
 if(save){points+=40;g.saves++;}
 g.individual[0]+=points;g.style=Math.min(100,g.style+t.points/10);
 g.feedback=save?'SALVADA!':t.name+(perfect?' · PERFEITO':'');
}
function touch(g:Altinha,i:number,kind:'keep'|'pass',target:number,off=0){
 const n=g.touchesThisTurn+1,keep=kind==='keep'&&n<g.maxTouches,p=g.players[i];
 g.holder=i;g.run=0;
 // A missed trick still keeps the ball up, but it flies off to the side by up to 120 units.
 const aim=(to:{x:number;z:number})=>({x:to.x+off,z:to.z});
 if(keep){g.touchesThisTurn=n;launchTo(g,aim(p),KEEP_FLIGHT);}
 else{g.receiver=target;g.touchesThisTurn=0;launchTo(g,aim(g.players[target]),PASS_FLIGHT);}
 g.rodaStreak++;g.rodaScore+=5*(1+Math.floor(g.rodaStreak/10));g.rodaBest=Math.max(g.rodaBest,g.rodaStreak);
 g.feedback=keep?'EMBAIXADINHA':'PASSE';g.feedbackTime=.9;g.contactSerial++;
}
const reachable=(g:Altinha,i:number,height=CONTACT)=>g.ball.vy>0&&g.ball.y>=FLOOR-height&&Math.hypot(g.ball.x-g.players[i].x,g.ball.z-g.players[i].z)<=REACH;
// CPU friends: chance to miss by level, plus 20% after a bad pass from you, plus the trick's risk.
// Tuned by sim (perfect human, 6 seeds, 120 s): Chill 1-7 drops, Club 2-8, Pro 4-11.
// ponytail: level only changes CPU misses; tune human timing windows per level if Chill feels hard.
const CPU_MISS:Record<string,number>={Chill:.03,Club:.06,Pro:.09};
function planCpu(g:Altinha,i:number,level:string){
 // Friends play at your level: only the tricks you have unlocked, easy ones more often.
 const r=g.random,known=tricks.filter(t=>g.unlocked.includes(t.id)),weights=known.map(t=>1/(1+t.risk*20)),total=weights.reduce((a,b)=>a+b);
 let pick=r()*total,k=0;while(k<known.length-1&&(pick-=weights[k])>0)k++;
 const t=known[k],chance=(CPU_MISS[level]??.06)+(g.badPass?.2:0)+t.risk;
 if(!g.touchesThisTurn)g.cpuTouches=1+Math.floor(r()*g.maxTouches);
 g.cpu={trick:t.id,miss:r()>1-chance};g.badPass=false;
}
function cpuTouch(g:Altinha,i:number){
 const t=trickById(g.cpu!.trick),last=g.touchesThisTurn+1>=g.cpuTouches;
 const target=g.random()<.4?0:[1,2,3,4].filter(f=>f!==i)[Math.floor(g.random()*3)];
 if(!g.lastTricks[i].includes(t.id))g.combo[i]=Math.min(MAX_COMBO,g.combo[i]+1);g.lastTricks[i]=[t.id,...g.lastTricks[i]].slice(0,2);
 g.individual[i]+=Math.round(t.points*(1+.5*g.combo[i]));
 g.cpu=null;touch(g,i,last?'pass':'keep',target);g.feedback=t.name;
}
export function armGamebreaker(g:Altinha){if(g.status!=='playing'||g.style<100)return;g.gamebreaker=6;g.gamebreakers++;g.style=0;g.feedback='ALTINHA DE OURO';g.feedbackTime=1.2;}
export function altinhaResult(g:Altinha){
 const king=g.individual.indexOf(Math.max(...g.individual));
 return {rodaBest:g.rodaBest,rodaScore:g.rodaScore,individual:[...g.individual],king,perfects:g.perfects,saves:g.saves,drops:g.drops,gamebreakers:g.gamebreakers};
}
export function stepAltinha(g:Altinha,dt:number,input:AltinhaInput,level:string){
 if(g.status!=='playing')return;
 g.clock+=dt;g.timeLeft=Math.max(0,g.timeLeft-dt);g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 if(!g.timeLeft){g.status='over';g.queued=null;g.holding=false;return;}
 if(g.holding)g.charge=Math.min(1,g.charge+dt*1.6);
 g.gamebreaker=Math.max(0,g.gamebreaker-dt);
 g.players.forEach((p,i)=>{
  if(!i){const x=p.x,z=p.z;moveRunner(p,input.x,input.z,dt);g.run+=Math.hypot(p.x-x,p.z-z);return;}
  const goal=g.receiver===i&&!g.dropTimer?altinhaGuide(g,g.cpu?trickById(g.cpu.trick).height:CONTACT):g.spots[i],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
  moveRunner(p,d>6?dx:0,d>6?dz:0,dt);
 });
 if(g.dropTimer){g.dropTimer=Math.max(0,g.dropTimer-dt);if(!g.dropTimer)toss(g);return;}
 const b=g.ball;b.vy+=gravity(g)*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;
 const q=g.queued;
 if(q){
  q.age+=dt;
  if(reachable(g,0,trickById(q.trick).height)){
   // A salvada is a reaction, not a timed touch: arriving in time counts as fair timing (never perfect).
   const t=trickById(q.trick),save=b.y>FLOOR-35&&g.run>120,raw=pressTiming(q.age).offset,offset=save?Math.sign(raw||1)*Math.min(Math.abs(raw),.5):raw,quality=Math.max(0,1-Math.abs(offset)),ok=quality>=.35+t.risk;g.timing=offset;g.queued=null;
   if(quality<.15){g.feedback='ISOLOU';g.feedbackTime=.9;return;}
   touch(g,0,q.kind,q.target,ok?0:Math.sign(offset||1)*(1-quality)*120);
   g.badPass=!ok;if(ok)scoreTrick(g,t,offset,save);else g.feedback='ERROU O TRICK';
   return;
  }
  if(q.age>QUEUE){g.queued=null;g.feedback=Math.hypot(b.x-g.players[0].x,b.z-g.players[0].z)>REACH?'LONGE':'CEDO';g.feedbackTime=.9;}
 }
 if(g.receiver&&!g.cpu)planCpu(g,g.receiver,level);
 if(g.receiver&&g.cpu&&!g.cpu.miss&&reachable(g,g.receiver,trickById(g.cpu.trick).height)){cpuTouch(g,g.receiver);return;}
 if(b.y>=FLOOR){
  Object.assign(b,{y:FLOOR,vx:0,vz:0,vy:0});g.queued=null;g.drops++;g.rodaStreak=0;g.combo[g.receiver]=Math.floor(g.combo[g.receiver]/2);
  g.feedback='CAIU!';g.feedbackTime=.9;g.dropTimer=1;g.cpu=null;g.badPass=false;
 }
}
