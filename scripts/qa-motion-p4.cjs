/* Real RN-web screens/components; DB, recognition and speech boundaries are fixtures. No learner files or phone. */
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
    'expo-router': `import {useEffect} from 'react';export const router={push(p){window.qa.navigation=p},replace(p){window.qa.navigation=p},back(){}};export const useLocalSearchParams=()=>window.qa.params;export const useIsFocused=()=>window.qa.focused;export const useFocusEffect=callback=>{const focused=window.qa.focused;useEffect(()=>focused?callback():undefined,[callback,focused]);};`,
    'expo-router/react-navigation': `import {createContext} from 'react';export const HeaderShownContext=createContext(false);`,
    'expo-sqlite': `export const useSQLiteContext=()=>window.qa.db;`,
    'expo-image': `export {Image} from 'react-native';`,
    'react-native-safe-area-context': `export {View as SafeAreaView} from 'react-native';`,
    '@expo/vector-icons': `import {Text} from 'react-native';export const Ionicons=({name,size,color})=><Text style={{fontSize:size,color}}>{name.includes('check')?'✓':name.includes('volume')?'♪':'◇'}</Text>;`,
    '@/hooks/use-study-session': `export const useStudySession=()=>()=>window.qa.completed++;`,
    '@/hooks/use-new-word-audio': `export function useNewWordAudio(){}`,
    '@/components/StudySettingsSheet': `export const StudySettingsSheet=()=>null;`,
    '@/components/PersonalContextCard': `export const PersonalContextCard=()=>null;`,
    '@/components/SpeechPinyinButton': `export const SpeechPinyinButton=()=>null;`,
    '@/components/HanziHandwritingPad': `import {TextInput} from 'react-native';export const HanziHandwritingPad=({onSelect})=><TextInput accessibilityLabel="Fixture handwriting candidate" onChangeText={onSelect}/>;`,
    '@/components/LocalVoiceRecorder': `import {Text} from 'react-native';export const LocalVoiceRecorder=()=><Text>Fixture: không ghi âm</Text>;`,
    '@/services/feedback/feedback-service': `export async function playFeedback(){};export async function playHaptic(){}`,
    '@/services/audio/chinese-speech': `export async function speakChinese(text,options){window.qa.speechCalls++;window.qa.speech={text,options};if(window.qa.speechFailure)return {ok:false,reason:'missing-mandarin-voice'};options?.onStart?.();return {ok:true};}export async function stopChineseSpeech(){window.qa.speech?.options?.onStopped?.();}`,
    '@/services/pinyin-ime/candidateSearch': `export async function searchHanziCandidates(){return window.qa.words.map((word,i)=>({word,candidateRank:i+1}));}`,
    '@/db/database': `export const getOfflineVocabulary=()=>window.qa.words;`,
    '@/db/vocabulary-context': `export const contextCloze=()=>null;export async function listVocabularyContexts(){return [];}`,
    '@/db/learning-path': `export async function recordLessonActivityEvidence(){window.qa.unexpectedWrites++;throw Error('Not expected in fixture');}`,
    '@/db/repository': `export async function getSettings(){return window.qa.settings;}export async function getProgress(){return {vocabularyId:'hao',memoryLevel:1,status:'LEARNING',studied:true,stability:1,difficulty:5,elapsedDays:1,scheduledDays:1,learningSteps:0,reps:1,lapses:0,state:2,lastReview:null,masteryLevel:1,isKnown:false,isFavorite:false,isSuspended:false};}export async function completeInitialLearning(){window.qa.learnAttempts++;if(window.qa.failSave)throw Error('fixture save');window.qa.learnSaved++;}export async function reviewWord(){window.qa.reviewAttempts++;if(window.qa.failSave)throw Error('fixture save');window.qa.reviewSaved++;return {direction:'up',levelBefore:1,memoryLevel:2,nextReviewAt:'2026-10-25T12:00:00Z'};}export async function markVocabularyNeedsReinforcement(){window.qa.reinforced++;}export async function setKnown(){window.qa.unexpectedWrites++;throw Error('No writes');}export const setSkipped=setKnown;export const saveSettings=setKnown;`,
    '@/db/speaking': `export async function listToneWords(){return window.qa.toneWords;}export async function saveSpeakingPractice(){window.qa.toneAttempts++;if(window.qa.failSave)throw Error('fixture save');window.qa.toneSaved++;}`,
  };
  const bundle = await build({
    stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'tsx', contents: `
      import {useState} from 'react';import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';import {View} from 'react-native';
      import {ThemeProvider,useTheme} from './src/theme/ThemeProvider';import {useAppStore} from './src/stores/app-store';
      import Learn from './src/app/learn/session';import Review from './src/app/review/session';import Tones from './src/app/speaking/tones';
      import {StrokeWriter} from './src/components/StrokeWriter';import {ShadowingPlayer} from './src/components/ShadowingPlayer';
      const word=(id,simplified,pinyin,pinyinNumeric,meaning)=>({id,simplified,traditional:simplified,pinyin,pinyinNumeric,primaryMeaningVi:meaning,meaningsVi:[meaning],meaningsEn:[],pos:['tính từ'],hskBand:1,examples:[],frequencyRank:1,source:'fixture'});
      const words=[word('hao','好','hǎo','hao3','tốt'),word('da','大','dà','da4','to'),word('xiao','小','xiǎo','xiao3','nhỏ'),word('ren','人','rén','ren2','người')];
      const toneWords=[['妈','mā','ma1','mẹ'],['麻','má','ma2','cây gai'],['马','mǎ','ma3','ngựa'],['骂','mà','ma4','mắng'],['吗','ma','ma5','trợ từ nghi vấn'],['中国','zhōng guó','zhong1 guo2','Trung Quốc']].map(([hanzi,pinyin,numeric,meaning])=>({id:hanzi,hanzi,pinyin,numeric,meaning}));
      const sentences=[{id:'one',hanzi:'你好。',pinyin:'nǐ hǎo',translation_vi:'Xin chào.'},{id:'two',hanzi:'谢谢。',pinyin:'xiè xie',translation_vi:'Cảm ơn.'}];
      window.qa={params:{},focused:true,words,toneWords,settings:{motionMode:'full',themeMode:'light',soundEnabled:false,autoPlayAudio:false,hapticEnabled:false,speechRate:0.82,simplifiedOrTraditional:'simplified',reviewStyle:'automatic',pinyinVisibility:true,toneColorEnabled:false},
        db:{getAllAsync:async()=>words,runAsync:async()=>{window.qa.unexpectedWrites++;throw Error('No DB writes');}},completed:0,learnAttempts:0,learnSaved:0,reviewAttempts:0,reviewSaved:0,reinforced:0,toneAttempts:0,toneSaved:0,unexpectedWrites:0,speechCalls:0,failSave:false,
        setting:patch=>flushSync(()=>{Object.assign(window.qa.settings,patch);useAppStore.getState().setSettings({...window.qa.settings});})};
      useAppStore.setState({settings:window.qa.settings});
      function Surface({children}){const theme=useTheme();return <View style={{padding:16,minHeight:'100vh',backgroundColor:theme.background}}>{children}</View>;}
      function Harness(){const [s,set]=useState({screen:'stroke',character:'好',key:0,tick:0});
        window.qa.show=(screen,params={})=>flushSync(()=>{window.qa.params=params;useAppStore.setState({learnQueue:[{...words[0],...params.word}],reviewQueue:[{...words[0],...params.word}]});set(s=>({...s,screen,key:s.key+1}));});
        window.qa.character=character=>flushSync(()=>set(s=>({...s,character})));window.qa.focus=value=>flushSync(()=>{window.qa.focused=value;set(s=>({...s,tick:s.tick+1}));});window.qa.render=()=>flushSync(()=>set(s=>({...s,tick:s.tick+1})));
        return <ThemeProvider><Surface key={s.key}>{s.screen==='learn'?<Learn/>:s.screen==='review'?<Review/>:s.screen==='tones'?<Tones/>:s.screen==='shadow'?<ShadowingPlayer sentences={sentences} onPracticed={async()=>{window.qa.unexpectedWrites++;throw Error('No save requested');}}/>:<StrokeWriter character={s.character}/>}</Surface></ThemeProvider>;}
      const root=createRoot(document.getElementById('root'));window.qa.unmount=()=>root.unmount();root.render(<Harness/>);
    ` }, bundle: true, write: false, format: 'iife', jsx: 'automatic',
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: { 'react-native': 'react-native-web', 'react-native-svg': path.resolve(__dirname, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}', __DEV__: 'false', global: 'globalThis' },
    plugins: [{ name: 'fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, args => Object.hasOwn(stubs,args.path) ? {path:args.path,namespace:'fixture'} : undefined);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({contents:stubs[args.path],loader:'tsx',resolveDir:path.resolve(__dirname,'..')}));
    } }],
  });
  const server = http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'application/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].contents:'<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/bundle.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const button=name=>page.getByRole('button',{name,exact:true});
    const show=(screen,params={})=>page.evaluate(({screen,params})=>window.qa.show(screen,params),{screen,params});
    const setting=patch=>page.evaluate(p=>window.qa.setting(p),patch);
    const capture=async name=>{if(output){await page.waitForTimeout(450);await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}};
    const settled=id=>page.waitForFunction(id=>{const e=document.querySelector('[data-testid="'+id+'"]');if(!e)return false;const s=getComputedStyle(e);return s.opacity==='1'&&(s.transform==='none'||s.transform==='matrix(1, 0, 0, 1, 0, 0)');},id);
    const enlargeText=()=>page.evaluate(()=>document.querySelectorAll('[dir="auto"]').forEach(e=>{const c=getComputedStyle(e);e.style.fontSize=parseFloat(c.fontSize)*1.5+'px';e.style.lineHeight=parseFloat(c.lineHeight)*1.5+'px';}));
    const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const position=()=>page.getByTestId('stroke-position').innerText();
    const visibility=state=>page.evaluate(value=>{Object.defineProperty(document,'visibilityState',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},state);
    await page.goto('http://127.0.0.1:'+server.address().port);await page.getByTestId('stroke-position').waitFor();
    await button('Xem nét 3 của chữ 好').click();assert.match(await position(),/Nét 3\/6/);
    assert.equal(await button('Xem nét 3 của chữ 好').getAttribute('aria-pressed'),'true');
    await page.waitForTimeout(500);assert.match(await position(),/Nét 3\/6/,'Selecting a stroke pauses automatic playback');
    for(const index of [6,1,4])await button('Xem nét '+index+' của chữ 好').click();assert.match(await position(),/Nét 4\/6/);
    assert.deepEqual(await page.evaluate(()=>[window.qa.unexpectedWrites,window.qa.reviewSaved,window.qa.learnSaved]),[0,0,0]);
    await capture('00-stroke-direct-selection');
    await button('Phát lại thứ tự nét').click();await page.waitForTimeout(460);await button('Tạm dừng thứ tự nét').click();const paused=await position();await page.waitForTimeout(500);assert.equal(await position(),paused);
    await button('Tiếp tục thứ tự nét').click();await page.waitForTimeout(450);await button('Nét trước').click();const manual=await position();await page.waitForTimeout(500);assert.equal(await position(),manual);
    await button('Nét sau').click();await button('Phát lại thứ tự nét').evaluate(e=>{e.click();e.click();e.click()});await page.waitForTimeout(460);assert.match(await position(),/Nét 1\//);await button('Phát lại thứ tự nét').click();await button('Phát lại thứ tự nét').click();await page.waitForTimeout(80);await button('Nét sau').click();assert.match(await position(),/Nét 1\//);await page.waitForTimeout(500);assert.match(await position(),/Nét 1\//);
    await page.evaluate(()=>window.qa.render());assert.match(await position(),/Nét 1\//);await button('Tiếp tục thứ tự nét').click();await page.evaluate(()=>window.qa.character('明'));assert.match(await position(),/Nét 8\/8/);await page.waitForTimeout(500);assert.match(await position(),/Nét 8\/8/);
    await button('Phát lại thứ tự nét').click();await page.evaluate(()=>window.qa.focus(false));await page.waitForFunction(()=>document.querySelector('[data-testid="stroke-position"]').textContent.startsWith('Đã dừng'));const blurred=await position();await page.waitForTimeout(500);assert.equal(await position(),blurred);await page.evaluate(()=>window.qa.focus(true));assert.equal(await position(),blurred);
    await button('Phát lại thứ tự nét').click();await visibility('hidden');await page.waitForFunction(()=>document.querySelector('[data-testid="stroke-position"]').textContent.startsWith('Đã dừng'));const hidden=await position();await page.waitForTimeout(500);assert.equal(await position(),hidden);await visibility('visible');
    for(const mode of ['reduced','off']){await setting({motionMode:mode});assert.match(await position(),/Nét 8\/8/);await button('Nét trước').click();assert.match(await position(),/Nét 7\/8/);await button('Phát lại thứ tự nét').click();assert.match(await position(),/Nét 8\/8/);}
    await button('Xem nét 2 của chữ 明').click();assert.match(await position(),/Nét 2\/8/);await page.waitForTimeout(500);assert.match(await position(),/Nét 2\/8/);
    await setting({motionMode:'full'});await page.emulateMedia({reducedMotion:'reduce'});await button('Phát lại thứ tự nét').click();assert.match(await position(),/Nét 8\/8/);await page.emulateMedia({reducedMotion:'no-preference'});
    await capture('01-stroke-controls');await page.evaluate(()=>window.qa.character('搾'));await page.getByText(/Chưa có dữ liệu thứ tự nét ngoại tuyến cho chữ 搾/).waitFor();assert.equal(await button('Phát lại thứ tự nét').count(),0);

    const learnPronunciation=async()=>{
      const question=page.getByTestId('chinese-learn-question');
      assert.equal(await question.getByLabel('Pinyin hǎo',{exact:true}).isVisible(),true,'Target pinyin stays visible even with general pinyin hidden');
      assert.equal(await question.getByRole('button',{name:'Nghe phát âm 好 bằng giọng đọc máy',exact:true}).count(),1,'Each learning pass pairs target pinyin with pronunciation');
    };
    await setting({pinyinVisibility:false});
    await show('learn');await page.getByTestId('chinese-learn-question').waitFor();await learnPronunciation();assert.equal(await page.getByTestId('learning-guide').count(),0,'No decorative character in a question');await page.getByRole('radio',{name:'Nhập pinyin',exact:true}).click();const input=page.getByRole('textbox',{name:'Nhập pinyin',exact:true});await input.fill('da');await button('Chọn 大').click();await page.getByTestId('chinese-learn-feedback').filter({hasText:'Bạn đã ghép: 大'}).waitFor();assert.equal(await page.getByTestId('learning-guide').count(),0,'No decorative character in answer feedback');assert.equal(await button('Xác nhận · sang lượt 2').isDisabled(),true);assert.equal(await page.evaluate(()=>window.qa.learnSaved),0);await capture('02-learn-correction');
    await page.evaluate(()=>window.qa.focus(false));await settled('chinese-learn-feedback');await page.evaluate(()=>window.qa.focus(true));await settled('chinese-learn-feedback');assert.equal(await page.getByTestId('pinyin-composed-answer').innerText(),'大');
    await setting({soundEnabled:true});await page.getByTestId('chinese-learn-feedback').getByRole('button',{name:'Nghe phát âm 好 bằng giọng đọc máy',exact:true}).click();await page.getByTestId('chinese-learn-feedback').getByRole('button',{name:'Dừng phát âm 好',exact:true}).click();await setting({soundEnabled:false});
    await button('Xóa toàn bộ câu trả lời').click();await input.fill('ha');await input.focus();await page.evaluate(()=>{window.qa.input=document.activeElement;window.qa.setting({themeMode:'dark'});});assert.equal(await page.evaluate(()=>window.qa.input===document.activeElement),true);assert.equal(await input.inputValue(),'ha');
    for(const pass of [1,2]){await input.fill('hao');await button('Chọn 好').click();await button('Xác nhận · sang lượt '+(pass+1)).evaluate(e=>{e.click();e.click()});await learnPronunciation();}
    await input.fill('hao');await button('Chọn 好').click();await page.evaluate(()=>window.qa.failSave=true);await button('Hoàn tất 3 lượt · lưu Cấp 1').evaluate(e=>{e.click();e.click()});await page.getByTestId('chinese-learn-feedback').filter({hasText:'Chưa hoàn tất'}).waitFor();assert.equal(await page.evaluate(()=>window.qa.learnAttempts),1);assert.equal(await page.getByTestId('pinyin-composed-answer').innerText(),'好');
    await page.evaluate(()=>window.qa.failSave=false);await button('Hoàn tất 3 lượt · lưu Cấp 1').evaluate(e=>{e.click();e.click()});await page.waitForFunction(()=>window.qa.learnSaved===1);assert.equal(await page.evaluate(()=>window.qa.learnAttempts),2);
    await setting({pinyinVisibility:true});await show('learn',{word:{simplified:'好人',traditional:'好人',pinyin:'hǎo rén'}});await page.getByRole('radio',{name:'Nhập pinyin',exact:true}).click();await input.fill('hao');await button('Chọn 好').click();assert.equal(await page.getByTestId('chinese-learn-feedback').count(),0);await input.fill('da');await button('Chọn 大').click();await page.getByTestId('chinese-learn-feedback').filter({hasText:'Bạn đã ghép: 好大'}).waitFor();assert.equal(await page.evaluate(()=>window.qa.learnSaved),1);

    await setting({soundEnabled:false,themeMode:'light'});await show('review',{mode:'hanzi-meaning'});
    const pronunciation=page.getByTestId('review-correct-pronunciation');
    const speechBefore=await page.evaluate(()=>window.qa.speechCalls);
    const options=page.getByTestId('chinese-review-options');
    const feedbackMarks=page.getByTestId('chinese-review-feedback');
    assert.equal(await options.getByTestId('answer-correct-mark').count(),0,'Do not reveal the correct option before selection');
    assert.equal(await pronunciation.count(),0,'Do not reveal pronunciation before answering');
    assert.equal(await page.getByTestId('learning-guide').count(),0,'Review questions have no greeting character');
    const drawFrames=await page.getByTestId('chinese-review-options').getByRole('button',{name:'tốt',exact:true}).evaluate(async element=>{
      element.click();const frames=[],until=performance.now()+650;
      while(performance.now()<until){await new Promise(requestAnimationFrame);const p=document.querySelector('[data-testid="chinese-review-options"] [data-testid="answer-symbol-stroke"]');if(p)frames.push(Number(p.getAttribute('stroke-dashoffset')));}
      return frames;
    });
    assert.ok(drawFrames.some(v=>v>0 && v<22),'Correct mark is drawn along its path, not just scaled');
    assert.equal(drawFrames.at(-1),0,'The drawn check settles completely');
    if(output)fs.writeFileSync(path.join(output,'answer-draw-frames.json'),JSON.stringify(drawFrames));
    await pronunciation.getByText('hǎo',{exact:true}).waitFor();
    const speaker=pronunciation.getByRole('button',{name:'Nghe phát âm 好 bằng giọng đọc máy',exact:true});
    assert.equal(await options.getByRole('button',{name:'tốt',exact:true}).getByTestId('answer-correct-mark').count(),1,'Correct option gets its own check');
    assert.equal(await options.getByTestId('answer-retry-mark').count(),0);
    assert.equal(await feedbackMarks.getByTestId('answer-correct-mark').count(),1,'Feedback follows the same real answer');
    await page.waitForTimeout(380);
    assert.equal(await options.getByTestId('answer-correct-mark').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)','Stamp settles without delaying a study action');
    assert.equal(await speaker.isEnabled(),true,'Manual pronunciation is available with general sound off');
    assert.equal(await button('Nghe phát âm 好 bằng giọng đọc máy').count(),1,'Correct answer has exactly one speaker beside pinyin');
    assert.equal(await page.evaluate(()=>window.qa.speechCalls),speechBefore,'Answer selection does not autoplay');
    assert.equal(await page.getByTestId('learning-guide').count(),0,'Correct feedback has no arbitrary character');
    await speaker.click();await pronunciation.getByRole('button',{name:'Dừng phát âm 好',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.qa.speech.text),'好');assert.equal(await page.evaluate(()=>window.qa.speechCalls),speechBefore+1);
    await pronunciation.getByRole('button',{name:'Dừng phát âm 好',exact:true}).click();await speaker.waitFor();
    assert.deepEqual(await page.evaluate(()=>[window.qa.reviewAttempts,window.qa.reviewSaved,window.qa.settings.soundEnabled]),[0,0,false],'Listening does not rate/save or change sound settings');
    await capture('03a-review-correct-pronunciation-390-light');
    for(const themeMode of ['light','dark']){
      await page.setViewportSize({width:320,height:844});await setting({themeMode});await noOverflow();
      assert.equal(await pronunciation.getByLabel('Pinyin hǎo',{exact:true}).evaluate(e=>getComputedStyle(e).color),await page.getByTestId('chinese-review-question').getByText('好',{exact:true}).evaluate(e=>getComputedStyle(e).color),'Pinyin keeps the readable foreground color in each theme');
      await capture('03b-review-correct-pronunciation-320-'+themeMode);
    }
    await enlargeText();await noOverflow();await capture('03c-review-correct-pronunciation-text150');
    await show('review',{mode:'hanzi-meaning',word:{pinyin:''}});await page.getByTestId('chinese-review-options').getByRole('button',{name:'tốt',exact:true}).click();await pronunciation.waitFor();assert.equal(await pronunciation.getByLabel('Pinyin ',{exact:true}).count(),0);assert.equal(await pronunciation.getByRole('button').count(),1,'Word without pinyin can still be heard');
    await page.setViewportSize({width:390,height:844});await setting({themeMode:'light'});
    await show('review',{mode:'hanzi-meaning'});await page.getByTestId('chinese-review-options').getByRole('button',{name:'to',exact:true}).click();const details=page.getByTestId('chinese-review-answer-details');await details.filter({hasText:'Nghĩa bạn chọn: to'}).waitFor();assert.equal(await pronunciation.count(),0,'Wrong selection does not show the correct-answer pronunciation row');assert.equal(await page.getByTestId('learning-guide').count(),0);assert.ok((await details.innerText()).includes('tốt'));await capture('03-review-meaning-error');assert.equal(await page.evaluate(()=>window.qa.reviewSaved),0);
    await page.evaluate(()=>window.qa.focus(false));await settled('chinese-review-feedback');await page.evaluate(()=>window.qa.focus(true));await settled('chinese-review-feedback');for(const mode of ['reduced','off']){await setting({motionMode:mode});await settled('chinese-review-feedback');assert.ok((await details.innerText()).includes('hǎo'));}await setting({motionMode:'full'});
    await show('review',{mode:'hanzi-pinyin'});await page.getByTestId('chinese-review-options').getByRole('button',{name:'dà',exact:true}).click();await details.filter({hasText:'Pinyin bạn chọn: dà'}).waitFor();
    assert.equal(await options.getByRole('button',{name:'dà',exact:true}).getByTestId('answer-retry-mark').count(),1,'Wrong selection gets a cross');
    assert.equal(await options.getByRole('button',{name:'hǎo',exact:true}).getByTestId('answer-correct-mark').count(),1,'Correction identifies the right option');
    await page.evaluate(()=>window.qa.focus(false));
    for(const id of ['answer-correct-mark','answer-retry-mark'])assert.equal(await options.getByTestId(id).evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)','Option feedback settles on blur');
    await page.evaluate(()=>window.qa.focus(true));
    for(const value of ['hǎo','dà','hǎo'])await options.getByRole('button',{name:value,exact:true}).click();
    assert.equal(await options.getByTestId('answer-correct-mark').count(),1,'Rapid reselection keeps only current feedback');
    assert.equal(await options.getByTestId('answer-retry-mark').count(),0);
    assert.equal(await feedbackMarks.getByTestId('answer-correct-mark').count(),1);
    assert.equal(await page.evaluate(()=>window.qa.reviewSaved),0,'Visual feedback never saves a rating');
    await show('review',{mode:'hanzi-meaning'});
    assert.equal(await page.getByTestId('review-light-hint').count(),0,'Hint is not mounted or exposed before requesting it');
    const hintFrames=await button('Gợi ý').evaluate(async element=>{
      element.click();const frames=[],until=performance.now()+650;
      while(performance.now()<until){await new Promise(requestAnimationFrame);const e=document.querySelector('[data-testid="review-light-hint"]');if(e)frames.push(e.getBoundingClientRect().height);}
      return frames;
    });
    assert.ok(hintFrames.at(-1)>20 && hintFrames.some(h=>h>0 && h<hintFrames.at(-1)-1),'Hint card expands through real layout heights');
    assert.equal(await button('Gợi ý').getAttribute('aria-expanded'),'true');
    if(output)fs.writeFileSync(path.join(output,'hint-expansion-frames.json'),JSON.stringify(hintFrames));
    await settled('review-light-hint');
    const hintText=await page.getByTestId('review-light-hint').innerText();await setting({themeMode:'dark'});await settled('review-light-hint');
    assert.equal(await page.getByTestId('review-light-hint').innerText(),hintText,'Unrelated renders do not replace or replay hints');
    assert.equal(await page.evaluate(()=>window.qa.reviewSaved),0,'Hint animation does not save an answer');await capture('03d-hint-reveal');
    await show('review',{mode:'hanzi-recall-pinyin-compose'});await input.fill('da');await button('Chọn 大').click();await button('Kiểm tra').click();await details.filter({hasText:'Chữ bạn chọn: 大'}).waitFor();assert.equal(await details.count(),1);await capture('04-review-compose-error');
    await show('review',{mode:'hanzi-meaning',word:{pinyin:'',primaryMeaningVi:'',examples:[]}});await button('Chưa nhớ · xem đáp án').click();await details.waitFor();assert.equal(await details.getByLabel('Pinyin ',{exact:true}).count(),0);
    await show('review',{mode:'hanzi-meaning'});for(const pass of [1,2]){await page.getByTestId('chinese-review-options').getByRole('button',{name:'tốt',exact:true}).click();await button('Đã nhớ').evaluate(e=>{e.click();e.click()});}
    await page.getByTestId('chinese-review-options').getByRole('button',{name:'tốt',exact:true}).click();await page.evaluate(()=>window.qa.failSave=true);await button('Đã nhớ').evaluate(e=>{e.click();e.click()});await page.getByText('Chưa lưu được lượt ôn. Bạn có thể thử lại; câu trả lời vẫn được giữ.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.qa.reviewAttempts),1);await details.waitFor();
    await page.evaluate(()=>window.qa.failSave=false);await button('Đã nhớ').evaluate(e=>{e.click();e.click()});await page.waitForFunction(()=>window.qa.reviewSaved===1);assert.equal(await page.evaluate(()=>window.qa.reviewAttempts),2);

    await show('tones');await button('Khám phá đường thanh').click();const guide=page.getByTestId('tone-guide');const mask=guide.getByTestId('tone-reveal-mask');await page.getByRole('radio',{name:'Xem thanh 2',exact:true}).click();await page.waitForTimeout(80);const width=Number(await mask.getAttribute('width'));assert.ok(width>0&&width<54);await page.waitForTimeout(370);assert.equal(Number(await mask.getAttribute('width')),54);
    await setting({themeMode:'light'});assert.equal(Number(await mask.getAttribute('width')),54);await button('Minh họa lại').click();await button('Hiện toàn đường').click();assert.equal(Number(await mask.getAttribute('width')),54);await button('Minh họa lại').click();await page.waitForTimeout(80);assert.ok(Number(await mask.getAttribute('width'))<54);await button('Hiện toàn đường').click();
    for(const tone of [4,1,3,2])await page.getByRole('radio',{name:'Xem thanh '+tone,exact:true}).click();assert.equal(await page.getByRole('radio',{name:'Xem thanh 2',exact:true}).getAttribute('aria-checked'),'true');assert.equal(await page.evaluate(()=>window.qa.toneSaved),0);
    for(const mode of ['reduced','off']){await setting({motionMode:mode});await button('Minh họa lại').click();assert.equal(Number(await mask.getAttribute('width')),54);}await setting({motionMode:'full'});
    await button('Đọc pinyin').click();const quiz=page.getByRole('radiogroup',{name:'Chọn thanh điệu',exact:true});assert.equal(await quiz.getByRole('radio',{name:'Thanh 1',exact:true}).isDisabled(),true);
    await button('Nghe ví dụ: 麻 · má').click();await button('Dừng âm mẫu').click();assert.equal(await quiz.getByRole('radio',{name:'Thanh 1',exact:true}).isDisabled(),true);await button('Nghe ví dụ: 麻 · má').click();await page.evaluate(()=>window.qa.speech.options.onDone());assert.equal(await quiz.getByRole('radio',{name:'Thanh 1',exact:true}).isDisabled(),true);
    await button('Nghe mẫu').click();await page.evaluate(()=>window.qa.speech.options.onDone());await page.evaluate(()=>window.qa.failSave=true);await quiz.getByRole('radio',{name:'Thanh 1',exact:true}).evaluate(e=>{e.click();e.click()});await page.getByText('Chưa lưu được kết quả. Hãy thử chọn lại.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.qa.toneAttempts),1);
    await page.evaluate(()=>window.qa.failSave=false);await quiz.getByRole('radio',{name:'Thanh 1',exact:true}).click();await button('Bài tiếp').waitFor();assert.equal(await page.evaluate(()=>window.qa.toneSaved),1);await capture('05-tone-guide');
    await button('Minh họa lại').click();await page.evaluate(()=>window.qa.focus(false));assert.equal(Number(await mask.getAttribute('width')),54);await page.evaluate(()=>window.qa.focus(true));assert.equal(Number(await mask.getAttribute('width')),54);
    await button('Minh họa lại').click();await visibility('hidden');await page.waitForFunction(()=>document.querySelector('[data-testid="tone-guide"] [data-testid="tone-reveal-mask"]').getAttribute('width')==='54');await visibility('visible');assert.equal(Number(await mask.getAttribute('width')),54);

    await show('shadow');await button('Ẩn pinyin câu hiện tại').click();assert.equal(await page.getByText('nǐ hǎo',{exact:true}).count(),0);await button('Hiện pinyin câu hiện tại').click();await page.getByText('nǐ hǎo',{exact:true}).waitFor();await button('Ẩn nghĩa câu hiện tại').click();assert.equal(await page.getByText('Xin chào.',{exact:true}).count(),0);
    await button('Nghe mẫu').click();assert.equal(await button('Lưu lượt đã luyện').isDisabled(),true);await button('Câu tiếp').click();await page.evaluate(()=>window.qa.speech.options.onDone());assert.equal(await button('Lưu lượt đã luyện').isDisabled(),true);await page.getByTestId('shadowing-current-sentence').filter({hasText:'谢谢。'}).waitFor();
    await page.evaluate(()=>window.qa.speechFailure=true);await button('Nghe mẫu').click();await page.getByText('Cần cài giọng Mandarin trên thiết bị để nghe mẫu.',{exact:true}).waitFor();await page.evaluate(()=>window.qa.speechFailure=false);await capture('06-shadowing');
    await page.evaluate(()=>window.qa.focus(false));await settled('shadowing-current-sentence');await page.evaluate(()=>window.qa.focus(true));await settled('shadowing-current-sentence');for(const mode of ['reduced','off']){await setting({motionMode:mode});await button('Ẩn pinyin câu hiện tại').click();await button('Hiện pinyin câu hiện tại').click();await settled('shadowing-current-sentence');await page.getByText('xiè xie',{exact:true}).waitFor();}await setting({motionMode:'full'});
    for(const width of [320,390,430]){await page.setViewportSize({width,height:844});for(const dark of [false,true]){await setting({themeMode:dark?'dark':'light'});await show('tones');await button('Khám phá đường thanh').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await capture('07-tones-'+width+'-'+(dark?'dark':'light'));}}
    await enlargeText();await noOverflow();await capture('08-text-150');
    await page.setViewportSize({width:320,height:844});await page.evaluate(()=>window.qa.character('好'));
    for(const screen of ['learn','review','stroke','shadow']){await show(screen,{mode:'hanzi-meaning',word:{primaryMeaningVi:'tốt; thuận lợi; phù hợp với hoàn cảnh và dễ sử dụng trong cuộc sống hằng ngày'}});if(screen==='learn'){await page.getByRole('radio',{name:'Nhập pinyin',exact:true}).click();await input.fill('da');await button('Chọn 大').click();await page.getByTestId('chinese-learn-feedback').waitFor();}if(screen==='review'){await button('Chưa nhớ · xem đáp án').click();await details.waitFor();}await enlargeText();await noOverflow();await capture('09-'+screen+'-320-dark-text150');}
    await page.evaluate(()=>window.qa.character('好'));await show('stroke');await button('Phát lại thứ tự nét').click();await page.evaluate(()=>window.qa.unmount());await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.qa.unexpectedWrites),0);assert.deepEqual(errors,[]);
    console.log('PASS: correct hanzi-meaning answer reveals pinyin + one enabled manual speaker with sound off, play/stop/no autoplay/no save/no preference write, missing pinyin, no arbitrary lesson/review character; Chinese learn/review corrections, missing fields, focus, 3 passes, save failure/retry/double submit; selectable tone diagram/replay/stop/modes/no fake recognition; real stroke corpus pause/resume/step/replay/change character/blur/background/unmount; shadowing reveal/stale callback/audio failure; 320/390/430 light/dark and CSS text 150%. RN-WEB FIXTURES, NO NATIVE OR LEARNER DB.');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
