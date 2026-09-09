import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {attachRooms} from './rooms.ts';
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
 console.log('Passed: mirrored physics, guest Turbo, no AI, two real WebSocket clients, ready gate, room capacity, movement, charge, shot, invalid aim and disconnect.');
}finally{clients.forEach(ws=>ws.terminate());stop();server.close();}
