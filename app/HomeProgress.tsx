'use client';
import Link from 'next/link';
import {useSyncExternalStore} from 'react';
import {rivals} from '../lib/rivals';
import {BEACH_PROGRESS_KEY,CIRCUIT_STAGES,circuitStage,dailyChallenge,localDay,nextSkin,readBeachProgress} from '../lib/beach-progress';

const subscribe=(update:()=>void)=>{window.addEventListener('storage',update);return ()=>window.removeEventListener('storage',update);};
const saved=()=>{try{return localStorage.getItem(BEACH_PROGRESS_KEY)??'';}catch{return '';}};

// Reasons to come back, read from this device only; the server renders nothing so hydration always matches.
export default function HomeProgress(){
 const raw=useSyncExternalStore(subscribe,saved,()=>null);
 if(raw===null)return null;
 const p=readBeachProgress(raw),day=localDay(),stage=circuitStage(p),daily=dailyChallenge(day),next=nextSkin(p),done=p.challengeDay===day;
 return <section className="arcade-home" aria-label="Seu progresso nos esportes de praia">
  <Link className="arcade-box arcade-continue" href={`${stage.sport.path}?rival=${stage.rival}&circuito=1`}>
   <span className="arcade-tag">CIRCUITO · ETAPA {stage.stage+1}/{CIRCUIT_STAGES}</span>
   <strong>{stage.sport.name} contra {rivals[stage.rival].name.toUpperCase()}</strong>
   <small>{p.titles?`${p.titles} título(s) · `:''}Vença para avançar.</small>
  </Link>
  <Link className="arcade-box arcade-daily" href={`${daily.sport.path}?rival=${daily.rival}&meta=${daily.goal}&dia=${day}`}>
   <span className="arcade-tag">DESAFIO DO DIA{done?' · CUMPRIDO':''}</span>
   <strong>{daily.sport.name}: vença {rivals[daily.rival].name.toUpperCase()} com {daily.goal} golpes perfeitos</strong>
   <small>Mesma meta para todos hoje · sequência de {p.streak} dia(s)</small>
  </Link>
  {next&&<div className="arcade-box">
   <span className="arcade-tag">PRÓXIMO: {next.name.toUpperCase()}</span>
   <span className="arcade-bar" aria-hidden="true"><i style={{width:`${Math.min(100,p[next.metric]/next.target*100)}%`}}/></span>
   <small>{Math.min(p[next.metric],next.target)} de {next.target} {next.goal}</small>
  </div>}
  <dl className="arcade-records">
   <div><dt>Vitórias</dt><dd>{p.wins}</dd></div>
   <div><dt>Perfeitos</dt><dd>{p.perfects}</dd></div>
   <div><dt>Títulos</dt><dd>{p.titles}</dd></div>
  </dl>
 </section>;
}
