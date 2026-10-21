'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import TouchControls from '../TouchControls';
import {createUltimate,startUltimate,pressUltimate,releaseUltimate,pauseUltimate,layoutUltimate,armUltimateSpecial,STALL,type Ultimate as Game} from '../../lib/ultimate';
import {rivals} from '../../lib/rivals';
import {BEACH_PROGRESS_KEY,readBeachProgress,recordBeachMatch} from '../../lib/beach-progress';

// The first rival is fixed so server and browser renders match (hydration); each new match draws a random one.
const fresh=(pick=Math.floor(Math.random()*rivals.length))=>createUltimate({rival:rivals[pick]});
export default function Ultimate(){
 const game=useRef<Game>(fresh(0)),host=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),level=useRef('Club');
 const [view,setView]=useState(()=>fresh(0)),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[tools,setTools]=useState(false),[notes,setNotes]=useState<string[]>([]);
 const recorded=useRef(new WeakSet<object>());
 const sync=useCallback(()=>{
  const g=game.current;
  // Save the match once: a win counts for the circuit totals, layouts count as perfect plays (home ball skins).
  if(g.status==='over'&&!recorded.current.has(g)){
   recorded.current.add(g);
   try{const {progress,notes:earned}=recordBeachMatch(readBeachProgress(localStorage.getItem(BEACH_PROGRESS_KEY)),{won:g.score[0]>g.score[1],perfects:g.layouts,specials:0});localStorage.setItem(BEACH_PROGRESS_KEY,JSON.stringify(progress));setNotes([`Layouts nesta partida: ${g.layouts}`,...earned]);}catch{/* Records are optional. */}
  }
  setView({...g,score:[...g.score]});
 },[]);
 const movement=useCallback(()=>({x:stick.current.x+Number(keys.current.has('d')||keys.current.has('arrowright'))-Number(keys.current.has('a')||keys.current.has('arrowleft')),z:stick.current.z+Number(keys.current.has('s')||keys.current.has('arrowdown'))-Number(keys.current.has('w')||keys.current.has('arrowup'))}),[]);
 const clear=useCallback(()=>{keys.current.clear();stick.current={x:0,z:0};game.current.holding=false;game.current.charge=0;},[]);
 const start=useCallback(()=>{clear();setNotes([]);if(game.current.status!=='ready')game.current=fresh();startUltimate(game.current);sync();},[clear,sync]);
 const pause=useCallback(()=>{clear();pauseUltimate(game.current);sync();},[clear,sync]);
 const press=useCallback((key:string)=>{keys.current.add(key);pressUltimate(game.current);sync();},[sync]);
 const release=useCallback((key:string,kind:'pass'|'hammer',cancelled=false)=>{
  if(!keys.current.delete(key))return;
  if(cancelled){game.current.holding=false;game.current.charge=0;return;}
  releaseUltimate(game.current,movement(),kind);sync();
 },[movement,sync]);
 const layout=useCallback(()=>{layoutUltimate(game.current,movement());sync();},[movement,sync]);
 const special=useCallback(()=>{armUltimateSpecial(game.current);sync();},[sync]);
 useEffect(()=>{
  let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
  import('../../lib/ultimate-scene').then(({mountUltimate})=>{if(!disposed&&host.current)engine=mountUltimate(host.current,()=>game.current,()=>({...movement(),jump:false}),()=>level.current,sync,()=>setLoaded(true),setError);}).catch(()=>setError('Não foi possível abrir o campo. Recarregue a página.'));
  const down=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(target.closest?.('input,select,textarea,[contenteditable=true]')||target.closest?.('button,a')&&[' ','Enter'].includes(event.key))return;
   const key=event.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','f','k','p'].includes(key))return;
   event.preventDefault();if(event.repeat)return;
   if(key==='p'){pause();return;}if(key==='k'){special();return;}
   if(key===' '){if(['ready','over'].includes(game.current.status))start();else layout();return;}
   if(key==='j'||key==='f'){press(key);return;}keys.current.add(key);
  };
  const up=(event:KeyboardEvent)=>{const key=event.key.toLowerCase();if(key==='j')release('j','pass');else if(key==='f')release('f','hammer');else keys.current.delete(key);};
  const blur=()=>{clear();if(game.current.status==='playing'){pauseUltimate(game.current);sync();}};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  return()=>{disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 },[clear,start,pause,press,release,layout,special,sync,movement]);
 const live=view.status==='playing',holding=live&&view.holder>=0&&view.offense===0&&view.active===view.holder,defending=live&&view.offense===1;
 return <main className={`arcade-app beach-match mobile-game ${tools?'mobile-tools-open':''} ${live?'match-live':''}`}>
  <section className="game-shell">
   <button className="mobile-tools-toggle" aria-label="Opções da partida" aria-expanded={tools} onClick={()=>setTools(!tools)}>{tools?'Fechar ×':'☰'}</button><Link className="mobile-exit" href="/">Escolher esporte</Link>
   <div className="game-toolbar"><strong>ULTIMATE · 5 × 5</strong><div className="tools"><Link href="/">Esportes</Link><button onClick={pause} disabled={!['playing','paused'].includes(view.status)}>{view.status==='paused'?'Continuar':'Pausar'}</button><button onClick={()=>{clear();game.current=fresh();sync();}}>Reiniciar</button><label>Dificuldade <select defaultValue="Club" onChange={e=>{level.current=e.target.value;}}><option value="Chill">Tranquilo</option><option value="Club">Clube</option><option value="Pro">Profissional</option></select></label></div></div>
   <div className="court"><figure ref={host} className="phaser-court" aria-label="Campo de ultimate. WASD move e mira, J passa (segure para huck), F hammer, espaço mergulha, K Disco de Fogo, P pausa."/>
    <div className="scoreboard"><div>VOCÊ <b>{view.score[0]}</b></div><span>:</span><div><b>{view.score[1]}</b> {view.rivalName}</div><small>ATÉ {view.goal} · {holding?`STALL ${Math.floor(view.stall)} DE ${STALL}`:defending?'DEFESA':'ATAQUE'}{view.onFire>=0?` · ${view.onFire?view.rivalName:'VOCÊ'} EM CHAMAS`:''}</small></div>
    {(!loaded||error||!live)&&!(view.status==='playing'&&view.restartDelay)&&<div className="overlay"><div className="start-card">
     <span className="mini-label">SHORELINE · ULTIMATE</span>
     <h2>{error||(!loaded?'Preparando o campo…':view.status==='over'?(view.score[0]>view.score[1]?'Seu time venceu!':'Boa partida!'):view.status==='paused'?'Partida pausada':'Um disco. Cinco contra cinco.')}</h2>
     {view.status==='over'?<>{notes.map(n=><p key={n} className="progress-note">{n}</p>)}</>:view.status==='ready'&&<>
      <p className="progress-note">Contra {view.rivalName}: {view.rivalHint}</p>
      <p>Com o disco você não anda: mire com a direção e lance antes do STALL chegar a {STALL}. Pegue o disco dentro da zona vermelha para marcar.</p>
      <p>J passa · segure J para o huck (longe e alto) · F hammer por cima da defesa · mire um pouco ao lado para curvar · espaço mergulha (layout) · K solta o Disco de Fogo.</p>
     </>}
     {!error&&loaded&&view.status!=='paused'&&<button className="primary" onClick={start}>{view.status==='over'?'Jogar de novo':'Entrar no campo'}</button>}
     {view.status==='paused'&&<button className="primary" onClick={pause}>Continuar</button>}
    </div></div>}
    {live&&view.restartDelay>0&&<output className="restart-feedback">{view.feedback}<small>Próximo ponto…</small></output>}
    {live&&!view.restartDelay&&view.feedbackTime>0&&<output className={`contact-feedback ${/LAYOUT|CALLAHAN|PONTO/.test(view.feedback)?'is-perfect':''}`}>{view.feedback}</output>}
    {loaded&&live&&<div className="arcade-hud">
     <div className="arcade-power"><span>{holding?`FORÇA ${Math.round(view.charge*100)}%`:defending?'MARQUE E MERGULHE':'CORRA PARA O ESPAÇO'}</span><div className="arcade-power-track" aria-hidden="true"><i style={{left:`${Math.min(98,view.charge*100)}%`}}/></div><small>{holding?(view.charge>=.65?'HUCK!':'SOLTE = PASSE · SEGURE = HUCK'):'ESPAÇO = LAYOUT'}</small></div>
     <button className={`arcade-special ${view.energy>=100?'is-ready':''}`} onClick={special} aria-pressed={view.specialArmed} disabled={view.energy<100} aria-label={`Disco de Fogo, ${Math.round(view.energy)}%`} style={{background:`linear-gradient(90deg,#986326 ${view.energy}%,#173f50 ${view.energy}%)`}}><b>{view.specialArmed?'ARMADO!':view.energy>=100?'ESPECIAL · K':`${Math.round(view.energy)}%`}</b><small>DISCO DE FOGO</small></button>
    </div>}
   </div>
   <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={()=>press('touch')} onRelease={cancelled=>release('touch','pass',cancelled)} onAim={special} onJump={held=>{if(held)layout();}} onAlternate={()=>{press('hammer');release('hammer','hammer');}} alternateLabel="Hammer" label={holding?'Lançar':'Correr'} charge={view.charge} enabled={loaded&&!error&&live} jumpLabel="LAYOUT"/>
   <div className="game-bottom"><span>WASD mover e mirar · J passe (segure = huck) · F hammer · Espaço layout · K Disco de Fogo · P pausa</span></div>
   <span className="sr-only" aria-live="polite">Você {view.score[0]}, {view.rivalName} {view.score[1]}.</span>
  </section>
 </main>;
}
