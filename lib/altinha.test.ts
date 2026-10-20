import assert from 'node:assert/strict';
import {createAltinha,startAltinha,stepAltinha,pressAltinha,releaseAltinha,pauseAltinha,altinhaGuide,passTarget,type Altinha} from './altinha.ts';
import {FLOOR} from './game.ts';
import {PERFECT_ETA} from './arcade.ts';

const DT=1/120;
// A scripted human: runs to where the ball comes down and releases J so the touch lands on the perfect beat.
function bot(g:Altinha,seconds:number,{play=true,kind='keep' as 'keep'|'pass',dir={x:0,z:0}}={}){
 let released=-1;
 for(let t=0;t<seconds*120&&g.status!=='over';t++){
  const guide=altinhaGuide(g),p=g.players[0],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),mine=play&&g.status==='playing'&&g.receiver===0&&!g.dropTimer;
  if(mine&&guide.time<=PERFECT_ETA&&released!==g.contactSerial){released=g.contactSerial;pressAltinha(g);releaseAltinha(g,dir,kind);}
  stepAltinha(g,DT,{x:mine&&d>8?dx/d:0,z:mine&&d>8?dz/d:0,jump:false},'Club');
 }
}

// Starting: the ball goes up over the human.
{const g=createAltinha({random:()=>.5});startAltinha(g);assert.equal(g.status,'playing');assert.equal(g.receiver,0);assert.ok(g.ball.y<FLOOR);}

// Ten touches in a row (the 3rd of each turn is forced to a pass and the friend sends it back):
// 9 touches at 5 points, the 10th at 10 (the roda multiplier grows every 10).
{const g=createAltinha({maxTouches:3});startAltinha(g);
 for(let t=0;t<120*30&&g.rodaStreak<10;t++)bot(g,DT);
 assert.equal(g.rodaStreak,10);assert.equal(g.rodaScore,55);assert.equal(g.drops,0);}

// Keep-ups stay with you until the last touch of the turn, which always goes to a friend.
{const g=createAltinha({maxTouches:3});startAltinha(g);const owners:number[]=[];
 for(let t=0;t<120*8&&owners.length<3;t++){const before=g.contactSerial;bot(g,DT);if(g.contactSerial!==before)owners.push(g.receiver);}
 assert.deepEqual(owners.map(r=>r===0),[true,true,false]);}

// Standing still: the ball drops, the streak resets and the roda goes on.
{const g=createAltinha();startAltinha(g);bot(g,1.5,{play:false});assert.equal(g.drops,1);assert.equal(g.rodaStreak,0);assert.equal(g.status,'playing');assert.equal(g.feedback,'CAIU!');}

// Pressing when the ball is going to a friend queues nothing.
{const g=createAltinha();startAltinha(g);g.receiver=2;pressAltinha(g);releaseAltinha(g,{x:0,z:0},'keep');assert.equal(g.queued,null);}

// Pausing mid-flight freezes the ball and the clock.
{const g=createAltinha();startAltinha(g);bot(g,.3,{play:false});const ball={...g.ball},time=g.timeLeft;
 pauseAltinha(g);assert.equal(g.status,'paused');bot(g,2,{play:false});assert.deepEqual(g.ball,ball);assert.equal(g.timeLeft,time);
 pauseAltinha(g);assert.equal(g.status,'playing');}

// Passing: the held direction picks the friend in that direction; no direction passes to the next friend clockwise.
{const g=createAltinha(),me=g.spots[0],s=g.spots[2],d=Math.hypot(s.x-me.x,s.z-me.z);
 assert.equal(passTarget(g,{x:(s.x-me.x)/d,z:(s.z-me.z)/d}),2);assert.equal(passTarget(g,{x:0,z:0}),1);}

// A pass goes to the friend, who sends it back (CPU friends never fail in this first version).
{const g=createAltinha();startAltinha(g);bot(g,1.2,{kind:'pass'});assert.notEqual(g.receiver,0);bot(g,4);assert.equal(g.drops,0);assert.ok(g.rodaStreak>=3);}

// The round lasts 120 seconds.
{const g=createAltinha();startAltinha(g);bot(g,121);assert.equal(g.status,'over');}

console.log('Passed: altinha roda core.');
