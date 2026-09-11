'use client';
import {useEffect,useRef,useState} from 'react';
import {stickDirection} from '../lib/controls';

export default function TouchControls({onMove,onPress,onRelease,onAim,onAlternate,alternateLabel,label,charge,enabled,flat=false}:{
  onMove:(x:number,z:number)=>void;onPress:()=>void;onRelease:()=>void;
  onAim:()=>void;onAlternate:()=>void;alternateLabel:string;label:string;charge:number;enabled:boolean;flat?:boolean;
}){
  const stickPointer=useRef<number|null>(null),actionPointer=useRef<number|null>(null);
  const thumb=useRef<HTMLSpanElement>(null),geometry=useRef({x:0,y:0,radius:1});
  const [held,setHeld]=useState<number|null>(null);
  const moveThumb=(x:number,y:number)=>{if(thumb.current)thumb.current.style.transform=`translate(${x}px,${y}px)`;};
  const callbacks=useRef({onMove,onRelease});callbacks.current={onMove,onRelease};
  const reset=()=>{stickPointer.current=null;actionPointer.current=null;moveThumb(0,0);setHeld(null);callbacks.current.onMove(0,0);callbacks.current.onRelease();};
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)reset();};
    window.addEventListener('blur',reset);window.addEventListener('orientationchange',reset);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('blur',reset);window.removeEventListener('orientationchange',reset);document.removeEventListener('visibilitychange',hidden);callbacks.current.onMove(0,0);callbacks.current.onRelease();};
  },[]);
  useEffect(()=>{if(!enabled)reset();},[enabled]);
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    const {x,y,radius}=geometry.current;
    const dx=e.clientX-x,dy=e.clientY-y;
    const limit=Math.max(1,Math.hypot(dx,dy)/radius);
    moveThumb(dx/limit,dy/limit);
    const direction=stickDirection(dx,dy,radius,flat);onMove(direction.x,direction.z);
  };
  const endStick=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    stickPointer.current=null;moveThumb(0,0);onMove(0,0);
  };
  const endAction=(e:React.PointerEvent<HTMLButtonElement>)=>{
    if(e.pointerId!==actionPointer.current)return;
    actionPointer.current=null;setHeld(null);onRelease();
  };
  return <div className="virtual-controls" aria-label="Controles de toque" onContextMenu={e=>e.preventDefault()}>
    <div className="virtual-stick" role="group" aria-label="Direcional: arraste para mover"
      onPointerDown={e=>{if(!enabled||stickPointer.current!==null)return;e.preventDefault();const box=e.currentTarget.getBoundingClientRect();geometry.current={x:box.left+box.width/2,y:box.top+box.height/2,radius:box.width*.34};stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
      onPointerMove={move} onPointerUp={endStick} onPointerCancel={endStick} onLostPointerCapture={endStick}>
      <span className="stick-cross">✛</span><span className="stick-thumb" ref={thumb}/><small>MOVER</small>
    </div>
    <div className="virtual-actions">
      <button className="virtual-aim" disabled={!enabled} onClick={onAim} aria-label="Trocar alvo">◎<small>ALVO</small></button>
      {[label,alternateLabel].map((text,index)=><button key={index} className={`virtual-play ${index?'virtual-alternate':''} ${held===index?'held':''}`} disabled={!enabled}
        onPointerDown={e=>{if(actionPointer.current!==null)return;e.preventDefault();actionPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setHeld(index);(index?onAlternate:onPress)();}}
        onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}
        onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();setHeld(index);(index?onAlternate:onPress)();}}}
        onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.stopPropagation();setHeld(null);onRelease();}}}>
        <b>{index?'B':'A'}</b><span>{text}</span><meter min="0" max="1" value={charge} aria-label="Preparação"/><small>SEGURE</small>
      </button>)}
    </div>
  </div>;
}
