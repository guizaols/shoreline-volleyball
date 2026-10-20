import {moveRunner} from './net.ts';
import {FLOOR,type Player} from './game.ts';

// Beach ultimate, 5 on 5 (WFDF beach rules): one disc, no running with it, a 10 s stall count,
// a point for a catch inside the end zone you attack. Players 0-4 are your team (attacking right), 5-9 the CPU.
// Field 45 × 25 m plus two 15 m end zones, drawn on the same 35..965 × 25..425 court as the other sports.
export const X_MIN=35,X_MAX=965,Z_MIN=25,Z_MAX=425,END_LEFT=221,END_RIGHT=779,STALL=10;
const REACH=38,BLOCK=26,PASS_SPEED=520,MIN_FLIGHT=.35,DISC_HEIGHT=90;
export type UltimateInput={x:number;z:number;jump:boolean};
type Runner=Player&{dive:number};
const runner=(x:number,z:number,team:number):Runner=>({x,z,y:FLOOR,vx:0,vz:0,vy:0,team,action:'idle',actionTime:0,stride:0,landing:0,windup:0,jumpBuffer:0,jumpHeld:false,diveHeld:false,diveX:team?-1:1,diveZ:0,preparation:0,dive:0});
// Start of every point: the team with the disc lines up in its own end zone, the defence in front of it.
const lineup=(team:number)=>{const side=(t:number,x:number)=>t?1000-x:x;return Array.from({length:10},(_,i)=>{const t=i<5?0:1,k=i%5,own=t===team;return {x:side(t===0?0:1,own?[200,260,300,300,340][k]:[420,380,380,460,460][k]),z:[225,120,330,60,390][k]};});};
const clampField=(p:{x:number;z:number})=>({x:Math.max(X_MIN,Math.min(X_MAX,p.x)),z:Math.max(Z_MIN,Math.min(Z_MAX,p.z))});
export function createUltimate(opts:{ai?:boolean;random?:()=>number;goal?:number}={}){
 return {status:'ready' as 'ready'|'playing'|'paused'|'over',resumeStatus:'playing' as 'ready'|'playing'|'paused'|'over',clock:0,score:[0,0],goal:opts.goal??5,ai:opts.ai??true,random:opts.random??Math.random,
  players:lineup(0).map((s,i)=>runner(s.x,s.z,i<5?0:1)),disc:{x:200,z:225,y:FLOOR-DISC_HEIGHT},holder:0,offense:0,active:0,stall:0,
  flight:null as null|{from:{x:number;z:number};to:{x:number;z:number};t:number;T:number;kind:'pass';thrower:number;target:number},
  ground:-1,restartDelay:0,restartTeam:0,charge:0,holding:false,cpuWait:0,feedback:'',feedbackTime:0,contactSerial:0};
}
export type Ultimate=ReturnType<typeof createUltimate>;
const teamOf=(i:number)=>i<5?0:1;
const say=(g:Ultimate,text:string)=>{g.feedback=text;g.feedbackTime=1.2;};
function give(g:Ultimate,i:number){
 g.holder=i;g.offense=teamOf(i);g.stall=0;g.flight=null;g.ground=-1;g.cpuWait=0;g.contactSerial++;
 const p=g.players[i];p.vx=p.vz=0;Object.assign(g.disc,{x:p.x,z:p.z,y:FLOOR-DISC_HEIGHT});
 g.active=g.offense===0?i:nearest(g,0,g.disc);
}
function nearest(g:Ultimate,team:number,at:{x:number;z:number}){
 let best=-1,d=Infinity;g.players.forEach((p,i)=>{const e=Math.hypot(p.x-at.x,p.z-at.z);if(teamOf(i)===team&&e<d){d=e;best=i;}});return best;
}
function restart(g:Ultimate,team:number){
 lineup(team).forEach((s,i)=>Object.assign(g.players[i],{x:s.x,z:s.z,vx:0,vz:0}));give(g,team?5:0);
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
const human=(g:Ultimate)=>g.status==='playing'&&!g.restartDelay&&g.holder>=0&&g.offense===0&&g.active===g.holder;
export function pressUltimate(g:Ultimate){if(!human(g))return;g.holding=true;g.charge=0;}
export function releaseUltimate(g:Ultimate,dir:{x:number;z:number},kind:'pass'|'hammer'){
 const ok=human(g)&&g.holding;g.holding=false;g.charge=0;if(!ok)return;void kind;
 const target=throwTarget(g,dir);if(target>=0)throwDisc(g,g.holder,target);
}
function throwDisc(g:Ultimate,thrower:number,target:number){
 const a=g.players[thrower],b=g.players[target];
 let T=Math.max(MIN_FLIGHT,Math.hypot(b.x-a.x,b.z-a.z)/PASS_SPEED);
 // Lead the receiver: throw to where they will be when the disc arrives.
 const to=clampField({x:b.x+b.vx*T,z:b.z+b.vz*T});T=Math.max(MIN_FLIGHT,Math.hypot(to.x-a.x,to.z-a.z)/PASS_SPEED);
 g.flight={from:{x:a.x,z:a.z},to,t:0,T,kind:'pass',thrower,target};g.holder=-1;g.stall=0;
 if(g.offense===0)g.active=target;
}
const scores=(team:number,x:number)=>team?x<=END_LEFT:x>=END_RIGHT;
function turnover(g:Ultimate,text:string){
 say(g,text);const team=1-g.offense,at=clampField(g.disc);g.flight=null;g.offense=team;g.ground=nearest(g,team,at);Object.assign(g.disc,{...at,y:FLOOR-4});g.cpuWait=.6;
}
function catchDisc(g:Ultimate,i:number){
 const team=teamOf(i),intercepted=team!==g.offense;give(g,i);
 if(scores(team,g.players[i].x)){g.score[team]++;say(g,'PONTO!');if(g.score[team]>=g.goal){g.status='over';return;}g.restartDelay=1.5;g.restartTeam=1-team;return;}
 say(g,intercepted?'INTERCEPTOU!':'PEGOU');
}
function stepFlight(g:Ultimate,dt:number){
 const f=g.flight!;f.t+=dt;const u=Math.min(1,f.t/f.T);
 Object.assign(g.disc,{x:f.from.x+(f.to.x-f.from.x)*u,z:f.from.z+(f.to.z-f.from.z)*u,y:FLOOR-DISC_HEIGHT-40*4*u*(1-u)});
 const close=(r:number)=>g.players.map((p,i)=>({i,d:Math.hypot(p.x-g.disc.x,p.z-g.disc.z)})).filter(c=>c.d<=r&&c.i!==f.thrower).sort((a,b)=>a.d-b.d);
 // A flat throw can be knocked down by a defender in its lane.
 if(u>.1&&u<.85){const d=close(BLOCK).find(c=>teamOf(c.i)!==g.offense);if(d){catchDisc(g,d.i);if(g.status==='playing'&&!g.restartDelay)say(g,'BLOQUEIO!');return;}}
 if(u>=.85){const c=close(REACH)[0];if(c){catchDisc(g,c.i);return;}}
 if(u>=1)turnover(g,'CAIU!');
}
export function stepUltimate(g:Ultimate,dt:number,input:UltimateInput,_level:string){
 if(g.status!=='playing')return;
 g.clock+=dt;g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 if(g.restartDelay){g.restartDelay=Math.max(0,g.restartDelay-dt);if(!g.restartDelay)restart(g,g.restartTeam);return;}
 if(g.holding)g.charge=Math.min(1,g.charge+dt*1.6);
 g.players.forEach((p,i)=>{
  const control=i===g.active&&i!==g.holder;
  moveRunner(p,control?input.x:0,control?input.z:0,dt);
  if(i===g.holder){p.x=g.disc.x;p.z=g.disc.z;}
 });
 if(g.flight){stepFlight(g,dt);return;}
 if(g.ground>=0){g.cpuWait=Math.max(0,g.cpuWait-dt);if(!g.cpuWait){const p=g.players[g.ground];p.x=g.disc.x;p.z=g.disc.z;give(g,g.ground);}return;}
 if(g.holder>=0){g.stall+=dt;if(g.stall>=STALL){Object.assign(g.disc,{y:FLOOR-4});g.offense=teamOf(g.holder);turnover(g,'STALL!');}}
}
