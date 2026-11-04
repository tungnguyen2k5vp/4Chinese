const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const serial='127.0.0.1:5585';
const adb='C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const out=path.resolve(__dirname,'../artifacts/english-personal-vocabulary-2026-10-11/native');fs.mkdirSync(out,{recursive:true});
const run=(...args)=>execFileSync(adb,['-P','5041','-s',serial,...args],{timeout:30000});
function dump(){run('shell','uiautomator','dump','/sdcard/personal-vocab-qa.xml');const xml=run('shell','cat','/sdcard/personal-vocab-qa.xml').toString();return [...xml.matchAll(/<node\b([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2].replaceAll('&amp;','&').replaceAll('&quot;','"')])));}
const [cmd,value]=process.argv.slice(2);
if(cmd==='dump')console.log(JSON.stringify(dump().filter(n=>n.text||n['content-desc']).map(n=>({text:n.text,label:n['content-desc'],bounds:n.bounds})),null,2));
else if(cmd==='tap'){const nodes=dump().filter(n=>(n.text===value||n['content-desc']===value)&&n.enabled==='true');if(!nodes.length)throw Error('No enabled '+value);const b=nodes[0].bounds.match(/\d+/g).map(Number);run('shell','input','tap',String((b[0]+b[2])/2|0),String((b[1]+b[3])/2|0));}
else if(cmd==='type'){if(!/^[a-zA-Z0-9 ._-]{1,200}$/.test(value))throw Error('ASCII QA input only');run('shell','input','text',value.replaceAll(' ','%s'));}
else if(cmd==='enter')run('shell','input','keyevent','66');
else if(cmd==='back')run('shell','input','keyevent','4');
else if(cmd==='scroll')run('shell','input','swipe','550','1700','550','500','400');
else if(cmd==='scroll-up')run('shell','input','swipe','550','500','550','1700','400');
else if(cmd==='capture'){if(!/^[\w-]+$/.test(value))throw Error('Safe name required');const nodes=dump();fs.writeFileSync(path.join(out,value+'.png'),run('exec-out','screencap','-p'));fs.writeFileSync(path.join(out,value+'.json'),JSON.stringify(nodes,null,2));}
else if(cmd==='route'){if(!/^\/english(?:\/[a-z-]+)?$/.test(value))throw Error('English route required');console.log(run('shell','am','start','-a','android.intent.action.VIEW','-d','4chinese:/'+value,'com.tungnguyen2k5vp.fourchinese').toString());}
else throw Error('Unknown command');
