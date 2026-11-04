/* Purpose-built ADB QA helper. Deliberately limited to the explicitly selected emulator. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const [serial, command, argument = ''] = process.argv.slice(2);
if (!/^emulator-\d+$/.test(serial || '')) throw new Error('Emulator serial required; phone writes are not supported');
const adb = process.env.ANDROID_ADB || 'C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const build = process.env.V7_QA_BUILD || '39';
if (!/^[1-9]\d{0,5}$/.test(build)) throw new Error('Safe QA build number required');
const output = path.resolve(__dirname, `../artifacts/v7-2026-10-10/native/build${build}-emulator`);
fs.mkdirSync(output, { recursive: true });
const run = (...args) => execFileSync(adb, ['-s', serial, ...args], { timeout: 30000 });
const decode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const dump = () => {
  run('shell', 'uiautomator', 'dump', '/sdcard/v7-qa-window.xml');
  const xml = run('shell', 'cat', '/sdcard/v7-qa-window.xml').toString();
  fs.writeFileSync(path.join(output, 'last-window.xml'), xml);
  return [...xml.matchAll(/<node\b([^>]+)>/g)].map(match => {
    const node = {};
    for (const attr of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) node[attr[1]] = decode(attr[2]);
    return node;
  });
};
if (command === 'dump') {
  console.log(JSON.stringify(dump().filter(n => n.text || n['content-desc']).map(n => ({ text: n.text, description: n['content-desc'], bounds: n.bounds, clickable: n.clickable, class: n.class })), null, 2));
} else if (command === 'tap-text' || command === 'tap-description') {
  const field = command === 'tap-text' ? 'text' : 'content-desc';
  const matches = dump().filter(n => n[field] === argument && n.enabled === 'true');
  if (matches.length !== 1) throw new Error(`Expected one enabled match for ${field}: ${argument}; found ${matches.length}`);
  const bounds = matches[0].bounds.match(/\d+/g).map(Number);
  run('shell', 'input', 'tap', String(Math.floor((bounds[0] + bounds[2]) / 2)), String(Math.floor((bounds[1] + bounds[3]) / 2)));
} else if (command === 'capture') {
  if (!/^[\w-]+$/.test(argument)) throw new Error('Safe capture name required');
  fs.writeFileSync(path.join(output, `${argument}.png`), run('exec-out', 'screencap', '-p'));
  run('shell', 'uiautomator', 'dump', '/sdcard/v7-qa-window.xml');
  fs.writeFileSync(path.join(output, `${argument}.xml`), run('shell', 'cat', '/sdcard/v7-qa-window.xml'));
} else if (command === 'type') {
  if (!/^[a-zA-Z0-9 ._-]{1,200}$/.test(argument)) throw new Error('QA ASCII input only');
  run('shell', 'input', 'text', argument.replaceAll(' ', '%s'));
} else if (command === 'back') run('shell', 'input', 'keyevent', '4');
else if (command === 'scroll') run('shell', 'input', 'swipe', '500', '1500', '500', '500', '350');
else throw new Error('Unknown QA action');
