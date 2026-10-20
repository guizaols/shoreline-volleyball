import {moveRunner} from './net.ts';
import {FLOOR,type Player} from './game.ts';

// Beach ultimate, 5 on 5 (WFDF beach rules): one disc, no running with it, a 10 s stall count,
// a point for a catch inside the end zone you attack. Players 0-4 are your team (attacking right), 5-9 the CPU.
// Field 45 × 25 m plus two 15 m end zones, drawn on the same 35..965 × 25..425 court as the other sports.
export const X_MIN=35,X_MAX=965,Z_MIN=25,Z_MAX=425,END_LEFT=221,END_RIGHT=779,STALL=10;
const REACH=38,BLOCK=26,DIVE_REACH=75,MIN_FLIGHT=.35,DISC_HEIGHT=90,BLOCK_HEIGHT=150;
// Throws: a flat pass, the huck (hold J) long and high into space, the hammer (F) over the top. Anything below
// BLOCK_HEIGHT can be knocked down on the way, so high throws are safe mid-flight but slower to arrive.
type ThrowKind='pass'|'huck'|'hammer';
const THROWS:Record<ThrowKind,{speed:number;peak:number;lead:number}>={pass:{speed:520,peak:40,lead:0},huck:{speed:600,peak:150,lead:180},hammer:{speed:360,peak:230,lead:0}};
export type UltimateInput={x:number;z:number;jump:boolean};
type Runner=Player&{dive:number;recover:number};
const runner=(x:number,z:number,team:number):Runner=>({x,z,y:FLOOR,vx:0,vz:0,vy:0,team,action:'idle',actionTime:0,stride:0,landing:0,windup:0,jumpBuffer:0,jumpHeld:false,diveHeld:false,diveX:team?-1:1,diveZ:0,preparation:0,dive:0,recover:0});
// Start of every point: the team with the disc lines up in its own end zone, the defence in front of it.
const lineup=(team:number)=>{const side=(t:number,x:number)=>t?1000-x:x;return Array.from({length:10},(_,i)=>{const t=i<5?0:1,k=i%5,own=t===team;return {x:side(t===0?0:1,own?[200,260,300,300,340][k]:[420,380,380,460,460][k]),z:[225,120,330,60,390][k]};});};
const clampField=(p:{x:number;z:number})=>({x:Math.max(X_MIN,Math.min(X_MAX,p.x)),z:Math.max(Z_MIN,Math.min(Z_MAX,p.z))});
export function createUltimate(opts:{ai?:boolean;autopilot?:boolean;random?:()=>number;goal?:number}={}){
 return {status:'ready' as 'ready'|'playing'|'paused'|'over',resumeStatus:'playing' as 'ready'|'playing'|'paused'|'over',clock:0,score:[0,0],goal:opts.goal??5,ai:opts.ai??true,autopilot:opts.autopilot??false,streakTeam:-1,streakCount:0,onFire:-1,energy:0,specialArmed:false,random:opts.random??Math.random,
  players:lineup(0).map((s,i)=>runner(s.x,s.z,i<5?0:1)),disc:{x:200,z:225,y:FLOOR-DISC_HEIGHT},holder:0,offense:0,active:0,stall:0,
  flight:null as null|{from:{x:number;z:number};to:{x:number;z:number};t:number;T:number;kind:ThrowKind;thrower:number;target:number;curve:number;peak:number;fire?:boolean},layouts:0,
  ground:-1,restartDelay:0,restartTeam:0,charge:0,holding:false,cpuWait:0,feedback:'',feedbackTime:0,contactSerial:0};
}
export type Ultimate=ReturnType<typeof createUltimate>;
const teamOf=(i:number)=>i<5?0:1;
const say=(g:Ultimate,text:string)=>{g.feedback=text;g.feedbackTime=1.2;};
function give(g:Ultimate,i:number){
 g.holder=i;g.offense=teamOf(i);g.stall=0;g.flight=null;g.ground=-1;g.cpuWait=0;g.contactSerial++;g.holding=false;g.charge=0;
 const p=g.players[i];p.vx=p.vz=0;Object.assign(g.disc,{x:p.x,z:p.z,y:FLOOR-DISC_HEIGHT});
 g.active=g.offense===0?i:nearest(g,0,g.disc);
}
function nearest(g:Ultimate,team:number,at:{x:number;z:number}){
 let best=-1,d=Infinity;g.players.forEach((p,i)=>{const e=Math.hypot(p.x-at.x,p.z-at.z);if(teamOf(i)===team&&e<d){d=e;best=i;}});return best;
}
function restart(g:Ultimate,team:number){
 lineup(team).forEach((s,i)=>Object.assign(g.players[i],{x:s.x,z:s.z,vx:0,vz:0,dive:0,recover:0,action:'idle'}));give(g,team?5:0);
}
export function startUltimate(g:Ultimate){if(g.status!=='ready')return;g.status='playing';restart(g,0);}
export function pauseUltimate(g:Ultimate){if(g.status==='paused')g.status=g.resumeStatus;else if(g.status==='playing'){g.resumeStatus='playing';g.status='paused';g.holding=false;g.charge=0;}}
// The teammate your direction points at (no direction: the one furthest upfield).
export function throwTarget(g:Ultimate,dir:{x:number;z:number}){
 const from=g.players[g.holder],forward=g.offense?-1:1,len=Math.hypot(dir.x,dir.z);let best=-1,score=-Infinity;
 g.players.forEach((q,i)=>{
  if(i===g.holder||teamOf(i)!==g.offense)return;const dx=q.x-from.x,dz=q.z-from.z,d=Math.hypot(dx,dz)||1;
  const s=len>.2?(dx*dir.x+dz*dir.z)/(d*len):dx*forward/1000;if(s>score){score=s;best=i;}
 });
 return best;
}
const human=(g:Ultimate)=>g.status==='playing'&&!g.restartDelay&&!g.autopilot&&g.holder>=0&&g.offense===0&&g.active===g.holder;
// Disco de Fogo: earned by catches, layouts and blocks; your next throw flies faster and cannot be knocked down.
export function armUltimateSpecial(g:Ultimate){if(g.status==='playing'&&g.energy>=100)g.specialArmed=!g.specialArmed;}
export function pressUltimate(g:Ultimate){if(!human(g)||g.holding)return;g.holding=true;g.charge=0;}
export function releaseUltimate(g:Ultimate,dir:{x:number;z:number},kind:'pass'|'hammer'){
 const ok=human(g)&&g.holding,plan=ok?throwPlan(g,dir,kind,g.charge>=.65):null;g.holding=false;g.charge=0;
 if(plan)throwDisc(g,g.holder,plan.target,plan.kind,plan.curve);
}
// Your throw as it will happen: receiver, kind, bend and landing spot. The scene draws exactly this as the aim.
export function throwPlan(g:Ultimate,dir:{x:number;z:number},kind:'pass'|'hammer',huck:boolean){
 const target=g.holder>=0?throwTarget(g,dir):-1;if(target<0)return null;
 // Aiming well off the receiver (over 30°) bends the disc that way, up to 60 units at mid-flight (Windjammers style);
 // keyboard aim is only 8 directions, so smaller offsets throw straight.
 const a=g.players[g.holder],b=g.players[target],len=Math.hypot(dir.x,dir.z),tx=b.x-a.x,tz=b.z-a.z,td=Math.hypot(tx,tz)||1;
 const side=len>.2?(tx*dir.z-tz*dir.x)/(td*len):0,curve=Math.abs(side)>.5?Math.max(-1,Math.min(1,side/.8))*60:0;
 const throwKind:ThrowKind=kind==='hammer'?'hammer':huck?'huck':'pass';
 return {target,kind:throwKind,curve,...landing(g,g.holder,target,throwKind,curve,teamOf(g.holder)===0&&g.specialArmed)};
}
// Lead the receiver: throw to where they will be when the disc arrives; a huck goes further, along the throw.
function landing(g:Ultimate,thrower:number,target:number,kind:ThrowKind,curve:number,fire:boolean){
 const a=g.players[thrower],b=g.players[target],{speed,lead}=THROWS[kind],pace=(curve?1.2:1)*(fire?.75:1);
 const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1,T0=Math.max(MIN_FLIGHT,d/speed)*pace;
 const to=clampField({x:b.x+b.vx*T0+dx/d*lead,z:b.z+b.vz*T0+dz/d*lead});
 return {to,T:Math.max(MIN_FLIGHT,Math.hypot(to.x-a.x,to.z-a.z)/speed)*pace};
}
export function layoutUltimate(g:Ultimate,dir:{x:number;z:number}){
 const p=g.players[g.active];if(g.status!=='playing'||g.restartDelay||!p||g.active===g.holder||p.dive||p.recover)return;
 let x=dir.x,z=dir.z;if(Math.hypot(x,z)<.2){x=g.disc.x-p.x;z=g.disc.z-p.z;}const d=Math.hypot(x,z)||1;
 p.dive=.45;p.vx=x/d*560;p.vz=z/d*560;p.diveX=x/d;p.diveZ=z/d;p.action='dive';
}
function throwDisc(g:Ultimate,thrower:number,target:number,kind:ThrowKind='pass',curve=0){
 const a=g.players[thrower],{peak}=THROWS[kind],fire=teamOf(thrower)===0&&g.specialArmed,{to,T}=landing(g,thrower,target,kind,curve,fire);
 if(fire){g.specialArmed=false;g.energy=0;say(g,'DISCO DE FOGO');}
 g.flight={from:{x:a.x,z:a.z},to,t:0,T,kind,thrower,target,curve,peak,fire};g.holder=-1;g.stall=0;
 if(g.offense===1)g.active=nearest(g,0,to);
 if(g.offense===0)g.active=target;
}
const scores=(team:number,x:number)=>team?x<=END_LEFT:x>=END_RIGHT;
function turnover(g:Ultimate,text:string){
 say(g,text);const team=1-g.offense,at=clampField(g.disc);g.flight=null;g.holder=-1;g.holding=false;g.charge=0;g.offense=team;g.ground=nearest(g,team,at);g.active=team===0?g.ground:nearest(g,0,at);Object.assign(g.disc,{...at,y:FLOOR-4});g.cpuWait=.6;
}
function catchDisc(g:Ultimate,i:number){
 const team=teamOf(i),intercepted=team!==g.offense,dived=g.players[i].dive>0;give(g,i);
 if(dived&&!team)g.layouts++;
 if(!team)g.energy=Math.min(100,g.energy+(dived?30:intercepted?25:15));
 if(scores(team,g.players[i].x)){g.score[team]++;say(g,intercepted?'CALLAHAN!':'PONTO!');
  // Three points in a row put that team on fire (faster) until the other team scores.
  g.streakCount=g.streakTeam===team?g.streakCount+1:1;g.streakTeam=team;g.onFire=g.streakCount>=3?team:-1;if(g.streakCount===3)say(g,'EM CHAMAS!');if(g.score[team]>=g.goal){g.status='over';return;}g.restartDelay=1.5;g.restartTeam=1-team;return;}
 say(g,dived?(intercepted?'LAYOUT D!':'LAYOUT!'):intercepted?'INTERCEPTOU!':'PEGOU');
}
function stepFlight(g:Ultimate,dt:number){
 const f=g.flight!;f.t+=dt;const u=Math.min(1,f.t/f.T);
 const dx=f.to.x-f.from.x,dz=f.to.z-f.from.z,len=Math.hypot(dx,dz)||1,bend=f.curve*4*u*(1-u);
 Object.assign(g.disc,{x:f.from.x+dx*u-dz/len*bend,z:f.from.z+dz*u+dx/len*bend,y:FLOOR-DISC_HEIGHT-f.peak*4*u*(1-u)});
 // Diving players reach much further.
 const close=(r:number,dive:number)=>g.players.map((p,i)=>({i,d:Math.hypot(p.x-g.disc.x,p.z-g.disc.z)})).filter(c=>c.d<=(g.players[c.i].dive?dive:r)&&c.i!==f.thrower).sort((a,b)=>a.d-b.d);
 // A low throw can be knocked down by a defender in its lane.
 if(!f.fire&&u>.25&&u<.85&&FLOOR-g.disc.y<BLOCK_HEIGHT){const d=close(BLOCK,60).find(c=>teamOf(c.i)!==g.offense);if(d){catchDisc(g,d.i);if(g.status==='playing'&&!g.restartDelay)say(g,'BLOQUEIO!');return;}}
 // At the end of the flight the receiver's side catches anything in reach; a defender has to be right in the way
 // (well inside reach and closer than every attacker) to take it.
 if(u>=.85){const all=close(REACH,DIVE_REACH),mine=all.find(c=>teamOf(c.i)===g.offense),theirs=all.find(c=>teamOf(c.i)!==g.offense);
  const steal=theirs&&(theirs.d<=REACH*.6||g.players[theirs.i].dive>0)&&(!mine||theirs.d<mine.d-10);
  if(steal){catchDisc(g,theirs.i);return;}if(mine){catchDisc(g,mine.i);return;}}
 if(u>=1)turnover(g,'CAIU!');
}
// Tuned by sim (CPU vs CPU, 6 seeds): about 2 minutes to 5 points, 8-15 turnovers, either side can win.
// CPU players. Offence spreads into cutting lanes ahead of the disc, the receiver runs to the throw; defence marks
// the same slot on the other team, a step goal-side, and the closest defender chases a throw.
const DEFENCE_SPEED:Record<string,number>={Chill:270,Club:290,Pro:305};
function aiGoal(g:Ultimate,i:number){
 const p=g.players[i],team=teamOf(i),f=g.flight,forward=g.offense?-1:1;
 if(g.ground===i)return g.disc;
 if(f&&f.target===i)return f.to;
 // The closest defender reads the throw after a 0.35 s reaction.
 if(f&&team!==g.offense&&f.t>.35&&nearest(g,team,f.to)===i)return f.to;
 if(team===g.offense){
  const mates=[0,1,2,3,4].map(k=>k+team*5).filter(k=>k!==g.holder),k=Math.max(0,mates.indexOf(i));
  return clampField({x:g.disc.x+forward*[110,190,270,150][k],z:[90,360,225,300][k]+Math.sin(g.clock*1.3+i)*50});
 }
 // The thrower's mark stands 30 upfield; everyone else trails their cutter by a step (cuts beat the mark).
 const mark=(i+5)%10,m=g.players[mark];return mark===g.holder?{x:m.x+forward*30,z:m.z}:{x:m.x-forward*22,z:m.z+(p.z>m.z?10:-10)};
}
function lane(g:Ultimate,from:{x:number;z:number},to:{x:number;z:number},team:number){
 const dx=to.x-from.x,dz=to.z-from.z,d=dx*dx+dz*dz||1;
 return Math.min(...g.players.filter((_,i)=>teamOf(i)!==team).map(q=>{const t=Math.max(0,Math.min(1,((q.x-from.x)*dx+(q.z-from.z)*dz)/d));return Math.hypot(q.x-from.x-dx*t,q.z-from.z-dz*t);}));
}
// The CPU holder looks for the most open teammate upfield; under stall pressure it throws anyway.
function cpuThrow(g:Ultimate,dt:number){
 g.cpuWait+=dt;if(g.cpuWait<.7+g.random()*.05)return;
 const a=g.players[g.holder],team=g.offense,forward=team?-1:1;let best=-1,score=-Infinity,open=0,gap=0;
 g.players.forEach((q,i)=>{
  if(i===g.holder||teamOf(i)!==team)return;
  const free=Math.min(...g.players.filter((_,j)=>teamOf(j)!==team).map(d=>Math.hypot(d.x-q.x,d.z-q.z))),space=lane(g,a,q,team);
  const s=(q.x-a.x)*forward*.6+Math.min(free,120)+Math.min(space,80)*1.2;if(s>score){score=s;best=i;open=free;gap=space;}
 });
 if(best<0||open<35&&g.stall<6.5)return;
 const deep=(g.players[best].x-a.x)*forward>200,kind:ThrowKind=deep&&open>90&&g.random()<.5?'huck':gap<30&&g.random()<.4?'hammer':'pass';
 throwDisc(g,g.holder,best,kind,gap<30&&kind==='pass'?(g.random()<.5?-45:45):0);
}
export function stepUltimate(g:Ultimate,dt:number,input:UltimateInput,level:string){
 if(g.status!=='playing')return;
 g.clock+=dt;g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 if(g.restartDelay){g.restartDelay=Math.max(0,g.restartDelay-dt);if(!g.restartDelay)restart(g,g.restartTeam);return;}
 if(g.holding)g.charge=Math.min(1,g.charge+dt*1.6);
 g.players.forEach((p,i)=>{
  const control=i===g.active&&i!==g.holder;
  // A dive carries you on with no steering; you get up after a short recovery.
  if(p.dive){p.dive=Math.max(0,p.dive-dt);p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=.9;p.vz*=.9;if(!p.dive){p.recover=.6;p.vx=p.vz=0;}return;}
  if(p.recover){p.recover=Math.max(0,p.recover-dt);if(!p.recover)p.action='idle';return;}
  if(i===g.holder){moveRunner(p,0,0,dt);p.x=g.disc.x;p.z=g.disc.z;return;}
  const speed=(teamOf(i)===g.offense?300:DEFENCE_SPEED[level]??290)*(g.onFire===teamOf(i)?1.15:1);
  // Your receiver runs to the landing ring on its own until you steer; the picker always walks to the disc.
  const steering=Math.hypot(input.x,input.z)>.2&&!(i===g.ground);
  if(control&&!g.autopilot&&steering){moveRunner(p,input.x,input.z,dt,speed);return;}
  if(control&&!g.autopilot&&!(g.flight?.target===i||g.ground===i)){moveRunner(p,0,0,dt,speed);return;}
  const goal=g.ai||g.flight?.target===i&&teamOf(i)===0?aiGoal(g,i):p,dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
  moveRunner(p,d>8?dx:0,d>8?dz:0,dt,speed);
 });
 if(g.flight){stepFlight(g,dt);return;}
 if(g.ground>=0){
  const p=g.players[g.ground];g.cpuWait=Math.max(0,g.cpuWait-dt);
  // The picker walks to the disc and plays it from there (scripted tests without AI hand it over after the wait).
  if(Math.hypot(p.x-g.disc.x,p.z-g.disc.z)<20||!g.ai&&!g.cpuWait){p.x=g.disc.x;p.z=g.disc.z;give(g,g.ground);}return;}
 if(g.holder>=0&&g.ai&&(g.offense===1||g.autopilot)){cpuThrow(g,dt);if(g.flight)return;}
 if(g.holder>=0){g.stall+=dt;if(g.stall>=STALL){Object.assign(g.disc,{y:FLOOR-4});g.offense=teamOf(g.holder);turnover(g,'STALL!');}}
}
