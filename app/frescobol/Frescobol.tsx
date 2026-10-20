'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import TouchControls from '../TouchControls';
import {createFrescobol,startFrescobol,pressFrescobol,releaseFrescobol,pauseFrescobol,armPancada,type Frescobol as Game} from '../../lib/frescobol';
import {BEACH_PROGRESS_KEY,readBeachProgress,recordBeachMatch} from '../../lib/beach-progress';

// Records on this device: best score and longest sequence. The server renders without them so hydration matches.
const KEY='shoreline-frescobol',saveEvent='shoreline-frescobol';
const subscribe=(update:()=>void)=>{window.addEventListener(saveEvent,update);window.addEventListener('storage',update);return ()=>{window.removeEventListener(saveEvent,update);window.removeEventListener('storage',update);};};
const savedRaw=()=>{try{return localStorage.getItem(KEY)??'';}catch{return '';}};
const readRecords=(raw:string|null)=>{try{const d=JSON.parse(raw||'null'),ok=(n:unknown)=>Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=10_000_000?n as number:0;return {best:ok(d?.best),sequence:ok(d?.sequence)};}catch{return {best:0,sequence:0};}};
const clock=(s:number)=>`${Math.floor(Math.ceil(s)/60)}:${String(Math.ceil(s)%60).padStart(2,'0')}`;

export default function Frescobol(){
 const game=useRef<Game>(createFrescobol()),host=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),level=useRef('Club');
 const [view,setView]=useState(()=>createFrescobol()),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tools,setTools]=useState(false),[notes,setNotes]=useState<string[]>([]);
 const raw=useSyncExternalStore(subscribe,savedRaw,()=>null),records=raw===null?null:readRecords(raw),recorded=useRef(new WeakSet<object>());
 const sync=useCallback(()=>{
  const g=game.current;
  // Save records and perfects (for the home ball skins) once per round.
  if(g.status==='over'&&!recorded.current.has(g)){
   recorded.current.add(g);const before=readRecords(savedRaw()),next={best:Math.max(before.best,g.score),sequence:Math.max(before.sequence,g.best)};
   try{localStorage.setItem(KEY,JSON.stringify(next));const {progress}=recordBeachMatch(readBeachProgress(localStorage.getItem(BEACH_PROGRESS_KEY)),{won:false,perfects:g.perfects,specials:g.pancadas});localStorage.setItem(BEACH_PROGRESS_KEY,JSON.stringify(progress));}catch{/* Records are optional. */}
   window.dispatchEvent(new Event(saveEvent));
   setNotes([...(g.score>before.best?[`Recorde de pontos: ${g.score}`]:[]),...(g.best>before.sequence?[`Maior sequência: ${g.best}`]:[])]);
  }
  setView({...g});
 },[]);
 const movement=useCallback(()=>({x:stick.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft')),z:stick.current.z+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup'))}),[]);
 const clear=useCallback(()=>{keys.current.clear();stick.current={x:0,z:0};game.current.holding=false;game.current.charge=0;},[]);
 const start=useCallback(()=>{clear();setNotes([]);game.current=createFrescobol();startFrescobol(game.current);sync();},[clear,sync]);
 const pause=useCallback(()=>{clear();pauseFrescobol(game.current);sync();},[clear,sync]);
 const press=useCallback((key:string)=>{keys.current.add(key);pressFrescobol(game.current);sync();},[sync]);
 const release=useCallback((key:string,kind:'hit'|'lob',cancelled=false)=>{
  if(!keys.current.delete(key))return;
  if(cancelled){game.current.holding=false;game.current.charge=0;return;}
  releaseFrescobol(game.current,movement(),kind);
 },[movement]);
 const pancada=useCallback(()=>{armPancada(game.current);sync();},[sync]);
 useEffect(()=>{
  let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
  import('../../lib/frescobol-scene').then(({mountFrescobol})=>{if(!disposed&&host.current)engine=mountFrescobol(host.current,()=>game.current,movement,()=>level.current,sync,()=>setLoaded(true),setError);}).catch(()=>setError('Não foi possível abrir a praia. Recarregue a página.'));
  const down=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(target.closest?.('input,select,textarea,[contenteditable=true]')||target.closest?.('button,a')&&[' ','Enter'].includes(event.key))return;
   const key=event.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','f','k','p'].includes(key))return;
   event.preventDefault();if(event.repeat)return;
   if(key==='p'){pause();return;}if(key==='k'){pancada();return;}
   if(key===' '){if(['ready','over'].includes(game.current.status))start();return;}
   if(key==='j'||key==='f'){press(key);return;}keys.current.add(key);
  };
  const up=(event:KeyboardEvent)=>{const key=event.key.toLowerCase();if(key==='j')release('j','hit');else if(key==='f')release('f','lob');else keys.current.delete(key);};
  const blur=()=>{clear();if(game.current.status==='playing'){pauseFrescobol(game.current);sync();}};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  return()=>{disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 },[clear,start,pause,press,release,pancada,sync,movement]);
 const live=view.status==='playing';
 return <main className={`arcade-app beach-match mobile-game ${tools?'mobile-tools-open':''} ${live?'match-live':''}`}>
  <section className="game-shell">
   <button className="mobile-tools-toggle" aria-label="Opções da partida" aria-expanded={tools} onClick={()=>setTools(!tools)}>{tools?'Fechar ×':'☰'}</button><Link className="mobile-exit" href="/">Escolher esporte</Link>
   <div className="game-toolbar"><strong>FRESCOBOL · DUPLA</strong><div className="tools"><Link href="/">Esportes</Link><button onClick={pause} disabled={!['playing','paused'].includes(view.status)}>{view.status==='paused'?'Continuar':'Pausar'}</button><button onClick={()=>{clear();game.current=createFrescobol();sync();}}>Reiniciar</button><label>Parceiro <select defaultValue="Club" onChange={e=>{level.current=e.target.value;}}><option value="Chill">Firme</option><option value="Club">Normal</option><option value="Pro">Desastrado</option></select></label></div></div>
   <div className="court"><figure ref={host} className="phaser-court" aria-label="Frescobol. WASD move e mira, J bate (segure para o ataque), F bola alta, K Pancada de Ouro, P pausa."/>
    <div className="scoreboard"><div>PONTOS <b>{view.score}</b></div><span>:</span><div><b>{view.sequence}</b> SEQ</div><small>{clock(view.timeLeft)} · RECORDE {Math.max(view.score,records?.best??0)} · MAIOR SEQ {Math.max(view.best,records?.sequence??0)}</small></div>
    {(!loaded||error||!live)&&<div className="overlay"><div className="start-card">
     <span className="mini-label">SHORELINE · FRESCOBOL</span>
     <h2>{error||(!loaded?'Preparando a praia…':view.status==='over'?'Fim da rodada!':view.status==='paused'?'Rodada pausada':'Bate e volta. Sem deixar cair.')}</h2>
     {view.status==='over'?<><p>Pontos: {view.score} · Maior sequência: {view.best} · Perfeitos: {view.perfects} · Ataques: {view.ataques} · Caiu: {view.drops}</p>{notes.map(n=><p key={n} className="progress-note">{n}</p>)}</>:view.status==='ready'&&<>
      <p>Você e seu parceiro jogam juntos: cada batida soma, a sequência multiplica. Bata no tempo certo quando a bola chega no anel.</p>
      <p>J bate · segure J para o ATAQUE (vale o triplo, tempo mais justo) · F bola alta para respirar · ↑/↓ põe a bola de um lado do parceiro · K com o ritmo cheio solta a PANCADA DE OURO.</p>
      {records&&<p className="progress-note">Recorde: {records.best} pontos · Maior sequência: {records.sequence}</p>}
     </>}
     {!error&&loaded&&view.status!=='paused'&&<button className="primary" onClick={start}>{view.status==='over'?'Jogar de novo':'Pegar a raquete'}</button>}
     {view.status==='paused'&&<button className="primary" onClick={pause}>Continuar</button>}
    </div></div>}
    {live&&view.feedbackTime>0&&<output className={`contact-feedback ${/PERFEITO|PANCADA/.test(view.feedback)?'is-perfect':''}`}>{view.feedback}</output>}
    {loaded&&live&&<div className="arcade-hud">
     <div className="arcade-power"><span>{view.receiver===0?`FORÇA ${Math.round(view.charge*100)}%`:'BOLA COM O PARCEIRO'}</span><div className="arcade-power-track" aria-hidden="true"><i style={{left:`${Math.min(98,view.charge*100)}%`}}/></div><small>{view.charge>=.65?'ATAQUE!':'SOLTE = GOLPE · SEGURE = ATAQUE'}</small></div>
     <button className={`arcade-special ${view.rhythm>=100?'is-ready':''}`} onClick={pancada} disabled={view.rhythm<100} aria-label={`Pancada de Ouro, ${Math.round(view.rhythm)}%`} style={{background:`linear-gradient(90deg,#986326 ${view.rhythm}%,#173f50 ${view.rhythm}%)`}}><b>{view.pancada>0?`OURO ${Math.ceil(view.pancada)}s`:view.rhythm>=100?'OURO · K':`${Math.round(view.rhythm)}%`}</b><small>PANCADA DE OURO</small></button>
    </div>}
   </div>
   <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={()=>press('touch')} onRelease={cancelled=>release('touch','hit',cancelled)} onAim={pancada} onAlternate={()=>{press('lob');release('lob','lob');}} alternateLabel="Bola alta" label="Bater" charge={view.charge} enabled={loaded&&!error&&live}/>
   <div className="game-bottom"><span>WASD mover e mirar · J bater (segure = ataque) · F bola alta · K Pancada de Ouro · P pausa</span></div>
   <span className="sr-only" aria-live="polite">{view.score} pontos, sequência {view.sequence}.</span>
  </section>
 </main>;
}
