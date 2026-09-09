'use client';
import {useEffect,useRef,useState} from 'react';
import type {Football} from '../../lib/gol';
export function useOnline(game:React.RefObject<Football>,onState:()=>void){
 const socket=useRef<WebSocket|null>(null),active=useRef(false);
 const [info,setInfo]=useState({active:false,players:0,ready:false,link:'',error:''});
 const callback=useRef(onState);callback.current=onState;
 const send=(data:unknown)=>{if(socket.current?.readyState===WebSocket.OPEN&&socket.current.bufferedAmount<16000)socket.current.send(JSON.stringify(data));};
 const connect=(room:string)=>{
  if(active.current)return;active.current=true;setInfo({active:true,players:0,ready:false,link:'',error:''});
  const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/play`);socket.current=ws;
  ws.onopen=()=>send({type:'join',room});
  ws.onmessage=e=>{
   const data=JSON.parse(e.data);
   if(data.error){game.current.status='paused';setInfo(i=>({...i,error:data.error}));callback.current();}
   if(data.type==='joined'){
    const url=new URL(location.href);url.searchParams.set('room',data.room);history.replaceState(null,'',url);
    setInfo(i=>({...i,link:url.toString()}));
   }
   if(data.type==='state'){
    game.current=data.game;callback.current();
    setInfo(i=>i.players===data.players&&i.ready===data.ready?i:{...i,players:data.players,ready:data.ready});
   }
  };
  ws.onclose=()=>{if(socket.current!==ws)return;game.current.status='paused';callback.current();setInfo(i=>({...i,error:i.error||'Conexão encerrada. Crie uma nova sala.'}));};
  ws.onerror=()=>setInfo(i=>({...i,error:'Não foi possível conectar à arena online.'}));
 };
 useEffect(()=>{const room=new URLSearchParams(location.search).get('room');if(room)connect(room);return()=>{socket.current?.close();socket.current=null;active.current=false;};},[]);
 return {active,info,connect,send};
}
