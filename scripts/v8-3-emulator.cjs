// New QA-only AVD: no learner userdata image is read, copied or reset.
const fs=require('node:fs'),path=require('node:path');const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base=path.join(root,'artifacts/v8-3-hanzi-memory/emulator');
const name='FourChineseV83QA',folder=path.join(base,name+'.avd');
if(fs.existsSync(folder))throw new Error('QA AVD already exists; refusing to recreate it');
fs.mkdirSync(folder,{recursive:true});
const template=fs.readFileSync(path.join(root,'artifacts/v8-2-chinese-redesign-2026-10-14/native-avd/FourChineseV82QA.avd/config.ini'),'utf8');
const config=template.replace(/^AvdId=.*$/m,'AvdId='+name).replace(/^avd.ini.displayname=.*$/m,'avd.ini.displayname=4Chinese V8.3 isolated QA').replace(/^disk.dataPartition.size=.*$/m,'disk.dataPartition.size=4G');
fs.writeFileSync(path.join(folder,'config.ini'),config);fs.writeFileSync(path.join(base,name+'.ini'),`avd.ini.encoding=UTF-8\npath=${folder}\ntarget=android-36\n`);
const log=fs.openSync(path.join(base,'emulator.log'),'a'),err=fs.openSync(path.join(base,'emulator-error.log'),'a');
const proc=spawn('C:/Users/Admin/AppData/Local/Android/Sdk/emulator/emulator.exe',['-avd',name,'-port','5566','-no-window','-no-snapshot','-no-audio','-no-metrics','-gpu','swiftshader_indirect','-skip-adb-auth'],{env:{...process.env,ANDROID_AVD_HOME:base,ANDROID_ADB_SERVER_PORT:'5045'},windowsHide:true,detached:true,stdio:['ignore',log,err]});
proc.unref();console.log(JSON.stringify({pid:proc.pid,serial:'127.0.0.1:5567',adbPort:5045,userdata:'NEW_ISOLATED_QA_ONLY'}));
