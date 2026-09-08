'use client';
import {useEffect} from 'react';
import {Trophy, X} from 'lucide-react';

export default function AchievementToast({title,onDone}:{title:string;onDone:()=>void}){
 useEffect(()=>{const timer=setTimeout(onDone,5500);return()=>clearTimeout(timer);},[title,onDone]);
 return <aside className="achievement-toast" role="status" aria-live="polite">
  <div className="achievement-confetti" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${i*9}%`,animationDelay:`${i%4*.12}s`,background:['#ffe080','#42dcc9','#ff947c'][i%3]}}/>)}</div>
  <Trophy size={36} aria-hidden="true"/><div><small>CONQUISTA DESBLOQUEADA</small><strong>{title}</strong><span>Guardada na sua coleção</span></div>
  <button onClick={onDone} aria-label="Fechar conquista"><X size={18}/></button>
 </aside>;
}
