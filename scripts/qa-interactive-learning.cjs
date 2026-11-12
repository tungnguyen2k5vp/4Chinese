/* Disposable RN-web UI checks. No learner database, device or live backend is opened. */
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { build } = require('esbuild');
const { chromium } = require(process.argv[2] || 'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

(async () => {
  const output = path.resolve('../outputs/interactive-adventures-2026-11-08');
  fs.mkdirSync(output, { recursive: true });
  const stubs = {
    'expo-router': `import {useEffect} from 'react'; export const router={push(p){window.qa.navigation=p},replace(p){window.qa.navigation=p},back(){},canGoBack(){return true}};export const useLocalSearchParams=()=>window.qa.params;export const useIsFocused=()=>true;export const useFocusEffect=cb=>useEffect(cb,[cb]);`,
    'expo-router/react-navigation': `import {createContext} from 'react';export const HeaderShownContext=createContext(true);`,
    'expo-sqlite': `export const useSQLiteContext=()=>null;`,
    'react-native-safe-area-context': `import {View} from 'react-native';export const SafeAreaView=({edges,...props})=><View {...props}/>;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});`,
    '@expo/vector-icons': `import {Text} from 'react-native';export const Ionicons=({name,color,size})=><Text aria-hidden style={{color,fontSize:size}}>{name.includes('check')?'✓':name.includes('volume')?'♫':'✦'}</Text>;`,
    '@/services/audio/chinese-speech': `export async function speakChinese(text,opts){window.qa.speech.push(text);opts?.onStart?.();opts?.onDone?.();return {ok:true}};export async function stopChineseSpeech(){}`, 
    '@/services/feedback/feedback-service': `export async function playHaptic(){};export async function playFeedback(signal,settings){window.qa.feedback.push({signal,sound:settings.soundEnabled});}`,
    '@/db/repository': `import {scenePracticeWords} from '@/services/learning/quick-challenge';export async function getLearnedReviewPage(){window.qa.reads++;await new Promise(r=>setTimeout(r,20));if(window.qa.dataState==='error')throw Error('fixture');return {words:window.qa.dataState==='empty'?[]:scenePracticeWords(),totalPages:2}};`,
    '@/services/cloud/client': `export const getCommunityClient=()=>null;`,
    '@/components/community/Attachments': `export const AttachmentList=()=>null,AttachmentComposer=()=>null;export const useMediaDrafts=()=>({drafts:[],files:[],busy:false,ready:true,clear(){}});`,
    '@/components/community/Illustrations': `import {Text} from 'react-native';export const AvatarGlyph=()=> <Text>☺</Text>;export const StickerList=()=>null,StickerPicker=()=>null;`,
    '@/components/community/Presence': `export const PresenceLabel=()=>null;export const useFriendPresence=()=>()=>({online:false});`,
    '@/services/community/use-social-refresh': `import {useEffect} from 'react';export function useSocialRefresh(tables,load){useEffect(()=>{void load()},[]);return {loading:false,error:'',connected:true,refresh:load}};`,
    '@/services/community/api': `export {topics} from '@/services/community/catalog';
      export const me=async()=>window.qa.profile,feed=async()=>window.qa.posts,relations=async()=>({friends:[],blocked:[]}),inbox=async()=>[],findPerson=async()=>null,getPerson=async()=>({state:null});
      export const newOperationId=()=> '11111111-1111-4111-8111-111111111111',socialError=()=> 'fixture error';
      export async function createPost(id,body,category,extra){const post={id,body,category,...extra,author:window.qa.profile,author_id:window.qa.profile.id,created_at:new Date().toISOString(),hearts:0,views:0,comments:0,stickers:[],reaction:null};window.qa.posts.push(post);return post;}
      export const blockPerson=async()=>true,bookmarkPost=async()=>true,friendsAction=async()=>true,react=async()=>true,removeContent=async()=>true,report=async()=>true;`,
  };
  const bundle = await build({
    stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'tsx', contents: `
      import {useState} from 'react';import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';import {View} from 'react-native';
      import Scenes from './src/app/practice/scenes';import Sentences from './src/app/practice/sentences';import Challenges from './src/app/practice/challenges';import Community from './src/app/community';
      import Missions from './src/app/practice/missions';import ChoiceStories from './src/app/practice/choice-stories';import Characters from './src/app/practice/characters';import Reading from './src/app/practice/reading-missions';import Hub from './src/app/practice';
      import {sceneMissions,choiceStories,assemblyCharacters,readingDocuments} from './src/services/learning/adventure-content';
      import {PostCard} from './src/components/community/SocialUI';import {ThemeProvider} from './src/theme/ThemeProvider';import {SystemReducedMotionProvider} from './src/hooks/use-reduced-motion';import {useAppStore} from './src/stores/app-store';import {practiceScenes} from './src/services/learning/interactive-content';
      window.qa={params:{},speech:[],feedback:[],reads:0,dataState:'normal',posts:[],profile:{id:'11111111-1111-4111-8111-111111111111',handle:'ABCDEF1234',display_name:'Người học thử',avatar:0}};window.confirm=()=>true;
      useAppStore.getState().setSettings({motionMode:'full',soundEnabled:true,hapticEnabled:false,themeMode:'light'});
      window.qa.settings=patch=>useAppStore.getState().setSettings({...useAppStore.getState().settings,...patch});window.qa.content=practiceScenes;window.qa.adventures={sceneMissions,choiceStories,assemblyCharacters,readingDocuments};
      const screens={scenes:Scenes,sentences:Sentences,challenges:Challenges,community:Community,missions:Missions,choiceStories:ChoiceStories,characters:Characters,reading:Reading,hub:Hub};
      function App(){const [state,set]=useState({screen:'scenes',key:0});window.qa.show=(screen,params={})=>flushSync(()=>{window.qa.params=params;set(s=>({screen,key:s.key+1}))});const Page=screens[state.screen];return <SystemReducedMotionProvider><ThemeProvider><View key={state.key} style={{height:'100vh'}}>{Page?<Page/>:<PostCard detail post={window.qa.posts.at(-1)} myId="viewer" onChanged={()=>{}} onPerson={()=>{}}/>}</View></ThemeProvider></SystemReducedMotionProvider>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', resolveExtensions: ['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],
    alias: { 'react-native': 'react-native-web', 'react-native-svg': path.resolve(__dirname, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}', __DEV__: 'false', global: 'globalThis' },
    plugins: [{ name: 'isolated', setup(b) { b.onResolve({ filter: /.*/ }, args => Object.hasOwn(stubs,args.path) ? {path:args.path,namespace:'stub'} : undefined);b.onLoad({filter:/.*/,namespace:'stub'}, args=>({contents:stubs[args.path],loader:'tsx',resolveDir:path.resolve(__dirname,'..')})); } }],
  });
  const server = http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'application/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].contents:'<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style><div id="root"></div><script src="/bundle.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const errors=[],checks=[];
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack)});
    page.setDefaultTimeout(12000);
    const click=name=>page.getByRole('button',{name,exact:true}).click();
    const show=(screen,params={})=>page.evaluate(({screen,params})=>window.qa.show(screen,params),{screen,params});
    const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,'no horizontal page overflow');
    const atTop=async()=>assert.equal(await page.evaluate(()=>[...document.querySelectorAll('*')].some(e=>e.scrollTop>2&&/auto|scroll/.test(getComputedStyle(e).overflowY))),false,'new turn scrolls to its question');
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Một nơi mới, vài điều hay',{exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'01-scenes.png'),fullPage:true});
    const content=await page.evaluate(()=>window.qa.content);
    for(const scene of content){
      await click(`Khám phá ${scene.title}`);
      for(const word of scene.words){await click(`Khám phá ${word.meaning}`);await page.getByText(word.sentence,{exact:true}).waitFor();}
      await page.getByText('Chạm biểu tượng trong cảnh · đã khám phá 5/5',{exact:true}).waitFor();
      await page.getByRole('tab',{name:'Thử hội thoại',exact:true}).click();
      for(let i=0;i<scene.dialogue.length;i++){
        const turn=scene.dialogue[i];await click(turn.choices[turn.answer]);await page.getByText('Chính xác!',{exact:true}).waitFor();
        const next=page.getByRole('button',{name:i===2?'Xem kết quả hội thoại':'Lượt tiếp theo',exact:true});
        await next.evaluate(el=>{el.click();el.click()});
        if(i<2)await page.getByText(scene.dialogue[i+1].prompt,{exact:true}).waitFor();
      }
      await page.getByText('Thêm một bước tiến!',{exact:true}).waitFor();await click('Chơi lại một lượt');await click('Đổi khung cảnh');
    }
    checks.push('4 scenes, 20 hotspots, 12 dialogue turns, replay and rapid next without skipped turns');
    await click('Khám phá Quán cà phê');
    await page.screenshot({path:path.join(output,'02-cafe.png'),fullPage:true});
    await page.getByRole('switch',{name:'Tự phát âm khi chạm đồ vật'}).uncheck();
    const spoken=await page.evaluate(()=>window.qa.speech.length);await click('Khám phá cà phê');assert.equal(await page.evaluate(()=>window.qa.speech.length),spoken);
    checks.push('auto speech off');
    await show('sentences',{scene:'cafe'});
    for(let i=0;i<5;i++){
      const word=content[0].words[i];
      if(i===0){
        const tile=page.getByRole('button',{name:`Thêm ${word.tokens[0]} vào câu`,exact:true}),target=page.getByLabel('Khung ghép câu',{exact:true});
        const a=await tile.boundingBox(),b=await target.boundingBox();
        await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+30,{steps:12});await page.mouse.up();
        await page.getByRole('button',{name:`Bỏ ${word.tokens[0]} khỏi vị trí 1`,exact:true}).waitFor();await click('Xếp lại');
      }
      for(const token of word.tokens)await click(`Thêm ${token} vào câu`);
      await page.getByRole('button',{name:'Kiểm tra câu',exact:true}).evaluate(el=>{el.click();el.click()});await page.getByText('Chính xác!',{exact:true}).waitFor();
      if(i===0)await page.screenshot({path:path.join(output,'03-sentence.png'),fullPage:true});
      await click(i===4?'Xem kết quả ghép câu':'Câu tiếp theo');
    }
    await page.getByText('Thêm một bước tiến!',{exact:true}).waitFor();await page.getByText(/Bạn trả lời đúng 5\/5 câu/).waitFor();checks.push('sentence drag, tap, rapid check, 5 correct sentences and result');
    await show('sentences');
    for(const token of [...content[0].words[0].tokens].reverse())await click(`Thêm ${token} vào câu`);
    await click('Kiểm tra câu');await page.getByText('Cùng xem lại nhé',{exact:true}).waitFor();await click('Xem câu mẫu');await click('Câu tiếp theo');checks.push('wrong sentence and reveal');
    await show('challenges');await click('Từ tôi đã học');await page.getByText(/20 từ phù hợp/).waitFor();await click('Nhóm sau');await page.getByText('20 từ phù hợp trong nhóm 2/2',{exact:true}).waitFor();await click('Nhóm trước');await page.getByText('20 từ phù hợp trong nhóm 1/2',{exact:true}).waitFor();
    await click('Bắt đầu thử thách');await click('Nghe câu hỏi thử thách');assert.ok(await page.evaluate(()=>window.qa.speech.length)>spoken);
    await page.getByRole('button').filter({hasText:/^[ABC]/}).first().click();await click('Câu tiếp theo');checks.push('read-only learned vocabulary and listening');
    await show('challenges');await click('Tìm đôi');await click('Bắt đầu thử thách');
    for(let round=0;round<2;round++){
      const cards=page.getByRole('button',{name:/^Từ /});const labels=await cards.evaluateAll(items=>items.map(e=>e.getAttribute('aria-label')));
      for(const label of labels){const hanzi=label.slice(3);const word=content.flatMap(s=>s.words).find(w=>w.hanzi===hanzi);await click(label);await click(`Nghĩa ${word.meaning}`);}
      await click('Tiếp tục');
    }
    await page.getByText('Thêm một bước tiến!',{exact:true}).waitFor();checks.push('pair matching across rounds');
    for(const name of ['Đáp lời','Thám tử câu']){await show('challenges');await click(name);await click('Bắt đầu thử thách');await page.getByRole('button').filter({hasText:/^[ABC]/}).first().click();await click('Câu tiếp theo');}
    checks.push('context and repair interactions');
    for(const state of ['empty','error']){await page.evaluate(state=>window.qa.dataState=state,state);await show('challenges');await click('Từ tôi đã học');await page.getByText(state==='empty'?/Chưa có đủ 3 từ/:/Chưa tải được từ đã học/).waitFor();assert.equal(await page.getByRole('button',{name:'Bắt đầu thử thách',exact:true}).isDisabled(),true);}
    await page.evaluate(()=>window.qa.dataState='normal');await click('Thử tải lại');await page.getByText(/20 từ phù hợp/).waitFor();checks.push('empty/error/retry');
    await show('community');await click('＋ Viết bài · hỏi cộng đồng');await click('Tạo bài đố tương tác');await click('Mẫu bài đố Nghe và đoán');
    await page.getByLabel('Đáp án A',{exact:true}).fill('Lối ra');
    assert.equal(await page.getByRole('button',{name:'Đăng bài',exact:true}).isDisabled(),true);
    await page.getByText('Các đáp án cần khác nhau.',{exact:true}).waitFor();
    await page.getByLabel('Câu hỏi bài đố',{exact:true}).fill('Nghe và chọn nghĩa của từ này nhé?');
    await page.getByLabel('Đáp án A',{exact:true}).fill('Vé tàu');await page.getByLabel('Đáp án C',{exact:true}).fill('Hành lý');
    await page.getByRole('radio',{name:'Đặt A làm đáp án đúng',exact:true}).click();
    await click('Chơi thử trước khi đăng');await click('Vé tàu');await page.getByText('Chính xác!',{exact:true}).waitFor();
    await click('Đóng bản xem thử');await click('Đăng bài');
    await page.getByRole('button',{name:/Chơi bài đố:/}).waitFor();
    assert.equal(await page.evaluate(()=>window.qa.posts.length),1);
    await show('post');await click('Vé tàu');await page.getByText('Chính xác!',{exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'04-community-quiz.png'),fullPage:true});checks.push('compose/edit/validation/preview/encode/decode/feed/detail quiz without network');
    const adventures=await page.evaluate(()=>window.qa.adventures);
    const double=locator=>locator.evaluate(el=>{el.click();el.click()});
    const drag=async(source,target)=>{
      await source.scrollIntoViewIfNeeded();
      const a=await source.boundingBox(),b=await target.boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();
    };
    for(const scene of content){
      await show('missions');await click(`Bắt đầu ${scene.title}`);
      const mission=adventures.sceneMissions[scene.id];
      for(const [index,task] of mission.tasks.entries()){
        const word=scene.words.find(word=>word.id===task.item);
        await click('Nghe yêu cầu giao đồ');
        if(index===0&&scene.id==='cafe'){
          await click(`Chọn ${word.meaning}`);await double(page.getByRole('button',{name:`Giao đến ${mission.places[1-task.place]}`,exact:true}));
          await page.getByText('Đúng đồ vật rồi, nhưng chưa đúng nơi nhận. Hãy nghe lại phần chỉ vị trí.',{exact:true}).waitFor();
          await click('Chọn cà phê');await click(`Giao đến ${mission.places[task.place]}`);
          await page.getByText('Chưa đúng đồ vật. Nghe lại hoặc mở gợi ý, rồi thử một món khác nhé.',{exact:true}).waitFor();
          await drag(page.getByRole('button',{name:`Chọn ${word.meaning}`,exact:true}),page.getByRole('button',{name:`Giao đến ${mission.places[task.place]}`,exact:true}));
        }else{
          await click(`Chọn ${word.meaning}`);await double(page.getByRole('button',{name:`Giao đến ${mission.places[task.place]}`,exact:true}));
        }
        await page.getByText('Chính xác!',{exact:true}).waitFor();
        if(scene.id==='cafe'&&index===0){await page.waitForTimeout(350);await page.screenshot({path:path.join(output,'06-scene-mission.png'),fullPage:true});}
        await double(page.getByRole('button',{name:index===2?'Xem kết quả nhiệm vụ':'Nhiệm vụ tiếp theo',exact:true}));
        await atTop();
      }
      await page.getByText(new RegExp(`Bạn trả lời đúng ${scene.id==='cafe'?2:3}/3 câu`)).waitFor();
      await click('Chơi lại một lượt');await page.getByText('Lượt 1/3',{exact:true}).waitFor();await click('Đổi hoạt động');
    }
    checks.push('12 scene missions: listening, wrong object/place, drag, tap, rapid delivery/next, first-try result and restart');
    for(const story of adventures.choiceStories)for(const a of [0,1])for(const b of [0,1]){
      await show('choiceStories');await click(`Bắt đầu ${story.title}`);
      let node=story.nodes[story.start];
      await click('Hiện nghĩa và pinyin');await page.getByText(node.meaning,{exact:true}).waitFor();
      for(const index of [a,b]){
        await double(page.getByRole('button',{name:`Chọn lời đáp ${node.choices[index].chinese}`,exact:true}));
        await double(page.getByRole('button',{name:'Tiếp tục câu chuyện',exact:true}));
        await atTop();
        node=story.nodes[node.choices[index].next];await page.getByText(node.chinese,{exact:true}).waitFor();
      }
      await page.getByRole('heading',{name:node.ending,exact:true}).waitFor();
      await page.getByLabel('Đã hoàn thành 2 trên 2 lượt',{exact:true}).waitFor();
      await click('Xem lại hội thoại');assert.equal(await page.getByText('BẠN ĐÃ CHỌN',{exact:true}).count(),2);
      if(story.id==='cafe'&&a===0&&b===0){await page.waitForTimeout(350);await page.screenshot({path:path.join(output,'07-story-ending.png'),fullPage:true});}
      await click('Ẩn hội thoại đã chọn');await click('Thử nhánh khác');await page.getByText(story.nodes[story.start].chinese,{exact:true}).waitFor();
    }
    checks.push('all 16 story endings, meanings, transcript, alternate paths and rapid choice/advance');
    await show('characters');await click('Luyện cả 12 chữ');
    for(const [index,puzzle] of adventures.assemblyCharacters.entries()){
      const choose=async part=>{const candidate=page.getByRole('button',{name:new RegExp(`^Chọn thành phần ${part}, mảnh`)}).first();await double(candidate)};
      if(index===0){
        await choose('口');await choose('木');await double(page.getByRole('button',{name:'Kiểm tra chữ',exact:true}));await page.getByText('Cùng xem lại nhé',{exact:true}).waitFor();await click('Xếp lại các phần');
        const piece=page.getByRole('button',{name:/^Chọn thành phần 亻, mảnh/}),target=page.getByRole('button',{name:'Ô 1: Bên trái, còn trống',exact:true});
        await drag(piece,target);await page.getByRole('button',{name:'Ô 1: Bên trái, 亻, chạm để lấy ra',exact:true}).waitFor();await choose('木');
      }else for(const part of puzzle.structure.parts)await choose(part);
      await double(page.getByRole('button',{name:'Kiểm tra chữ',exact:true}));await page.getByText('Đã ghép đúng cấu tạo!',{exact:true}).waitFor();
      if(puzzle.character==='国'){await page.waitForTimeout(350);await page.screenshot({path:path.join(output,'08-character-assembly.png'),fullPage:true});}
      await double(page.getByRole('button',{name:index===11?'Xem kết quả ghép chữ':'Chữ tiếp theo',exact:true}));
      await atTop();
    }
    await page.getByText(/Bạn trả lời đúng 11\/12 câu/).waitFor();
    checks.push('12 character assemblies, wrong/reset, drag/tap, duplicate 木 pieces, four layouts, first-try score and rapid controls');
    await show('characters');await page.getByRole('button',{name:'Luyện bố cục Khung bao',exact:true}).click();
    await page.getByRole('button',{name:/^Chọn thành phần 木, mảnh/}).click();await page.getByRole('button',{name:/^Chọn thành phần 日, mảnh/}).click();await click('Kiểm tra chữ');await click('Xem cách ghép');await page.getByText('Cùng đối chiếu cách ghép',{exact:true}).waitFor();await click('Chữ tiếp theo');await page.getByText('Lượt 2/2',{exact:true}).waitFor();await click('Đổi hoạt động');checks.push('assembly reveal and group change');
    for(const document of adventures.readingDocuments){
      await show('reading');await click(`Bắt đầu ${document.title}`);
      for(const [index,question] of document.questions.entries()){
        const row=document.rows[0];await page.getByRole('button',{name:`Đánh dấu dòng 1: ${row.chinese}`,exact:true}).click();await page.getByText('Đã đánh dấu',{exact:true}).waitFor();
        await click('Hiện bản dịch hỗ trợ');await page.getByText(row.meaning,{exact:true}).waitFor();await click('Ẩn bản dịch');
        const answer=index===0?(question.answer+1)%3:question.answer;
        await double(page.getByRole('button',{name:question.choices[answer],exact:true}));
        await page.getByText(question.explanation,{exact:true}).waitFor();assert.equal(await page.getByText('✓ Dữ kiện đáp án',{exact:true}).count(),question.evidence.length);
        if(document.id==='ticket'&&index===0){await page.waitForTimeout(350);await page.screenshot({path:path.join(output,'09-reading-evidence.png'),fullPage:true});}
        await double(page.getByRole('button',{name:index===3?'Xem kết quả đọc':'Câu hỏi đọc tiếp theo',exact:true}));
        await atTop();
      }
      await page.getByText(/Bạn trả lời đúng 3\/4 câu/).waitFor();await click('Chọn tư liệu khác');
    }
    checks.push('12 real-world reading questions: mark, translate, wrong/correct, evidence rows, rapid next and result');
    await show('hub');
    for(const [title,path] of [['Nhiệm vụ trong cảnh','missions'],['Truyện có lựa chọn','choice-stories'],['Ghép thành phần Hán tự','characters'],['Tìm thông tin thực tế','reading-missions']]){
      await page.getByRole('button').filter({has:page.getByText(title,{exact:true})}).click();assert.equal(await page.evaluate(()=>window.qa.navigation),`/practice/${path}`);
    }
    checks.push('all four activities discoverable from real Practice hub');
    for(const width of [320,390,768])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:844});await page.evaluate(theme=>window.qa.settings({themeMode:theme}),theme);
      for(const screen of ['scenes','sentences','challenges','post','missions','choiceStories','characters','reading','hub']){await show(screen);await noOverflow();}
      await show('missions',{scene:'cafe'});await noOverflow();
      await show('characters');await click('Luyện cả 12 chữ');await noOverflow();
      await show('choiceStories');await click('Bắt đầu Một buổi chiều ở quán');await noOverflow();
      await show('reading');await click('Bắt đầu Đọc vé tàu');await noOverflow();
    }
    await page.setViewportSize({width:320,height:740});
    await page.emulateMedia({reducedMotion:'reduce'});await show('scenes');await click('Khám phá Quán cà phê');await click('Khám phá cà phê');await noOverflow();
    await page.screenshot({path:path.join(output,'05-compact-dark.png'),fullPage:true});
    await show('characters');await click('Luyện cả 12 chữ');await noOverflow();await page.screenshot({path:path.join(output,'10-compact-dark-assembly.png'),fullPage:true});
    await page.evaluate(()=>window.qa.settings({soundEnabled:false}));await show('missions',{scene:'cafe'});assert.equal(await page.getByRole('button',{name:'Nghe yêu cầu giao đồ',exact:true}).isDisabled(),true);await click('Hiện pinyin và nghĩa');await page.getByText(adventures.sceneMissions.cafe.tasks[0].meaning,{exact:true}).waitFor();
    checks.push('320/390/768px, light/dark, reduced motion, speech-off text fallback');
    for(const screen of ['missions','choiceStories','characters','reading']){
      await show(screen,screen==='missions'?{scene:'cafe'}:{});
      if(screen==='choiceStories')await click('Bắt đầu Một buổi chiều ở quán');
      if(screen==='characters'){await click('Luyện cả 12 chữ');await click('Gợi ý pinyin');}
      if(screen==='reading')await click('Bắt đầu Đọc vé tàu');
      await page.evaluate(()=>{for(const text of document.querySelectorAll('[dir="auto"]')){const s=getComputedStyle(text);text.style.fontSize=`${parseFloat(s.fontSize)*1.35}px`;text.style.lineHeight=`${parseFloat(s.lineHeight)*1.35}px`;}});
      await noOverflow();
    }
    checks.push('35% larger text on 320px active screens, automatic top-of-turn scrolling');
    assert.deepEqual(errors,[],'no runtime errors');
    fs.writeFileSync(path.join(output,'ui-results.json'),JSON.stringify({checks,errors,liveBackendUsed:false,learnerDatabaseOpened:false},null,2));
    console.log(JSON.stringify({passed:checks.length,checks,errors},null,2));
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
