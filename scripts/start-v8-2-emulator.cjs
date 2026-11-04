/* Creates a separate QA AVD. Never copies, resets or opens the learner data image. */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'artifacts/v8-2-chinese-redesign-2026-10-14/native-avd');
const name = process.env.NATIVE_QA_AVD_NAME || 'FourChineseV82QA';
if (!/^FourChineseV82QA(?:-[A-Z0-9]+)?$/.test(name)) throw new Error('Isolated V8.2 QA AVD name required');
const avd = path.join(base, name + '.avd');
fs.mkdirSync(avd, { recursive: true });
const config = fs.readFileSync('C:/Users/Admin/.android/avd/Pixel_2.avd/config.ini', 'utf8')
  .replace(/^AvdId=.*$/m, 'AvdId=' + name)
  .replace(/^avd.ini.displayname=.*$/m, 'avd.ini.displayname=4Chinese V8.2 isolated QA')
  .replace(/^disk.dataPartition.size=.*$/m, 'disk.dataPartition.size=16G')
  .replace(/^fastboot.forceColdBoot=.*$/m, 'fastboot.forceColdBoot=yes')
  .replace(/^fastboot.forceFastBoot=.*$/m, 'fastboot.forceFastBoot=no');
if (!fs.existsSync(path.join(avd, 'config.ini'))) fs.writeFileSync(path.join(avd, 'config.ini'), config);
if (!fs.existsSync(path.join(base, name + '.ini'))) fs.writeFileSync(path.join(base, name + '.ini'), `avd.ini.encoding=UTF-8\npath=${avd}\ntarget=android-36\n`);
const stdout = fs.openSync(path.join(base, `emulator-${name}.log`), 'a');
const stderr = fs.openSync(path.join(base, `emulator-${name}-error.log`), 'a');
const proc = spawn('C:/Users/Admin/AppData/Local/Android/Sdk/emulator/emulator.exe', ['-avd', name, '-port', '5562', '-skip-adb-auth', '-no-window', '-no-snapshot', '-no-audio', '-no-metrics', '-gpu', 'swiftshader_indirect'], {
  env: { ...process.env, ANDROID_AVD_HOME: base }, detached: true, windowsHide: true,
  stdio: ['ignore', stdout, stderr],
});
proc.unref();
console.log(JSON.stringify({ pid: proc.pid, serial: '127.0.0.1:5563', data: 'NEW_ISOLATED_QA_AVD_NO_PERSONAL_DATA', folder: base }));
