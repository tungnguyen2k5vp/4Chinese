/* Isolated RN-web components and screens. Every database/audio/network boundary is a fixture. */
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
    'expo-router': `import {useEffect} from 'react'; export const router={push(p){window.qa.navigation=p},back(){},replace(){}}; export const useLocalSearchParams=()=>window.qa.params; export const useIsFocused=()=>true; export const useFocusEffect=callback=>useEffect(callback,[callback]);`,
    'expo-router/react-navigation': `import {createContext} from 'react'; export const HeaderShownContext=createContext(false);`,
    'expo-sqlite': `export const useSQLiteContext=()=>window.qa.db;`,
    'expo-speech': `export async function stop(){}; export function speak(){}`,
    'react-native-safe-area-context': `export {View as SafeAreaView} from 'react-native';`,
    '@expo/vector-icons': `import {Text} from 'react-native'; export const Ionicons=({name,size,color,style})=><Text style={[{fontSize:size,color},style]}>{name.includes('check')?'✓':name.includes('close')?'×':'◇'}</Text>;`,
    '@/components/EnglishAudioButton': `import {Text} from 'react-native'; export const EnglishAudioButton=()=> <Text>Nghe mẫu</Text>;`,
    '@/components/AudioButton': `export const AudioButton=()=>null;`,
    '@/components/english/EnglishQuickDictionary': `export const EnglishQuickDictionary=()=>null;`,
    '@/services/feedback/feedback-service': `export async function playHaptic(){}`,
    '@/services/audio/chinese-speech': `export async function stopChineseSpeech(){}`,
    '@/services/languages/LanguageProvider': `export const useLearningLanguage=()=>({preferences:window.qa.preferences});`,
    '@/services/languages/LanguageRuntime': `export const useEnglishDatabase=()=>window.qa.db; export const EnglishAvailability=({children})=>children;`,
    '@/services/languages/use-language-protection': `export function useLanguageProtection(){}`,
    '@/db/english/learner': `export async function englishDueQueue(){return window.qa.cards;} export const englishQuickQueue=englishDueQueue; export async function englishStatistics(){return {due:window.qa.cards.length};} export async function reviewEnglishCard(...args){window.qa.attempts++; if(window.qa.failSave)throw Error('fixture failure');window.qa.saved.push(args[3]);return {nextReviewAt:'2026-10-25T12:00:00Z'};}`,
    '@/db/english/new-word-session': `export const englishLearningIds=()=>[]; export async function selectedEnglishNewCards(){return [];} export async function beginEnglishNewWordReview(){throw Error('Not exercised');}`,
    '@/db/repository': `export async function getVocabulary(){return null;} export async function getNotes(){return '';}`,
    '@/db/vocabulary-context': `export async function listVocabularyContexts(){return [];}`,
    '@/db/hanzi-memory': `export const readMemoryMnemonic=()=>''; export function saveMemoryMnemonic(){window.qa.unexpectedWrites++;throw Error('No persistence');}`,
    '@/services/handwriting/stroke-data': `export function getStrokePaths(c){return c==='无'?[]:['M 100 100 L 300 300 L 200 300 Z','M 400 100 L 600 300 L 500 300 Z'];}`,
    '@/services/languages/skypedia-runtime': `export async function getSkypediaDictionary(){return {};}`,
    '@/db/english/skypedia': `export async function lookupSkypedia(db,word){return word==='eagle'?[{meaning:'đại bàng'}]:[];}`,
    '@/services/english/word-chain': `export {normalizeChainWord,validateWordChainGuess} from './src/services/english/word-chain';export async function pickDictionaryChainWord(db,letter){if(letter==='a')return 'apple';return new Promise(resolve=>{window.qa.reply=()=>resolve('earth')});}`,
  };
  const bundle = await build({
    stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'tsx', contents: `
      import {useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {View,Text} from 'react-native';
      import {ThemeProvider} from './src/theme/ThemeProvider'; import {useAppStore} from './src/stores/app-store';
      import {FlashcardFlip} from './src/components/ui/FlashcardFlip'; import {AnimatedNumber} from './src/components/ui/AnimatedNumber';
      import {PrimaryButton} from './src/components/PrimaryButton'; import {XpJourneyCard} from './src/components/XpJourneyCard';
      import {EnglishNewWordWarmup} from './src/components/english/EnglishNewWordWarmup'; import {EnglishReviewFlow} from './src/components/english/EnglishReviewFlow';
      import EnglishReview from './src/app/english/review'; import Structure from './src/app/memory/structure'; import Game from './src/app/(tabs)/entertainment';
      import {StrokeWriter} from './src/components/StrokeWriter'; import {useModalAnimationType} from './src/hooks/use-reduced-motion';
      const cards=[{id:'garden',headword:'garden',meaning_vi:'khu vườn',ipa:'/garden/',notes:'',pos:'noun',revision:1},{id:'window',headword:'window',meaning_vi:'cửa sổ',ipa:'/window/',notes:'',pos:'noun',revision:1}];
      window.qa={params:{},cards,db:{getFirstAsync:async()=>null,runAsync:async()=>{window.qa.unexpectedWrites++;throw Error('No writes');}},preferences:{learningLanguage:'en',englishVariant:'en-US'},attempts:0,saved:[],unexpectedWrites:0,failSave:false,completions:0,
        mode:motionMode=>useAppStore.setState({settings:{...useAppStore.getState().settings,motionMode}}),theme:themeMode=>useAppStore.setState({settings:{...useAppStore.getState().settings,themeMode}})};
      useAppStore.setState({settings:{motionMode:'full',themeMode:'light'}});
      function Demo(){const [s,set]=useState({back:false,turn:'one',value:1200});window.qa.update=p=>set(s=>({...s,...p}));const policy=useModalAnimationType();return <View style={{gap:16,padding:20}}>
        <Text testID="modal-policy">{policy}</Text><FlashcardFlip revealed={s.back} turnKey={s.turn} testID="flip">{back=><View>{back?<PrimaryButton label="Rate back" onPress={()=>window.qa.completions++}/>:<Text>Front prompt</Text>}</View>}</FlashcardFlip>
        <PrimaryButton label="Flip" onPress={()=>set(s=>({...s,back:!s.back}))}/><AnimatedNumber testID="number" value={s.value} suffix=" XP"/>
        <XpJourneyCard totalXp={s.value} todayXp={20}/></View>;}
      function Harness(){const [s,set]=useState({screen:'demo',key:0});window.qa.show=(screen,params={})=>{window.qa.params=params;window.qa.preferences.learningLanguage=screen==='structure'?'zh':'en';set(s=>({screen,key:s.key+1}));};return <ThemeProvider><View key={s.key} style={{minHeight:'100vh'}}>{s.screen==='demo'?<Demo/>:s.screen==='warmup'?<EnglishNewWordWarmup cards={cards} onComplete={async()=>{window.qa.completions++}} onExit={()=>{}}/>:s.screen==='flow'?<EnglishReviewFlow/>:s.screen==='legacy'?<EnglishReview/>:s.screen==='structure'?<Structure/>:s.screen==='strokes'?<StrokeWriter key={window.qa.params.character} character={window.qa.params.character||'好'}/>:<Game/>}</View></ThemeProvider>;}
      const root=createRoot(document.getElementById('root'));window.qa.unmount=()=>root.unmount();root.render(<Harness/>);
    ` }, bundle: true, write: false, format: 'iife', jsx: 'automatic',
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: { 'react-native': 'react-native-web', 'react-native-svg': path.resolve(__dirname, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}', __DEV__: 'false', global: 'globalThis' },
    plugins: [{ name: 'fixtures', setup(b) {
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
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const show = (screen, params = {}) => page.evaluate(({screen,params}) => window.qa.show(screen,params), {screen,params});
    const update = patch => page.evaluate(p => window.qa.update(p), patch);
    const mode = m => page.evaluate(m => window.qa.mode(m), m);
    const button = name => page.getByRole('button', { name, exact: true });
    const capture = async name => { if (output) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }); } };
    const visibility = value => page.evaluate(value => { Object.defineProperty(document,'visibilityState',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange')); }, value);
    await page.goto('http://127.0.0.1:' + server.address().port); await page.getByTestId('number').waitFor();
    assert.equal(await page.getByTestId('number').innerText(), '1.200 XP');
    await update({value:1500}); await page.waitForTimeout(70);
    assert.equal(await page.getByTestId('number').getAttribute('aria-label'), '1.500 XP');
    const interim = Number((await page.getByTestId('number').innerText()).replace(/\D/g,'')); assert.ok(interim > 1200 && interim < 1500);
    await update({value:1300}); await page.waitForTimeout(430); assert.equal(await page.getByTestId('number').innerText(),'1.300 XP');
    await show('demo'); assert.equal(await page.getByTestId('number').innerText(),'1.200 XP');
    await update({back:true}); await page.waitForTimeout(70); assert.equal(await button('Rate back').count(),0);
    await update({back:false}); await page.waitForTimeout(370); assert.equal(await button('Rate back').count(),0);
    await update({back:true}); await page.waitForTimeout(210); assert.equal(await button('Rate back').count(),1);
    await update({back:false}); await page.waitForTimeout(380); assert.equal(await button('Rate back').count(),0);
    await update({back:true}); await page.waitForTimeout(200); await update({turn:'two',back:false}); await page.waitForTimeout(30); assert.equal(await button('Rate back').count(),0);
    for (const m of ['reduced','off']) { await mode(m); await update({back:true,value:1600}); await page.waitForTimeout(40); assert.equal(await button('Rate back').count(),1); assert.equal(await page.getByTestId('number').innerText(),'1.600 XP'); assert.equal(await page.getByTestId('modal-policy').innerText(),m==='off'?'none':'fade'); await update({back:false,value:1200}); }
    await mode('full'); await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(50); await update({back:true,value:1700}); await page.waitForTimeout(40); assert.equal(await button('Rate back').count(),1); assert.equal(await page.getByTestId('number').innerText(),'1.700 XP'); assert.equal(await page.getByTestId('modal-policy').innerText(),'fade');
    await page.emulateMedia({reducedMotion:'no-preference'}); await page.waitForTimeout(40); await update({back:false,value:1800}); await visibility('hidden'); await page.waitForTimeout(40); assert.equal(await page.getByTestId('number').innerText(),'1.800 XP'); assert.equal(await button('Rate back').count(),0); await visibility('visible');

    await show('warmup'); const input=page.getByTestId('english-learning-answer'); await input.fill('gar'); await input.focus();
    await page.evaluate(()=>{window.qa.input=document.activeElement;window.qa.theme('dark')}); assert.equal(await page.evaluate(()=>window.qa.input===document.activeElement),true); assert.equal(await input.inputValue(),'gar');
    await input.fill('wrong'); await input.press('Enter'); await page.getByTestId('english-warmup-feedback').waitFor(); assert.equal(await input.inputValue(),'wrong');
    await input.press('Enter'); await page.waitForTimeout(300); assert.equal(await page.getByTestId('english-warmup-feedback').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)');
    for (const text of ['garden','window','garden','window']) { await input.fill(text); await button('Kiểm tra').click(); await button('Tiếp tục').click(); }
    assert.equal(await page.evaluate(()=>window.qa.completions),1); await capture('01-warmup');

    await show('flow'); await page.getByTestId('english-review-setup').waitFor(); await button('Ôn bằng flashcard · tự đánh giá').click(); assert.equal(await page.evaluate(()=>window.qa.navigation.params.legacy),'true');
    await button('Ôn 2 từ ngay').click(); await page.getByRole('radio',{name:'khu vườn',exact:true}).click();
    await page.evaluate(()=>{window.qa.failSave=true}); await button('Kiểm tra').evaluate(e=>{e.click();e.click()}); await page.getByRole('alert').waitFor(); assert.equal(await page.evaluate(()=>window.qa.attempts),1); assert.equal(await page.getByTestId('english-answer-feedback').count(),0); assert.equal(await page.getByRole('radio',{name:'khu vườn',exact:true}).getAttribute('aria-checked'),'true');
    await page.evaluate(()=>{window.qa.failSave=false}); await button('Thử lại').evaluate(e=>{e.click();e.click()}); await page.getByTestId('english-answer-feedback').waitFor(); assert.equal(await page.evaluate(()=>window.qa.attempts),2); assert.equal(await page.evaluate(()=>window.qa.saved.length),1); await capture('02-correct');
    await button('Tiếp tục').click(); await page.getByTestId('english-review-answer').fill('wrong'); await button('Kiểm tra').click(); await page.getByText('Bạn đã trả lời: wrong',{exact:true}).waitFor(); assert.equal(await page.evaluate(()=>window.qa.saved.length),2); await capture('03-supportive-error');
    await button('Tiếp tục').click(); await page.getByRole('radio',{name:'cửa sổ',exact:true}).click(); await button('Kiểm tra').click(); await page.getByTestId('english-answer-feedback').waitFor(); await button('Tiếp tục').click();
    await page.getByTestId('english-review-answer').fill('garden'); await button('Kiểm tra').click(); await page.getByTestId('english-answer-feedback').waitFor(); await button('Tiếp tục').click(); await page.getByTestId('english-review-complete').waitFor();
    assert.equal(await page.evaluate(()=>window.qa.saved.length),2); await capture('04-complete'); await show('flow'); await page.getByTestId('english-review-setup').waitFor(); assert.equal(await page.evaluate(()=>window.qa.saved.length),2);
    await button('Ôn 2 từ ngay').click(); await button('Cài đặt lượt ôn').click(); await button('Đóng').click(); await button('Cài đặt lượt ôn').click(); await mode('off'); await button('Đóng').click(); await mode('full');

    await show('legacy',{legacy:'true'}); await button('Hiện nghĩa đã lưu').waitFor(); const saved=await page.evaluate(()=>window.qa.saved.length);
    await button('Hiện nghĩa đã lưu').click(); await page.waitForTimeout(80); await button('Xem mặt trước').click(); await page.waitForTimeout(370); assert.equal(await button('Đã nhớ từ này').count(),0);
    await button('Hiện nghĩa đã lưu').click(); await button('Đã nhớ từ này').waitFor(); assert.equal(await button('Chưa nhớ từ này').count(),1); await capture('05-flashcard-back');
    await button('Xem mặt trước').click(); await page.waitForTimeout(370); assert.equal(await button('Đã nhớ từ này').count(),0); assert.equal(await page.evaluate(()=>window.qa.saved.length),saved);

    await show('structure',{character:'好'}); await page.getByRole('radio',{name:'Xem nét thành phần 1: 女',exact:true}).click(); await page.getByText('Thành phần 1: 女 · trong chữ 好',{exact:true}).waitFor(); await capture('06-character-parts');
    await page.getByRole('radio',{name:'Xem toàn chữ 好',exact:true}).click(); await page.getByText('女 + 子 = 好',{exact:true}).waitFor();
    await show('strokes'); await button('Phát lại thứ tự nét').click(); await page.waitForTimeout(460); await mode('off'); await button('Phát lại thứ tự nét').click(); await mode('full'); await show('strokes',{character:'无'}); assert.equal(await button('Phát lại thứ tự nét').count(),0);

    await show('game'); await button('Bắt đầu chơi').click(); await page.getByTestId('english-word-chain-current').filter({hasText:'apple'}).waitFor();
    const entry=page.getByLabel('Từ tiếp theo trong trò chơi Word Chain',{exact:true}); await entry.fill('chair'); await button('Nối từ').click(); await page.getByText('Từ tiếp theo cần bắt đầu bằng “e”.',{exact:true}).waitFor(); assert.equal(await page.getByTestId('word-chain-score').innerText(),'0 điểm trò chơi');
    await entry.fill('eagle'); await button('Nối từ').click(); await page.waitForFunction(()=>typeof window.qa.reply==='function'); assert.equal(await page.getByTestId('english-word-chain-current').innerText(),'apple');
    await page.evaluate(()=>window.qa.reply()); await page.getByTestId('english-word-chain-current').filter({hasText:'earth'}).waitFor(); await capture('07-word-chain');
    for (const width of [320,390,430]) { await page.setViewportSize({width,height:844}); for (const dark of [false,true]) { await page.evaluate(d=>window.qa.theme(d?'dark':'light'),dark); await show('legacy',{legacy:'true'}); await button('Hiện nghĩa đã lưu').click(); await button('Đã nhớ từ này').waitFor(); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); await capture('08-flip-'+width+'-'+(dark?'dark':'light')); } }
    await page.evaluate(()=>document.querySelectorAll('[dir="auto"]').forEach(e=>{const c=getComputedStyle(e);e.style.fontSize=parseFloat(c.fontSize)*1.5+'px';e.style.lineHeight=parseFloat(c.lineHeight)*1.5+'px';})); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); await capture('09-text-150');
    await show('demo'); await update({back:true,value:2000}); await page.evaluate(()=>window.qa.unmount()); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>window.qa.unexpectedWrites),0); assert.deepEqual(errors,[]);
    console.log('PASS: single-face flip/reversal/reset; real-target numbers; full/reduced/off/OS; simulated background/unmount; warmup/focus; answer save failure/retry/no duplicate grading; completion/remount; modal reopen; structure/stroke fallback; deferred game reply; 320/390/430 light/dark and CSS text 150%. RN-WEB FIXTURES ONLY.');
  } finally { if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
