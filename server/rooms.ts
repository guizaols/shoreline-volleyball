import {randomBytes} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import type {Server} from 'node:http';
import {newFootball,startFootball,stepFootball} from '../lib/gol.ts';
import {createGame,prepareServe,step as stepVolley,volleyPerspective,volleyAction,type Game,type VolleyInput} from '../lib/game.ts';
import {emptyInput,onlineAction,perspective} from '../lib/football-online.ts';

export function attachRooms(server:Server){
 const wss=new WebSocketServer({server,path:'/play',maxPayload:2048});
 type Seat={ws:WebSocket;input:ReturnType<typeof emptyInput>;ready:boolean;volleyInput:VolleyInput;last:number;count:number};
 type Room={game:ReturnType<typeof newFootball>;volley:Game|null;started:boolean;seats:Seat[];created:number};
 // ponytail: rooms live in one process; add shared room routing before running multiple replicas.
 const neutral=():VolleyInput=>({move:0,depth:0,jump:false,attack:false,dive:false,block:false,prepare:false});
 const rooms=new Map<string,Room>();
 const send=(ws:WebSocket,data:unknown)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<100000)ws.send(JSON.stringify(data));};
 wss.on('connection',ws=>{
  if(wss.clients.size>220){ws.close(1013,'Arena cheia');return;}
  let room:Room|undefined,seat:Seat|undefined;
  const timeout=setTimeout(()=>ws.close(1008,'Entre em uma sala'),10000);
  ws.on('error',()=>{});
  ws.on('message',raw=>{
   try{
    const m=JSON.parse(raw.toString());if(!m||typeof m!=='object')return;
    if(!room){
     if(m.type!=='join')return;
     let id=m.room;
     if(id==='new'){
      if(rooms.size>=100){send(ws,{error:'Arena cheia. Tente novamente.'});return;}
      id=randomBytes(12).toString('hex');const game=newFootball();game.online=true;
      const volley=m.sport==='volley'?createGame():null;if(volley){volley.online=true;volley.pointGoal=7;volley.opponentName='AMIGO';volley.names=['Alex','Dani'];volley.opponentPlayers=['Sam','Rafa'];}
      rooms.set(id,{game,volley,started:false,seats:[],created:Date.now()});
     }
     room=typeof id==='string'?rooms.get(id):undefined;
     if(!room||room.seats.length>=2||!!room.volley!==(m.sport==='volley')){room=undefined;send(ws,{error:'Sala indisponível ou cheia.'});ws.close();return;}
     clearTimeout(timeout);seat={ws,input:emptyInput(),ready:false,volleyInput:neutral(),last:Date.now(),count:0};room.seats.push(seat);
     send(ws,{type:'joined',room:id});return;
    }
    if(!seat)return;
    const now=Date.now();if(now-seat.last>1000){seat.last=now;seat.count=0;}if(++seat.count>100){ws.close(1008,'Muitas mensagens');return;}
    const team=room.seats.indexOf(seat);
    if(m.type==='input'){
     if(room.volley){if([m.move,m.depth].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1)&&['jump','attack','dive','block','prepare'].every(k=>typeof m[k]==='boolean'))seat.volleyInput={move:team?-m.move:m.move,depth:m.depth,jump:m.jump,attack:m.attack,dive:m.dive,block:m.block,prepare:m.prepare};return;}
     if([m.x,m.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1)&&typeof m.charging==='boolean')seat.input={x:m.x,y:m.y,charging:m.charging};
    }else if(m.type==='action'&&typeof m.action==='string'){if(room.volley)volleyAction(room.volley,team,m.action,m.value);else onlineAction(room.game,team,m.action,m.value);}
    else if(m.type==='ready'&&(!room.started||(room.volley||room.game).status==='over')){
     seat.ready=true;
     if(room.seats.length===2&&room.seats.every(s=>s.ready)){
      room.started=true;
      if(room.volley){room.volley=createGame();room.volley.online=true;room.volley.pointGoal=7;room.volley.opponentName='AMIGO';prepareServe(room.volley);}
      else{room.game=newFootball();room.game.online=true;startFootball(room.game);}
      room.seats.forEach(s=>{s.ready=false;s.input=emptyInput();s.volleyInput=neutral();});
     }
    }
   }catch{ws.close(1008,'Mensagem inválida');}
  });
  ws.on('close',()=>{
   clearTimeout(timeout);
   if(room){for(const [id,r] of rooms)if(r===room)rooms.delete(id);
    for(const peer of room.seats)if(peer.ws!==ws){send(peer.ws,{error:'Seu amigo saiu. Crie uma nova sala para jogar novamente.'});peer.ws.close();}}
  });
 });
 let frame=0,last=performance.now(),acc=0;
 const timer=setInterval(()=>{
  const now=performance.now();acc+=Math.min(.1,(now-last)/1000);last=now;
  while(acc>=1/120){
   for(const room of rooms.values())if(room.seats.length===2){
    const [a,b]=room.seats;
    if(room.volley){if(!room.started)continue;const g=room.volley;if(g.status==='ready')prepareServe(g);const first=Date.now()-a.last>1500?neutral():a.volleyInput,second=Date.now()-b.last>1500?neutral():b.volleyInput;stepVolley(g,1/120,first.move,first.jump,'Club',first.attack,first.dive,first.depth,first.block,first.prepare,second);continue;}
    const first=Date.now()-a.last>1500?emptyInput():a.input,second=Date.now()-b.last>1500?emptyInput():b.input;
    stepFootball(room.game,1/120,first.x,first.y,first.charging,{...second,x:-second.x});
   }
   acc-=1/120;
  }
  if(++frame%2===0)for(const room of rooms.values())room.seats.forEach((s,i)=>{
   const game=room.volley?(i?volleyPerspective(room.volley):room.volley):i?perspective(room.game):room.game;
   send(s.ws,{type:'state',game,players:room.seats.length,ready:s.ready});
  });
  for(const [id,room] of rooms)if(Date.now()-room.created>2*60*60*1000){rooms.delete(id);room.seats.forEach(s=>s.ws.close(1000,'Sala expirada'));}
 },1000/60);
 return ()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();};
}
