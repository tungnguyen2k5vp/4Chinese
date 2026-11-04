/* Runnable visual check: real RN-web/SVG component, no database or speech. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require(process.argv[2]||'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=process.env.QA_OUTPUT;
  if(out)fs.mkdirSync(out,{recursive:true});
  const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import {useState} from 'react';import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';import {View} from 'react-native';
    import {AnimatedProgressBar} from './src/components/ui/AnimatedProgressBar';
    window.qa={settings:{motionMode:'full'},state:{progress:0,active:true,width:280,color:'#147D79',trackColor:'#DDE9E5'}};
    function Harness(){const [,render]=useState(0);window.qa.update=p=>flushSync(()=>{if(p.motion)window.qa.settings.motionMode=p.motion;Object.assign(window.qa.state,p);render(v=>v+1);});
      const s=window.qa.state;return <View style={{padding:24,gap:24,backgroundColor:'#F8F6F0',minHeight:'100vh'}}>
        <View style={{width:s.width}}><AnimatedProgressBar {...s} variant="stream" height={12} testID="river" accessibilityLabel="Tiến độ buổi học"/></View>
        <View style={{width:s.width}}><AnimatedProgressBar progress={s.progress} color={s.color} trackColor={s.trackColor} testID="plain"/></View>
      </View>;}
    const root=createRoot(document.getElementById('root'));window.qa.unmount=()=>root.unmount();root.render(<Harness/>);
  `},bundle:true,write:false,format:'iife',jsx:'automatic',resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],
    alias:{'react-native':'react-native-web','react-native-svg':path.join(root,'node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},
    define:{'process.env.NODE_ENV':'"production"','process.env':'{}',__DEV__:'false',global:'globalThis'},
    plugins:[{name:'settings-only',setup(b){b.onResolve({filter:/^@\/stores\/app-store$/},()=>({path:'settings',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const useAppStore=select=>select({settings:window.qa.settings});',loader:'js'}));}}]});
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'application/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].contents:'<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/bundle.js"></script>');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port);await page.getByTestId('river').waitFor();
    const update=p=>page.evaluate(p=>window.qa.update(p),p);
    const sample=()=>page.getByTestId('river').evaluate(async root=>{
      const frames=[],until=performance.now()+650;
      while(performance.now()<until){await new Promise(requestAnimationFrame);const matrix=id=>{const element=root.querySelector('[data-testid="'+id+'"]');if(!element)throw Error('Missing '+id+': '+root.outerHTML.slice(0,2500));return new DOMMatrix(getComputedStyle(element).transform);};frames.push({fish:matrix('stream-fish-position').m41,current:matrix('stream-current').m41,bob:matrix('stream-fish-swim').m42,tail:matrix('stream-fish-tail').b});}return frames;
    });
    const frame=await sample();assert.ok(frame.some((f,i)=>i&&f.current>frame[i-1].current),'Current flows left to right');
    assert.ok(new Set(frame.map(f=>f.tail.toFixed(2))).size>4,'Fish tail moves');assert.ok(new Set(frame.map(f=>f.bob.toFixed(2))).size>4,'Fish bobs');
    assert.equal(await page.getByTestId('plain').getByTestId('stream-fish-position').count(),0,'Default bars have no fish or stream');
    for(const progress of [0,0.1,0.5,1,0.2,-2,2]){
      await update({progress});await page.waitForTimeout(400);
      const clamped=Math.max(0,Math.min(1,progress)),fish=await page.getByTestId('stream-fish-position').boundingBox(),rail=await page.getByTestId('river').boundingBox();
      assert.equal(Number(await page.getByTestId('river').getAttribute('aria-valuenow')),Math.round(clamped*100));
      assert.ok(Math.abs(fish.x-rail.x-clamped*(rail.width-36))<1,'Fish tracks the actual clamped progress');
      assert.ok(fish.x>=rail.x-0.5&&fish.x+fish.width<=rail.x+rail.width+0.5,'Fish stays in the track width');
      const fill=await page.getByTestId('stream-progress-fill').boundingBox();assert.ok(Math.abs(fill.width/rail.width-clamped)<0.01);
    }
    await update({progress:NaN});await page.waitForTimeout(400);assert.equal(await page.getByTestId('river').getAttribute('aria-valuenow'),'0');
    await update({progress:0.9});await page.waitForTimeout(50);await update({progress:0.3});const retarget=await sample();assert.ok(Math.abs(retarget.at(-1).fish-0.3*244)<1);
    for(const patch of [{motion:'reduced'},{motion:'off'},{motion:'full',active:false}]){
      await update(patch);const still=await sample();assert.ok(still.every(f=>f.current===0&&f.bob===0),'Disabled or blurred stream stops');
    }
    await update({active:true,motion:'full'});await page.emulateMedia({reducedMotion:'reduce'});const osStill=await sample();assert.ok(osStill.slice(-10).every(f=>f.current===0));await page.emulateMedia({reducedMotion:'no-preference'});
    const visibility=state=>page.evaluate(value=>{Object.defineProperty(document,'visibilityState',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},state);
    await visibility('hidden');const hidden=await sample();assert.ok(hidden.every(f=>f.current===0));await visibility('visible');const resumed=await sample();assert.ok(resumed.some(f=>f.current>0));
    for(const width of [148,220,280,350]){await update({width,progress:1});await page.waitForTimeout(400);const fish=await page.getByTestId('stream-fish-position').boundingBox(),rail=await page.getByTestId('river').boundingBox();assert.ok(fish.x+fish.width<=rail.x+rail.width+0.5);}
    await update({width:280,progress:0.55});await page.waitForTimeout(400);
    if(out){fs.writeFileSync(path.join(out,'flow-frames.json'),JSON.stringify({initial:frame,retarget,resumed},null,2));await page.screenshot({path:path.join(out,'stream-progress.png')});}
    await page.evaluate(()=>window.qa.unmount());await page.waitForTimeout(100);assert.deepEqual(errors,[]);
    console.log('PASS: stream direction, fish tail/bob and real progress, clamp/retarget, default bars unchanged, width bounds, reduced/off/OS, focus/background/resume/unmount. RN-WEB ONLY; no learner data.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
