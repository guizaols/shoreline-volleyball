'use client';
import {useEffect,useState} from 'react';
import {exportCareer,importCareer} from '../lib/backup';
import type {Progress} from '../lib/cup';

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
function download(text:string,name:string,type='application/json'){
 const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');
 link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function BetaTools({progress,onImport}:{progress:Progress;onImport:(p:Progress)=>void}){
 const [install,setInstall]=useState<InstallEvent|null>(null),[secure,setSecure]=useState(false),[message,setMessage]=useState('');
 const [candidate,setCandidate]=useState<Progress|null>(null),[feedback,setFeedback]=useState('');
 useEffect(()=>{
  setSecure(window.isSecureContext);
  const available=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
  window.addEventListener('beforeinstallprompt',available);
  if(window.isSecureContext&&'serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>setMessage('Não foi possível preparar a instalação. Recarregue e tente novamente.'));
  return()=>window.removeEventListener('beforeinstallprompt',available);
 },[]);
 return <div className="beta-tools">
 <h3>Leve a praia com você</h3>
 <button disabled={!secure} onClick={async()=>{
  if(!install){setMessage('No iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início. No Android: procure Instalar app no menu do navegador.');return;}
  try{await install.prompt();await install.userChoice;setInstall(null);}catch{setMessage('Instalação cancelada. Você pode tentar novamente.');}
 }}>Instalar jogo</button>
 {!secure&&<p>A instalação precisa de um endereço HTTPS público. O acesso pela rede local continua disponível no navegador.</p>}
 <h3>Salvar e transferir carreira</h3><p>Baixe sua carreira e importe o arquivo no outro aparelho. Não há sincronização automática.</p>
 <button onClick={()=>download(exportCareer(progress),'shoreline-carreira.json')}>Exportar carreira</button>
 <label className="import-button">Escolher carreira<input type="file" accept=".json,application/json" onChange={async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  setCandidate(null);
  try{if(file.size>200000)throw new Error('Arquivo grande demais.');setCandidate(importCareer(await file.text()));setMessage('');}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível ler o arquivo.');}
 }}/></label>
 {candidate&&<div className="import-preview"><strong>{candidate.career.country} · {candidate.career.players.map(p=>p.name).join(' & ')}</strong><p>{candidate.career.ranking} pontos · {candidate.career.history.length} resultados. Importar substituirá a carreira deste navegador.</p><button onClick={()=>{onImport(candidate);setCandidate(null);setMessage('Carreira importada.');}}>Importar esta carreira</button><button onClick={()=>setCandidate(null)}>Cancelar</button></div>}
 <details><summary>Teste de 5 minutos</summary><ol><li>Sem explicações, encontre um amistoso e comece a jogar.</li><li>Faça uma cortada e uma largadinha. Depois encontre sua carreira.</li><li>Anote onde travou, aparelho usado e se jogaria outra partida.</li></ol>
 <label>Observações<textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Aparelho, dificuldades e vontade de jogar novamente…" maxLength={4000}/></label>
 <button disabled={!feedback.trim()} onClick={()=>download(feedback,'shoreline-feedback.txt','text/plain')}>Baixar observações</button>
 </details><p role="status">{message}</p>
 </div>;
}
