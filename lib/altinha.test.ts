import assert from 'node:assert/strict';
import {createAltinha,startAltinha,stepAltinha,pressAltinha,releaseAltinha,pauseAltinha,altinhaGuide,passTarget,trickFor,tricks,trickWindow,armGamebreaker,altinhaResult,type Altinha,type TrickId} from './altinha.ts';
import {FLOOR} from './game.ts';
import {PERFECT_ETA} from './arcade.ts';

const DT=1/120;
// A scripted human: runs to where the ball comes down and releases J so the touch lands on the perfect beat.
function bot(g:Altinha,seconds:number,{play=true,kind='keep' as 'keep'|'pass',dir={x:0,z:0},level='Club'}={}){
 let released=-1;
 for(let t=0;t<seconds*120&&g.status!=='over';t++){
  const guide=altinhaGuide(g),p=g.players[0],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),mine=play&&g.status==='playing'&&g.receiver===0&&!g.dropTimer;
  if(mine&&guide.time<=PERFECT_ETA&&released!==g.contactSerial){released=g.contactSerial;pressAltinha(g);releaseAltinha(g,dir,kind);}
  stepAltinha(g,DT,{x:mine&&d>8?dx/d:0,z:mine&&d>8?dz/d:0,jump:false},level);
 }
}
// Seeded random so the CPU sims are repeatable.
const seeded=(seed:number)=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};

// Starting: the ball goes up over the human.
{const g=createAltinha({random:()=>.5});startAltinha(g);assert.equal(g.status,'playing');assert.equal(g.receiver,0);assert.ok(g.ball.y<FLOOR);}

// Ten touches in a row (the 3rd of each turn is forced to a pass and the friend sends it back):
// 9 touches at 5 points, the 10th at 10 (the roda multiplier grows every 10).
{const g=createAltinha({maxTouches:3,random:()=>0});startAltinha(g);
 for(let t=0;t<120*30&&g.rodaStreak<10;t++)bot(g,DT);
 assert.equal(g.rodaStreak,10);assert.equal(g.rodaScore,55);assert.equal(g.drops,0);}

// Keep-ups stay with you until the last touch of the turn, which always goes to a friend.
{const g=createAltinha({maxTouches:3});startAltinha(g);const owners:number[]=[];
 for(let t=0;t<120*8&&owners.length<3;t++){const before=g.contactSerial;bot(g,DT);if(g.contactSerial!==before)owners.push(g.receiver);}
 assert.deepEqual(owners.map(r=>r===0),[true,true,false]);}

// Standing still: the ball drops, the streak resets and the roda goes on.
{const g=createAltinha();startAltinha(g);bot(g,1.8,{play:false});assert.equal(g.drops,1);assert.equal(g.rodaStreak,0);assert.equal(g.status,'playing');assert.equal(g.feedback,'CAIU!');}

// Pressing when the ball is going to a friend queues nothing.
{const g=createAltinha();startAltinha(g);g.receiver=2;pressAltinha(g);releaseAltinha(g,{x:0,z:0},'keep');assert.equal(g.queued,null);}

// Pausing mid-flight freezes the ball and the clock.
{const g=createAltinha();startAltinha(g);bot(g,.3,{play:false});const ball={...g.ball},time=g.timeLeft;
 pauseAltinha(g);assert.equal(g.status,'paused');bot(g,2,{play:false});assert.deepEqual(g.ball,ball);assert.equal(g.timeLeft,time);
 pauseAltinha(g);assert.equal(g.status,'playing');}

// Passing: the held direction picks the friend in that direction; no direction passes to the next friend clockwise.
{const g=createAltinha(),me=g.spots[0],s=g.spots[2],d=Math.hypot(s.x-me.x,s.z-me.z);
 assert.equal(passTarget(g,{x:(s.x-me.x)/d,z:(s.z-me.z)/d}),2);assert.equal(passTarget(g,{x:0,z:0}),1);}

// A pass goes to the friend, who plays it on (here a CPU that never misses).
{const g=createAltinha({random:()=>0});startAltinha(g);bot(g,1.6,{kind:"pass"});assert.notEqual(g.receiver,0);bot(g,4);assert.equal(g.drops,0);assert.ok(g.rodaStreak>=3);}

// The round lasts 120 seconds.
{const g=createAltinha();startAltinha(g);bot(g,121);assert.equal(g.status,'over');}

const all=tricks.map(t=>t.id),starters:TrickId[]=['embaixadinha','cabeca','coxa'];
const heightOf=(dir:{x:number;z:number},hold=false,jump=false,unlocked=all)=>tricks.find(t=>t.id===trickFor(dir,hold,jump,unlocked))!.height;
// One touch with the given direction, released `late` seconds after the perfect beat.
function trick(g:Altinha,dir:{x:number;z:number},late=0,kind:'keep'|'pass'='keep'){
 const serial=g.contactSerial;let released=false;
 for(let t=0;t<120*4&&g.contactSerial===serial&&g.status==='playing';t++){
  const guide=altinhaGuide(g,heightOf(dir,false,false,g.unlocked)),p=g.players[0],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),mine=g.receiver===0&&!g.dropTimer;
  if(mine&&!released&&guide.time<=PERFECT_ETA-late){released=true;pressAltinha(g);releaseAltinha(g,dir,kind);}
  stepAltinha(g,DT,{x:mine&&d>8?dx/d:0,z:mine&&d>8?dz/d:0,jump:false},'Club');
 }
}
// The direction held, holding J and jumping pick the trick; a locked trick falls back to embaixadinha.
assert.equal(trickFor({x:0,z:-1},false,false,starters),'cabeca');
assert.equal(trickFor({x:1,z:0},false,false,starters),'embaixadinha');
assert.equal(trickFor({x:0,z:0},true,false,all),'volta');
assert.equal(trickFor({x:0,z:1},false,true,all),'tesoura');

// Three different perfect tricks: combo 1, 2, 3 → ×1.5, ×2, ×2.5, each ×1.5 for perfect = 23 + 45 + 56.
{const g=createAltinha();startAltinha(g);trick(g,{x:0,z:0});trick(g,{x:0,z:1});trick(g,{x:0,z:-1});
 assert.equal(g.combo[0],3);assert.equal(g.individual[0],124);assert.equal(g.perfects,3);assert.ok(g.style>0);}

// Repeating the same trick does not raise the combo.
{const g=createAltinha();startAltinha(g);trick(g,{x:0,z:0});trick(g,{x:0,z:0});assert.equal(g.combo[0],1);}

// Risk is timing, never dice: 120 ms off is fine for an embaixadinha and not for a carretilha.
{const g=createAltinha({unlocked:all});startAltinha(g);trick(g,{x:0,z:0},.12);assert.equal(g.feedback,'EMBAIXADINHA');
 const h=createAltinha({unlocked:all});startAltinha(h);h.charge=0;
 const serial=h.contactSerial;let released=false;
 for(let t=0;t<120*4&&h.contactSerial===serial;t++){const guide=altinhaGuide(h,60);if(!released&&guide.time<=PERFECT_ETA+.4){h.holding=true;}if(!released&&guide.time<=PERFECT_ETA-.12){released=true;releaseAltinha(h,{x:0,z:-1},'keep');}stepAltinha(h,DT,{x:0,z:0,jump:false},'Club');}
 assert.equal(h.individual[0],0);assert.match(h.feedback,/ERROU/);}

// Salvada: the ball comes down far away, you run and touch it only once it is just above the sand.
{const g=createAltinha();startAltinha(g);Object.assign(g.ball,{x:g.players[0].x+125,z:g.players[0].z,y:FLOOR-150,vx:0,vz:0,vy:-120});
 let pressed=false;
 for(let t=0;t<120*3&&!g.contactSerial&&!g.drops;t++){const p=g.players[0],dx=g.ball.x-p.x,d=Math.abs(dx);if(!pressed&&d<40&&g.ball.y>FLOOR-35){pressed=true;pressAltinha(g);releaseAltinha(g,{x:0,z:0},'keep');}stepAltinha(g,DT,{x:d>4?Math.sign(dx):0,z:0,jump:false},'Club');}
assert.equal(g.saves,1);assert.equal(g.feedback,'SALVADA!');assert.ok(g.individual[0]>=40);}

// One-touch mode: every touch goes to a friend, even a keep-up.
{const g=createAltinha({maxTouches:1});startAltinha(g);trick(g,{x:0,z:0},0,'keep');assert.notEqual(g.receiver,0);}

// Balance: a perfect human with CPU friends for a whole round. The ball must fall sometimes, not all the time.
const drops:Record<string,number>={};
for(const level of ['Chill','Club','Pro']){
 const g=createAltinha({random:seeded(7)});startAltinha(g);bot(g,121,{level});drops[level]=g.drops;
 assert.equal(g.status,'over');assert.ok(g.drops>=2&&g.drops<=12,`${level}: ${g.drops} drops`);assert.ok(g.rodaBest>=15,`${level}: best ${g.rodaBest}`);
 for(let i=1;i<5;i++)assert.ok(g.individual[i]>0,`friend ${i} scored`);
}
assert.ok(drops.Chill<=drops.Pro);console.log('altinha drops per round',drops);

// A human who never plays scores nothing, and the roda suffers for it.
{const g=createAltinha({random:seeded(3)});startAltinha(g);bot(g,121,{play:false});assert.equal(g.individual[0],0);assert.ok(g.drops>=1);}

// Altinha de Ouro: with a full style meter, K gives 6 s of slow ball and double points.
{const g=createAltinha({random:()=>0});startAltinha(g);trick(g,{x:0,z:0});const normal=g.individual[0];
 const h=createAltinha({random:()=>0});startAltinha(h);h.style=100;armGamebreaker(h);assert.equal(h.gamebreaker,6);assert.equal(h.style,0);assert.equal(h.feedback,'ALTINHA DE OURO');
 trick(h,{x:0,z:0});assert.equal(h.individual[0],normal*2);}

// The score is final at the whistle, even with the ball in the air.
{const g=createAltinha({random:seeded(5)});startAltinha(g);bot(g,121);const final=g.individual[0];
 pressAltinha(g);releaseAltinha(g,{x:0,z:0},'keep');bot(g,2);assert.equal(g.individual[0],final);}

// The king of the roda is the top individual score.
{const g=createAltinha({random:seeded(9)});startAltinha(g);bot(g,121);const r=altinhaResult(g);assert.equal(r.individual[r.king],Math.max(...g.individual));assert.equal(r.rodaBest,g.rodaBest);}

// The timing meter is on the altinha scale: each trick's working window, in the same units as g.timing (±1 = ±0.3 s).
assert.ok(Math.abs(trickWindow('embaixadinha')-.65)<1e-9);assert.ok(Math.abs(trickWindow('carretilha')-.3)<1e-9);
{const g=createAltinha({unlocked:all});startAltinha(g);trick(g,{x:0,z:0},.12);assert.ok(Math.abs(Math.abs(g.timing!)-.4)<.05,`timing ${g.timing}`);}

// Holding J while the ball is still on its way to you keeps the charge, so the held trick comes out.
{const g=createAltinha({unlocked:all,random:()=>0});startAltinha(g);g.receiver=2;g.ball.vy=-300;pressAltinha(g);
 for(let t=0;t<60;t++)stepAltinha(g,DT,{x:0,z:0,jump:false},'Club');
 assert.ok(g.charge>=.65,`charge ${g.charge}`);g.receiver=0;releaseAltinha(g,{x:0,z:0},'keep');assert.equal(g.queued?.trick,'volta');}

// Nobody is king of a roda where nobody scored.
{const g=createAltinha();startAltinha(g);bot(g,121,{play:false});assert.equal(altinhaResult(g).king,-1);}

console.log('Passed: altinha roda core, tricks, combos, salvadas, CPU friends and the gamebreaker.');
