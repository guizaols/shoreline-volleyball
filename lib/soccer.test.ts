import assert from 'node:assert/strict';
import {createSoccer,startSoccer,passSoccer,shootSoccer,tackleSoccer,stepSoccer} from './soccer.ts';
const idle={x:0,z:0,prepare:false,jump:false};
const g=createSoccer();startSoccer(g);assert.equal(g.players.length,6);
const from=g.owner;passSoccer(g);for(let i=0;i<14;i++)stepSoccer(g,1/120,idle,'Club');assert.equal(g.owner,-1);assert.equal(g.lastHit,from);
for(let i=0;i<300&&g.owner<0;i++)stepSoccer(g,1/120,idle,'Club');
assert.ok(g.owner>=0&&g.owner!==from,'A pass must be received by another player');
const move=createSoccer();startSoccer(move);move.autoSwitch=false;move.active=1;move.players[1].x=480;
for(let i=0;i<60;i++)stepSoccer(move,1/120,{...idle,x:1},'Club');
assert.ok(move.players[1].x>500,'Outfield players can cross midfield');
const goal=createSoccer();startSoccer(goal);goal.owner=-1;goal.cooldown=1;goal.lastHit=1;goal.ball={x:960,z:225,y:420,vx:700,vz:0,vy:0};
stepSoccer(goal,1/120,idle,'Club');assert.deepEqual(goal.score,[1,0]);assert.equal(goal.status,'ready');assert.equal(goal.owner,4,'Conceding team restarts');
const high=createSoccer();startSoccer(high);high.owner=-1;high.cooldown=1;high.ball={x:960,z:225,y:260,vx:700,vz:0,vy:0};high.lastHit=1;
stepSoccer(high,1/120,idle,'Club');assert.deepEqual(high.score,[0,0],'Ball above the crossbar is not a goal');
const shot=createSoccer();startSoccer(shot);shot.charge=1;shootSoccer(shot);for(let i=0;i<10;i++)stepSoccer(shot,1/120,idle,'Club');assert.ok(shot.ball.vx>0);assert.equal(shot.owner,-1);
const dribble=createSoccer();startSoccer(dribble);dribble.players[1].x=955;dribble.players[1].z=225;dribble.cooldown=1;dribble.ball={x:964,z:225,y:437,vx:295,vz:0,vy:0};
for(let i=0;i<3;i++)stepSoccer(dribble,1/120,{...idle,x:1},'Club');assert.equal(dribble.score[0],1,'Dribbling the ball over the goal line scores');
shot.status='paused';const before=JSON.stringify(shot);stepSoccer(shot,1/120,idle,'Club');assert.equal(JSON.stringify(shot),before);
const auto=createSoccer();auto.active=-1;startSoccer(auto);const teams=new Set<number>();
for(let i=0;i<7200&&auto.status!=='over';i++){if(auto.status==='ready')startSoccer(auto);stepSoccer(auto,1/120,idle,'Club');if(auto.lastHit>=0)teams.add(auto.players[auto.lastHit].team);assert.ok(auto.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));}
assert.equal(teams.size,2,'Both teams participate');assert.ok(auto.contactSerial>10,'CPU must keep the match moving');
assert.ok(auto.score.some(Boolean),'CPU must create scoring chances, not endlessly exchange tackles');
console.log('Passed: soccer passes, full field, goals, height, restarts, pause and CPU match.');
const touches=createSoccer();startSoccer(touches);touches.cooldown=1;
for(let i=0;i<24;i++)stepSoccer(touches,1/120,{...idle,x:1},'Club');
assert.ok(Math.hypot(touches.ball.vx,touches.ball.vz)>0,'Dribbling propels a physical ball');
const ballBefore={...touches.ball};stepSoccer(touches,1/120,{...idle,z:1},'Club');
assert.ok(Math.hypot(touches.ball.x-ballBefore.x,touches.ball.z-ballBefore.z)<8,'Changing direction cannot teleport the ball');
const quick=createSoccer();startSoccer(quick);passSoccer(quick);
assert.equal(quick.owner,1,'Pass has a short plant and backswing before contact');
for(let i=0;i<20;i++)stepSoccer(quick,1/120,idle,'Club');
assert.equal(quick.owner,-1,'Prepared pass releases within 170ms');
console.log('Passed: physical dribbling and pass anticipation.');
startSoccer(goal);goal.ball.z=26;goal.ball.vz=-220;goal.cooldown=1;
stepSoccer(goal,1/120,idle,'Club');
assert.equal(goal.owner,1,'Ball out after a restart belongs to the other team');
const control=createSoccer();startSoccer(control);control.cooldown=10;
for(const i of [0,3,4,5]){control.players[i].x=900;control.players[i].z=400;}
for(let i=0;i<80;i++)stepSoccer(control,1/120,{...idle,x:1},'Club');
for(let i=0;i<75;i++)stepSoccer(control,1/120,{...idle,x:-1},'Club');
for(let i=0;i<70;i++)stepSoccer(control,1/120,idle,'Club');
assert.equal(control.owner,1,'A controlled turn and stop keep possession');
assert.ok(Math.hypot(control.ball.x-control.players[1].x,control.ball.z-control.players[1].z)<35,'Stopping traps the ball at the feet');
assert.ok(Math.hypot(control.ball.vx,control.ball.vz)<25,'The trapped ball stops physically');
const backPass=createSoccer();startSoccer(backPass);backPass.autoSwitch=false;backPass.players[1].x=480;backPass.players[1].z=225;backPass.players[2].x=630;backPass.players[2].z=225;backPass.ball={x:498,z:225,y:437,vx:0,vz:0,vy:0};
passSoccer(backPass,{x:-1,z:0});
for(let i=0;i<14;i++)stepSoccer(backPass,1/120,idle,'Club');
assert.ok(backPass.ball.vx<0,'Passing backward chooses the goalkeeper instead of the forward teammate');
const manualPass=createSoccer();startSoccer(manualPass);manualPass.active=0;manualPass.players=backPass.players.map(p=>({...p}));manualPass.ball={x:498,z:225,y:437,vx:0,vz:0,vy:0};
passSoccer(manualPass,{x:-1,z:0});assert.equal(manualPass.kickTarget,0,'An explicit pass direction works while another player is selected');
const keeperPass=createSoccer();startSoccer(keeperPass);keeperPass.players=manualPass.players.map(p=>({...p}));keeperPass.ball={x:498,z:225,y:437,vx:0,vz:0,vy:0};
passSoccer(keeperPass,{x:-1,z:0});for(let i=0;i<30;i++)stepSoccer(keeperPass,1/120,idle,'Club');assert.equal(keeperPass.active,0,'A backward pass keeps the intended handoff to the goalkeeper');
const defense=createSoccer();startSoccer(defense);defense.autoSwitch=false;defense.active=1;defense.owner=4;defense.lastHit=4;defense.cooldown=0;
defense.players[1].x=469;defense.players[1].z=225;defense.players[4].x=500;defense.players[4].z=225;defense.ball={x:482,z:225,y:437,vx:0,vz:0,vy:0};
stepSoccer(defense,1/120,{...idle,prepare:true},'Club');
assert.equal(defense.owner,4,'Holding charge cannot silently steal the ball without a tackle');
tackleSoccer(defense);stepSoccer(defense,1/120,idle,'Club');
assert.equal(defense.owner,1,'An aimed tackle can win an exposed ball');
assert.equal(defense.players[1].action,'dive','The tackle keeps a readable slide follow-through');
assert.ok(defense.players[1].tackleCooldown>.5,'Winning a tackle still requires recovery');
const miss=createSoccer();startSoccer(miss);miss.autoSwitch=false;miss.active=1;miss.owner=4;miss.players[1].x=400;miss.players[1].z=225;miss.players[1].facingX=-1;miss.players[4].x=718;miss.players[4].z=225;miss.ball={x:700,z:225,y:437,vx:0,vz:0,vy:0};
tackleSoccer(miss);for(let i=0;i<28;i++)stepSoccer(miss,1/120,idle,'Club');
assert.equal(miss.players[1].tackleTime,0);assert.ok(miss.players[1].tackleCooldown>0);assert.equal(miss.owner,4,'A distant tackle cannot steal the ball');
const recovering=miss.players[1].tackleCooldown;tackleSoccer(miss);assert.equal(miss.players[1].tackleCooldown,recovering,'Tackle spam cannot skip recovery');
const committed=createSoccer();startSoccer(committed);committed.owner=-1;committed.lastHit=4;committed.ball={x:700,z:225,y:437,vx:0,vz:0,vy:0};committed.players[2].x=600;committed.players[2].z=225;
tackleSoccer(committed);stepSoccer(committed,1/120,idle,'Club');assert.equal(committed.active,1,'Automatic selection cannot hide a committed tackle by changing player');
for(const {input,y} of [{input:{...idle,x:1},y:450},{input:{...idle,prepare:true},y:450},{input:{...idle,jump:true},y:450},{input:{...idle,x:1,prepare:true,jump:true},y:450},{input:idle,y:400}]){
 const engaged=createSoccer();startSoccer(engaged);engaged.owner=-1;engaged.lastHit=4;engaged.players[1].x=420;engaged.players[1].z=300;engaged.players[1].y=y;engaged.players[2].x=600;engaged.players[2].z=300;engaged.ball={x:600,z:300,y:360,vx:0,vz:0,vy:0};
 stepSoccer(engaged,1/120,input,'Club');assert.equal(engaged.active,1,'Moving, preparing or jumping keeps control of the selected athlete');
 if(input.jump)assert.ok(engaged.players[1].y<450,'The selected athlete receives the jump');
}
const selection=createSoccer();startSoccer(selection);selection.owner=-1;selection.lastHit=4;selection.players[1].x=300;selection.players[1].z=225;selection.players[2].x=600;selection.players[2].z=225;selection.ball={x:600,z:225,y:250,vx:0,vz:0,vy:0};
stepSoccer(selection,1/120,idle,'Club');assert.equal(selection.active,2,'Idle selection can move to the closer receiver');
selection.ball.x=300;stepSoccer(selection,1/120,idle,'Club');assert.equal(selection.active,2,'A loose ball cannot repeatedly change selection during one contact');
selection.contactSerial++;stepSoccer(selection,1/120,idle,'Club');assert.equal(selection.active,1,'A new contact permits another idle selection');
const safePass=createSoccer();startSoccer(safePass);safePass.active=-1;safePass.players[1].x=450;safePass.players[1].z=225;safePass.players[2].x=640;safePass.players[2].z=225;safePass.players[4].x=540;safePass.players[4].z=225;safePass.ball={x:468,z:225,y:437,vx:0,vz:0,vy:0};
passSoccer(safePass);assert.equal(safePass.kickTarget,0,'CPU recycles possession through the keeper when the forward passing lane is blocked');
const cpuShot=createSoccer();startSoccer(cpuShot);cpuShot.active=-1;cpuShot.players[1].z=225;cpuShot.players[3].z=300;cpuShot.ball.z=225;
shootSoccer(cpuShot);for(let i=0;i<10;i++)stepSoccer(cpuShot,1/120,idle,'Club');
assert.ok(cpuShot.ball.vz< -20,'Your CPU teammate aims away from the keeper just like the opponent');
const cpuReceive=createSoccer();startSoccer(cpuReceive);cpuReceive.active=-1;
for(const i of [3,4,5]){cpuReceive.players[i].x=900;cpuReceive.players[i].z=400;}
passSoccer(cpuReceive);for(let i=0;i<14;i++)stepSoccer(cpuReceive,1/120,idle,'Club');
for(let i=0;i<300&&cpuReceive.owner<0;i++)stepSoccer(cpuReceive,1/120,idle,'Club');
assert.equal(cpuReceive.owner,2,'A CPU receiver runs into the pass instead of abandoning the passing lane');
const airborneKick=createSoccer();startSoccer(airborneKick);
for(let i=0;i<19;i++)stepSoccer(airborneKick,1/120,{...idle,jump:true},'Club');
shootSoccer(airborneKick);for(let i=0;i<10;i++)stepSoccer(airborneKick,1/120,idle,'Club');
assert.ok(airborneKick.players[1].y<450);assert.equal(airborneKick.owner,1,'An airborne player cannot kick a grounded ball');assert.equal(airborneKick.pendingKick,'shot','The shot waits for a real foot contact after landing');
for(let i=0;i<90&&airborneKick.pendingKick;i++)stepSoccer(airborneKick,1/120,idle,'Club');
assert.equal(airborneKick.pendingKick,'');assert.equal(airborneKick.owner,-1,'The queued shot fires after landing');
const rivalShot=createSoccer();startSoccer(rivalShot);rivalShot.owner=4;rivalShot.lastHit=4;rivalShot.active=1;rivalShot.cpuWait=1;rivalShot.attackStyle='roll';rivalShot.ball={x:682,z:310,y:437,vx:0,vz:0,vy:0};
shootSoccer(rivalShot);for(let i=0;i<10;i++)stepSoccer(rivalShot,1/120,idle,'Club');
assert.doesNotMatch(rivalShot.feedback,/COBERTURA/,'Human shot choices cannot change the opponent shot style');assert.ok(rivalShot.ball.vy> -180,'The rival keeps its direct shot trajectory');
const lineSave=createSoccer();startSoccer(lineSave);lineSave.owner=-1;lineSave.lastHit=1;lineSave.cooldown=1;lineSave.players[3].x=950;lineSave.players[3].z=225;lineSave.ball={x:960,z:225,y:420,vx:700,vz:0,vy:0};
stepSoccer(lineSave,1/120,idle,'Club');assert.equal(lineSave.owner,3);assert.ok(lineSave.ball.x<965,'A swept keeper catch holds the ball before the goal line');
for(let i=0;i<20;i++)stepSoccer(lineSave,1/120,idle,'Club');assert.deepEqual(lineSave.score,[0,0],'A saved ball cannot drift over the goal line after the catch');
console.log('Passed: dribble control, directional passing, tackle timing/recovery and safe CPU passing.');
for(const keepMoving of [false,true]){
 const advancing=createSoccer();startSoccer(advancing);
 for(const i of [3,4,5]){advancing.players[i].x=900;advancing.players[i].z=400;}
 for(let i=0;i<30;i++)stepSoccer(advancing,1/120,{...idle,x:1},'Club');
 passSoccer(advancing,{x:1,z:0});const receiver=advancing.kickTarget;
 for(let i=0;i<14;i++)stepSoccer(advancing,1/120,{...idle,x:Number(keepMoving)},'Club');
 for(let i=0;i<180&&advancing.owner<0&&advancing.status==='playing';i++)stepSoccer(advancing,1/120,{...idle,x:Number(keepMoving)},'Club');
 assert.equal(advancing.status,'playing','An ordinary advancing pass cannot roll out untouched');
 assert.equal(advancing.owner,receiver,'The receiver can take a pass while movement continues or stops');
 if(keepMoving){
  passSoccer(advancing,{x:0,z:-1});const returnTarget=advancing.kickTarget;
  for(let i=0;i<14;i++)stepSoccer(advancing,1/120,{...idle,z:-1},'Club');
  for(let i=0;i<180&&advancing.owner<0&&advancing.status==='playing';i++)stepSoccer(advancing,1/120,{...idle,z:-1},'Club');
  assert.equal(returnTarget,1);assert.equal(advancing.owner,1,'An advancing one-two returns to the first runner without stopping');
 }
}
const duel=createSoccer();startSoccer(duel);duel.players[1].x=480;duel.players[1].z=225;duel.players[4].x=532;duel.players[4].z=225;duel.players[5].x=850;duel.ball={x:498,z:225,y:437,vx:0,vz:0,vy:0};
for(let i=0;i<10;i++)stepSoccer(duel,1/120,idle,'Club');
assert.equal(duel.owner,1,'An approaching CPU defender must give the carrier a reaction window');
assert.ok(duel.players[4].windup>0,'The CPU telegraphs its tackle before the lunge');
const tapShot=createSoccer();startSoccer(tapShot);tapShot.players[1].x=700;tapShot.players[1].z=225;tapShot.players[4].x=400;tapShot.players[4].z=400;tapShot.players[5].x=430;tapShot.players[5].z=50;tapShot.ball={x:718,z:225,y:437,vx:0,vz:0,vy:0};
shootSoccer(tapShot,{x:1,z:-1});for(let i=0;i<150&&tapShot.status==='playing';i++)stepSoccer(tapShot,1/120,idle,'Club');
assert.equal(tapShot.score[0],1,'A quick directed tap can score from an open chance without charging');
const neutralShot=createSoccer();startSoccer(neutralShot);neutralShot.aim.z=275;shootSoccer(neutralShot,{x:0,z:0});assert.equal(neutralShot.kickAimZ,275,'A neutral shot keeps the selected target');
const invalidShot=createSoccer();startSoccer(invalidShot);shootSoccer(invalidShot,{x:NaN,z:1});assert.equal(invalidShot.pendingKick,'','Invalid direction cannot prepare a shot');
const left=createSoccer(),right=createSoccer();left.active=-1;right.active=-1;right.owner=4;right.lastHit=4;
right.players=left.players.map((_,i)=>{const p=left.players[(i+3)%6];return {...p,team:i<3?0:1,x:1000-p.x,z:450-p.z,vx:-p.vx,vz:-p.vz,facingX:-p.facingX,facingZ:-p.facingZ};});right.ball={...left.ball,x:1000-left.ball.x,z:450-left.ball.z};
startSoccer(left);startSoccer(right);for(let i=0;i<30;i++){stepSoccer(left,1/120,idle,'Club');stepSoccer(right,1/120,idle,'Club');}
assert.ok(Math.hypot(right.players[5].x-(1000-left.players[2].x),right.players[5].z-(450-left.players[2].z))<1,'Both teams offer the same passing support when the field is mirrored');
console.log('Passed: advancing one-twos, readable CPU tackles, quick directed shots and symmetric support.');

{
 const {firstTimeSoccer}=await import('./soccer.ts');
 const oneTouch=(gap:number)=>{
  const m=createSoccer();m.status='playing';m.owner=-1;m.active=2;m.passReceiver=2;m.lastHit=1;m.cooldown=0;
  const p=m.players[2];p.x=600;p.z=225;m.aim={x:965,z:300};
  for(const q of m.players.slice(4)){q.x=900;q.z=60;}
  m.ball={x:p.x-gap,z:225,y:437,vx:600,vz:0,vy:0};
  assert.ok(firstTimeSoccer(m),'A pass to the human can be struck first time');
  for(let i=0;i<70&&m.lastHit!==2;i++)stepSoccer(m,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
  return m;
 };
 const hit=oneTouch(96);
 assert.equal(hit.owner,-1,'First-time strike does not stop the ball');assert.ok(hit.ball.vx>500,'The ball flies toward goal');
 assert.match(hit.feedback,/PERFEITO/,'Pressing just before the ball arrives is perfect');
 assert.match(oneTouch(200).feedback,/CEDO/);assert.match(oneTouch(40).feedback,/TARDE/);
 const noPass=createSoccer();noPass.status='playing';noPass.owner=-1;noPass.active=2;noPass.passReceiver=-1;
 assert.equal(firstTimeSoccer(noPass),false,'Without an incoming pass A still tackles');
 console.log('Passed: first-time strike on an incoming pass.');
}
