import {moveRunner} from './net.ts';
import {FLOOR,type Player} from './game.ts';
import {PERFECT_ETA} from './arcade.ts';

// Frescobol: two friends with wooden paddles keep a rubber ball going, no net, no winner. One shared score that grows
// with the sequence. You (player 0) on the left, a CPU partner on the right. Rounds of 2 minutes.
export type FrescobolInput={x:number;z:number};
const GRAVITY=620,CONTACT=110,REACH=45,ROUND=120,TIMING_SPAN=.3,SPOTS=[{x:330,z:225},{x:670,z:225}];
// Shots: the golpe, the ataque (hold J: fast, worth triple, harder for your partner and needs tighter timing) and the
// lob (F: slow and high, a breather). Risk narrows the timing that works, as in altinha.
type Shot='golpe'|'ataque'|'lob';
const SHOTS:Record<Shot,{T:number;points:number;risk:number;name:string}>={golpe:{T:.9,points:10,risk:0,name:'GOLPE'},ataque:{T:.55,points:30,risk:.35,name:'ATAQUE'},lob:{T:1.4,points:5,risk:-.1,name:'BOLA ALTA'}};
const runner=(x:number,z:number,team:number):Player=>({x,z,y:FLOOR,vx:0,vz:0,vy:0,team,action:'idle',actionTime:0,stride:0,landing:0,windup:0,jumpBuffer:0,jumpHeld:false,diveHeld:false,diveX:team?-1:1,diveZ:0,preparation:0});
export function createFrescobol(opts:{random?:()=>number}={}){
 return {status:'ready' as 'ready'|'playing'|'paused'|'over',resumeStatus:'playing' as 'ready'|'playing'|'paused'|'over',clock:0,timeLeft:ROUND,random:opts.random??Math.random,
  players:SPOTS.map((s,i)=>runner(s.x,s.z,i)),ball:{x:SPOTS[1].x,z:SPOTS[1].z,y:FLOOR-CONTACT,vx:0,vz:0,vy:0},target:{...SPOTS[0]},receiver:0,hitter:1,
  incoming:'golpe' as Shot,badShot:false,cpuMiss:false,charge:0,holding:false,queued:null as null|{kind:'hit'|'lob';ataque:boolean;aim:FrescobolInput;age:number},
  holdKind:'hit' as 'hit'|'lob',late:0,sequence:0,best:0,score:0,drops:0,dropTimer:0,perfects:0,ataques:0,rhythm:0,pancada:0,pancadas:0,feedback:'',feedbackTime:0,contactSerial:0,timing:null as number|null};
}
export type Frescobol=ReturnType<typeof createFrescobol>;
const say=(g:Frescobol,text:string)=>{g.feedback=text;g.feedbackTime=1;};
function launch(g:Frescobol,to:{x:number;z:number},T:number){
 const b=g.ball;g.target={...to};b.vx=(to.x-b.x)/T;b.vz=(to.z-b.z)/T;b.vy=(FLOOR-CONTACT-b.y-.5*GRAVITY*T*T)/T;
}
// The partner serves to you after every drop and at the start.
function serve(g:Frescobol){const p=g.players[1];Object.assign(g.ball,{x:p.x,z:p.z,y:FLOOR-CONTACT});g.receiver=0;g.hitter=1;g.incoming='golpe';g.badShot=false;launch(g,g.players[0],SHOTS.golpe.T);}
export function startFrescobol(g:Frescobol){if(g.status!=='ready')return;g.status='playing';serve(g);}
export function pauseFrescobol(g:Frescobol){if(g.status==='paused')g.status=g.resumeStatus;else if(g.status==='playing'){g.resumeStatus='playing';g.status='paused';g.holding=false;g.charge=0;}}
// Where and when the ball reaches hitting height (the landing ring and the timing both use it).
export function frescobolGuide(g:Frescobol){
 const b=g.ball,c=b.y-(FLOOR-CONTACT),disc=b.vy*b.vy-2*GRAVITY*c,time=disc<0?0:Math.max(0,(-b.vy+Math.sqrt(disc))/GRAVITY);
 return {x:b.x+b.vx*time,z:b.z+b.vz*time,time};
}
// Your shot as it will happen: the direction places it left/right of your partner (and short/deep).
export function shotPlan(g:Frescobol,aim:FrescobolInput,kind:'hit'|'lob',ataque:boolean){
 const shot:Shot=kind==='lob'?'lob':ataque?'ataque':'golpe',s=SPOTS[1],side=Math.abs(aim.z)>.2?Math.sign(aim.z):0,depth=Math.abs(aim.x)>.2?Math.sign(aim.x):0;
 return {shot,to:{x:s.x+depth*60,z:s.z+side*90},T:SHOTS[shot].T,points:SHOTS[shot].points};
}
const mine=(g:Frescobol)=>g.status==='playing'&&g.receiver===0&&!g.dropTimer;
// Holding may start while the ball is with your partner; only the release has to be on your turn.
export function pressFrescobol(g:Frescobol,kind:'hit'|'lob'='hit'){if(g.status!=='playing'||g.holding)return;g.holding=true;g.charge=0;g.holdKind=kind;}
export function releaseFrescobol(g:Frescobol,aim:FrescobolInput,kind:'hit'|'lob'){
 const ataque=g.charge>=.65;g.holding=false;g.charge=0;if(!mine(g)||g.queued)return;
 // Released after the ball already passed the hitting point: that lateness counts against the timing.
 g.queued={kind,ataque:kind==='hit'&&ataque,aim:{...aim},age:-g.late};
}
// Pancada de Ouro: perfect hits fill the rhythm meter; K gives 6 s of double points and a partner who never misses.
export function armPancada(g:Frescobol){if(g.status!=='playing'||g.rhythm<100)return;g.pancada=6;g.pancadas++;g.rhythm=0;say(g,'PANCADA DE OURO');}
function addPoints(g:Frescobol,points:number,perfect:boolean){
 g.sequence++;g.best=Math.max(g.best,g.sequence);
 g.score+=Math.round(points*(1+Math.floor(g.sequence/10)*.5)*(perfect?1.5:1))*(g.pancada>0?2:1);g.contactSerial++;
}
function humanHit(g:Frescobol){
 const q=g.queued!,plan=shotPlan(g,q.aim,q.kind,q.ataque),s=SHOTS[plan.shot],err=Math.abs(q.age-PERFECT_ETA),quality=Math.max(0,1-err/TIMING_SPAN);
 g.queued=null;g.timing=Math.max(-1,Math.min(1,(q.age-PERFECT_ETA)/TIMING_SPAN));
 if(quality<.15){g.hitter=0;say(g,'ISOLOU');return;}
 const ok=quality>=.35+s.risk,perfect=ok&&err<=.03;g.hitter=0;g.receiver=1;g.incoming=plan.shot;g.badShot=!ok;
 // A mistimed shot still goes over, but off your aim (up to 150 units) and weak: a hard ball for your partner.
 const off=ok?0:Math.sign(q.age-PERFECT_ETA||1)*(1-quality)*150;launch(g,{x:plan.to.x,z:Math.max(40,Math.min(410,plan.to.z+off))},ok?plan.T:SHOTS.golpe.T);
 if(!ok){g.sequence++;g.best=Math.max(g.best,g.sequence);g.contactSerial++;say(g,'ERROU O GOLPE');return;}
 if(perfect){g.perfects++;g.rhythm=Math.min(100,g.rhythm+20);}else g.rhythm=Math.min(100,g.rhythm+5);
 if(plan.shot==='ataque')g.ataques++;
 addPoints(g,plan.points,perfect);say(g,s.name+(perfect?' · PERFEITO':''));
}
// The partner misses by level, more against your ataques and mistimed shots. Placement adds no hidden risk.
// Tuned by sim (perfect human, 120 s, Club): about 1 drop with golpes only, 13 with ataques only.
const PARTNER_MISS:Record<string,number>={Chill:.02,Club:.04,Pro:.07};
function planPartner(g:Frescobol,level:string){
 const chance=(PARTNER_MISS[level]??.04)+(g.incoming==='ataque'?.1:0)+(g.badShot?.25:0);
 g.cpuMiss=g.pancada<=0&&g.random()>1-chance;
}
function partnerHit(g:Frescobol){
 const p=g.players[1],far=Math.hypot(p.x-SPOTS[1].x,p.z-SPOTS[1].z)>80,r=g.random(),shot:Shot=far?'lob':r<.15?'ataque':'golpe',me=g.players[0];
 g.hitter=1;g.receiver=0;g.incoming=shot;g.badShot=false;launch(g,{x:me.x,z:Math.max(40,Math.min(410,me.z+(g.random()-.5)*80))},SHOTS[shot].T);
 addPoints(g,SHOTS[shot].points,false);say(g,SHOTS[shot].name);
}
const reachable=(g:Frescobol,i:number)=>g.ball.vy>0&&g.ball.y>=FLOOR-CONTACT&&Math.hypot(g.ball.x-g.players[i].x,g.ball.z-g.players[i].z)<=REACH;
export function stepFrescobol(g:Frescobol,dt:number,input:FrescobolInput,level:string){
 if(g.status!=='playing')return;
 g.clock+=dt;g.timeLeft=Math.max(0,g.timeLeft-dt);g.feedbackTime=Math.max(0,g.feedbackTime-dt);g.pancada=Math.max(0,g.pancada-dt);
 if(!g.timeLeft){g.status='over';g.queued=null;g.holding=false;return;}
 if(g.holding)g.charge=Math.min(1,g.charge+dt*1.6);
 moveRunner(g.players[0],input.x,input.z,dt);
 const partner=g.players[1],goal=g.receiver===1&&!g.dropTimer?frescobolGuide(g):SPOTS[1],dx=goal.x-partner.x,dz=goal.z-partner.z,d=Math.hypot(dx,dz);
 moveRunner(partner,d>6?dx:0,d>6?dz:0,dt,320);
 if(g.dropTimer){g.dropTimer=Math.max(0,g.dropTimer-dt);if(!g.dropTimer)serve(g);return;}
 const b=g.ball;b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;
 g.late=g.receiver===0&&!g.queued&&reachable(g,0)?g.late+dt:0;
 if(g.queued){g.queued.age+=dt;if(reachable(g,0)){humanHit(g);if(g.receiver===1)planPartner(g,level);return;}if(g.queued&&g.queued.age>.5){g.queued=null;say(g,'CEDO');}}
 if(g.receiver===1&&!g.cpuMiss&&reachable(g,1)){partnerHit(g);return;}
 if(b.y>=FLOOR){Object.assign(b,{y:FLOOR,vx:0,vz:0,vy:0});g.queued=null;g.drops++;g.sequence=0;say(g,'CAIU!');g.dropTimer=1;}
}
