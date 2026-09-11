'use client';
import {useOnline} from '../gol-a-gol/useOnline';
import {drills,medalNames,trainingUnlocked} from '../../lib/training';
import AchievementToast from '../AchievementToast';
import BetaTools from '../BetaTools';
import CareerPanel from '../CareerPanel';
import {events,roundNames} from '../../lib/career';
import {newAchievements,trainingGame,applyCareer,beginEvent,rematch,eventOpponents,opponents,lessons,newProgress,readProgress,recordProgress,cupGame,challengeGame,type Progress} from '../../lib/cup';
import TouchControls from '../TouchControls';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Maximize, Pause, Play, RotateCcw, Volleyball, Wind, X } from 'lucide-react';
import { createGame, serveTiming, chooseShot, shotChoices, cycleAim, startPractice, prepareServe, serve, toss, switchPlayer } from '../../lib/game';

export default function Home(){
 const canvas=useRef<HTMLDivElement>(null), game=useRef(createGame()), keys=useRef(new Set<string>()), level=useRef('Club'), region=useRef<HTMLDivElement>(null);
 const [view,setView]=useState({...game.current}),[difficulty,setDifficulty]=useState('Club'),[help,setHelp]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const stick=useRef({x:0,z:0}),shotPointer=useRef<number|null>(null);
 const [unlocks,setUnlocks]=useState<string[]>([]);
 const dismissUnlock=useCallback(()=>setUnlocks(queue=>queue.slice(1)),[]);
 const progressRef=useRef(newProgress()),menuVisible=useRef(true);
 const [menuPage,setMenuPage]=useState('home'),[trainee,setTrainee]=useState(0);
 const [progress,setProgress]=useState(newProgress),[cupOpen,setCupOpen]=useState(true),[saveError,setSaveError]=useState('');
 menuVisible.current=cupOpen;
 const persist=(next:Progress,celebrate=true)=>{if(JSON.stringify(next)===JSON.stringify(progressRef.current))return;if(celebrate){const earned=newAchievements(progressRef.current,next);if(earned.length)setUnlocks(queue=>[...queue,...earned.map(a=>a.title)]);}progressRef.current=next;setProgress(next);try{localStorage.setItem('shoreline-career-v2',JSON.stringify(next));setSaveError('');}catch{setSaveError('Não foi possível salvar neste navegador.');}};
 const sync=()=>{if(!game.current.online)persist(recordProgress(progressRef.current,game.current));setView({...game.current,score:[...game.current.score]});};
 const online=useOnline(game,sync,'volley');
 const [mobileTools,setMobileTools]=useState(false);
 const [copyMessage,setCopyMessage]=useState('Copiar convite');
 const createRoom=()=>{keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);online.connect('new');};
 const choose=(index:number)=>{if(online.active.current){online.send({type:'action',action:'style',value:index});return;}chooseShot(game.current,index);};
 useEffect(()=>{if(online.info.active)setCupOpen(false);},[online.info.active]);
 const openCup=()=>{if(online.active.current)return;setMenuPage('home');keys.current.clear();stick.current={x:0,z:0};if(['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';}setCupOpen(true);sync();};
 const enterCup=()=>{let p=progressRef.current;if(p.stage===3){const next=beginEvent(p,p.event);if(next===p){setSaveError('Recupere a classificação no circuito antes de entrar novamente.');return;}p=next;persist(p);}game.current=cupGame(p);keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);sync();};
 const train=(index:number)=>{const g=trainingGame(progressRef.current,index,trainee);if(!g)return;game.current=g;keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);sync();};
 const lesson=(index:number)=>{if(index>progressRef.current.training)return;game.current=applyCareer(challengeGame(index,progressRef.current.gold),progressRef.current);keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);sync();};
 const start=()=>{
   if(online.active.current){if(game.current.status==='over')online.send({type:'ready'});return;}
   if(game.current.status==='drill-complete'){openCup();setMenuPage('training');return;}
   if(game.current.status==='challenge-complete'){if(game.current.challenge<2)lesson(game.current.challenge+1);else openCup();return;}
   if(game.current.status==='over'){
     if(game.current.cupStage>=0){
       if(game.current.cupStage===2&&game.current.score[0]>game.current.score[1]){openCup();return;}
       if(game.current.score[0]<game.current.score[1])persist(rematch(progressRef.current));
       game.current=cupGame(progressRef.current);
     }else{friendly(game.current.friendlyOpponent);}
   }
   prepareServe(game.current);keys.current.clear();stick.current={x:0,z:0};sync();
 };
 const release=()=>{if(online.active.current){online.send({type:'action',action:'serve'});keys.current.clear();return;}game.current.pace=level.current;if(game.current.status==='serving')toss(game.current);else serve(game.current);keys.current.clear();stick.current={x:0,z:0};sync();};
 const pause=()=>{if(online.active.current){keys.current.clear();stick.current={x:0,z:0};return;}setCupOpen(false);keys.current.clear();stick.current={x:0,z:0};if(['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';}else if(game.current.status==='paused')game.current.status=game.current.resumeStatus;sync();};
 const friendly=(index:number)=>{if(online.active.current)return;setMobileTools(false);setCupOpen(false);const g=applyCareer(createGame(),progressRef.current);g.friendlyOpponent=index;g.cpuStyle=opponents[index].style;g.cpuTier=events[Math.floor(index/3)].tier;g.opponentGenders=[...opponents[index].genders];g.opponentCountry=opponents[index].country;g.opponentPlayers=[...opponents[index].players];g.opponentName=opponents[index].name;g.pointGoal=7;game.current=g;keys.current.clear();stick.current={x:0,z:0};sync();};
 const reset=()=>friendly(0);
 const selectEvent=(index:number)=>{const p=progressRef.current;if(index!==p.event||p.stage===3){const next=beginEvent(p,index);if(next===p)return;persist(next);}enterCup();};
 const practice=()=>{if(online.active.current)return;setCupOpen(false);game.current=applyCareer(createGame(),progressRef.current);startPractice(game.current);keys.current.clear();stick.current={x:0,z:0};sync();};
 const changeStyle=()=>{const choices=shotChoices(game.current),selected=['serving','tossing'].includes(game.current.status)?game.current.serveStyle:game.current.attackStyle;choose((choices.findIndex(c=>c.style===selected)+1)%3);sync();};
 const nextAim=()=>{if(online.active.current){online.send({type:'action',action:'aim'});return;}cycleAim(game.current);sync();};
 const changePlayer=()=>{if(online.active.current){online.send({type:'action',action:'switch'});return;}switchPlayer(game.current);sync();};
 useEffect(()=>{
 try{const saved=readProgress(localStorage.getItem('shoreline-career-v2')||localStorage.getItem('shoreline-cup-v1'));progressRef.current=saved;setProgress(saved);}catch{setSaveError('Progresso disponível apenas nesta sessão.');}
 let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
 import('../../lib/court').then(({mountCourt})=>{
   if(disposed||!canvas.current)return;
   engine=mountCourt(canvas.current,()=>game.current,keys.current,()=>level.current,()=>{if(!disposed)sync();},()=>{if(!disposed)setLoaded(true);},message=>{if(!disposed)setError(message);},()=>stick.current,(x,z)=>online.send({type:'action',action:'target',value:{x,z}}));
 }).catch(()=>{if(!disposed)setError('Não foi possível abrir a quadra. Recarregue a página.');});
 const map=(k:string)=>['a','ArrowLeft'].includes(k)?'left':['d','ArrowRight'].includes(k)?'right':['w','ArrowUp'].includes(k)?'up':['s','ArrowDown'].includes(k)?'down':k===' '?'jump':k==='j'?'prepare':k==='i'?'attack':k==='k'?'dive':k==='l'?'block':'';
 const down=(e:KeyboardEvent)=>{if(menuVisible.current)return;if((e.target as HTMLElement).matches('select,input')||(e.target as HTMLElement).closest('[role=dialog]'))return;if(['1','2','3'].includes(e.key)){e.preventDefault();if(!e.repeat){choose(Number(e.key)-1);if(game.current.status==='playing')keys.current.add(e.key);sync();}return;}const k=map(e.key.length===1?e.key.toLowerCase():e.key);if(k){e.preventDefault();keys.current.add(k);if(k==='jump'&&!e.repeat){if(game.current.status==='ready'){start();return;}if(['serving','tossing'].includes(game.current.status)){release();return;}}}if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();changeStyle();}if(e.key.toLowerCase()==='q'&&!e.repeat){e.preventDefault();nextAim();}if(e.key.toLowerCase()==='p'&&!e.repeat)pause();if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();changePlayer();}};const up=(e:KeyboardEvent)=>{keys.current.delete(e.key);keys.current.delete(map(e.key.length===1?e.key.toLowerCase():e.key));};const blur=()=>{shotPointer.current=null;keys.current.clear();stick.current={x:0,z:0};if(!online.active.current&&['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';sync();}};
 const network=setInterval(()=>{if(!online.active.current)return;const has=(...names:string[])=>names.some(n=>keys.current.has(n));online.send({type:'input',move:Math.max(-1,Math.min(1,stick.current.x+Number(has('right'))-Number(has('left')))),depth:Math.max(-1,Math.min(1,stick.current.z+Number(has('down'))-Number(has('up')))),jump:has('jump'),attack:has('attack','touch-attack','1','2','3'),dive:has('dive'),block:has('block'),prepare:has('prepare','touch-prepare','touch-attack','1','2','3')});},34);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{clearInterval(network);disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 useEffect(()=>{if(cupOpen||!['playing','serving','tossing'].includes(view.status)){shotPointer.current=null;keys.current.delete('touch-attack');}},[cupOpen,view.status]);
 const play=()=>{const status=game.current.status;if(status==='ready'||status==='over')start();else if(status==='serving'||status==='tossing')release();else if(status==='playing')keys.current.add('touch-prepare');};
 const shotDown=(e:React.PointerEvent<HTMLButtonElement>,index:number)=>{
   if(shotPointer.current!==null)return;e.preventDefault();shotPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);
   choose(index);if(game.current.status==='playing')keys.current.add('touch-attack');sync();
 };
 const shotUp=(e:React.PointerEvent<HTMLButtonElement>)=>{if(shotPointer.current!==e.pointerId)return;shotPointer.current=null;keys.current.delete('touch-attack');setMobileTools(false);};
 const serveBand=serveTiming(view),greenStart=(.56-serveBand.goodHalf)/1.15*100,greenEnd=(.56+serveBand.goodHalf)/1.15*100;
 const playLabel=view.status==='serving'?'Lançar':view.status==='tossing'?'Sacar':view.lastTeam===0?(view.touches>=2?(view.attackStyle==='tip'?'Largar':'Cortar'):'Levantar'):'Jogar';
 return <main className={`arcade-app ${!cupOpen?'mobile-game':''} ${mobileTools?'mobile-tools-open':''} ${view.status==='playing'||['serving','tossing'].includes(view.status)?'match-live':''}`}>
 <section className={`game-shell ${cupOpen?'cup-open':''}`} ref={region}><button className="mobile-tools-toggle" aria-label="Opções da partida" aria-expanded={mobileTools} onClick={()=>setMobileTools(v=>!v)}>{mobileTools?'Fechar ×':'☰'}</button><a className="mobile-exit" href="/">Sair da partida</a><div className="mobile-rotate-hint">Na horizontal, a quadra fica maior</div><div className="game-toolbar"><div className="court-label"><span className="live-dot"/> BEACH VOLLEYBALL <span className="tag">2 VS 2</span></div><div className="tools"><button disabled={online.info.active} onClick={openCup}>Menu do vôlei</button><button disabled={online.info.active} className="mobile-mode" onClick={practice}>Treino</button><button disabled={online.info.active} className="mobile-mode" onClick={reset}>Partida</button><button disabled={online.info.active} aria-label="Pause or resume game" onClick={pause}>{view.status==='paused'?<Play size={17}/>:<Pause size={17}/>}</button><button disabled={online.info.active} aria-label="Restart match" onClick={reset}><RotateCcw size={16}/></button><button aria-label="Toggle fullscreen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void region.current?.requestFullscreen?.().catch(()=>{});}}><Maximize size={17}/></button></div></div>
 {online.info.active&&<div className="football-online"><strong>{online.info.error||`${online.info.players}/2 jogadores · Sua dupla à esquerda`}</strong>{online.info.link&&<><input aria-label="Link de convite" readOnly value={online.info.link} onFocus={e=>e.target.select()}/><button onClick={async()=>{try{await navigator.clipboard.writeText(online.info.link);setCopyMessage('Copiado!');}catch{setCopyMessage('Selecione o link para copiar');}}}>{copyMessage}</button></>}<a href="/">Sair da sala</a></div>}
 <div className="court"><div ref={canvas} className="phaser-court" role="img" aria-label="Quadra de vôlei em perspectiva. WASD move, espaço salta, E troca jogador, J prepara o contato, K mergulha."/><div className="scoreboard"><div><span className="you-dot"/> {view.drill>=0?view.names[view.drillAthlete]:view.country} <b>{view.drill>=0?view.drillScore:view.score[0]}</b></div><span className="score-divider">:</span><div><b>{view.drill>=0?5:view.score[1]}</b> {view.drill>=0?medalNames[view.drillMedal]:view.opponentCountry+' · '+view.opponentName} <span className="cpu-dot"/></div><small>{view.drill>=0?`${view.names[view.drillAthlete]} · ${view.drillScore}/5 ACERTOS · ${view.drillAttempts}/5 TENTATIVAS`:view.practice?`TREINO · ${view.repetitions} SEQUÊNCIAS`:`ATÉ ${view.pointGoal} · VANTAGEM DE 2`}</small></div><span className="location"><span/> {view.location}</span>
 {!online.info.active&&!cupOpen&&(!loaded||!['playing','serving','tossing','practice-wait'].includes(view.status))&&<div className="overlay"><div className="start-card"><span className="mini-label">{view.status==='drill-complete'?medalNames[view.drillMedal].toUpperCase():view.status==='paused'?'TAKE A BREATHER':view.status==='challenge-complete'?'DESAFIO CONCLUÍDO':view.status==='over'?'FIM DA PARTIDA':view.score[0]+view.score[1]>0?'KEEP THE GOOD TIMES GOING':'YOUR DAILY DOSE OF VITAMIN SEA'}</span><h2>{error||(!loaded?'Preparing your court…':view.status==='drill-complete'?`${drills[view.drill].name} · ${view.drillScore}/5`:view.status==='paused'?'Back in a splash.':view.status==='challenge-complete'?'Boa! Vamos ao próximo.':view.status==='over'&&view.cupStage>=0?(view.score[0]>view.score[1]?(view.cupStage===2?`Campeões · ${events[view.event].name}!`:'Vitória! Próxima etapa liberada.'):'Tente outra estratégia na revanche.'):view.message)}</h2><p>{view.status==='drill-complete'?`${view.names[view.drillAthlete]} · Medalhas e XP salvos. Melhore a medalha para ganhar mais XP.`:view.status==='paused'?'The court will be right here.':view.status==='over'?`${view.score[0]} – ${view.score[1]} · ${view.cupStage===2&&view.score[0]>view.score[1]?'Uniforme dourado desbloqueado!':'Pronto para a próxima?' }`:view.lastRally?`${view.pointReason} · ${view.lastRally} contatos · Recorde: ${view.bestRally}`:'Two on your side. Two across the net. Let’s rally.'}</p><button className="primary" disabled={!loaded||!!error} onClick={view.status==='paused'?pause:start}>{view.status==='drill-complete'?'Voltar aos treinos':view.status==='paused'?'Resume game':view.status==='challenge-complete'?(view.challenge<2?'Próximo desafio':'Voltar à copa'):view.status==='over'?(view.cupStage>=0&&view.score[0]>view.score[1]?(view.cupStage===2?'Ver troféu':'Próximo adversário'):'Revanche'):view.score[0]+view.score[1]>0?'Preparar próximo saque':'Entrar na quadra'} <ArrowUpRight size={18}/></button><small>{view.status==='ready'?'or press space to serve':'Make yourself at home.'}</small></div></div>}
 {online.info.active&&(online.info.error||online.info.players<2||['ready','over'].includes(view.status))&&<div className="overlay"><div className="start-card"><h2>{online.info.error?'Conexão encerrada':online.info.players<2?'Convide seu amigo':view.status==='over'?(view.score[0]>view.score[1]?'Sua dupla venceu!':'Boa partida!'):'Duplas prontas?'}</h2><p>{online.info.error||(online.info.ready?'Esperando seu amigo confirmar.':'Cada pessoa controla uma dupla. Até 7 pontos, com vantagem de 2.')}</p><button className="primary" disabled={!loaded||!!error||!!online.info.error||online.info.players<2||online.info.ready} onClick={()=>online.send({type:'ready'})}>{view.status==='over'?'Quero revanche':'Estou pronto'}</button></div></div>}
 {cupOpen&&<div className={`overlay cup-overlay ${menuPage==='home'?'arcade-home':''}`}><section className="cup-card" aria-label="Menu do jogo">
 {menuPage==='home'?<>
 <a className="sport-back" href="/">← Escolher esporte</a><span className="arcade-badge">SHORELINE · DUPLAS</span><h1 className="volley-menu-title">VÔLEI DE PRAIA</h1><p className="arcade-tagline">Escolha como entrar na quadra.</p>
 <nav className="arcade-menu" aria-label="Modos de jogo">
 <button className="arcade-play" disabled={!loaded||!!error} onClick={()=>view.status==='paused'?pause():friendly(0)}>{view.status==='paused'?'CONTINUAR':'JOGAR AGORA'} <span>{view.status==='paused'?'Sua partida está esperando':'Amistoso · direto para a quadra'}</span></button>
 <button disabled={!loaded||!!error} onClick={createRoom}>JOGAR COM AMIGO <span>Vôlei online · convite por link</span></button>
 <button onClick={()=>setMenuPage('career')}>CARREIRA <span>{progress.career.country} · {progress.career.players.map(p=>p.name).join(' & ')}</span></button>
 <button onClick={()=>setMenuPage('training')}>TREINO <span>Medalhas e XP · treino por atleta</span></button>
 <button onClick={()=>setMenuPage('settings')}>OPÇÕES <span>Controles · instalar · transferir carreira</span></button>
 </nav><small className="arcade-footer">2 JOGADORES POR LADO · UMA PRAIA INTEIRA PARA CONQUISTAR</small>
 </>:<>
 <button className="menu-back" onClick={()=>setMenuPage('home')}>← Menu do vôlei</button>
 <h2>{menuPage==='career'?events[progress.event].name:menuPage==='training'?'DOMINE A QUADRA':'DO SEU JEITO'}</h2>
 {menuPage==='career'&&<>
 <CareerPanel progress={progress} onChange={persist} onEvent={selectEvent} onFriendly={friendly}/>
 <ol>{eventOpponents(progress.event).map((opponent,i)=><li key={opponent.name} className={progress.stage>i?'complete':progress.stage===i?'current':''}><strong>{progress.stage>i?'✓':i+1} · {roundNames[i]} · {opponent.country} · {opponent.name}</strong><small>{opponent.players.join(' & ')}</small><small>{opponent.description}</small></li>)}</ol>
 <button className="primary" disabled={!loaded||!!error} onClick={enterCup}>{progress.stage===3?'Repetir torneio':progress.score.some(Boolean)?'Continuar torneio':progress.stage?'Próxima etapa':'Começar torneio'}</button>
 {progress.champion&&<label className="cup-uniform"><input type="checkbox" checked={progress.gold} onChange={e=>{persist({...progressRef.current,gold:e.target.checked});game.current.gold=e.target.checked;sync();}}/> Uniforme dourado de campeão</label>}
 </>}
 {menuPage==='training'&&<div className="training-menu">
 <label>Atleta treinado<select value={trainee} onChange={e=>setTrainee(Number(e.target.value))}>{progress.career.players.map((player,i)=><option key={i} value={i}>{player.name} · {player.xp} XP</option>)}</select></label>
 <p>Cinco tentativas: 2 acertos = bronze, 3 = prata, 5 = ouro. Bronze libera o próximo nível. XP acumulado por medalha: 20 / 50 / 100, apenas para este atleta.</p>
 <div className="drill-grid">{drills.map((drill,i)=><button key={i} disabled={!loaded||!trainingUnlocked(progress.drills[trainee],i)} onClick={()=>train(i)}><strong>{drill.name}</strong><span>{medalNames[progress.drills[trainee][i]]}</span><small>{drill.kind==='defense'?'Receba com qualidade':'Acerte o círculo dourado'} · {drill.kind==='serve'?'Lance e bata na faixa verde':drill.kind==='attack'?'Mire e segure o golpe':'Mova e segure Jogar / J'}</small></button>)}</div>
 <h3>Primeiros passos</h3>{lessons.map((name,i)=><button key={name} disabled={!loaded||i>progress.training} onClick={()=>lesson(i)}><strong>{progress.training>i?'✓':i+1}</strong>{name}</button>)}<button onClick={practice} disabled={!loaded}>Treino livre</button></div>}
 {menuPage==='settings'&&<>
 <button className="menu-back" onClick={()=>setHelp(true)}>Ver todos os controles</button>
 <label className="arcade-option">Dificuldade<select value={difficulty} onChange={e=>{setDifficulty(e.target.value);level.current=e.target.value;}}><option value="Chill">Tranquilo</option><option value="Club">Clube</option><option value="Pro">Profissional</option></select></label>
 <p>Computador: WASD move · J prepara · Q mira · 1/2/3 escolhem o golpe.<br/>Celular: direcional, Jogar e Alvo. Segure um dos três golpes para atacar, inclusive de segunda.</p>
 <label className="assist-toggle"><input type="checkbox" checked={view.autoSwitch} onChange={e=>{game.current.autoSwitch=e.target.checked;sync();}}/> Troca automática de jogador</label>
 <label className="assist-toggle"><input type="checkbox" disabled={view.practice} checked={view.windEnabled} onChange={e=>{game.current.windEnabled=e.target.checked;if(!game.current.windEnabled)game.current.wind=0;sync();}}/> Vento variável · {view.wind>=0?'↓':'↑'} {Math.abs(view.wind).toFixed(0)} · observe o desvio lateral</label>
 <p className="guide-legend">Círculo branco: queda da bola · Círculo azul/verde: onde se posicionar · {view.practice?'Pressione Q para escolher o alvo amarelo e segure J até o contato. Você pode escolher o alvo antes da bola chegar.':'No ataque, espere “PULE AGORA”.'}</p>
 <label className="assist-toggle"><input type="checkbox" checked={view.assist} onChange={e=>{game.current.assist=e.target.checked;sync();}}/> Ajuda de contato e ajuste fino de posição ao soltar os controles</label>
 </>}
 <div hidden={menuPage!=='settings'}><BetaTools progress={progress} onImport={p=>{game.current=applyCareer(createGame(),p);persist(p,false);setUnlocks([]);keys.current.clear();stick.current={x:0,z:0};sync();}}/></div>
 </>}
 <small role="status">{error||saveError||(!loaded?'Preparando a quadra…':menuPage==='career'?'Carreira salva neste navegador':'')}</small>
 </section></div>}
 {view.drill>=0&&!cupOpen&&['playing','serving','tossing','practice-wait'].includes(view.status)&&<div className="lesson-hint">{drills[view.drill].name} · {drills[view.drill].kind==='defense'?'Chegue ao círculo e prepare a recepção':'Mire no círculo dourado'} · {view.drillScore}/5 acertos</div>}
 {view.challenge>=0&&!cupOpen&&view.status==='playing'&&<div className="lesson-hint">{lessons[view.challenge]}</div>}
 {['serving','tossing'].includes(view.status)&&<div className="serve-prompt"><div><strong>{view.server?'Saque adversário':view.status==='tossing'?'Espaço novamente para bater':'Escolha o saque e o alvo · Lance e bata na faixa verde'}</strong><small>{view.tossQuality||'Bata quando a barra estiver verde'}</small>{view.status==='tossing'&&<div className="toss-meter" style={{background:`linear-gradient(to right,#ce8c67 0% ${greenStart}%,#8fc574 ${greenStart}% ${greenEnd}%,#ce8c67 ${greenEnd}%)`}}><span style={{left:`${Math.min(100,view.tossTime/1.15*100)}%`}}/></div>}</div><button className="primary" onClick={release} disabled={view.server===1&&(online.info.active||view.status==='tossing')}>{view.status==='tossing'?'Bater agora':view.server?'Pronto para receber':'Lançar bola'} · Espaço</button></div>}

 {view.feedbackTime>0&&<div role="status" className={`contact-feedback ${view.feedback.endsWith('RUIM')?'poor':''}`}>{view.feedback}<small>{view.contactHint}</small></div>}
 {view.status==='playing'&&<span className="rally">{view.rally?`${view.shot} · ${view.rally} hits`:'Find the ball. Make it yours.'}</span>}</div>
 {!cupOpen&&!help&&loaded&&(view.status==='playing'||view.server===0&&['serving','tossing'].includes(view.status))&&<div className="shot-bar" aria-label="Golpe desta jogada">
 <small>{['serving','tossing'].includes(view.status)?'ESCOLHA O SAQUE · DEPOIS LANCE E BATA':'SEGURE PARA ATACAR · JOGAR / J RECEBE E LEVANTA'}</small>
 <div>{shotChoices(view).map((choice,i)=><button key={choice.style} aria-pressed={choice.style===(['serving','tossing'].includes(view.status)?view.serveStyle:view.attackStyle)}
 onPointerDown={e=>shotDown(e,i)} onPointerUp={shotUp} onPointerCancel={shotUp} onLostPointerCapture={shotUp}
 onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();choose(i);if(game.current.status==='playing')keys.current.add('touch-attack');sync();}}}
 onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();keys.current.delete('touch-attack');}}}
 onBlur={()=>{shotPointer.current=null;keys.current.delete('touch-attack');}}><kbd>{i+1}</kbd>{choice.label}</button>)}</div></div>}
 {unlocks[0]&&<AchievementToast key={unlocks[0]} title={unlocks[0]} onDone={dismissUnlock}/>}
 <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={play} onRelease={()=>keys.current.delete('touch-prepare')} onAim={nextAim} label={playLabel} charge={view.players[view.active]?.preparation||0} enabled={loaded&&!error&&view.status!=='paused'&&view.status!=='challenge-complete'&&view.status!=='drill-complete'&&!help&&!cupOpen}/>
 <div className="game-bottom"><span><Wind size={15}/> Player {view.active+1} · <button className="switch-player" onClick={changePlayer}>E · Switch</button> · {view.autoSwitch?'AUTO':'MANUAL'}</span><label>YOUR PACE <select disabled={online.info.active} aria-label="Computer difficulty" value={difficulty} onChange={e=>{setDifficulty(e.target.value);level.current=e.target.value;}}><option>Chill</option><option>Club</option><option>Pro</option></select></label></div></section>
 <span className="sr-only" aria-live="polite">{view.country} {view.score[0]}, {view.opponentName} {view.score[1]}.</span>
 {help&&<div className="modal-backdrop"><section className="help" role="dialog" aria-modal="true" aria-label="How to play"><button className="close" aria-label="Close instructions" autoFocus onClick={()=>setHelp(false)}><X/></button><Volleyball size={32}/><h2>Entre no ritmo.</h2><p>WASD ou setas movem. J prepara recepção, levantamento e ataque de terceira. Q troca o alvo. No celular, use o direcional, Jogar e Alvo.</p><p>Escolha o golpe em cada ação: 1 Cortada, 2 Colocado, 3 Largadinha. Segure a tecla ou o botão do golpe para atacar, inclusive na segunda bola. Depois do ataque, a escolha volta à cortada.</p><p>No saque, 1 Por baixo, 2 Flutuante, 3 Em salto. Espaço ou Jogar lança a bola; pressione novamente na faixa verde para bater. O tempo da batida determina a qualidade. Escolha o alvo com Q ou Alvo.</p><p>Espaço salta, K mergulha, L bloqueia, E troca atleta e P pausa. Segurar Jogar também ajuda a saltar, bloquear e mergulhar no momento do contato. Vença torneios e desafios para conquistar troféus, XP e o uniforme dourado.</p><button className="primary" onClick={()=>setHelp(false)}>Vamos jogar <ArrowUpRight size={18}/></button></section></div>}
 </main>;
}
