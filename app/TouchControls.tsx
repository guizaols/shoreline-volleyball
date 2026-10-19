'use client';
import {useEffect,useRef} from 'react';
import {stickDirection} from '../lib/controls';

export default function TouchControls({onMove,onPress,onRelease,onAim,onAlternate,onJump,alternateLabel,label,charge,enabled,flat=false,jumpLabel='SALTAR'}:{
  onMove:(x:number,z:number)=>void;onPress:()=>void;onRelease:(cancelled?:boolean)=>void;
  onAim:()=>void;onAlternate:()=>void;onJump?:(held:boolean)=>void;alternateLabel:string;label:string;charge:number;enabled:boolean;flat?:boolean;jumpLabel?:string;
}){
  const stickPointer=useRef<number|null>(null),actionPointer=useRef<number|null>(null),jumpPointer=useRef<number|null>(null);
  const thumb=useRef<HTMLSpanElement>(null),geometry=useRef({x:0,y:0,radius:1});
  const actionKey=useRef(false);
  const moveThumb=(x:number,y:number)=>{if(thumb.current)thumb.current.style.transform=`translate(${x}px,${y}px)`;};
  const callbacks=useRef({onMove,onRelease,onJump});
  useEffect(()=>{callbacks.current={onMove,onRelease,onJump};},[onMove,onRelease,onJump]);
  const reset=()=>{stickPointer.current=null;actionPointer.current=null;jumpPointer.current=null;actionKey.current=false;moveThumb(0,0);callbacks.current.onMove(0,0);callbacks.current.onRelease(true);callbacks.current.onJump?.(false);};
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)reset();};
    window.addEventListener('blur',reset);window.addEventListener('orientationchange',reset);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('blur',reset);window.removeEventListener('orientationchange',reset);document.removeEventListener('visibilitychange',hidden);callbacks.current.onMove(0,0);callbacks.current.onRelease(true);callbacks.current.onJump?.(false);};
  },[]);
  useEffect(()=>{if(!enabled)reset();},[enabled]);
  const move=(e:React.PointerEvent<HTMLFieldSetElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    const {x,y,radius}=geometry.current;
    const dx=e.clientX-x,dy=e.clientY-y;
    const limit=Math.max(1,Math.hypot(dx,dy)/radius);
    moveThumb(dx/limit,dy/limit);
    const direction=stickDirection(dx,dy,radius,flat);onMove(direction.x,direction.z);
  };
  const endStick=(e:React.PointerEvent<HTMLFieldSetElement>)=>{
    if(e.pointerId!==stickPointer.current)return;
    stickPointer.current=null;moveThumb(0,0);onMove(0,0);
  };
  const endAction=(e:React.PointerEvent<HTMLButtonElement>)=>{
    if(e.pointerId!==actionPointer.current)return;
    actionPointer.current=null;onRelease(e.type==='pointercancel'||e.type==='lostpointercapture');
  };
  const endJump=(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.pointerId===jumpPointer.current){jumpPointer.current=null;onJump?.(false);}};
  return <div className="virtual-controls" aria-label="Controles de toque" onContextMenu={e=>e.preventDefault()}>
    <fieldset className="virtual-stick" aria-label="Direcional: arraste para mover"
      onPointerDown={e=>{if(!enabled||stickPointer.current!==null)return;e.preventDefault();const box=e.currentTarget.getBoundingClientRect();geometry.current={x:box.left+box.width/2,y:box.top+box.height/2,radius:box.width*.34};stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}}
      onPointerMove={move} onPointerUp={endStick} onPointerCancel={endStick} onLostPointerCapture={endStick}>
      <span className="stick-cross">✛</span><span className="stick-thumb" ref={thumb}/><small>MOVER</small>
    </fieldset>
    <div className="virtual-actions">
      <button className="virtual-aim" disabled={!enabled} onClick={onAim} aria-label="Trocar alvo">◎<small>ALVO</small></button>
      {[label,alternateLabel].map((text,index)=><button key={index} className={`virtual-play ${index?'virtual-alternate':''}`} disabled={!enabled}
        onPointerDown={e=>{if(actionPointer.current!==null||actionKey.current)return;e.preventDefault();actionPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);(index?onAlternate:onPress)();}}
        onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}
        onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&!actionKey.current&&actionPointer.current===null){e.preventDefault();e.stopPropagation();actionKey.current=true;(index?onAlternate:onPress)();}}}
        onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();if(actionKey.current){actionKey.current=false;onRelease();}}}}
        onBlur={()=>{if(actionKey.current){actionKey.current=false;onRelease(true);}}}>
        <b>{index?'B':'A'}</b><span>{text}</span><meter min="0" max="1" value={charge} aria-label="Carga"/><small>TOQUE</small>
      </button>)}
      {onJump&&<button className="virtual-jump" disabled={!enabled} aria-label="Saltar para atacar"
        onPointerDown={e=>{if(jumpPointer.current!==null)return;e.preventDefault();jumpPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);onJump(true);}}
        onPointerUp={endJump} onPointerCancel={endJump} onLostPointerCapture={endJump}
        onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();onJump(true);}}}
        onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();onJump(false);}}} onBlur={()=>onJump(false)}>↑<small>{jumpLabel}</small></button>}
    </div>
  </div>;
}
