import {moveRunner} from './net.ts';
import {FLOOR,type Player} from './game.ts';
import {pressTiming} from './arcade.ts';

// Altinha: five friends in a circle keep the ball up. Player 0 is the human; the others are CPU friends.
// One roda score for everyone (grows while the ball stays up) and one score per player.
export type AltinhaInput={x:number;z:number;jump:boolean};
const GRAVITY=620,CONTACT=60,REACH=45,ROUND=120,KEEP_FLIGHT=.8,PASS_FLIGHT=1.1,QUEUE=.5;
const spotsFor=(n:number)=>Array.from({length:n},(_,i)=>{const a=(90+i*72)*Math.PI/180;return {x:500+Math.cos(a)*150,z:225+Math.sin(a)*150};});
const runner=(x:number,z:number):Player=>({x,z,y:FLOOR,vx:0,vz:0,vy:0,team:0,action:'idle',actionTime:0,stride:0,landing:0,windup:0,jumpBuffer:0,jumpHeld:false,diveHeld:false,diveX:1,diveZ:0,preparation:0});
export function createAltinha(opts:{maxTouches?:1|2|3;random?:()=>number}={}){
 const spots=spotsFor(5);
 return {status:'ready' as 'ready'|'playing'|'paused'|'over',resumeStatus:'playing' as 'ready'|'playing'|'paused'|'over',clock:0,timeLeft:ROUND,
  spots,players:spots.map(s=>runner(s.x,s.z)),ball:{x:spots[0].x,z:spots[0].z,y:FLOOR-CONTACT,vx:0,vz:0,vy:0},
  receiver:0,holder:0,touchesThisTurn:0,maxTouches:opts.maxTouches??3,rodaScore:0,rodaStreak:0,rodaBest:0,individual:[0,0,0,0,0],combo:[0,0,0,0,0],drops:0,dropTimer:0,
  charge:0,holding:false,queued:null as null|{kind:'keep'|'pass';target:number;hold:boolean;age:number},
  feedback:'',feedbackTime:0,contactSerial:0,timing:null as number|null,random:opts.random??Math.random};
}
export type Altinha=ReturnType<typeof createAltinha>;
// Sends the ball so it comes down to contact height over `to` after `flight` seconds.
function launchTo(g:Altinha,to:{x:number;z:number},flight:number){
 const b=g.ball;b.vx=(to.x-b.x)/flight;b.vz=(to.z-b.z)/flight;b.vy=(FLOOR-CONTACT-b.y-.5*GRAVITY*flight*flight)/flight;
}
function toss(g:Altinha){const p=g.players[g.receiver];Object.assign(g.ball,{x:p.x,z:p.z,y:FLOOR-CONTACT});g.touchesThisTurn=0;launchTo(g,p,KEEP_FLIGHT);}
export function startAltinha(g:Altinha){if(g.status!=='ready')return;g.status='playing';toss(g);}
export function pauseAltinha(g:Altinha){if(g.status==='paused')g.status=g.resumeStatus;else if(g.status==='playing'){g.resumeStatus=g.status;g.status='paused';g.holding=false;}}
// Where and when the falling ball reaches contact height (the landing ring and the timing both use it).
export function altinhaGuide(g:Altinha){
 const b=g.ball,c=b.y-(FLOOR-CONTACT),disc=b.vy*b.vy-2*GRAVITY*c,time=disc<0?0:Math.max(0,(-b.vy+Math.sqrt(disc))/GRAVITY);
 return {x:b.x+b.vx*time,z:b.z+b.vz*time,time,height:CONTACT};
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
export function releaseAltinha(g:Altinha,input:{x:number;z:number},kind:'keep'|'pass'){
 const hold=g.charge>=.65;g.holding=false;g.charge=0;
 if(!mine(g)||g.queued)return;
 g.queued={kind,target:passTarget(g,input),hold,age:0};
}
function touch(g:Altinha,i:number,kind:'keep'|'pass',target:number){
 const n=g.touchesThisTurn+1,keep=kind==='keep'&&n<g.maxTouches;
 g.holder=i;
 if(keep){g.touchesThisTurn=n;launchTo(g,g.players[i],KEEP_FLIGHT);}
 else{g.receiver=target;g.touchesThisTurn=0;launchTo(g,g.players[target],PASS_FLIGHT);}
 g.rodaStreak++;g.rodaScore+=5*(1+Math.floor(g.rodaStreak/10));g.rodaBest=Math.max(g.rodaBest,g.rodaStreak);
 g.feedback=keep?'EMBAIXADINHA':'PASSE';g.feedbackTime=.9;g.contactSerial++;
}
const reachable=(g:Altinha,i:number)=>g.ball.vy>0&&g.ball.y>=FLOOR-CONTACT&&Math.hypot(g.ball.x-g.players[i].x,g.ball.z-g.players[i].z)<=REACH;
export function stepAltinha(g:Altinha,dt:number,input:AltinhaInput,_level:string){
 if(g.status!=='playing')return;
 g.clock+=dt;g.timeLeft=Math.max(0,g.timeLeft-dt);g.feedbackTime=Math.max(0,g.feedbackTime-dt);
 if(!g.timeLeft){g.status='over';g.queued=null;g.holding=false;return;}
 if(g.holding)g.charge=Math.min(1,g.charge+dt*1.6);
 const guide=altinhaGuide(g);
 g.players.forEach((p,i)=>{
  if(!i){moveRunner(p,input.x,input.z,dt);return;}
  const goal=g.receiver===i&&!g.dropTimer?guide:g.spots[i],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
  moveRunner(p,d>6?dx:0,d>6?dz:0,dt);
 });
 if(g.dropTimer){g.dropTimer=Math.max(0,g.dropTimer-dt);if(!g.dropTimer)toss(g);return;}
 const b=g.ball;b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;
 const q=g.queued;
 if(q){
  q.age+=dt;
  if(reachable(g,0)){g.timing=pressTiming(q.age).offset;g.queued=null;touch(g,0,q.kind,q.target);return;}
  if(q.age>QUEUE){g.queued=null;g.feedback=Math.hypot(b.x-g.players[0].x,b.z-g.players[0].z)>REACH?'LONGE':'CEDO';g.feedbackTime=.9;}
 }
 // ponytail: CPU friends never miss and always pass back to you; real friends with misses come with the CPU task.
 if(g.receiver&&reachable(g,g.receiver)){touch(g,g.receiver,'pass',0);return;}
 if(b.y>=FLOOR){
  Object.assign(b,{y:FLOOR,vx:0,vz:0,vy:0});g.queued=null;g.drops++;g.rodaStreak=0;g.combo[g.receiver]=Math.floor(g.combo[g.receiver]/2);
  g.feedback='CAIU!';g.feedbackTime=.9;g.dropTimer=1;
 }
}
