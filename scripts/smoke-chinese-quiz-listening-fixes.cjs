// Mount the real screens in React Native Web; isolate SQLite/router/TTS boundaries.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, 'artifacts/chinese-quiz-listening-fixes-2026-10-13'));
const fixtures = [
  { id: 'apology', simplified: '对不起', pinyin: 'duì bu qǐ', primaryMeaningVi: 'xin lỗi', chinese: '对不起，我来晚了。', vietnamese: 'Xin lỗi, tôi đến muộn.' },
  { id: 'star', simplified: '星星', pinyin: 'xīng xing', primaryMeaningVi: 'ngôi sao', chinese: '今晚有很多星星。', vietnamese: 'Tối nay có nhiều ngôi sao.' },
  { id: 'yesterday', simplified: '昨天', pinyin: 'zuó tiān', primaryMeaningVi: 'hôm qua', chinese: '昨天我去了学校。', vietnamese: 'Hôm qua tôi đến trường.' },
  { id: 'sunday', simplified: '星期日', pinyin: 'xīng qī rì', primaryMeaningVi: 'chủ nhật', chinese: '星期日我休息。', vietnamese: 'Chủ nhật tôi nghỉ ngơi.' },
].map(word => ({ ...word, examples: [{ chinese: word.chinese, vietnamese: word.vietnamese, pinyin: '' }] }));
const adapters = `
import React, {useEffect,useMemo} from 'react';
import {View,Text,Pressable} from 'react-native-web';
import {lightTheme} from '${path.join(root, 'src/theme/tokens.ts').replaceAll('\\', '/')}';
export const words=${JSON.stringify(fixtures)};
export const Ionicons=({name,color})=><Text style={{color,fontSize:24}}>{name==='volume-high'?'🔊':name==='checkmark-circle'?'✓':'×'}</Text>;
export const router={back(){},replace(){}};
export const useLocalSearchParams=()=>({deckId:'qa-only'});
export const useFocusEffect=callback=>useEffect(callback,[callback]);
const database={}; export const useSQLiteContext=()=>database;
export const useTheme=()=>lightTheme;
export const useThemeStyles=f=>useMemo(()=>f(lightTheme),[f]);
export const useStudySession=()=>{};
export const getDeckVocabulary=async()=>words;
export const listPersonalDecks=async()=>[{id:'qa-only',name:'Bộ từ kiểm thử'}];
export const getSettings=async()=>({speechRate:.82,selectedHskBands:[1]});
export const getDueVocabulary=async()=>words;
export const getUnlearnedVocabulary=async()=>words;
export const listVocabulary=async()=>words;
window.__qa={audioCalls:[]};
export const speakChinese=async text=>{window.__qa.audioCalls.push(text);return {ok:true}};
export const stopChineseSpeech=async()=>{};
export const AudioButton=({text})=><Pressable accessibilityRole='button' accessibilityLabel='Nghe đáp án' onPress={()=>speakChinese(text)}><Text>🔊</Text></Pressable>;
export const EmptyState=({title,message})=><View><Text>{title}</Text><Text>{message}</Text></View>;
export const PrimaryButton=({label,disabled,onPress})=><Pressable accessibilityRole='button' disabled={disabled} onPress={onPress} style={{padding:18,borderRadius:16,backgroundColor:disabled?'#A4B7E8':'#2457D6'}}><Text style={{color:'white',textAlign:'center',fontWeight:'700'}}>{label}</Text></Pressable>;
export const Screen=({title,subtitle,children})=><View style={{backgroundColor:lightTheme.background,padding:20,gap:16,minHeight:'100vh'}}><Text style={{fontSize:26,fontWeight:'800'}}>{title}</Text><Text>{subtitle}</Text>{children}</View>;
`;
function assert(ok, message) { if (!ok) throw new Error(message); }
async function main() {
  if (fs.existsSync(output)) throw new Error('Evidence folder already exists; choose a fresh folder.');
  fs.mkdirSync(output, { recursive: true });
  const mocks = new Set(['@expo/vector-icons','expo-router','expo-sqlite','@/db/repository','@/hooks/use-study-session','@/services/audio/chinese-speech','@/theme/ThemeProvider','@/components/AudioButton','@/components/EmptyState','@/components/PrimaryButton','@/components/Screen']);
  const bundle = await esbuild.build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Quiz from './src/app/decks/quiz';import Listening from './src/app/decks/listening';Math.random=()=>.4;createRoot(document.getElementById('root')).render(location.pathname==='/quiz'?<Quiz/>:<Listening/>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV':'"production"','__DEV__':'false' },
    plugins: [{name:'qa-boundaries',setup(build){
      build.onResolve({filter:/.*/}, args => {
        if (mocks.has(args.path)) return {path:'adapters',namespace:'qa'};
        if (args.path==='react-native') return {path:require.resolve('react-native-web')};
        if (args.path.startsWith('@/')) return {path:path.join(root,'src',args.path.slice(2)+'.ts')};
      });
      build.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:adapters,loader:'tsx',resolveDir:root}));
    }}],
  });
  const server=http.createServer((request,response)=>{
    response.setHeader('Content-Type',request.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');
    response.end(request.url==='/bundle.js'?bundle.outputFiles[0].text:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const capture=name=>page.screenshot({path:path.join(output,name),fullPage:true});
  try {
    await page.goto(base+'/listening');
    await page.getByRole('button',{name:'Phát âm thanh 1',exact:true}).waitFor();
    const meanings=page.getByRole('button',{name:/^Nghĩa \d:/});
    const initial=await meanings.evaluateAll(elements=>elements.map(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor,selected:el.getAttribute('aria-selected')})));
    await page.getByRole('button',{name:'Phát âm thanh 1',exact:true}).click();
    const after=await meanings.evaluateAll(elements=>elements.map(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor,selected:el.getAttribute('aria-selected')})));
    assert(JSON.stringify(initial)===JSON.stringify(after),'Playing audio revealed/highlighted a meaning.');
    assert(await page.getByText('0/4 cặp',{exact:true}).count()===1,'Audio alone advanced the score.');
    const spoken=await page.evaluate(()=>window.__qa.audioCalls.at(-1));
    const target=fixtures.find(word=>word.simplified===spoken);
    await capture('01-play-audio-no-answer-revealed.png');
    const wrong=fixtures.find(word=>word.id!==target.id);
    await page.getByRole('button',{name:new RegExp(`^Nghĩa \\d: ${wrong.primaryMeaningVi}$`)}).click();
    await page.getByText('Chưa khớp. Hãy giữ lựa chọn loa và thử nghĩa khác.').waitFor();
    assert(await page.getByText('0/4 cặp',{exact:true}).count()===1,'Wrong meaning advanced the score.');
    await page.getByRole('button',{name:new RegExp(`^Nghĩa \\d: ${target.primaryMeaningVi}$`)}).click();
    await page.getByText('1/4 cặp',{exact:true}).waitFor();
    await capture('02-user-chosen-match.png');
    for(let index=2;index<=4;index++){
      await page.getByRole('button',{name:`Phát âm thanh ${index}`,exact:true}).click();
      const text=await page.evaluate(()=>window.__qa.audioCalls.at(-1));
      const word=fixtures.find(item=>item.simplified===text);
      await page.getByRole('button',{name:new RegExp(`^Nghĩa \\d: ${word.primaryMeaningVi}$`)}).click();
    }
    await page.getByText('4/4 cặp',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Xem kết quả',exact:true}).click();
    await page.getByText('80% chính xác · 1 lần ghép chưa khớp.').waitFor();
    await capture('03-listening-result.png');
    await page.goto(base+'/quiz');
    await page.getByRole('button',{name:/^Lựa chọn A:/}).waitFor();
    assert(await page.getByText('Vì sao đáp án này đúng?',{exact:true}).count()===0,'Quiz revealed explanation before an answer.');
    for(let index=0;index<4;index++){
      const sentence=await page.getByText(/＿＿/).textContent();
      const targetWord=fixtures.find(word=>word.chinese.replaceAll(word.simplified,'＿＿')===sentence);
      await page.getByText(`Nghĩa câu: ${targetWord.vietnamese}`,{exact:true}).waitFor();
      const chosen=index===0?fixtures.find(word=>word.id!==targetWord.id):targetWord;
      await page.getByRole('button',{name:new RegExp(`^Lựa chọn [A-D]: ${chosen.simplified}$`)}).click();
      await page.getByText('Vì sao đáp án này đúng?',{exact:true}).waitFor();
      await page.getByText(targetWord.chinese,{exact:true}).waitFor();
      await page.getByText('Vì sao các đáp án khác không khớp?',{exact:true}).waitFor();
      if(index===0){await page.getByText(`Bạn đã chọn ${chosen.simplified}`,{exact:true}).waitFor();await capture('04-quiz-wrong-explanation.png');}
      if(index===1)await capture('05-quiz-correct-explanation.png');
      await page.getByRole('button',{name:index===3?'Xem kết quả':'Câu tiếp theo',exact:true}).click();
    }
    await page.getByText('75% câu trả lời chính xác.').waitFor();
    assert(errors.length===0,errors.join('\n'));
    const names=fs.readdirSync(output).filter(name=>name.endsWith('.png'));
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({date:'2026-10-13',environment:'Real screen components in React Native Web, mocked SQLite/router/TTS; no device audio validation or learner-data writes.',checks:['audio-only leaves all meaning tiles unchanged and score at zero','wrong meaning does not advance score','correct user-selected match advances score','all pairs completed and score accounts for wrong attempt','quiz hides explanation before answering','wrong and correct answers show source sentence, translation and distractor explanations','quiz finishes and scores correctly'],pageErrors:errors},null,2));
    fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><meta charset="utf-8"><title>Quiz & listening QA</title><style>body{font:16px system-ui;background:#f6f7fb;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}img{width:100%}figure{margin:0}</style><h1>Quiz điền từ & ghép âm thanh</h1><p>Kiểm thử component web với dữ liệu và âm thanh giả lập, không cài lên điện thoại.</p><main>${names.map(name=>`<figure><a href="${name}"><img src="${name}"></a><figcaption>${name}</figcaption></figure>`).join('')}</main>`);
    console.log(JSON.stringify({output,screenshots:names.length,checks:'passed',errors},null,2));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1});
