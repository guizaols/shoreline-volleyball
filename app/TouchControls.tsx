'use client';
import {useEffect,useRef,useState} from 'react';
import {stickDirection} from '../lib/controls';

export default function TouchControls({onMove,onPress,onRelease,onAim,onStyle,styleLabel,label,charge,enabled}:{
  onMove:(x:number,z:number)=>void;onPress:()=>void;onRelease:()=>void;
  onAim:()=>void;onStyle:()=>void;styleLabel:string;label:string;charge:number;enabled:boolean;
}){
  const stickPointer=useRef<number|null>(null),actionPointer=useRef<number|null>(null);
  const [thumb,setThumb]=useState({x:0,y:0}),[held,setHeld]=useState(false);
  const callbacks=useRef({onMove,onRelease});callbacks.current={onMove,onRelease};
  const reset=()=>{stickPointer.current=null;actionPointer.current=null;setThumb({x:0,y:0});setHeld(false);callbacks.current.onMove(0,0);callbacks.current.onRelease();};
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)reset();};
    window.addEventListener('blur',reset);window.addEventListener('orientationchange',reset);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('blur',reset);window.removeEventListener('orientationchange',reset);document.removeEventListener('visibilitychange',hidden);callbacks.current.onMove(0,0);callbacks.current.onRelease();};
  },[]);
  useEffect(()=>{if(!enabled)reset();},[enabled]);
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    const box=e.currentTarget.getBoundingClientRect(),radius=box.width*.34;
    const dx=e.clientX-box.left-box.width/2,dy=e.clientY-box.top-box.height/2;
    const limit=Math.max(1,Math.hypot(dx,dy)/radius);
    setThumb({x:dx/limit,y:dy/limit});
    const direction=stickDirection(dx,dy,radius);onMove(direction.x,direction.z);
  };
  const endStick=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    stickPointer.current=null;setThumb({x:0,y:0});onMove(0,0);
  };
  const endAction=(e:React.PointerEvent<HTMLButtonElement>)=>{
    if(e.pointerId!==actionPointer.current)return;
    actionPointer.current=null;setHeld(false);onRelease();
  };
  return <div className="virtual-controls" aria-label="Controles de toque" onContextMenu={e=>e.preventDefault()}>
    <div className="virtual-stick" role="group" aria-label="Direcional: arraste para mover"
      onPointerDown={e=>{if(!enabled||stickPointer.current!==null)return;e.preventDefault();stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
      onPointerMove={move} onPointerUp={endStick} onPointerCancel={endStick} onLostPointerCapture={endStick}>
      <span className="stick-cross">✛</span><span className="stick-thumb" style={{transform:`translate(${thumb.x}px,${thumb.y}px)`}}/><small>MOVER</small>
    </div>
    <div className="virtual-actions">
      <button className="virtual-aim" disabled={!enabled} onClick={onAim} aria-label="Trocar alvo">◎<small>ALVO</small></button>
      <button className="virtual-style" disabled={!enabled} onClick={onStyle} aria-label="Alternar cortada e largadinha">{styleLabel}<small>GOLPE</small></button>
      <button className={`virtual-play ${held?'held':''}`} disabled={!enabled}
        onPointerDown={e=>{if(actionPointer.current!==null)return;e.preventDefault();actionPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setHeld(true);onPress();}}
        onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}
        onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();setHeld(true);onPress();}}}
        onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.stopPropagation();setHeld(false);onRelease();}}}>
        {label}<meter min="0" max="1" value={charge} aria-label="Preparação"/><small>SEGURE</small>
      </button>
    </div>
  </div>;
}
