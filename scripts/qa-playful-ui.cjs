/* Isolated real RN-web UI with fixture reads. Never opens a learner database. */
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { build } = require('esbuild');
const { chromium } = require(process.argv[2] || 'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

(async () => {
  const output = process.env.QA_OUTPUT;
  if (output) fs.mkdirSync(output, { recursive: true });
  const stubs = {
    'expo-router': `import {useEffect} from 'react'; export const router={push(p){window.qa.navigation=p},replace(p){window.qa.navigation=p},back(){},setParams(p){Object.assign(window.qa.params,p)}}; export const useLocalSearchParams=()=>window.qa.params; export const useIsFocused=()=>window.qa.focus; export const useFocusEffect=callback=>useEffect(callback,[callback]);`,
    'expo-router/react-navigation': `import {createContext} from 'react'; export const HeaderShownContext=createContext(false);`,
    'expo-sqlite': `export const useSQLiteContext=()=>null;`,
    'react-native-safe-area-context': `import {View} from 'react-native'; export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0}); export const SafeAreaView=({edges,...props})=><View {...props} testID="safe-area" dataSet={{edges:edges.join(',')}}/>;`,
    '@expo/vector-icons': `import {Text} from 'react-native'; export const Ionicons=({name,size,color,style})=><Text style={[{fontSize:size,color},style]}>{name.includes('chevron')?'›':name.includes('check')?'✓':'✦'}</Text>;`,
    '@/services/audio/chinese-speech': `export async function speakChinese(text,options){window.qa.speechCalls=(window.qa.speechCalls||0)+1;window.qa.speech=options;options?.onStart?.();return {ok:true};} export async function stopChineseSpeech(){window.qa.speech?.onStopped?.();}`,
    'expo-image': `export {Image} from 'react-native';`,
    '@/components/LexicalKnowledgeCard': `export const LexicalKnowledgeCard=()=>null;`,
    '@/components/PersonalContextCard': `export const PersonalContextCard=()=>null;`,
    '@/components/StrokeWriter': `import {Text} from 'react-native'; export const StrokeWriter=({character})=><Text>{character}</Text>;`,
    '@/db/hsk30': `export async function getHsk30WordLevels(){return [];}`,
    '@/app/english/activity': `export default function EnglishActivity(){return null;}`,
    '@/services/languages/LanguageProvider': `export const useLearningLanguage=()=>({preferences:{learningLanguage:'zh'}});`,
    '@/services/languages/LanguageRuntime': `export const EnglishAvailability=({children})=>children;`,
    '@/services/feedback/feedback-service': `export async function playHaptic(){}`,
    '@/services/analytics/analytics-service': `export const AnalyticsEvent={};export function track(){}`,
    '@/services/decks/share-code': `export function createSharedDeckPayload(){throw Error('No writes in visual QA');}`,
    '@/services/decks/short-share': `export class ShortDeckShareError extends Error{};export function publishShortDeck(){throw Error('No network in visual QA');}`,
    '@/services/pinyin-ime/candidateSearch': `export async function searchHanziCandidates(){return [];}`,
    '@/services/handwriting/stroke-data': `export const getStrokePaths=()=>[];`,
    '@/db/hanzi-memory': `import {getVocabulary} from '@/db/repository';
      export async function listMemoryCandidates(db,scope,limit){window.qa.memoryRead={scope,limit};if(window.qa.dataState==='error')throw Error('fixture');if(window.qa.dataState==='empty')return [];const word=await getVocabulary();return [{word,learnedAt:'2026-01-01',lastReviewAt:'2026-09-01',wrongCount:4,lapseCount:2,mistakes:window.qa.mistakes,personalSentence:''}];}
      export const readMemoryMnemonic=()=>'';
      export const saveMemoryMnemonic=()=>{window.qa.writes++;throw Error('No writes in visual QA');};`,
    '@/db/mistakes': `export async function listMistakes(){if(window.qa.dataState==='error')throw Error('fixture');return window.qa.dataState==='empty'?[]:window.qa.mistakes;}`,
    '@/db/vocabulary-context': `export const contextCloze=()=>null;export async function listVocabularyContexts(){return [{id:'context',sentence:'你好！',translation_vi:'Xin chào!',source_type:'PERSONAL'}];}`,
    '@/db/repository': `import {useAppStore} from '@/stores/app-store';
      export async function getSettings(){return useAppStore.getState().settings;}
      export async function getDashboardStats(){return {due:16,streak:4,studySeconds:420,reviewedToday:8,newToday:2};}
      export async function getDueCount(){return 16;}
      export async function getDailyVocabulary(){return {id:'fixture',simplified:'你好',pinyin:'nǐ hǎo',primaryMeaningVi:'Xin chào'};}
      export async function getVocabulary(){return {id:'fixture',simplified:'你好',traditional:'你好',pinyin:'nǐ hǎo',primaryMeaningVi:'Xin chào',meaningsVi:['Xin chào'],meaningsEn:['Hello'],hskBand:'1',status:'NEW',pos:[],examples:[]};}
      export async function getNotes(){return '';}
      export async function saveNotes(db,id,text){window.qa.noteSaveAttempts=(window.qa.noteSaveAttempts||0)+1;if(window.qa.failNoteSave)throw Error('fixture save failure');window.qa.savedNote={id,text};}
      export async function getRelatedVocabulary(){return [];}
      export async function getUnlearnedVocabulary(){return [{id:'fixture'}];}
      export async function getDeckVocabulary(){return [];}
      export async function getDueVocabulary(){return [];}
      export async function listPersonalDecks(){return [{id:'fixture',name:'Từ vựng mỗi ngày'}];}
      const noWrite=()=>{window.qa.writes++;throw Error('No writes in visual QA');};
      export const defaultSettings={};
      export {noWrite as deletePersonalDeck,noWrite as removeVocabularyFromDeck,noWrite as renamePersonalDeck,noWrite as toggleFavorite,noWrite as copyVocabularyBatchToDeck,noWrite as saveSettings};`,
    '@/db/learning-path': `export async function listLearningCourses(){return [];}
      export async function listLearningLessons(){return ['COMPLETED','IN_PROGRESS','LOCKED'].map((status,index)=>({id:'lesson-'+index,title:['Chào hỏi','Làm quen','Gia đình'][index],unit_title:'Khởi đầu',status,estimated_minutes:5,xp_reward:10}));}
      export const isLessonUnlocked=(rows,index)=>index===0 || rows[index-1]?.status==='COMPLETED';
      export async function listLessonActivities(){return [{id:'activity',activity_type:'VOCABULARY'}];}
      export async function recordLessonActivityEvidence(){window.qa.writes++;throw Error('No writes in visual QA');}`,
    '@/db/gamification': `export async function getGamificationSummary(){return {todayXp:35};}`,
  };
  const bundle = await build({
    stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'tsx', contents: `
      import {useState} from 'react'; import {flushSync} from 'react-dom'; import {createRoot} from 'react-dom/client';
      import {View,Text,Pressable} from 'react-native';
      import Home from './src/app/(tabs)/index'; import Result from './src/app/review/result'; import Deck from './src/app/decks/[id]'; import Onboarding from './src/app/onboarding';
      import Word from './src/app/word/[id]'; import Path from './src/app/path/[courseId]';
      import MemoryWords from './src/app/memory/words'; import MemoryStructure from './src/app/memory/structure'; import Mistakes from './src/app/mistakes';
      import {Screen} from './src/components/Screen'; import {HeaderShownContext} from 'expo-router/react-navigation';
      import {ToolHub} from './src/components/ToolHub'; import {practiceGroups,libraryGroups} from './src/services/app/tool-hubs';
      import {StudyTransition} from './src/components/ui/StudyTransition'; import {Disclosure} from './src/components/chinese/Disclosure'; import {AudioButton} from './src/components/AudioButton';
      import {LearningGuide} from './src/components/visual/LearningGuide';
      import {ThemeProvider,useTheme} from './src/theme/ThemeProvider'; import {useAppStore} from './src/stores/app-store';
      window.qa={screen:'guide',focus:true,params:{},writes:0,mode:motionMode=>useAppStore.setState({settings:{...useAppStore.getState().settings,motionMode}})};
      window.qa.dataState='ready';window.qa.mistakes=['HANZI','HANZI','LISTENING','GRAMMAR','SPEAKING','HANZI'].map((skill,i)=>({id:'mistake-'+i,vocabulary_id:i===3?null:'fixture',grammar_id:i===3?'grammar':null,skill_type:skill,exercise_type:i===5?'confusable_test':i===2?'audio_to_hanzi':'meaning_to_hanzi',wrong_count:4,correct_streak:1,last_wrong_at:'2026-10-20',resolved:0,title:['你好','好','听','语法','说','字'][i],pinyin:'nǐ hǎo',attempts_30d:8,errors_30d:4}));
      window.qa.theme=themeMode=>useAppStore.setState({settings:{...useAppStore.getState().settings,themeMode}});
      useAppStore.setState({settings:{motionMode:'full',themeMode:'light',selectedHskBands:['1'],dailyNewWordGoal:10,dailyStudyMinutes:30}});
      function MotionDemo(){const theme=useTheme();const [feedback,setFeedback]=useState({kind:'success',turn:0});window.qa.feedback=kind=>setFeedback(s=>({kind,turn:s.turn+1}));
        return <View style={{padding:24,gap:20,backgroundColor:theme.background,minHeight:'100vh'}}><Text style={{fontSize:25,fontWeight:'800',color:theme.textPrimary}}>Chuyển động khi học</Text>
          <StudyTransition testID="demo-feedback" turnKey={String(feedback.turn)} effect={feedback.kind} style={{padding:20,borderRadius:16,backgroundColor:feedback.kind==='success'?theme.successSoft:theme.errorSoft}}><Text style={{fontSize:20,color:theme.textPrimary}}>{feedback.kind==='success'?'✓ Chính xác!':'Chưa đúng, thử lại nhé.'}</Text></StudyTransition>
          <View style={{flexDirection:'row',gap:20}}>{['success','error'].map(kind=><Pressable key={kind} accessibilityRole="button" onPress={()=>window.qa.feedback(kind)} style={{padding:16,backgroundColor:theme.surface,borderRadius:16}}><Text>{kind==='success'?'Trả lời đúng':'Thử câu sai'}</Text></Pressable>)}</View>
          <Disclosure title="Gợi ý ghi nhớ"><Text style={{fontSize:18,color:theme.textPrimary}}>你好 · Xin chào. Học từng chút, nhớ lâu hơn.</Text></Disclosure><AudioButton text="你好"/>
        </View>;}
      function Harness(){const [s,set]=useState({screen:'guide',key:0});window.qa.show=(screen,params={},focus=true)=>flushSync(()=>{Object.assign(window.qa,{params,focus});set(s=>({screen,key:s.key+1}));});
        window.qa.setFocus=focus=>flushSync(()=>{window.qa.focus=focus;set(s=>({...s}));});
        return <ThemeProvider><View key={s.key} style={{minHeight:'100vh'}}>{s.screen==='home'?<Home/>:s.screen==='onboarding'?<Onboarding/>:s.screen==='result'?<Result/>:s.screen==='deck'?<Deck/>:s.screen==='word'?<Word/>:s.screen==='path'?<Path/>:s.screen==='memory'?<MemoryWords/>:s.screen==='structure'?<MemoryStructure/>:s.screen==='mistakes'?<Mistakes/>:s.screen==='header'?<HeaderShownContext.Provider value={window.qa.params.shown}><Screen title="Header check"><Text>Content</Text></Screen></HeaderShownContext.Provider>:s.screen==='companion'?<View style={{alignItems:'center',padding:24}}><LearningGuide interactive size={160} mood={window.qa.params.mood}/></View>:s.screen==='motion'?<MotionDemo/>:s.screen==='practice'||s.screen==='library'?<ToolHub title={s.screen==='practice'?'Luyện tập':'Thư viện'} subtitle="" groups={s.screen==='practice'?practiceGroups:libraryGroups}/>:<View style={{alignItems:'center',padding:24,gap:16}}><View testID="welcome"><LearningGuide size={160} active={window.qa.focus}/></View><View testID="complete"><LearningGuide mood="celebrate" size={196} active={window.qa.focus}/></View></View>}</View></ThemeProvider>;}
      const root=createRoot(document.getElementById('root'));window.qa.unmount=()=>root.unmount();root.render(<Harness/>);
    ` },
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: { 'react-native': 'react-native-web', 'react-native-svg': path.resolve(__dirname, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}', __DEV__: 'false', global: 'globalThis' },
    plugins: [{ name: 'fixture-only', setup(b) {
      b.onResolve({ filter: /.*/ }, args => Object.hasOwn(stubs, args.path) ? { path: args.path, namespace: 'fixture' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'tsx', resolveDir: path.resolve(__dirname, '..') }));
    } }],
  });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'application/javascript' : 'text/html; charset=utf-8');
    res.end(req.url === '/bundle.js' ? bundle.outputFiles[0].contents : '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.stack); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const welcomeBody = page.getByTestId('welcome').getByTestId('guide-body');
    const spark = page.getByTestId('celebration-spark-0');
    const translation = () => welcomeBody.evaluate(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).m42));
    const settled = async () => {
      await page.waitForFunction(() => {
        const bodies = [...document.querySelectorAll('[data-testid="guide-body"]')];
        const limbs = [...document.querySelectorAll('[data-testid="guide-wave"],[data-testid="guide-head"]')];
        return bodies.length > 0 && bodies.every(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).m42) < 0.001 && getComputedStyle(e).opacity === '1') && limbs.every(e => { const m=new DOMMatrix(getComputedStyle(e).transform); return Math.abs(m.b)<0.001 && Math.abs(m.m42)<0.001; });
      });
    };
    await page.waitForFunction(() => {
      const arm = document.querySelector('[data-testid="welcome"] [data-testid="guide-wave"]');
      return arm && Math.abs(new DOMMatrix(getComputedStyle(arm).transform).b) > 0.05;
    });
    assert.ok(await page.getByTestId('guide-artwork-learning').locator('svg').count() >= 5, 'Original artwork has independently rigged layers');
    assert.ok(await page.getByTestId('guide-artwork-celebration').locator('svg').count() >= 5);
    const rigFrames = await page.getByTestId('welcome').evaluate(root => new Promise((resolve,reject) => {
      const frames=[], start=performance.now(); const sample=()=>{
        try {
        const matrix=id=>{const element=root.querySelector('[data-testid="'+id+'"]');if(!element)throw Error('Missing rig layer: '+id+'; '+root.innerHTML.slice(0,500));return new DOMMatrix(getComputedStyle(element).transform);};
        frames.push({arm:matrix('guide-wave').b,head:matrix('guide-head').b,eyes:matrix('guide-eyes').d});
        if(performance.now()-start<1700)requestAnimationFrame(sample);else resolve(frames);
        }catch(error){reject(error);}
      };requestAnimationFrame(sample);
    }));
    assert.ok(rigFrames.some(f=>Math.abs(f.arm)>0.05),'Arm actually waves');
    assert.ok(rigFrames.some(f=>Math.abs(f.head)>0.01),'Head moves independently');
    assert.ok(rigFrames.some(f=>f.eyes<0.5),'Eyes actually blink');
    await page.evaluate(()=>window.qa.show('guide'));
    await spark.waitFor(); await page.waitForTimeout(100);
    assert.ok(Number(await spark.evaluate(e => getComputedStyle(e).opacity)) > 0, 'Fireworks should be visible');
    if (output) await page.screenshot({ path: path.join(output, 'celebration-in-motion.png') });
    await page.waitForTimeout(1700); await settled();
    assert.equal(Number(await spark.evaluate(e => getComputedStyle(e).opacity)), 0);
    await page.waitForTimeout(200); assert.ok(await translation() < 0.001, 'Illustration must not loop');
    for (const mode of ['reduced', 'off']) {
      await page.evaluate(mode => window.qa.mode(mode), mode);
      await page.evaluate(() => window.qa.show('guide')); await page.waitForTimeout(100); await settled();
      assert.equal(await page.locator('[data-testid^="celebration-spark-"]').count(), 0);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.evaluate(() => window.qa.mode('full'));
    await page.evaluate(() => window.qa.show('guide')); await page.waitForTimeout(150); await settled();
    assert.equal(await page.locator('[data-testid^="celebration-spark-"]').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => window.qa.show('guide', {}, false)); await page.waitForTimeout(150); await settled();
    assert.ok(await translation() < 0.001, 'Hidden screen must stay still');
    await page.evaluate(() => window.qa.show('guide')); await page.waitForTimeout(120);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(50); await settled();
    assert.equal(Number(await spark.evaluate(e => getComputedStyle(e).opacity)), 0);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(200); await settled();
    assert.equal(Number(await spark.evaluate(e => getComputedStyle(e).opacity)), 0, 'Foreground must not restart confetti');
    for (const [screen, params] of [['home', {}], ['onboarding', {}], ['result', {mode:'learn',correct:'3',known:'1',skipped:'0'}], ['deck', {id:'fixture',celebrate:'learn'}]]) {
      await page.evaluate(([screen, params]) => window.qa.show(screen, params), [screen, params]);
      await page.waitForTimeout(1800);
      if (screen === 'deck') {
        assert.equal(await page.evaluate(() => window.qa.params.celebrate), undefined, 'Consume presentation event');
        await page.getByRole('button', { name: 'Đóng lời chúc mừng' }).click();
        assert.equal(await page.getByText('Hoàn thành buổi học!', { exact:true }).count(), 0);
        await page.evaluate(() => window.qa.show('deck', {id:'fixture',celebrate:'learn'})); await page.waitForTimeout(1800);
      }
      for (const [width, theme] of [[320,'light'],[390,'light'],[430,'dark']]) {
        await page.setViewportSize({width,height:844});
        // Changing only the in-memory UI store never persists a user preference.
        await page.evaluate(theme => window.qa.theme(theme), theme);
        await page.evaluate(() => window.qa.mode('off'));
        await page.waitForTimeout(50);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen} overflow at ${width}`);
        if (output) await page.screenshot({ path: path.join(output, `${screen}-${width}-${theme}.png`), fullPage:true });
      }
      await page.setViewportSize({width:320,height:844}); await page.evaluate(() => window.qa.theme('light'));
      await page.waitForTimeout(50);
      // Approximate 150% text on web; Android font-scale still needs native verification.
      await page.evaluate(() => {
        const text = [...document.querySelectorAll('[dir="auto"]')].map(e => [e, getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight]);
        for (const [e, size, line] of text) { e.style.fontSize = parseFloat(size) * 1.5 + 'px'; if (line !== 'normal') e.style.lineHeight = parseFloat(line) * 1.5 + 'px'; }
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen} overflow at 150% text`);
      if (output) await page.screenshot({ path: path.join(output, `${screen}-320-text150.png`), fullPage:true });
    }
    await page.evaluate(() => { window.qa.mode('full'); window.qa.show('result', {correct:'8',wrong:'2',total:'10',up:'5',same:'3',down:'2',elapsedSeconds:'75'}); });
    await page.getByText('80%', {exact:true}).waitFor();
    await page.waitForTimeout(200);
    assert.equal(Number(await spark.evaluate(e=>getComputedStyle(e).opacity)),0,'Opening results does not imply a new completion event');
    await page.getByRole('button',{name:'Chạm để ăn mừng hoàn thành',exact:true}).click();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="celebration-spark-0"]')).opacity)>0);
    assert.equal(await page.getByRole('button',{name:'Về trang chủ',exact:true}).isEnabled(),true,'Completion never locks the CTA');
    await page.evaluate(()=>window.qa.setFocus(false));await page.evaluate(()=>window.qa.setFocus(true));
    await page.waitForTimeout(180);assert.equal(Number(await spark.evaluate(e=>getComputedStyle(e).opacity)),0,'Result focus does not replay celebration');
    await page.getByTestId('review-level-change-up').click();
    await page.getByTestId('review-level-change-up-list').waitFor();
    assert.equal(await page.getByText('Đã ôn xong!', {exact:true}).count(), 1);
    if (output) await page.screenshot({ path:path.join(output,'review-result-expanded.png'),fullPage:true });
    await page.evaluate(() => { window.qa.mode('full'); window.qa.show('motion'); });
    const feedback = page.getByTestId('demo-feedback');
    const matrix = () => feedback.evaluate(e => { const m=new DOMMatrix(getComputedStyle(e).transform);return {scale:m.a,x:m.m41}; });
    const samples = kind => page.evaluate(kind => new Promise(resolve => {
      window.qa.feedback(kind); const frames=[];const start=performance.now();
      const sample=()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="demo-feedback"]')).transform);frames.push({scale:m.a,x:m.m41});if(performance.now()-start<500)requestAnimationFrame(sample);else resolve(frames);};
      requestAnimationFrame(sample);
    }),kind);
    const successFrames=await samples('success');
    assert.ok(successFrames.some(m=>Math.abs(m.scale-1)>0.005),'Success visibly pops');
    assert.ok(Math.abs(successFrames.at(-1).scale-1)<0.001);
    const errorFrames=await samples('error');
    assert.ok(errorFrames.some(m=>Math.abs(m.x)>0.1),'Error gently shakes');
    assert.ok(Math.abs(errorFrames.at(-1).x)<0.001);
    const stampFrames=await samples('stamp');
    assert.ok(stampFrames.some(m=>m.scale>1.01),'Answer stamp visibly overshoots');
    assert.ok(Math.abs(stampFrames.at(-1).scale-1)<0.001,'Answer stamp settles');
    const disclosure = page.getByRole('button', {name:'Gợi ý ghi nhớ',exact:true});
    await disclosure.click(); assert.equal(await disclosure.getAttribute('aria-expanded'),'true');
    await page.waitForTimeout(210);
    assert.ok(await page.getByTestId('disclosure-chevron').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).a)<-0.99);
    for(let i=0;i<6;i++) await disclosure.click();
    await disclosure.click(); assert.equal(await disclosure.getAttribute('aria-expanded'),'false');
    await page.getByText('你好 · Xin chào. Học từng chút, nhớ lâu hơn.',{exact:true}).waitFor({state:'detached'});
    assert.equal(await page.getByText('你好 · Xin chào. Học từng chút, nhớ lâu hơn.',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Nghe phát âm 你好 bằng giọng đọc máy',exact:true}).click();
    const ring = page.getByTestId('audio-playback-bars'); await ring.waitFor();
    const firstScale = await ring.locator(':scope > div').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).d);
    await page.waitForTimeout(250);
    assert.notEqual(await ring.locator(':scope > div').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).d),firstScale);
    await page.getByRole('button',{name:'Dừng phát âm 你好',exact:true}).click(); assert.equal(await ring.count(),0);
    for(const mode of ['reduced','off']){
      await page.evaluate(mode=>window.qa.mode(mode),mode); await page.waitForTimeout(30);
      await page.evaluate(()=>window.qa.feedback('error')); await page.waitForTimeout(50);
      assert.ok(Math.abs((await matrix()).x)<0.001);
    }
    for(const screen of ['practice','library','path','word']){
      await page.evaluate(screen=>window.qa.show(screen,{id:'fixture',courseId:'fixture'}),screen);await page.waitForTimeout(400);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), screen+' overflow');
      if(screen==='practice'||screen==='library'){
        assert.ok(await page.getByTestId('guide-artwork-'+(screen==='library'?'reading':'learning')).locator('svg').count()>=5);
        assert.equal(await page.getByRole('button',{name:'Chạm chào bạn đồng hành',exact:true}).count(),0,'Hubs use contextual static art');
        await settled();
      }
      if(output)await page.screenshot({path:path.join(output,screen+'-320-light.png'),fullPage:true});
      if(screen==='path'){
        await page.getByRole('button',{name:'Làm quen. Đang học',exact:true}).click();
        await page.getByRole('button',{name:'Bắt đầu bài học',exact:true}).waitFor();
        if(output)await page.screenshot({path:path.join(output,'path-sheet.png'),fullPage:true});
        await page.getByRole('button',{name:'Đóng',exact:true}).click();
      }
      if(screen==='word'){
        await page.evaluate(()=>window.qa.mode('full'));
        const recall=page.getByTestId('word-recall-card');
        await recall.getByTestId('word-recall-front').waitFor();
        const drag=recall.getByTestId('word-recall-drag');
        const swipe=async (distance,midway) => {
          const box=await drag.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
          await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+distance,y,{steps:12});
          if(midway)await midway();await page.mouse.up();await page.waitForTimeout(420);
        };
        await swipe(35,async()=>assert.ok(Math.abs(await drag.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41))>2,'Card follows horizontal drag'));
        await recall.getByTestId('word-recall-front').waitFor();
        await swipe(110);await recall.getByTestId('word-recall-back').waitFor();
        await swipe(-110);await recall.getByTestId('word-recall-front').waitFor();
        await swipe(110,async()=>{await page.evaluate(()=>window.qa.setFocus(false));});
        await page.evaluate(()=>window.qa.setFocus(true));await recall.getByTestId('word-recall-front').waitFor();
        for(const mode of ['reduced','off']){
          await page.evaluate(mode=>window.qa.mode(mode),mode);
          await swipe(110,async()=>assert.equal(await drag.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41),0));await recall.getByTestId('word-recall-back').waitFor();
          await swipe(-110);await recall.getByTestId('word-recall-front').waitFor();
        }
        await page.evaluate(()=>window.qa.mode('full'));
        if(output)await recall.screenshot({path:path.join(output,'word-flashcard-front.png')});
        await recall.getByRole('button',{name:'Lật thẻ xem nghĩa',exact:true}).click();
        await recall.getByTestId('word-recall-back').waitFor();
        assert.ok((await recall.getByTestId('word-recall-back').innerText()).includes('Xin chào'));
        assert.equal(await recall.getByTestId('word-recall-front').count(),0,'Only the visible face is mounted');
        await page.waitForTimeout(350);
        if(output)await recall.screenshot({path:path.join(output,'word-flashcard-back.png')});
        const flip=recall.getByRole('button',{name:'Lật thẻ xem chữ Hán',exact:true});await flip.focus();await flip.press('Enter');
        await recall.getByTestId('word-recall-front').waitFor();
        await recall.getByRole('button',{name:'Nghe phát âm 你好 bằng giọng đọc máy',exact:true}).click();
        await recall.getByRole('button',{name:'Dừng phát âm 你好',exact:true}).click();
        const speaker=recall.getByRole('button',{name:'Nghe phát âm 你好 bằng giọng đọc máy',exact:true});
        const speakerBox=await speaker.boundingBox(),calls=await page.evaluate(()=>window.qa.speechCalls);
        await page.mouse.move(speakerBox.x+25,speakerBox.y+25);await page.mouse.down();await page.waitForTimeout(500);
        await recall.getByTestId('audio-slow-badge').waitFor();assert.equal(await page.evaluate(()=>window.qa.speech.rate),0.6);
        await page.mouse.up();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.qa.speechCalls),calls+1,'Long press plays once, release does not restart');
        assert.equal(await recall.getByTestId('word-recall-front').count(),1,'Long press audio does not flip card');
        if(output)await recall.screenshot({path:path.join(output,'word-audio-slow.png')});
        await recall.getByRole('button',{name:'Dừng phát âm 你好',exact:true}).click();
        await recall.getByRole('button',{name:'Lật thẻ xem nghĩa',exact:true}).click();
        await page.evaluate(()=>window.qa.setFocus(false));
        await recall.getByTestId('word-recall-back').waitFor();
        assert.ok(await recall.getByTestId('word-recall-flip').evaluate(e=>Math.abs(new DOMMatrix(getComputedStyle(e).transform).m11+1)<0.001),'Recall card settles to requested face on blur');
        await page.evaluate(()=>window.qa.setFocus(true));
        await recall.getByRole('button',{name:'Lật thẻ xem chữ Hán',exact:true}).click();await recall.getByTestId('word-recall-front').waitFor();
        for(const mode of ['reduced','off']){
          await page.evaluate(mode=>window.qa.mode(mode),mode);
          await recall.getByRole('button',{name:'Lật thẻ xem nghĩa',exact:true}).click();await recall.getByTestId('word-recall-back').waitFor();
          await recall.getByRole('button',{name:'Lật thẻ xem chữ Hán',exact:true}).click();await recall.getByTestId('word-recall-front').waitFor();
        }
        await page.evaluate(()=>window.qa.mode('full'));
        const tab = page.getByRole('tab',{name:'Ghi chú',exact:true});
        const tabFrames = await tab.evaluate(async element => {
          element.click(); const frames=[],until=performance.now()+650;
          while(performance.now()<until){await new Promise(requestAnimationFrame);const e=document.querySelector('[data-testid="word-tab-indicator"]');const m=new DOMMatrix(getComputedStyle(e).transform);frames.push({x:m.m41,scale:m.m11});}
          return frames;
        });
        const finalTabX=tabFrames.at(-1).x;
        assert.ok(finalTabX>0 && tabFrames.some(f=>f.x>1 && f.x<finalTabX-1),'One tab indicator travels through intermediate positions');
        assert.ok(tabFrames.some(f=>f.scale>1.02),'Tab indicator stretches while travelling');
        await page.evaluate(()=>window.qa.setFocus(false));await page.evaluate(()=>window.qa.setFocus(true));
        assert.ok(Math.abs(await page.getByTestId('word-tab-indicator').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41)-finalTabX)<1,'Focus does not replay tab movement');
        if(output)fs.writeFileSync(path.join(output,'tab-motion-frames.json'),JSON.stringify(tabFrames));
        const input = page.getByPlaceholder('Mẹo nhớ, ngữ cảnh sử dụng...'); await input.fill('Ghi chú chưa lưu');
        await page.waitForTimeout(310); assert.equal(await input.inputValue(),'Ghi chú chưa lưu');
        await page.evaluate(()=>window.qa.failNoteSave=true);await page.getByRole('button',{name:'Lưu ghi chú',exact:true}).click();
        const saved=page.getByTestId('word-save-feedback');await saved.filter({hasText:'Chưa lưu được.'}).waitFor();
        assert.equal(await saved.getByTestId('answer-correct-mark').count(),0,'Failed save never shows success');
        assert.equal(await input.inputValue(),'Ghi chú chưa lưu');
        await page.evaluate(()=>window.qa.failNoteSave=false);await page.getByRole('button',{name:'Lưu ghi chú',exact:true}).click();
        await saved.filter({hasText:'Đã lưu ghi chú.'}).waitFor();assert.equal(await saved.getByTestId('answer-correct-mark').count(),1);
        assert.deepEqual(await page.evaluate(()=>window.qa.savedNote),{id:'fixture',text:'Ghi chú chưa lưu'});
        assert.equal(await tab.getAttribute('aria-selected'),'true');
        for(const mode of ['reduced','off']){
          await page.evaluate(mode=>window.qa.mode(mode),mode);
          await page.getByRole('tab',{name:'Tổng quan',exact:true}).click();await tab.click();
          assert.ok(Math.abs(await page.getByTestId('word-tab-indicator').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41)-finalTabX)<1,'Reduced/off tabs select immediately');
          assert.equal(await input.inputValue(),'Ghi chú chưa lưu','Tab motion never discards note state');
        }
        await page.evaluate(()=>window.qa.mode('full'));
        for(const label of ['Tổng quan','Ví dụ','Ghi chú'])await page.getByRole('tab',{name:label,exact:true}).click();
        await page.waitForTimeout(360);
        for(const width of [320,360,390,430]){
          await page.setViewportSize({width,height:844});await page.waitForTimeout(50);
          const pill=await page.getByTestId('word-tab-indicator').boundingBox(),target=await tab.boundingBox();
          assert.ok(Math.abs(pill.x-target.x)<1 && Math.abs(pill.width-target.width)<1,'Tab indicator follows resized layout');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
          if(output)await page.getByTestId('word-tab-indicator').locator('..').screenshot({path:path.join(output,'word-tabs-'+width+'.png')});
        }
        await page.setViewportSize({width:320,height:844});
        if(output)await page.screenshot({path:path.join(output,'word-notes-unsaved.png'),fullPage:true});
        for(const name of ['Tổng quan','Cách viết','Ví dụ','Ghi chú']) await page.getByRole('tab',{name,exact:true}).click();
        await page.waitForTimeout(310); assert.equal(await input.inputValue(),'Ghi chú chưa lưu');
      }
    }
    await page.evaluate(()=>{window.qa.mode('full');window.qa.show('companion');});
    const companion=page.getByRole('button',{name:'Chạm chào bạn đồng hành',exact:true});
    await page.getByText('Chạm để chào',{exact:true}).waitFor();
    await companion.click(); await page.getByText('你好! Cùng học nhé.',{exact:true}).waitFor();
    const greetingFrames=await page.evaluate(()=>new Promise(resolve=>{
      document.querySelector('[aria-label="Chạm chào bạn đồng hành"]').click();
      const frames=[];const start=performance.now();const sample=()=>{
        frames.push(new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="guide-head"]')).transform).m42);
        if(performance.now()-start<1050)requestAnimationFrame(sample);else resolve(frames);
      };requestAnimationFrame(sample);
    }));
    assert.ok(greetingFrames.some(y=>y > 0.1),'Second greeting nods the head');
    assert.ok(Math.abs(greetingFrames.at(-1))<0.001,'Greeting settles');
    await page.evaluate(()=>window.qa.setFocus(false));await page.evaluate(()=>window.qa.setFocus(true));
    await page.waitForTimeout(180);
    assert.ok(Math.abs(await page.getByTestId('guide-head').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42))<0.001,'Focus does not replay the prior nod');
    assert.equal(await page.locator('[data-testid^="celebration-spark-"]').count(),0,'Greeting does not trigger completion fireworks');
    if(output)await page.screenshot({path:path.join(output,'companion-interactive.png')});
    await companion.click();await page.getByText('加油! Đập tay nào!',{exact:true}).waitFor();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="guide-highfive"]')).opacity)>0.1);
    if(output)await page.screenshot({path:path.join(output,'companion-highfive.png')});
    for(let i=0;i<9;i++)await companion.click();
    await page.getByText('加油! Đập tay nào!',{exact:true}).waitFor();
    await page.waitForTimeout(1700); await settled();
    assert.equal(await page.locator('[data-testid^="celebration-spark-"]').count(),0,'Rapid greeting taps remain a greeting');
    await page.evaluate(()=>window.qa.show('companion',{mood:'reading'}));
    assert.ok(await page.getByTestId('guide-artwork-reading').locator('svg').count()>=5);
    await page.waitForTimeout(600); await settled();
    await page.evaluate(()=>window.qa.show('companion',{mood:'celebrate'}));
    const celebrate=page.getByRole('button',{name:'Chạm để ăn mừng hoàn thành',exact:true});
    await celebrate.click();await page.getByText('Bạn làm tốt lắm!',{exact:true}).waitFor();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="celebration-spark-0"]')).opacity)>0);
    if(output)await page.screenshot({path:path.join(output,'completion-interactive.png')});
    for(let i=0;i<9;i++)await celebrate.click();
    await page.waitForTimeout(1700);await settled();
    assert.equal(Number(await spark.evaluate(e=>getComputedStyle(e).opacity)),0,'Repeated completion taps finish one celebration');
    for(const mode of ['reduced','off']){
      await page.evaluate(mode=>{window.qa.mode(mode);window.qa.show('companion',{mood:'celebrate'});},mode);
      await celebrate.click();await celebrate.click();await page.waitForTimeout(100);
      assert.equal(await page.locator('[data-testid^="celebration-spark-"]').count(),0);
      assert.ok(Math.abs(await page.getByTestId('guide-body').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42))<0.001);
    }
    await page.evaluate(()=>window.qa.show('companion',{},false));assert.ok(await companion.isDisabled());
    for(const shown of [false,true]){
      await page.evaluate(shown=>window.qa.show('header',{shown}),shown);
      assert.equal(await page.getByTestId('safe-area').getAttribute('data-edges'),shown?'':'top','Apply top safe inset exactly once');
    }
    for(const mode of ['weak','old','structure']){
      await page.evaluate(mode=>window.qa.show('memory',{mode,size:'7'}),mode);
      const details=page.getByRole('button',{name:'Chi tiết 你好',exact:true});await details.waitFor();
      assert.deepEqual(await page.evaluate(()=>window.qa.memoryRead),{scope:mode==='structure'?'all':mode,limit:50});
      assert.equal(await page.getByText('Sai 4 · quên lại 2 lần · Nhận diện mặt chữ',{exact:true}).count(),0);
      await details.click();assert.equal(await details.getAttribute('aria-expanded'),'true');
      await page.getByText(/Sai 4 · quên lại 2 lần/).waitFor();
      await details.click();assert.equal(await details.getAttribute('aria-expanded'),'false');
      await page.getByRole('button',{name:mode==='structure'?'Xem cấu tạo 你好. Xin chào':'Củng cố 你好. Xin chào',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>window.qa.navigation),{pathname:mode==='structure'?'/memory/structure':'/memory/session',params:{id:'fixture',mode:'weak',assisted:'1'}});
      if(mode!=='structure'){
        await page.getByRole('button',{name:'Bắt đầu luyện',exact:true}).click();
        assert.equal(await page.evaluate(()=>window.qa.navigation),'/memory/session?mode='+mode+'&size=7');
      }
      assert.equal(await page.getByTestId('safe-area').getAttribute('data-edges'),'bottom');
    }
    await page.evaluate(()=>window.qa.show('structure',{id:'fixture'}));
    const mnemonic=page.getByRole('textbox',{name:'Câu chuyện ghi nhớ cá nhân',exact:true});await mnemonic.fill('Liên tưởng chưa lưu');
    for(const name of ['Ngữ cảnh & ví dụ','Nguồn & lưu ý']){
      const toggle=page.getByRole('button',{name,exact:true});await toggle.click();await toggle.click();
      assert.equal(await mnemonic.inputValue(),'Liên tưởng chưa lưu','Disclosure must preserve unsaved mnemonic');
    }
    await page.evaluate(()=>window.qa.show('mistakes'));await page.getByText('Mục cần củng cố · 6',{exact:true}).waitFor();
    const tabs=await page.getByRole('tab').all();const tops=await Promise.all(tabs.map(tab=>tab.boundingBox()));
    assert.ok(tops.every(box=>Math.abs(box.y-tops[0].y)<1),'Mistake filters stay in one horizontal row');
    await page.getByRole('button',{name:'Gợi ý luyện · 3 nhóm',exact:true}).click();
    const suggestion=page.getByRole('button',{name:'Chi tiết gợi ý',exact:true}).first();await suggestion.click();await page.getByText(/Có bằng chứng gần đây: 8\/16/).waitFor();await suggestion.click();
    await page.getByRole('button',{name:'Luyện 2 mục',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.qa.navigation),'/mistakes/practice?id=mistake-0&queue=mistake-0%7Cmistake-1');
    for(const [title,destination] of [['你好','/mistakes/practice?id=mistake-0'],['语法','/grammar/grammar'],['说','/word/fixture'],['字','/confusables/test']]){
      await page.getByRole('button',{name:`Luyện lại ${title}. Sai 4 lần. Đúng liên tiếp 1 trên 3.`,exact:true}).click();
      assert.equal(await page.evaluate(()=>window.qa.navigation),destination);
    }
    await page.getByRole('tab',{name:'Nghĩa · 0',exact:true}).click();await page.getByText('Chưa có lỗi thuộc nhóm Nghĩa',{exact:true}).waitFor();
    for(const screen of ['memory','mistakes']){
      await page.evaluate(screen=>{window.qa.dataState='empty';window.qa.show(screen);},screen);
      await page.getByText(screen==='memory'?'Chưa có từ phù hợp':'Chưa có lỗi cần củng cố',{exact:true}).waitFor();
      await page.evaluate(screen=>{window.qa.dataState='error';window.qa.show(screen);},screen);
      const retry=page.getByRole('button',{name:'Thử lại',exact:true});await retry.waitFor();
      await page.evaluate(()=>{window.qa.dataState='ready';});await retry.click();
      await (screen==='memory'?page.getByRole('button',{name:'Chi tiết 你好',exact:true}):page.getByText('Mục cần củng cố · 6',{exact:true})).waitFor();
    }
    for(const [screen,params] of [['memory',{mode:'weak'}],['memory',{mode:'old'}],['memory',{mode:'structure'}],['structure',{id:'fixture'}],['mistakes',{}]]){
      await page.evaluate(([screen,params])=>window.qa.show(screen,params),[screen,params]);await page.waitForTimeout(150);
      for(const [width,theme] of [[320,'light'],[390,'light'],[430,'dark']]){
        await page.setViewportSize({width,height:844});await page.evaluate(theme=>window.qa.theme(theme),theme);await page.waitForTimeout(30);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' overflow at '+width);
        if(output)await page.screenshot({path:path.join(output,`${screen}-${params.mode||'detail'}-${width}-${theme}.png`),fullPage:true});
      }
      await page.setViewportSize({width:320,height:844});await page.evaluate(()=>window.qa.theme('light'));await page.waitForTimeout(30);
      await page.evaluate(()=>{const text=[...document.querySelectorAll('[dir="auto"]')].map(e=>[e,getComputedStyle(e).fontSize,getComputedStyle(e).lineHeight]);for(const [e,size,line] of text){e.style.fontSize=parseFloat(size)*1.5+'px';if(line!=='normal')e.style.lineHeight=parseFloat(line)*1.5+'px';}});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),screen+' overflow with 150% text');
      if(output)await page.screenshot({path:path.join(output,`${screen}-${params.mode||'detail'}-320-text150.png`),fullPage:true});
    }
    assert.equal(await page.evaluate(()=>window.qa.writes),0,'Visual interactions must never save learning data');
    if(output){
      await page.evaluate(()=>{window.qa.mode('full');window.qa.show('guide');});
      for(let i=0;i<18;i++){await page.screenshot({path:path.join(output,'illustration-frame-'+String(i).padStart(2,'0')+'.png')});await page.waitForTimeout(60);}
      await page.evaluate(()=>window.qa.show('motion'));await page.waitForTimeout(30);
      await page.getByRole('button',{name:'Nghe phát âm 你好 bằng giọng đọc máy',exact:true}).click();
      for(let i=0;i<24;i++){
        if(i===0||i===6)await page.evaluate(kind=>window.qa.feedback(kind),i===0?'success':'error');
        if(i===12||i===18)await page.getByRole('button',{name:'Gợi ý ghi nhớ',exact:true}).click();
        await page.screenshot({path:path.join(output,'interaction-frame-'+String(i).padStart(2,'0')+'.png')});await page.waitForTimeout(60);
      }
    }
    await page.evaluate(() => window.qa.show('guide')); await page.evaluate(() => window.qa.mode('full'));
    await page.waitForTimeout(100); await page.evaluate(() => window.qa.unmount()); await page.waitForTimeout(1700);
    assert.deepEqual(errors, []);
    console.log('PASS: original rigged character with measured arm/head/blink, wave/nod/high-five taps; real word recall card flip/audio/keyboard/reduced/off; finite completion-only fireworks/replay; reduced/off/OS, focus/background/no foreground replay/cleanup; onboarding, results, success/error feedback, rapid taps, playback, static hubs/path/word tabs, compact memory/mistake screens, unchanged read scopes and navigation queues, details/retry/empty states, unsaved notes, top inset ownership, zero fixture writes, 320/390/430 layouts and simulated 150% text. WEB ONLY; fixture reads, icon/stroke/knowledge stubs and synthetic speech callbacks.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
