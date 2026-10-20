'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import TouchControls from '../TouchControls';
import {createAltinha,startAltinha,pressAltinha,releaseAltinha,pauseAltinha,armGamebreaker,altinhaResult,tricks,type Altinha as Roda,type TrickId} from '../../lib/altinha';
import {ALTINHA_KEY,readAltinha,recordAltinha,unlockedTricks,lessonFor,markLearned,type AltinhaSave} from '../../lib/altinha-progress';
import {BEACH_PROGRESS_KEY,readBeachProgress,recordBeachMatch} from '../../lib/beach-progress';

const FRIENDS=['VOCÊ','BIEL','NANDA','TICO','LU'];
// The save lives on this device; the server renders without it so hydration matches.
const saveEvent='shoreline-altinha';
const subscribeSave=(update:()=>void)=>{window.addEventListener(saveEvent,update);window.addEventListener('storage',update);return ()=>{window.removeEventListener(saveEvent,update);window.removeEventListener('storage',update);};};
const savedRaw=()=>{try{return localStorage.getItem(ALTINHA_KEY)??'';}catch{return '';}};
const readSave=()=>readAltinha(savedRaw());
const writeSave=(save:AltinhaSave)=>{try{localStorage.setItem(ALTINHA_KEY,JSON.stringify(save));}catch{/* Progress is optional. */}window.dispatchEvent(new Event(saveEvent));};
// How to do a trick, in the words of the controls: direction, hold J, or jump.
const command=(id:TrickId)=>{const t=tricks.find(t=>t.id===id)!;return t.jump?'Espaço + J':`${{none:'',up:'↑ + ',down:'↓ + ',side:'←/→ + '}[t.dir]}${t.hold?'segure J':'J'}`;};
const clock=(s:number)=>`${Math.floor(Math.ceil(s)/60)}:${String(Math.ceil(s)%60).padStart(2,'0')}`;

export default function Altinha(){
 // Touches per turn live in a ref (like the level) so changing them never remounts the scene.
 const [touches,setTouches]=useState<1|2|3>(3),touchMode=useRef<1|2|3>(3);
 const fresh=useCallback(()=>createAltinha({maxTouches:touchMode.current,unlocked:unlockedTricks(readSave().total)}),[]);
 const game=useRef<Roda>(createAltinha()),host=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),level=useRef('Club');
 const [view,setView]=useState(()=>createAltinha()),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tools,setTools]=useState(false);
 const raw=useSyncExternalStore(subscribeSave,savedRaw,()=>null),save=raw===null?null:readAltinha(raw),lesson=save?lessonFor(save):null;
 const [notes,setNotes]=useState<string[]>([]),recorded=useRef(new WeakSet<object>());
 const sync=useCallback(()=>{
  const g=game.current;
  // The lesson trick is learned the first time you land it.
  const learning=lessonFor(readSave());if(learning&&g.holder===0&&g.feedbackTime>0&&g.feedback.startsWith(tricks.find(t=>t.id===learning)!.name))writeSave(markLearned(readSave(),learning));
  // Save totals, unlocks and perfects (for the home ball skins) once per finished round.
  if(g.status==='over'&&!recorded.current.has(g)){
   recorded.current.add(g);const result=altinhaResult(g),{save:next,notes:earned}=recordAltinha(readSave(),result);writeSave(next);
   try{const {progress}=recordBeachMatch(readBeachProgress(localStorage.getItem(BEACH_PROGRESS_KEY)),{won:false,perfects:result.perfects,specials:result.gamebreakers});localStorage.setItem(BEACH_PROGRESS_KEY,JSON.stringify(progress));}catch{/* Records are optional. */}
   setNotes(earned);
  }
  setView({...g,individual:[...g.individual],combo:[...g.combo]});
 },[]);
 const movement=useCallback(()=>({x:stick.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft')),z:stick.current.z+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup'))}),[]);
 const clear=useCallback(()=>{keys.current.clear();stick.current={x:0,z:0};game.current.holding=false;game.current.charge=0;},[]);
 const start=useCallback(()=>{clear();setNotes([]);game.current=fresh();startAltinha(game.current);sync();},[clear,fresh,sync]);
 const pause=useCallback(()=>{clear();pauseAltinha(game.current);sync();},[clear,sync]);
 const press=useCallback((key:string)=>{keys.current.add(key);pressAltinha(game.current);sync();},[sync]);
 const release=useCallback((key:string,kind:'keep'|'pass',cancelled=false)=>{
  if(!keys.current.delete(key))return;
  if(cancelled){game.current.holding=false;game.current.charge=0;return;}
  releaseAltinha(game.current,{...movement(),jump:keys.current.has(' ')},kind);
 },[movement]);
 const gamebreaker=useCallback(()=>{armGamebreaker(game.current);sync();},[sync]);
 useEffect(()=>{
  let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
  import('../../lib/altinha-scene').then(({mountAltinha})=>{if(!disposed&&host.current)engine=mountAltinha(host.current,()=>game.current,()=>({...movement(),jump:keys.current.has(' ')}),()=>level.current,sync,()=>setLoaded(true),setError);}).catch(()=>setError('Não foi possível abrir a roda. Recarregue a página.'));
  const down=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(target.closest('input,select,textarea,[contenteditable=true]')||target.closest('button,a')&&[' ','Enter'].includes(event.key))return;
   const key=event.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','f','k','p'].includes(key))return;
   event.preventDefault();if(event.repeat)return;
   if(key==='p'){pause();return;}if(key==='k'){gamebreaker();return;}
   if(key===' '&&['ready','over'].includes(game.current.status)){start();return;}
   if(key==='j'||key==='f'){press(key);return;}keys.current.add(key);
  };
  const up=(event:KeyboardEvent)=>{const key=event.key.toLowerCase();if(key==='j')release('j','keep');else if(key==='f')release('f','pass');else keys.current.delete(key);};
  const blur=()=>{clear();if(game.current.status==='playing'){pauseAltinha(game.current);sync();}};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  return()=>{disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 },[clear,start,pause,press,release,gamebreaker,sync,movement]);
 const result=view.status==='over'?altinhaResult(view):null,ranking=result?result.individual.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score):[];
 const lessonName=lesson&&tricks.find(t=>t.id===lesson)!.name;
 const tip=view.status==='playing'&&lesson?`NOVO TRICK · ${lessonName}: ${command(lesson)}`:'';
 const live=view.status==='playing';
 return <main className={`arcade-app beach-match mobile-game ${tools?'mobile-tools-open':''} ${live?'match-live':''}`}>
  <section className="game-shell">
   <button className="mobile-tools-toggle" aria-label="Opções da roda" aria-expanded={tools} onClick={()=>setTools(!tools)}>{tools?'Fechar ×':'☰'}</button><Link className="mobile-exit" href="/">Escolher esporte</Link>
   <div className="game-toolbar"><strong>ALTINHA · RODA DE 5</strong><div className="tools"><Link href="/">Esportes</Link><button onClick={pause} disabled={!['playing','paused'].includes(view.status)}>{view.status==='paused'?'Continuar':'Pausar'}</button><button onClick={()=>{clear();game.current=fresh();sync();}}>Reiniciar</button><label>Amigos <select defaultValue="Club" onChange={e=>{level.current=e.target.value;}}><option value="Chill">Firmes</option><option value="Club">Normais</option><option value="Pro">Desastrados</option></select></label></div></div>
   <div className="court"><figure ref={host} className="phaser-court" aria-label="Roda de altinha. WASD move e escolhe o trick e o amigo, J toca (segure para tricks difíceis), F passa, espaço + J tesoura, K Altinha de Ouro, P pausa."/>
    <div className="scoreboard"><div>RODA <b>{view.rodaScore}</b></div><span>:</span><div><b>{view.individual[0]}</b> VOCÊ</div><small>{clock(view.timeLeft)} · SEQUÊNCIA {view.rodaStreak} · RECORDE {Math.max(view.rodaBest,save?.rodaBest??0)}</small></div>
    {(!loaded||error||!live)&&<div className="overlay"><div className="start-card altinha-card">
     <span className="mini-label">SHORELINE · ALTINHA</span>
     <h2>{error||(!loaded?'Preparando a roda…':view.status==='over'?'Fim da roda!':view.status==='paused'?'Roda pausada':'Não deixa cair.')}</h2>
     {view.status==='over'&&result?<>
      <ol className="altinha-ranking">{ranking.map(({score,i},place)=><li key={i} className={i===0?'is-you':''}><span>{place===0&&result.king>=0?'REI DA RODA · ':''}{FRIENDS[i]}</span><b>{score}</b></li>)}</ol>
      <p>Recorde da roda nesta partida: {result.rodaBest} toques · Perfeitos: {result.perfects} · Salvadas: {result.saves}</p>
      {notes.map(n=><p key={n} className="progress-note">{n}</p>)}
     </>:view.status==='ready'&&<>
      <p>Mantenha a bola no ar com os amigos. Cada toque soma para a roda; seus tricks somam para você. Variar os tricks sobe o combo.</p>
      <p>J toca · direção escolhe o trick e o amigo · segure J para tricks difíceis · F passa · K com o estilo cheio solta a ALTINHA DE OURO.</p>
      <fieldset className="team-pick"><legend>TOQUES POR VEZ</legend><div className="team-grid">{([3,2,1] as const).map(n=><button key={n} aria-pressed={touches===n} onClick={()=>{touchMode.current=n;setTouches(n);game.current=fresh();sync();}}>{n} {n===1?'TOQUE':'TOQUES'}<small>{n===3?'clássico':n===2?'rápido':'só passe'}</small></button>)}</div></fieldset>
      {save&&<p className="progress-note">Seu total: {save.total} · Recorde da roda: {save.rodaBest} · Tricks: {unlockedTricks(save.total).length} de {tricks.length}</p>}
      {lesson&&<p className="progress-note">NOVO TRICK · {lessonName} — {command(lesson)}</p>}
     </>}
     {!error&&loaded&&view.status!=='paused'&&<button className="primary" onClick={start}>{view.status==='over'?'Jogar de novo':'Entrar na roda'}</button>}
     {view.status==='paused'&&<button className="primary" onClick={pause}>Continuar</button>}
    </div></div>}
    {tip&&<output className="play-tip">{tip}</output>}
    {live&&view.feedbackTime>0&&<output className={`contact-feedback ${view.feedback.includes('PERFEITO')||view.feedback==='SALVADA!'?'is-perfect':''}`}>{view.feedback}</output>}
    {loaded&&live&&<div className="arcade-hud">
     <div className="arcade-power"><span>COMBO <b>×{view.combo[0]}</b> · {view.receiver===0?'SUA VEZ':`BOLA COM ${FRIENDS[view.receiver]}`}</span><div className="arcade-power-track" aria-hidden="true"><i style={{left:`${Math.min(98,view.charge*100)}%`}}/></div><small>{view.charge>=.65?'SEGURANDO · TRICK DIFÍCIL':view.receiver===0?`TOQUE ${view.touchesThisTurn+1} DE ${view.maxTouches}`:'PREPARE-SE'}</small></div>
     <button className={`arcade-special ${view.style>=100?'is-ready':''}`} onClick={gamebreaker} disabled={view.style<100} aria-label={`Altinha de Ouro, ${Math.round(view.style)}%`} style={{background:`linear-gradient(90deg,#986326 ${view.style}%,#173f50 ${view.style}%)`}}><b>{view.gamebreaker>0?`OURO ${Math.ceil(view.gamebreaker)}s`:view.style>=100?'OURO · K':`${Math.round(view.style)}%`}</b><small>ALTINHA DE OURO</small></button>
    </div>}
   </div>
   <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={()=>press('touch')} onRelease={cancelled=>release('touch','keep',cancelled)} onAim={gamebreaker} onJump={held=>{if(held)keys.current.add(' ');else keys.current.delete(' ');}} onAlternate={()=>{press('pass');release('pass','pass');}} alternateLabel="Passar" label="Tocar" charge={view.charge} enabled={loaded&&!error&&live} jumpLabel="SALTAR"/>
   <div className="game-bottom"><span>WASD mover e escolher · J tocar (segure = trick difícil) · F passar · Espaço + J tesoura · K Altinha de Ouro · P pausa</span></div>
   <span className="sr-only" aria-live="polite">Roda {view.rodaScore}, você {view.individual[0]}.</span>
  </section>
 </main>;
}
