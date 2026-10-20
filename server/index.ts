import {createServer,request} from 'node:http';
import {spawn} from 'node:child_process';
import {attachRooms} from './rooms.ts';
const production=process.argv.includes('--production');
const frontend=production?spawn(process.execPath,['dist/standalone/server.js'],{env:{...process.env,PORT:'3000',HOST:'127.0.0.1'},stdio:'inherit'}):null;
const server=createServer((req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'content-type':'text/plain'});res.end('ok');return;}
 if(!production){res.writeHead(404);res.end();return;}
 const upstream=request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers:req.headers},response=>{
  res.writeHead(response.statusCode||502,response.headers);response.pipe(res);
 });
 upstream.on('error',()=>{res.writeHead(503);res.end('Iniciando a arena');});req.pipe(upstream);
});
const closeRooms=attachRooms(server);
server.listen(Number(process.env.PORT||3002),'0.0.0.0',()=>console.log('Match server ready'));
const close=()=>{closeRooms();server.close();frontend?.kill();};
process.on('SIGTERM',close);process.on('SIGINT',close);
frontend?.on('exit',()=>{closeRooms();server.close();process.exitCode=1;});
