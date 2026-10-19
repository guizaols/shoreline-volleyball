import assert from 'node:assert/strict';
import {createGame,contactPoint,step} from './game.ts';

const g=createGame();g.status='playing';g.autoSwitch=false;g.lastTeam=1;g.lastHit=3;
const p=g.players[0];p.action='bump';p.actionTime=.28;
const hand=contactPoint(p);
g.ball={x:hand.x,z:hand.z+20,y:hand.y,vx:0,vz:0,vy:0};
step(g,1/120,0,false,'Club',false,false,0,false,true);
assert.equal(g.rally,1);
assert.ok(Math.abs(g.ball.z-hand.z-20)<1,'Contact must not teleport the ball to the center of the athlete');
console.log('Passed: impact preserves the real ball position.');
const contacts=['Chill','Club','Pro'].map(level=>{
 const match=createGame();match.status='playing';match.autoSwitch=false;match.lastTeam=1;match.lastHit=3;
 match.players[0].action='bump';match.players[0].actionTime=.28;
 const target=contactPoint(match.players[0]);match.ball={...target,z:target.z+43,vx:0,vz:0,vy:0};
 step(match,1/120,0,false,level,false,false,0,false,true);return match.rally;
});
assert.deepEqual(contacts,[1,1,0],'Professional mode must require more precise positioning');

const control=createGame();control.status='playing';control.windEnabled=false;control.lastTeam=1;control.lastHit=2;
control.players[0].x=400;control.players[0].z=225;control.players[1].x=100;control.players[1].z=225;
control.ball={x:650,z:225,y:200,vx:-700,vz:0,vy:0};
step(control,1/120,1,false,'Club',false,false,0,false,true);
assert.equal(control.active,0,'Automatic selection must preserve the athlete while the player moves and prepares');
for(let i=0;i<12;i++)step(control,1/120,0,false,'Club');
assert.equal(control.active,0,'Releasing movement must not switch athletes during the same ball');
const online=createGame();online.status='playing';online.online=true;online.lastTeam=0;online.lastHit=0;
online.players[2].x=600;online.players[2].z=225;online.players[3].x=900;online.players[3].z=225;
online.ball={x:350,z:225,y:200,vx:700,vz:0,vy:0};
step(online,1/120,0,false,'Club',false,false,0,false,false,{move:-1,depth:0,jump:false,prepare:true,attack:false,dive:false,block:false});
assert.equal(online.remoteActive,2,'The remote player keeps the same control over deliberate movement');
console.log('Passed: volleyball selection preserves movement and preparation for both players.');
const stationary=createGame();stationary.status='playing';stationary.windEnabled=false;stationary.lastTeam=1;stationary.lastHit=2;
stationary.players[0].x=45;stationary.players[0].z=225;stationary.players[1].x=380;stationary.players[1].z=225;
stationary.ball={x:650,z:225,y:100,vx:-300,vz:0,vy:0};
step(stationary,1/120,0,false,'Club',false,false,0,false,true);
assert.equal(stationary.active,1,'Holding preparation while stationary still selects the reachable receiver');
