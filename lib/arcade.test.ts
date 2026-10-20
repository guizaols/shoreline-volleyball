import assert from 'node:assert/strict';
import {createNetMatch,strikeNet,netPoint,releaseNet,stepNet,netContact} from './net.ts';
import {createSoccer,startSoccer,shootSoccer,passSoccer,stepSoccer} from './soccer.ts';
import {armSpecial,cancelArcadeInput,aimDrift} from './arcade.ts';
const idle={x:0,z:0,prepare:false,jump:false};
for(const sport of ['tennis','footvolley'] as const){
 const make=(charge:number)=>{const g=createNetMatch(sport);g.status='playing';g.active=0;g.charge=charge;g.clock=.15;g.lastTeam=sport==='footvolley'?0:1;g.lastHit=sport==='footvolley'?1:2;g.touches=sport==='footvolley'?2:1;g.ball={x:400,z:225,y:240,vx:0,vz:0,vy:30};g.aim={x:850,z:225};return g;};
 const light=make(.2),strong=make(1);strikeNet(light,0,1);strikeNet(strong,0,1);
 assert.ok(strong.ball.vx>light.ball.vx*1.12,`${sport}: holding increases speed`);
 assert.ok(Math.abs(strong.ball.vz)>Math.abs(light.ball.vz)+20,`${sport}: full power sacrifices precision`);
 const special=make(.6);special.energy[0]=100;armSpecial(special);strikeNet(special,0,1);
 assert.equal(special.energy[0],0);assert.equal(special.specialShot,true);assert.equal(special.specialArmed,false);
 const blocked=make(.6);blocked.energy[0]=99;armSpecial(blocked);strikeNet(blocked,0,1);assert.equal(blocked.specialShot,false);
 const cancel=make(.9);cancel.energy[0]=100;armSpecial(cancel);releaseNet(cancel);cancelArcadeInput(cancel);
 assert.equal(cancel.shotWindow,0);assert.equal(cancel.charge,0);assert.equal(cancel.specialArmed,false);assert.equal(cancel.energy[0],100);
 const earned=make(.4);for(let n=0;n<7;n++){earned.lastHit=2;earned.lastTeam=1;earned.touches=0;strikeNet(earned,0,1);}
 assert.equal(earned.energy[0],100,'Good contacts earn the special');
 netPoint(earned,1,'Fora');assert.equal(earned.combo[0],0,'Losing a point breaks the combo');
}
const buffered=createNetMatch('tennis');buffered.status='playing';buffered.active=0;buffered.autoSwitch=false;buffered.lastTeam=1;buffered.lastHit=2;buffered.cooldown=0;buffered.charge=.55;
buffered.ball={...netContact(buffered,0),vx:0,vz:0,vy:30};releaseNet(buffered);stepNet(buffered,1/120,idle,'Club');
assert.equal(buffered.lastHit,0,'Releasing shortly before contact still hits');
const shot=(power:number,special=false)=>{const g=createSoccer();startSoccer(g);g.charge=power;g.clock=.15;if(special){g.energy[0]=100;armSpecial(g);}shootSoccer(g);for(let i=0;i<10;i++)stepSoccer(g,1/120,idle,'Club');return g;};
const light=shot(.2),strong=shot(1),special=shot(.6,true);
assert.ok(strong.ball.vx>light.ball.vx*1.2);assert.ok(Math.abs(strong.ball.vz)>Math.abs(light.ball.vz)+30);
assert.equal(special.energy[0],0);assert.ok(special.specialShot);assert.ok(special.ball.vx>strong.ball.vx);
const spam=createSoccer();startSoccer(spam);for(let i=0;i<10;i++)passSoccer(spam);assert.equal(spam.energy[0],0,'Pass button spam cannot earn energy');
assert.equal(aimDrift(.5,10),0);assert.ok(Math.abs(aimDrift(1,.15))>75);
console.log('Passed: charged power/precision, buffered contact, earned specials, consumption, combo break and cancellation.');
const receive=createNetMatch('footvolley');receive.status='playing';receive.lastTeam=1;receive.lastHit=2;receive.energy[0]=100;armSpecial(receive);strikeNet(receive,0,1);
assert.equal(receive.energy[0],100,'Receiving does not spend the footvolley finisher');assert.ok(receive.specialArmed);
const save=createSoccer();startSoccer(save);save.owner=-1;save.cooldown=0;save.lastHit=4;save.specialShot=true;save.ball={x:save.players[0].x+35,z:225,y:420,vx:-1100,vz:0,vy:0};
stepSoccer(save,1/120,idle,'Club');assert.ok(save.ball.vx>0,'Keeper can repel a special');assert.equal(save.owner,-1,'Powerful saves create a playable rebound');assert.match(save.feedback,/REBOTE/);assert.ok(save.energy[0]>=30,'Stopping a special rewards the defender');
const passes=createSoccer();startSoccer(passes);passSoccer(passes);for(let i=0;i<400&&!passes.energy.some(Boolean);i++)stepSoccer(passes,1/120,idle,'Club');assert.ok(passes.energy.some(Boolean),'Receiving the pass or intercepting it earns energy');
const close=createSoccer();startSoccer(close);close.players[1].x=800;close.players[1].z=225;close.ball={x:818,z:225,y:437,vx:0,vz:0,vy:0};close.energy[0]=100;close.charge=.55;armSpecial(close);shootSoccer(close);
for(let i=0;i<32;i++)stepSoccer(close,1/120,idle,'Club');
assert.equal(close.score[0],0,'Close-range special must collide with a correctly positioned keeper during the kick cooldown');assert.match(close.feedback,/REBOTE/);
