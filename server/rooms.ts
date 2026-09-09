import {randomBytes} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import type {Server} from 'node:http';
import {newFootball,startFootball,stepFootball} from '../lib/gol.ts';
import {emptyInput,onlineAction,perspective} from '../lib/football-online.ts';

export function attachRooms(server:Server){
 const wss=new WebSocketServer({server,path:'/play',maxPayload:2048});
 type Seat={ws:WebSocket;input:ReturnType<typeof emptyInput>;ready:boolean;last:number;count:number};
 type Room={game:ReturnType<typeof newFootball>;seats:Seat[];created:number};
 // ponytail: rooms live in one process; add shared room routing before running multiple replicas.
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
      rooms.set(id,{game,seats:[],created:Date.now()});
     }
     room=typeof id==='string'?rooms.get(id):undefined;
     if(!room||room.seats.length>=2){room=undefined;send(ws,{error:'Sala indisponível ou cheia.'});ws.close();return;}
     clearTimeout(timeout);seat={ws,input:emptyInput(),ready:false,last:Date.now(),count:0};room.seats.push(seat);
     send(ws,{type:'joined',room:id});return;
    }
    if(!seat)return;
    const now=Date.now();if(now-seat.last>1000){seat.last=now;seat.count=0;}if(++seat.count>100){ws.close(1008,'Muitas mensagens');return;}
    const team=room.seats.indexOf(seat);
    if(m.type==='input'){
     if([m.x,m.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1)&&typeof m.charging==='boolean')seat.input={x:m.x,y:m.y,charging:m.charging};
    }else if(m.type==='action'&&typeof m.action==='string')onlineAction(room.game,team,m.action,m.value);
    else if(m.type==='ready'&&['ready','over'].includes(room.game.status)){
     seat.ready=true;
     if(room.seats.length===2&&room.seats.every(s=>s.ready)){
      room.game=newFootball();room.game.online=true;startFootball(room.game);
      room.seats.forEach(s=>{s.ready=false;s.input=emptyInput();});
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
    const first=Date.now()-a.last>1500?emptyInput():a.input,second=Date.now()-b.last>1500?emptyInput():b.input;
    stepFootball(room.game,1/120,first.x,first.y,first.charging,{...second,x:-second.x});
   }
   acc-=1/120;
  }
  if(++frame%2===0)for(const room of rooms.values())room.seats.forEach((s,i)=>{
   const game=i?perspective(room.game):room.game;
   send(s.ws,{type:'state',game,players:room.seats.length,ready:s.ready});
  });
  for(const [id,room] of rooms)if(Date.now()-room.created>2*60*60*1000){rooms.delete(id);room.seats.forEach(s=>s.ws.close(1000,'Sala expirada'));}
 },1000/60);
 return ()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();};
}
