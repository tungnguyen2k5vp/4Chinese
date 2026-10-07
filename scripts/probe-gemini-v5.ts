/** Explicit operator probe. No credentials, prompts, replies or audio are logged. */
import { readFileSync } from 'node:fs';

import { parseGeminiConversationReply } from '../src/services/speaking/gemini-conversation-contract';

const publicNames=['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;
const config:Record<string,string|undefined>={};
for(const name of publicNames)config[name]=process.env[name];
try{
  const source=readFileSync('.env','utf8');
  for(const name of publicNames){
    const line=source.split(/\r?\n/u).find(item=>item.startsWith(`${name}=`));
    if(!config[name]&&line)config[name]=line.slice(name.length+1).trim().replace(/^(['"])(.*)\1$/u,'$2');
  }
}catch{/* Missing optional local configuration is reported without exposing values. */}
const token=process.env.FOURCHINESE_QA_ACCESS_TOKEN;
const report=(status:string,details:Record<string,unknown>={})=>console.log(JSON.stringify({probe:'GEMINI_V5_TEXT_ONLY',status,...details}));
async function run(){
  if(!process.argv.includes('--run')){report('NOT_RUN',{reason:'Pass --run and a short-lived FOURCHINESE_QA_ACCESS_TOKEN in the local environment.'});return;}
  if(!token){report('NOT_RUN',{reason:'Authenticated app QA token unavailable. No account or session was created.'});return;}
  const url=config.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u,'');const key=config.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/u.test(url)||!key){report('NOT_RUN',{reason:'Public project configuration unavailable or unsupported.'});return;}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  const started=performance.now();
  try{
    const response=await fetch(`${url}/functions/v1/gemini-conversation`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({message:'你好',history:[],level:1,scene:'daily'}),signal:controller.signal});
    if(!response.ok){report('FAILED',{httpStatus:response.status,elapsedMs:Math.round(performance.now()-started)});process.exitCode=1;return;}
    parseGeminiConversationReply(await response.json());
    report('PASSED_TEXT_CONTRACT',{httpStatus:response.status,elapsedMs:Math.round(performance.now()-started),microphoneTested:false,pronunciationScoringTested:false});
  }catch{
    report('FAILED',{reason:controller.signal.aborted?'TIMEOUT':'NETWORK_OR_REPLY_CONTRACT',elapsedMs:Math.round(performance.now()-started)});process.exitCode=1;
  }finally{clearTimeout(timer);}
}
void run();
