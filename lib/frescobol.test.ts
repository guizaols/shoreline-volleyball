import assert from 'node:assert/strict';
import {createFrescobol,startFrescobol,stepFrescobol,pressFrescobol,releaseFrescobol,pauseFrescobol,armPancada,frescobolGuide,shotPlan,type Frescobol} from './frescobol.ts';
import {FLOOR} from './game.ts';
import {PERFECT_ETA} from './arcade.ts';

const DT=1/120,still={x:0,z:0};
const seeded=(seed:number)=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
// A scripted human: runs to where the ball arrives and releases on the perfect beat with the given shot.
function bot(g:Frescobol,seconds:number,{play=true,shot='golpe' as 'golpe'|'ataque'|'lob',aim=still,late=0}={}){
 let released=-1;
 for(let t=0;t<seconds*120&&g.status!=='over';t++){
  const guide=frescobolGuide(g),p=g.players[0],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),mine=play&&g.status==='playing'&&g.receiver===0&&!g.dropTimer;
  if(mine&&guide.time<=PERFECT_ETA-late&&released!==g.contactSerial){released=g.contactSerial;pressFrescobol(g);if(shot==='ataque')g.charge=1;releaseFrescobol(g,aim,shot==='lob'?'lob':'hit');}
  stepFrescobol(g,DT,{x:mine&&d>8?dx/d:0,z:mine&&d>8?dz/d:0},'Club');
 }
}

// Serve: the ball comes to you first.
{const g=createFrescobol({random:()=>0});startFrescobol(g);assert.equal(g.status,'playing');assert.equal(g.receiver,0);assert.ok(g.ball.y<FLOOR);}

// A perfect rally with a partner who never misses: the sequence grows and so does the score.
{const g=createFrescobol({random:()=>0});startFrescobol(g);bot(g,20);assert.equal(g.drops,0);assert.ok(g.sequence>=15,`sequence ${g.sequence}`);assert.ok(g.score>0);assert.ok(g.perfects>=7);}

// Standing still: the ball drops, the sequence resets, the round goes on.
{const g=createFrescobol({random:()=>0});startFrescobol(g);bot(g,3,{play:false});assert.ok(g.drops>=1);assert.equal(g.sequence,0);assert.equal(g.status,'playing');}

// Shots: an ataque is faster and worth more than a golpe; a lob is slower and worth less.
{const g=createFrescobol();startFrescobol(g);const golpe=shotPlan(g,still,'hit',false),ataque=shotPlan(g,still,'hit',true),lob=shotPlan(g,still,'lob',false);
 assert.ok(ataque.T<golpe.T&&golpe.T<lob.T);assert.ok(ataque.points>golpe.points&&golpe.points>lob.points);}

// The direction places the ball left or right of your partner; the plan is where the ball goes.
{const g=createFrescobol({random:()=>0});startFrescobol(g);const left=shotPlan(g,{x:0,z:-1},'hit',false),right=shotPlan(g,{x:0,z:1},'hit',false);
 assert.ok(left.to.z<g.players[1].z-50&&right.to.z>g.players[1].z+50);
 const plan=shotPlan(g,{x:0,z:1},'hit',false);bot(g,1.2,{aim:{x:0,z:1}});assert.equal(g.receiver,1);assert.deepEqual(g.target,plan.to);}

// Timing, never dice: 120 ms off still returns a golpe, but not an ataque.
{const g=createFrescobol({random:()=>0});startFrescobol(g);bot(g,1.2,{late:.12});assert.equal(g.receiver,1);assert.equal(g.drops,0);}
{const g=createFrescobol({random:()=>0});startFrescobol(g);bot(g,1.2,{late:.12,shot:'ataque'});assert.match(g.feedback,/ERROU|ISOLOU/);}

// Pressing while the ball goes to your partner does nothing.
{const g=createFrescobol();startFrescobol(g);g.receiver=1;pressFrescobol(g);releaseFrescobol(g,still,'hit');assert.equal(g.queued,null);}

// Pause freezes the ball and the clock.
{const g=createFrescobol();startFrescobol(g);bot(g,.3,{play:false});const ball={...g.ball},time=g.timeLeft;pauseFrescobol(g);bot(g,1,{play:false});
 assert.deepEqual(g.ball,ball);assert.equal(g.timeLeft,time);pauseFrescobol(g);assert.equal(g.status,'playing');}

// Pancada de Ouro: a full rhythm meter gives 6 s of double points.
{const g=createFrescobol({random:()=>0});startFrescobol(g);g.rhythm=100;armPancada(g);assert.equal(g.pancada,6);assert.equal(g.rhythm,0);
 const before=g.score;bot(g,1.2);const gold=g.score-before;const h=createFrescobol({random:()=>0});startFrescobol(h);bot(h,1.2);assert.equal(gold,h.score*2);}

// Balance: a perfect human with the CPU partner for a whole round. Drops happen, but not all the time; ataques drop more.
const drops:Record<string,number>={};
for(const shot of ['golpe','ataque'] as const){const g=createFrescobol({random:seeded(4)});startFrescobol(g);bot(g,121,{shot});drops[shot]=g.drops;
 assert.equal(g.status,'over');assert.ok(g.drops>=1&&g.drops<=14,`${shot}: ${g.drops} drops`);}
assert.ok(drops.ataque>=drops.golpe);console.log('frescobol drops per round',drops);

// The score is final at the whistle.
{const g=createFrescobol({random:seeded(2)});startFrescobol(g);bot(g,121);const final=g.score;pressFrescobol(g);releaseFrescobol(g,still,'hit');bot(g,2);assert.equal(g.score,final);}

console.log('Passed: frescobol rally, shots, timing, partner and the Pancada de Ouro.');
