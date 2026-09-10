import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {attachRooms} from './rooms.ts';
import {createGame,prepareServe,point,guidance,volleyAction,volleyPerspective,step as stepVolley} from '../lib/game.ts';
import {newFootball,startFootball,stepFootball} from '../lib/gol.ts';
import {perspective,onlineAction,emptyInput} from '../lib/football-online.ts';
const game=newFootball();game.remoteCharge=.8;game.remoteEnergy=100;game.remoteAim=2;
assert.deepEqual(perspective(perspective(game)),game);
startFootball(game);game.owner=1;game.online=true;
for(let i=0;i<300;i++)stepFootball(game,1/120,0,0,false,emptyInput());
assert.equal(game.owner,1,'Online guest never shoots automatically');
onlineAction(game,1,'special',null);onlineAction(game,1,'shoot',null);
assert.ok(game.ball.vx< -1000);assert.equal(game.remoteEnergy,0);assert.equal(game.energy,40);
assert.equal(game.lastShooter,1);
const volley=createGame();volley.online=true;
assert.deepEqual(volleyPerspective(volleyPerspective(volley)),volley);
point(volley,1);prepareServe(volley);volleyAction(volley,0,'serve',null);assert.equal(volley.status,'serving');
const neutral={move:0,depth:0,jump:false,attack:false,dive:false,block:false,prepare:false};
for(let i=0;i<300;i++)stepVolley(volley,1/120,0,false,'Club',false,false,0,false,false,neutral);
assert.equal(volley.status,'serving','Only the serving human can toss');
volleyAction(volley,1,'style',2);assert.equal(volley.remoteServeStyle,'jump');
volleyAction(volley,1,'serve',null);
for(let i=0;i<66;i++)stepVolley(volley,1/120,0,false,'Club',false,false,0,false,false,neutral);
assert.equal(volley.status,'tossing','Opponent serve must not be automatic');
volleyAction(volley,1,'serve',null);assert.equal(volley.status,'playing');assert.equal(volley.lastHit,3);assert.ok(volley.ball.vx<0);
volleyAction(volley,1,'aim',null);assert.notDeepEqual(volley.remoteAim,{x:190,z:225});
volleyAction(volley,1,'style',2);assert.equal(volley.remoteAttackStyle,'tip');assert.equal(volley.attackStyle,'power');
// Two guided teams rally, then deliberately miss to finish a complete match.
{
 const g=createGame();g.online=true;g.pointGoal=7;const served=new Set(),contacts=new Set(),clamp=(n:number)=>Math.max(-1,Math.min(1,n));
 for(let i=0;i<150000&&g.status!=='over';i++){
  if(g.status==='ready')prepareServe(g);if(g.status==='serving'){served.add(g.server);volleyAction(g,g.server,'serve',null);}if(g.status==='tossing'&&g.tossTime>=.56)volleyAction(g,g.server,'serve',null);
  const target=guidance(g),input=[0,1].map(team=>{const p=g.players[team?g.remoteActive:g.active],miss=g.rally>12&&team===((g.score[0]+g.score[1])%3===0?0:1);return {...neutral,move:miss?0:target.team===team?clamp((target.x-p.x)/45):0,depth:miss?1:target.team===team?clamp((target.z-p.z)/45):0,prepare:!miss};});
  const a=input[0];stepVolley(g,1/120,a.move,a.jump,'Club',a.attack,a.dive,a.depth,a.block,a.prepare,input[1]);if(g.lastTeam>=0)contacts.add(g.lastTeam);
 }
 assert.equal(g.status,'over');assert.equal(contacts.size,2);assert.equal(served.size,2);assert.ok(g.bestRally>12);
 console.log('Passed: full online volleyball match, both teams serve and return, extended rallies and match completion.');
}
const server=createServer(),stop=attachRooms(server);server.listen(0,'127.0.0.1');await once(server,'listening');
const port=(server.address() as {port:number}).port;
const clients:WebSocket[]=[];
async function client(){const ws=new WebSocket(`ws://127.0.0.1:${port}/play`);clients.push(ws);await once(ws,'open');return ws;}
function wait(ws:WebSocket,predicate:(data:any)=>boolean):Promise<any>{return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.off('message',message);reject(new Error('Timed out waiting for room state'));},4000);
 const message=(raw:Buffer)=>{const data=JSON.parse(raw.toString());if(predicate(data)){clearTimeout(timer);ws.off('message',message);resolve(data);}};ws.on('message',message);
});}
const send=(ws:WebSocket,data:unknown)=>ws.send(JSON.stringify(data));
try{
 const a=await client();const joined=wait(a,d=>d.type==='joined');send(a,{type:'join',room:'new'});const {room}=await joined;
 const b=await client();const second=wait(b,d=>d.type==='joined');send(b,{type:'join',room});await second;
 const c=await client();const full=wait(c,d=>d.error);send(c,{type:'join',room});assert.match((await full).error,/cheia/);
 send(a,{type:'ready'});const waiting=await wait(a,d=>d.type==='state'&&d.ready);assert.equal(waiting.game.status,'ready');
 send(b,{type:'ready'});const playing=await wait(b,d=>d.type==='state'&&d.game.status==='playing');assert.equal(playing.game.owner,1);
 send(b,{type:'input',x:1,y:0,charging:false});const moved=await wait(b,d=>d.type==='state'&&d.game.players[0].x>180);assert.ok(moved.game.players[0].x<450);
 send(b,{type:'input',x:0,y:0,charging:false});
 send(a,{type:'input',x:0,y:0,charging:true});await wait(a,d=>d.type==='state'&&d.game.charge>.7);
 const shot=wait(b,d=>d.type==='state'&&d.game.owner===-1);send(a,{type:'action',action:'shoot'});assert.ok((await shot).game.ball.vx<0);
 send(a,{type:'action',action:'aim',value:999});const valid=await wait(a,d=>d.type==='state');assert.ok(valid.game.aim<=2);
 const left=wait(a,d=>d.error);b.close();assert.match((await left).error,/saiu/);
 const va=await client(),vjoined=wait(va,d=>d.type==='joined');send(va,{type:'join',room:'new',sport:'volley'});const vr=(await vjoined).room;
 const wrong=await client(),rejected=wait(wrong,d=>d.error);send(wrong,{type:'join',room:vr});assert.match((await rejected).error,/indisponível/);
 const vb=await client(),vsecond=wait(vb,d=>d.type==='joined');send(vb,{type:'join',room:vr,sport:'volley'});await vsecond;
 send(va,{type:'ready'});send(vb,{type:'ready'});
 const serving=await wait(vb,d=>d.type==='state'&&d.game.status==='serving');assert.equal(serving.game.server,1);assert.equal(serving.game.players.length,4);
 send(vb,{type:'action',action:'serve'});assert.equal((await wait(va,d=>d.type==='state')).game.status,'serving');
 send(va,{type:'action',action:'serve'});await wait(va,d=>d.type==='state'&&d.game.tossTime>.5);
 send(va,{type:'action',action:'serve'});await wait(vb,d=>d.type==='state'&&d.game.status==='playing');
 send(vb,{type:'input',...neutral,move:1,depth:1});
 const movement=await wait(vb,d=>d.type==='state'&&d.game.players.some((p:any,i:number)=>i<2&&p.vx>30&&p.vz>30));assert.equal(movement.game.online,true);
 console.log('Passed: volleyball room isolation, two teams, manual serve, remote movement, mirrored state and independent shot selection.');
 console.log('Passed: mirrored physics, guest Turbo, no AI, two real WebSocket clients, ready gate, room capacity, movement, charge, shot, invalid aim and disconnect.');
}finally{clients.forEach(ws=>ws.terminate());stop();server.close();}
