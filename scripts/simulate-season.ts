import assert from 'node:assert/strict';
import {events} from '../lib/career.ts';
import {newProgress,cupGame} from '../lib/cup.ts';
import {prepareServe,toss,serve,step,guidance} from '../lib/game.ts';

// Deterministic balance probe, not a substitute for a human playtest.
// Each opponent gets a fresh match and a 5-minute simulated-time budget.
for(let event=0;event<events.length;event++)for(let stage=0;stage<3;stage++){
 const p=newProgress();p.event=event;p.stage=stage;
 const g=cupGame(p);
 // Compare similarly developed teams; later events require career upgrades.
 g.attributes=g.attributes.map(()=>({serve:50+events[event].tier*12,attack:50+events[event].tier*12,defense:50+events[event].tier*12,mobility:50+events[event].tier*12}));
 let ticks=0,contacts=0;
 while(g.status!=='over'&&ticks<36000){
  if(g.status==='ready')prepareServe(g);
  if(g.status==='serving')toss(g);
  if(g.status==='tossing'&&g.tossTime>=.55)serve(g);
  const guide=guidance(g),player=g.players[g.active],target=guide.team===0?guide:{x:240,z:225},dx=target.x-player.x,dz=target.z-player.z,d=Math.hypot(dx,dz);
  const stroke=guide.team===0&&guide.time>0&&guide.time<.28,pursuing=d>45&&!stroke;
  if(g.lastTeam===0&&g.touches===2){
   g.attackStyle=Math.floor(g.rally/6)%2?'tip':'power';
   g.aim={x:870,z:g.players[2].z+g.players[3].z>450?80:370};
  }
  const before=g.rally;
  step(g,1/120,pursuing?dx/d:0,false,'Club',false,false,pursuing?dz/d:0,false,stroke);
  if(g.rally>before)contacts+=g.rally-before;
  ticks++;
 }
 assert.equal(g.status,'over',`${g.opponentName}: match exceeded the 5-minute simulation budget`);
 assert.ok(contacts>=14,`${g.opponentName}: match must contain real rallies`);
 console.log(JSON.stringify({event:event+1,opponent:g.opponentName,score:g.score,seconds:Math.round(ticks/120),contacts,finished:g.status==='over'}));
}
