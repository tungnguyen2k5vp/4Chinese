const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const output=path.resolve(process.env.QA_OUTPUT_DIR || path.join(root,'artifacts/chinese-review-setup-schedule-2026-10-13'));
const adapters=`
import React,{useEffect,useMemo} from 'react';
import {View,Text,Pressable} from 'react-native-web';
import {lightTheme} from '${path.join(root,'src/theme/tokens.ts').replaceAll('\\','/')}';
const db={}; export const useSQLiteContext=()=>db;
export const useTheme=()=>lightTheme;export const useThemeStyles=f=>useMemo(()=>f(lightTheme),[f]);
export const useFocusEffect=callback=>useEffect(callback,[callback]);
export const useLocalSearchParams=()=>({deckId:new URLSearchParams(location.search).get('deckId')||undefined});
window.__qa={total:123,calls:[],routes:[],timers:[]};
window.setInterval=callback=>{window.__qa.timers.push(callback);return window.__qa.timers.length};window.clearInterval=()=>{};
export const router={push(route){window.__qa.routes.push(route)},back(){}};
export const getSettings=async()=>({reviewSessionSize:Number(localStorage.getItem('qa-review-size')||10),selectedHskBands:[1]});
export const saveSettings=async(_,settings)=>localStorage.setItem('qa-review-size',settings.reviewSessionSize);
const words=Array.from({length:123},(_,i)=>({id:'word-'+i,simplified:'词'+i,pinyin:'cí '+i,primaryMeaningVi:'Từ kiểm thử '+i,hskBand:i%2?5:1,examples:[],status:i===121?'KNOWN':'LEARNING',studied:true,masteryLevel:3,isKnown:i===121,isSuspended:i===122,nextReviewAt:new Date(Date.now()+(i<5?-1:i+1)*3600000).toISOString()}));
export const getDueCount=async(_,bands,deck)=>deck?8:40;
export const getDueVocabulary=async(_,size,bands,deck)=>{window.__qa.calls.push({size,deck});return words.slice(0,Math.min(size,deck?8:40))};
export const LEARNED_REVIEW_PAGE_SIZE=50;
export const getLearnedReviewPage=async(_,requested)=>{const total=window.__qa.total,totalPages=Math.max(1,Math.ceil(total/50)),page=Math.max(1,Math.min(requested,totalPages));return {words:words.slice((page-1)*50,Math.min(page*50,total)),total,totalPages,page}};
export const EmptyState=({title,message})=><View><Text>{title}</Text><Text>{message}</Text></View>;
export const PrimaryButton=({label,disabled,loading,onPress})=><Pressable accessibilityRole='button' disabled={disabled||loading} onPress={onPress} style={{padding:18,borderRadius:16,backgroundColor:'#2457D6'}}><Text style={{color:'white',textAlign:'center',fontWeight:'700'}}>{label}</Text></Pressable>;
export const Screen=({title,subtitle,children})=><View style={{backgroundColor:lightTheme.background,padding:20,gap:16,minHeight:'100vh'}}><Text style={{fontSize:26,fontWeight:'800'}}>{title}</Text><Text>{subtitle}</Text>{children}</View>;
`;
function assert(value,message){if(!value)throw new Error(message)}
async function main(){
 if(fs.existsSync(output))throw new Error('Evidence folder exists; use a fresh QA_OUTPUT_DIR.');fs.mkdirSync(output,{recursive:true});
 const mocks=new Set(['expo-router','expo-sqlite','@/db/repository','@/theme/ThemeProvider','@/components/EmptyState','@/components/PrimaryButton','@/components/Screen']);
 const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Setup from './src/app/review/index';import Schedule from './src/app/review/upcoming';import {useAppStore} from './src/stores/app-store';window.__store=useAppStore;createRoot(document.getElementById('root')).render(location.pathname==='/schedule'?<Schedule/>:<Setup/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','__DEV__':'false'},plugins:[{name:'boundaries',setup(build){
 build.onResolve({filter:/.*/},args=>{if(mocks.has(args.path))return{path:'adapters',namespace:'qa'};if(args.path==='react-native')return{path:require.resolve('react-native-web')};if(args.path.startsWith('@/'))return{path:path.join(root,'src',args.path.slice(2)+'.ts')}});
 build.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:adapters,loader:'tsx',resolveDir:root}));}}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const capture=(name,fullPage=false)=>page.screenshot({path:path.join(output,name),fullPage});
 try{
  await page.goto(base+'/setup');await page.getByRole('button',{name:'Bắt đầu ôn 10 từ',exact:true}).waitFor();
  for(const size of [5,10,15,20]){
   await page.getByRole('button',{name:size+' từ trong phiên',exact:true}).click();
   await page.getByRole('button',{name:'Bắt đầu ôn '+size+' từ',exact:true}).click();
   assert(await page.evaluate(()=>window.__store.getState().reviewQueue.length)===size,'Queue did not match selected size '+size);
   assert(await page.evaluate(()=>window.__qa.calls.at(-1).size)===size,'Repository limit mismatch');
  }
  await capture('01-select-5-10-15-20.png',true);
  await page.reload();await page.getByRole('button',{name:'Bắt đầu ôn 20 từ',exact:true}).waitFor();
  await page.goto(base+'/setup?deckId=deck-qa');await page.getByRole('button',{name:'Bắt đầu ôn 8 từ',exact:true}).waitFor();
  await page.getByRole('button',{name:'Bắt đầu ôn 8 từ',exact:true}).click();
  assert(await page.evaluate(()=>window.__store.getState().reviewQueue.length)===8,'Not clamped to available deck words');
  assert(await page.evaluate(()=>window.__qa.calls.at(-1).deck)==='deck-qa','Deck scope lost');
  await page.goto(base+'/schedule');await page.getByText('Đang xem 1–50 / 123 từ',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:/^词\d+,/}).count()===50,'First page not 50 words');await capture('02-schedule-page-1.png');
  await page.getByRole('button',{name:'Trang sau',exact:true}).first().click();await page.getByText('Đang xem 51–100 / 123 từ',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:/^词\d+,/}).count()===50,'Second page not 50 words');await capture('03-schedule-page-2.png');
  await page.getByRole('button',{name:'Trang sau',exact:true}).first().click();await page.getByText('Đang xem 101–123 / 123 từ',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:/^词\d+,/}).count()===23,'Last page incorrect');assert(await page.getByRole('button',{name:'Trang sau',exact:true}).first().isDisabled(),'Next allowed beyond final page');await capture('04-schedule-last-page.png');
  await page.evaluate(()=>{window.__qa.total=49;window.__qa.timers.at(-1)()});await page.getByText('Đang xem 1–49 / 49 từ',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:/^词\d+,/}).count()===49,'Refresh failed to clamp removed page');
  assert(errors.length===0,errors.join('\n'));
  const names=fs.readdirSync(output).filter(name=>name.endsWith('.png'));
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({date:'2026-10-13',environment:'Real review screens and Zustand queue in React Native Web; mocked SQLite/router and timer; no learner data writes.',checks:['All four session sizes reach repository and actual queue','Saved selection survives reload','Deck-only session clamps to available words','123 words paginate 50/50/23','Last page disables next','Periodic refresh clamps a page removed by a changed total'],pageErrors:errors},null,2));
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><title>Review sizes & schedule</title><style>body{font:16px system-ui;background:#f6f7fb;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}img{width:100%}figure{margin:0}</style><h1>Số từ mỗi phiên & lịch ôn phân trang</h1><p>Ảnh kiểm thử component web với dữ liệu giả lập.</p><main>${names.map(name=>`<figure><a href="${name}"><img src="${name}"></a><figcaption>${name}</figcaption></figure>`).join('')}</main>`);
  console.log(JSON.stringify({output,screenshots:names.length,result:'passed',errors},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);process.exitCode=1});
