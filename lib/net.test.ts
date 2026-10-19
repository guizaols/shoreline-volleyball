import assert from 'node:assert/strict';
import {createNetMatch,serveNet,stepNet,strikeNet,netContact,netPoint,moveRunner,netGuide} from './net.ts';
import {flightTime,landingX,FLOOR} from './game.ts';
import * as net from './net.ts';

const g=createNetMatch('footvolley');serveNet(g);
g.lastTeam=1;g.lastHit=2;g.cooldown=0;
for(const i of [0,1,0]){
 g.ball={...netContact(g,i),vx:0,vz:0,vy:20};
 strikeNet(g,i,1);
}
assert.equal(g.touches,3);assert.ok(g.ball.vx>0,'Third footvolley contact crosses the net');
assert.equal(g.feedback,'CABEÇA · BOM');
g.cooldown=0;strikeNet(g,1,1);assert.equal(g.score[1],1,'Fourth touch is a fault');
const repeat=createNetMatch('footvolley');serveNet(repeat);strikeNet(repeat,2,1);strikeNet(repeat,2,1);
assert.equal(repeat.score[0],1,'Consecutive contacts are a fault');
const rally=createNetMatch('footvolley');rally.active=-1;serveNet(rally);
let hits=0;
for(let i=0;i<2400&&rally.status==='playing';i++){stepNet(rally,1/120,{x:0,z:0,prepare:false,jump:false},'Club');hits=Math.max(hits,rally.rally);}
assert.ok(hits>=6,`CPU must sustain combinations on both sides, got ${hits} contacts`);
assert.ok(rally.players.every(p=>Number.isFinite(p.x)));
console.log('Passed: footvolley combinations, faults and simulated rally.');

const tennis=createNetMatch('tennis');serveNet(tennis);tennis.ball={...netContact(tennis,2),vx:0,vz:0,vy:20};strikeNet(tennis,2,1);
assert.ok(tennis.ball.vx<0,'First tennis return must cross the net');
assert.match(tennis.feedback,/VOLEIO/);
strikeNet(tennis,3,1);assert.equal(tennis.points[0],1,'Partner cannot add a second touch');
const deuce=createNetMatch('tennis');deuce.points=[3,3];netPoint(deuce,0,'Ponto');
assert.deepEqual(deuce.score,[1,0]);assert.deepEqual(deuce.points,[0,0]);assert.equal(deuce.server,1,'Serve alternates after every game');
const server=createNetMatch('tennis');netPoint(server,1,'Ponto');assert.equal(server.serviceOrder[0],0,'Same athlete must serve the entire game');
deuce.score=[2,0];deuce.points=[3,0];netPoint(deuce,0,'Ponto');assert.equal(deuce.status,'over');
const tennisRally=createNetMatch('tennis');tennisRally.active=-1;serveNet(tennisRally);let returns=0;
for(let i=0;i<1800&&tennisRally.status==='playing';i++){stepNet(tennisRally,1/120,{x:0,z:0,prepare:false,jump:false},'Club');returns=Math.max(returns,tennisRally.rally);}
assert.ok(returns>=4,`Tennis CPU must return across the net, got ${returns}`);
console.log('Passed: tennis single contacts, no-ad scoring, service rotation and rallies.');

const rhythm=createNetMatch('tennis');serveNet(rhythm);netPoint(rhythm,1,'Bola na areia');
for(let i=0;i<480&&rhythm.status==='ready';i++)stepNet(rhythm,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
assert.ok(['playing','tossing'].includes(rhythm.status),'Points restart without another menu click');
const ready=createNetMatch('tennis');ready.active=-1;serveNet(ready);let anticipates=false;
for(let i=0;i<220&&ready.status==='playing';i++){stepNet(ready,1/120,{x:0,z:0,prepare:false,jump:false},'Club');if(!ready.rally&&ready.players.some(p=>p.team===1&&p.windup>0))anticipates=true;}
assert.ok(anticipates,'Receiver prepares the swing before ball contact');
const flat=createNetMatch('tennis'),lob=createNetMatch('tennis');
for(const match of [flat,lob]){match.status='playing';match.lastTeam=1;match.ball={x:400,z:225,y:270,vx:0,vz:0,vy:30};match.aim={x:820,z:225};}
lob.attackStyle='roll';strikeNet(flat,0,1);strikeNet(lob,0,1);
assert.ok(flat.ball.vx>lob.ball.vx*1.3,'A volley is substantially faster than a lob');
console.log('Passed: continuous points, anticipation and distinct shots.');

const runner=createNetMatch('tennis').players[0];
for(let i=0;i<12;i++)moveRunner(runner,1,0,1/120,320);
assert.ok(runner.vx>280,'A short directional press reaches useful running speed');
for(let i=0;i<12;i++)moveRunner(runner,-1,0,1/120,320);
assert.ok(runner.vx< -200,'Changing direction responds before a ball passes the athlete');
for(let i=0;i<12;i++)moveRunner(runner,0,0,1/120,320);
assert.ok(Math.abs(runner.vx)<20,'Releasing movement brakes for a balanced contact');

const intercept=createNetMatch('tennis');intercept.status='playing';intercept.autoSwitch=false;intercept.lastTeam=1;intercept.lastHit=2;
intercept.players[0].x=200;intercept.players[0].z=225;intercept.players[1].x=145;intercept.players[1].z=225;
intercept.ball={x:256,z:225,y:310,vx:-900,vz:0,vy:180};
net.pressNet?.(intercept);
stepNet(intercept,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
assert.equal(intercept.lastHit,0,'A prepared athlete can intercept before the predicted receiver');

const control=createNetMatch('tennis');control.status='playing';control.lastTeam=1;control.lastHit=2;
control.players[0].x=400;control.players[1].x=100;control.players[1].z=225;
control.ball={x:650,z:225,y:200,vx:-700,vz:0,vy:0};
stepNet(control,1/120,{x:1,z:0,prepare:true,jump:false},'Club');
assert.equal(control.active,0,'Automatic selection must not steal a movement or charged shot');
for(let i=0;i<12;i++)stepNet(control,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(control.active,0,'The selected athlete stays stable through the same incoming ball');
console.log('Passed: responsive running, deliberate interception and stable athlete control.');

const reception=(quality:number)=>{
 const match=createNetMatch('footvolley');match.status='playing';match.lastTeam=1;match.lastHit=2;
 match.players[0].x=150;match.players[0].z=225;match.players[1].x=350;match.players[1].z=225;
 match.ball={x:175,z:225,y:414,vx:-200,vz:0,vy:80};strikeNet(match,0,quality);return match;
};
const balanced=reception(1),rushed=reception(.2);
assert.ok(flightTime(balanced,370)>flightTime(rushed,370)+.2,'A balanced reception gives the partner more time to set');
assert.ok(Math.abs(landingX(balanced,370)-362)<1,'The reception arrives at the partner chest contact, rather than overshooting it');
stepNet(balanced,1/120,{x:1,z:0,prepare:true,jump:false},'Club');
assert.equal(balanced.active,1,'Footvolley hands control to the partner after a legal contact');

const finish=(sport:'tennis'|'footvolley',airborne:boolean,quality=1)=>{
 const match=createNetMatch(sport);match.status='playing';match.lastTeam=sport==='tennis'?1:0;match.lastHit=sport==='tennis'?2:1;match.touches=sport==='tennis'?1:2;
 const p=match.players[0];p.x=400;p.z=225;p.y=airborne?380:FLOOR;match.charge=.6;match.aim={x:850,z:225};
 match.ball={...netContact(match,0),vx:0,vz:0,vy:80};strikeNet(match,0,quality);return match;
};
for(const sport of ['tennis','footvolley'] as const){
 const ground=finish(sport,false),air=finish(sport,true),late=finish(sport,true,.2);
 assert.ok(air.ball.vx>ground.ball.vx*1.1,`${sport}: a timed aerial finish gains speed`);
 assert.ok(air.ball.vx>late.ball.vx*1.12,`${sport}: a balanced finish beats a rushed hit`);
}
const jumping=createNetMatch('footvolley');jumping.status='playing';jumping.active=-1;jumping.lastTeam=1;jumping.lastHit=3;jumping.touches=2;
jumping.contactAge=.4;jumping.players[2].x=650;jumping.players[2].z=225;jumping.ball={x:638,z:225,y:200,vx:0,vz:0,vy:120};
const unreadyJump=structuredClone(jumping);unreadyJump.contactAge=0;stepNet(unreadyJump,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(unreadyJump.players[2].y,FLOOR,'CPU cannot jump before reacting to a newly hit ball');
stepNet(jumping,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.ok(jumping.players[2].y<FLOOR,'CPU attackers jump for a reachable high setup');
console.log('Passed: cooperative reception arcs and useful, balanced aerial finishes.');

const guideGround=createNetMatch('tennis');guideGround.status='playing';guideGround.lastTeam=1;guideGround.lastHit=2;guideGround.ball={x:500,z:225,y:150,vx:-300,vz:0,vy:120};
const guideAir=structuredClone(guideGround);guideAir.players[0].y=380;
assert.ok(netGuide(guideAir).time<netGuide(guideGround).time-.12,'The guide shows the earlier contact available while jumping');
const bufferedJump=createNetMatch('tennis');bufferedJump.status='playing';bufferedJump.autoSwitch=false;bufferedJump.cooldown=1;
bufferedJump.ball={x:800,z:225,y:100,vx:0,vz:0,vy:0};bufferedJump.players[0].y=445;bufferedJump.players[0].vy=80;
stepNet(bufferedJump,1/120,{x:0,z:0,prepare:false,jump:true},'Club');
for(let i=0;i<12;i++)stepNet(bufferedJump,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.ok(bufferedJump.players[0].vy<0&&bufferedJump.players[0].y<435,'A jump tapped just before landing is kept until the feet touch sand');
console.log('Passed: airborne guidance and buffered jump input.');

const shortServe=createNetMatch('tennis');shortServe.active=-1;shortServe.aim={x:610,z:225};serveNet(shortServe);let shortReturns=0;
for(let i=0;i<600&&shortServe.status==='playing';i++){stepNet(shortServe,1/120,{x:0,z:0,prepare:false,jump:false},'Club');shortReturns=Math.max(shortReturns,shortServe.rally);}
assert.ok(shortReturns>=1,'CPU stays grounded when an aerial intercept would occur across the net');
const edge=createNetMatch('tennis');edge.status='playing';edge.autoSwitch=false;edge.cooldown=1;edge.players[0].x=40;
edge.ball={x:800,z:225,y:100,vx:0,vz:0,vy:0};stepNet(edge,.05,{x:-1,z:0,prepare:false,jump:false},'Club');
assert.equal(edge.players[0].vx,0,'The court edge stops outward momentum so the next turn responds immediately');

const tap=createNetMatch('tennis');tap.status='playing';tap.autoSwitch=false;tap.lastTeam=1;tap.lastHit=2;
tap.players[0].x=250;tap.players[0].z=225;tap.ball={x:306,z:225,y:322,vx:0,vz:0,vy:30};
net.pressNet?.(tap,{x:1,z:-1});stepNet(tap,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(tap.lastHit,0,'A quick tap next to the ball returns it without holding the button');
assert.match(tap.feedback,/PERFEITO|BOM/,'A centered tap is a good volley, rather than a preparation penalty');
assert.ok(landingX(tap,437)>875&&tap.ball.vz<0,'The direction held at press chooses a deep upper lane');
for(let i=0;i<12;i++)stepNet(tap,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
net.releaseNet(tap,{x:0,z:0});assert.equal(tap.shotWindow,0,'Releasing an already completed stroke cannot arm a second athlete');

const rise=createNetMatch('tennis');rise.status='playing';rise.autoSwitch=false;rise.lastTeam=1;rise.lastHit=2;rise.players[0].z=225;
rise.ball={x:256,z:225,y:323,vx:0,vz:0,vy:-200};net.pressNet?.(rise);stepNet(rise,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(rise.lastHit,0,'A deliberate volley can intercept an ascending ball');
for(const sport of ['tennis','footvolley'] as const){
 const held=createNetMatch(sport);serveNet(held);net.pressNet?.(held);let contacts=0,serial=held.contactSerial;
 for(let i=0;i<1800&&held.status==='playing';i++){
  stepNet(held,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
  if(serial!==held.contactSerial){serial=held.contactSerial;if(held.lastHit<2)contacts++;}
 }
 assert.ok(contacts<=(sport==='tennis'?1:0),`${sport}: holding one early press cannot sustain automatic returns`);
 const companion=createNetMatch(sport);companion.status='playing';companion.autoSwitch=false;companion.lastTeam=1;companion.lastHit=2;companion.contactAge=.4;
 companion.players[0].x=40;companion.players[0].z=30;companion.players[1].x=300;companion.players[1].z=225;
 companion.ball={x:sport==='tennis'?356:325,z:225,y:sport==='tennis'?322:414,vx:0,vz:0,vy:30};
 stepNet(companion,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
 if(sport==='tennis'){
  assert.equal(companion.lastHit,1,'The partner can cover one missed tennis return');assert.equal(companion.coverUsed,true);
  assert.ok(companion.ball.vx>0&&flightTime(companion,437)>1.6,'Partner cover is a weak safe lob that buys positioning time');
  companion.lastTeam=1;companion.lastHit=2;companion.cooldown=0;companion.contactAge=1;companion.ball={x:356,z:225,y:322,vx:0,vz:0,vy:30};
  stepNet(companion,1/120,{x:0,z:0,prepare:false,jump:false},'Club');assert.equal(companion.lastHit,2,'A second teammate cover needs a fresh human contact');
  companion.ball={...netContact(companion,0),vx:0,vz:0,vy:30};net.pressNet(companion);stepNet(companion,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
  assert.equal(companion.lastHit,0);assert.equal(companion.coverUsed,false,'An actual human return restores one partner cover');
 }else assert.equal(companion.lastHit,2,'An idle footvolley team cannot get free incoming returns');
}
const reaction=createNetMatch('tennis');reaction.status='playing';reaction.active=-1;reaction.lastTeam=0;reaction.lastHit=0;
reaction.players[2].x=635;reaction.players[2].z=225;reaction.ball={x:579,z:225,y:322,vx:0,vz:0,vy:30};
stepNet(reaction,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(reaction.lastHit,0,'CPU needs reaction time before returning a newly hit ball');
console.log('Passed: quick strokes, directional placement, ascending volleys and explicit input ownership.');
const approach=createNetMatch('tennis');approach.status='playing';approach.autoSwitch=false;approach.lastTeam=1;approach.lastHit=2;
approach.players[0].x=100;approach.players[0].z=225;approach.players[1].x=450;approach.players[1].z=420;approach.ball={x:356,z:225,y:100,vx:0,vz:0,vy:0};net.pressNet(approach);
for(let i=0;i<12;i++)stepNet(approach,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
assert.equal(approach.players[0].x,100,'Preparation cannot run the human across the court automatically');
const quickDrive=createNetMatch('tennis');quickDrive.status='playing';quickDrive.autoSwitch=false;quickDrive.lastTeam=1;quickDrive.lastHit=2;
quickDrive.players[0].x=250;quickDrive.players[0].z=225;quickDrive.ball={x:306,z:225,y:322,vx:0,vz:0,vy:30};quickDrive.aimPreset=2;net.pressNet(quickDrive,{x:0,z:0});
assert.equal(quickDrive.aimPreset,2,'Neutral directional input keeps the chosen target preset');
stepNet(quickDrive,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.ok(flightTime(quickDrive,437)<1.3,'An ordinary tapped drive reaches the other court promptly');
const lane=(style:'power'|'roll')=>{
 const match=createNetMatch('tennis');match.status='playing';match.autoSwitch=false;match.lastTeam=1;match.lastHit=2;match.players[0].x=250;match.players[0].z=225;
 match.players[2].x=700;match.players[2].z=80;match.players[3].x=850;match.players[3].z=80;match.attackStyle=style;
 match.ball={x:306,z:225,y:322,vx:0,vz:0,vy:30};match.charge=1;net.releaseNet(match,{x:1,z:1});stepNet(match,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
 let returned=false;
 for(let i=0;i<700&&match.status==='playing';i++){stepNet(match,1/120,{x:0,z:0,prepare:false,jump:false},'Club');if(match.lastHit>=2)returned=true;}
 return {match,returned};
};
const driveLane=lane('power'),lobLane=lane('roll');
assert.equal(driveLane.match.points[0],1,'A charged drive into an open sideline beats the CPU');
assert.equal(driveLane.returned,false);assert.equal(lobLane.returned,true,'A lob gives the opponent time to recover the same open lane');
console.log('Passed: position ownership and purposeful drive versus lob placement.');

const doubles=createNetMatch('tennis');serveNet(doubles);let heldFor=0,tapped=-1,humanReturns=0,serial=doubles.contactSerial;
for(let i=0;i<1800&&doubles.status==='playing';i++){
 const guide=netGuide(doubles),p=doubles.players[doubles.active],incoming=guide.team===0;
 const dx=incoming?guide.x-p.x:0,dz=incoming?guide.z-p.z:0;
 const input={x:Math.abs(dx)>10?Math.sign(dx):0,z:Math.abs(dz)>10?Math.sign(dz):0,prepare:heldFor>0,jump:false};
 if(incoming&&Math.hypot(dx,dz)<80&&guide.time>0&&guide.time<.23&&tapped!==doubles.contactSerial){net.pressNet(doubles,input);tapped=doubles.contactSerial;heldFor=.08;}
 if(heldFor>0){heldFor-=1/120;input.prepare=true;if(heldFor<=0)net.releaseNet(doubles,input);}
 stepNet(doubles,1/120,input,'Club');
 if(serial!==doubles.contactSerial){serial=doubles.contactSerial;if(doubles.rally>0&&doubles.lastHit===doubles.active)humanReturns++;}
}
assert.ok(humanReturns>=2,`Following the incoming circle from serve must permit real doubles play without secret recovery positioning (${humanReturns})`);
console.log('Passed: one teammate cover and real player movement from the opening serve.');
const priority=createNetMatch('tennis');priority.status='playing';priority.autoSwitch=false;priority.lastTeam=1;priority.lastHit=2;priority.contactAge=.4;
priority.players[0].x=250;priority.players[0].z=225;priority.players[1].x=255;priority.players[1].z=225;priority.ball={x:313,z:225,y:322,vx:0,vz:0,vy:30};
net.pressNet(priority);stepNet(priority,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(priority.lastHit,0,'A nearby partner cannot steal a human timed volley');
const cpuLob=createNetMatch('tennis');cpuLob.status='playing';cpuLob.lastTeam=0;cpuLob.lastHit=0;cpuLob.rally=3;cpuLob.ball={...netContact(cpuLob,2),vx:0,vz:0,vy:30};
strikeNet(cpuLob,2,1);assert.match(cpuLob.feedback,/^LOB/,'CPU feedback describes its real shot instead of the selected human stroke');

const {shotTiming}=await import('./arcade.ts');
assert.ok(shotTiming(0).perfect&&shotTiming(.8).early&&shotTiming(-.8).late,'Contact timing has early, perfect and late bands');
const timedShot=(ahead:number)=>{
 const m=createNetMatch('tennis');m.status='playing';m.active=0;m.lastTeam=1;m.lastHit=2;m.aim={x:820,z:225};
 m.players[0].z=145;m.ball={...netContact(m,0),vx:0,vz:0,vy:20};
 strikeNet(m,0,.7,ahead);return m;
};
const early=timedShot(.8),late=timedShot(-.8),perfect=timedShot(0);
assert.ok(early.ball.vz>0&&late.ball.vz<0,'Early crosses the court, late goes down the line');
assert.match(perfect.feedback,/PERFEITO/);assert.match(early.feedback,/DIAGONAL/);assert.match(late.feedback,/PARALELA/);
const aimed=createNetMatch('tennis');aimed.status='playing';aimed.active=0;net.releaseNet(aimed,{x:0,z:-1});
assert.ok(aimed.shotAimed,'An explicit direction overrides timing placement');
const runFor=(prepare:boolean)=>{
 const m=createNetMatch('tennis');m.status='playing';m.active=0;m.autoSwitch=false;m.charge=1;m.cooldown=1;
 m.ball={x:800,z:225,y:100,vx:0,vz:0,vy:0};const x=m.players[0].x;
 for(let i=0;i<12;i++)stepNet(m,1/120,{x:1,z:0,prepare,jump:false},'Club');
 return m.players[0].x-x;
};
assert.ok(runFor(true)<runFor(false)*.6,'Charging slows the athlete down');
console.log('Passed: press timing picks the side, perfect contacts and charging roots the athlete.');

const toss=createNetMatch('footvolley');net.beginServe(toss);
assert.equal(toss.status,'tossing','The human serves with a toss instead of an automatic serve');
for(let i=0;i<60;i++)stepNet(toss,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
net.pressNet(toss);assert.equal(toss.status,'playing');assert.match(toss.feedback,/PERFEITO/,'Hitting at the peak is a perfect serve');
const lateServe=createNetMatch('footvolley');net.beginServe(lateServe);
for(let i=0;i<130&&lateServe.status==='tossing';i++)stepNet(lateServe,1/120,{x:0,z:0,prepare:false,jump:false},'Club');
assert.equal(lateServe.status,'playing','A forgotten toss still serves, weakly');assert.match(lateServe.feedback,/FRACO/);
const cpuServe=createNetMatch('footvolley');cpuServe.server=1;net.beginServe(cpuServe);assert.equal(cpuServe.status,'playing','The CPU serves at once');
console.log('Passed: timed human serve, late fallback and instant CPU serve.');

{
 const {rivals}=await import('./rivals.ts');
 const landing=(style:string,rally:number)=>{
  const m=createNetMatch('footvolley',rivals.find(r=>r.style===style));m.status='playing';m.lastTeam=1;m.lastHit=3;m.touches=2;m.rally=rally;
  m.ball={...netContact(m,2),vx:0,vz:0,vy:20};strikeNet(m,2,1);
  return Math.round(landingX(m,437));
 };
 const spots=new Set(['attack','placement','defense','block'].map(s=>landing(s,0)));
 assert.ok(spots.size>=3,`Rival styles aim at different depths, got ${[...spots]}`);
 assert.notEqual(landing('placement',0),landing('placement',1),'A placement rival varies its target between rallies');
 const named=createNetMatch('tennis',rivals[1]);assert.equal(named.rivalName,rivals[1].name.toUpperCase());assert.equal(named.cpuStyle,rivals[1].style);
 console.log('Passed: rival styles change CPU shots and the rival is named.');
}
