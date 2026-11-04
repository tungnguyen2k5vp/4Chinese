const { execFileSync } = require('node:child_process');
const adb = 'C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const run = (...args) => execFileSync(adb, ['-P', '5042', '-s', '127.0.0.1:5561', ...args], { encoding: 'utf8', timeout: 30000 });
if (run('shell', 'getprop', 'ro.kernel.qemu').trim() !== '1') throw new Error('Private QA emulator required');
const [command, value] = process.argv.slice(2);
if (command === 'width' && ['320', '360', '390', '412'].includes(value)) {
  console.log(run('shell', 'wm', 'density', String(Math.round(1080 * 160 / Number(value)))));
} else if (command === 'font' && ['1.0', '1.3', '1.6'].includes(value)) {
  console.log(run('shell', 'settings', 'put', 'system', 'font_scale', value));
} else if (command === 'theme' && ['yes', 'no'].includes(value)) {
  console.log(run('shell', 'cmd', 'uimode', 'night', value));
} else if (command === 'restore') {
  run('shell', 'wm', 'density', '420');
  run('shell', 'settings', 'put', 'system', 'font_scale', '1.0');
  run('shell', 'cmd', 'uimode', 'night', 'no');
} else throw new Error('Known QA display setting required');
console.log(JSON.stringify({ size: run('shell', 'wm', 'size').trim(), density: run('shell', 'wm', 'density').trim(), fontScale: run('shell', 'settings', 'get', 'system', 'font_scale').trim(), night: run('shell', 'cmd', 'uimode', 'night').trim() }));
