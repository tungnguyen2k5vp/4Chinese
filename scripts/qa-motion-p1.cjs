/* Actual RN-web components in an isolated browser. No learner DB; haptics are stubbed. */
/* global __dirname */
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const { build } = require('esbuild');
const { chromium } = require(process.argv[2] || 'C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');

(async () => {
  const bundle = await build({
    stdin: { resolveDir: path.resolve(__dirname, '..'), loader: 'tsx', contents: `
      import { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { PrimaryButton } from './src/components/PrimaryButton';
      import { MotionPressable } from './src/components/ui/MotionPressable';
      import { AnimatedProgressBar } from './src/components/ui/AnimatedProgressBar';
      import { StudyTransition } from './src/components/ui/StudyTransition';
      import { useAppStore } from './src/stores/app-store';
      useAppStore.setState({settings: {motionMode: 'full'}});
      window.qa = {count: 0, mode: mode => useAppStore.setState({settings: {motionMode: mode}})};
      function Harness() {
        const [s, set] = useState({turn: 1, progress: 0, disabled: false, loading: false, feedback: false});
        window.qa.update = patch => set(s => ({...s, ...patch}));
        return <div style={{padding: 40, width: 300}}>
          <div data-testid="header">Stable header</div>
          <PrimaryButton label="Primary" onPress={() => window.qa.count++} disabled={s.disabled} loading={s.loading}/>
          <PrimaryButton label="Secondary" variant="secondary" onPress={() => window.qa.count++}/>
          <MotionPressable accessibilityLabel="Card" onPress={() => window.qa.count++}><div>Card</div></MotionPressable>
          <AnimatedProgressBar progress={s.progress} color="green" trackColor="gray" accessibilityLabel="Progress"/>
          <StudyTransition testID="question" turnKey={'same-word:' + s.turn}>Question {s.turn}</StudyTransition>
          {s.feedback && <StudyTransition testID="feedback" turnKey={String(s.turn)} animateOnMount accessibilityLiveRegion="polite">Correct</StudyTransition>}
        </div>;
      }
      const root = createRoot(document.getElementById('root'));
      window.qa.unmount = () => root.unmount();
      root.render(<Harness/>);
    ` },
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: { 'react-native': 'react-native-web', 'react-native-svg': path.resolve(__dirname, '../node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js') },
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'globalThis' },
    plugins: [{ name: 'optional-haptics', setup(b) {
      b.onResolve({ filter: /feedback-service$/ }, () => ({ path: 'feedback', namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export async function playHaptic() {}' }));
    } }],
  });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/bundle.js' ? bundle.outputFiles[0].contents : '<div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const primary = page.getByRole('button', { name: 'Primary', exact: true });
    const question = page.getByTestId('question');
    const update = patch => page.evaluate(p => window.qa.update(p), patch);
    const scale = element => element.evaluate(e => new DOMMatrix(getComputedStyle(e).transform).a);
    const atRest = async element => {
      await page.waitForFunction(e => Math.abs(new DOMMatrix(getComputedStyle(e).transform).a - 1) < 0.001, await element.elementHandle(), { timeout: 1500 });
    };
    const hold = async element => { await element.hover(); await page.mouse.down(); await page.waitForTimeout(140); };
    await primary.waitFor();
    assert.equal(await question.evaluate(e => getComputedStyle(e).opacity), '1');
    await hold(primary); assert.ok(Math.abs(await scale(primary) - 0.97) < 0.001);
    await page.mouse.up(); await page.waitForTimeout(140); await atRest(primary);
    const secondary = page.getByRole('button', { name: 'Secondary', exact: true });
    await hold(secondary); assert.ok(Math.abs(await scale(secondary) - 0.98) < 0.001);
    await page.mouse.up();
    const count = await page.evaluate(() => window.qa.count);
    await hold(primary); await page.mouse.move(580, 700); await page.mouse.up();
    await page.waitForTimeout(140); await atRest(primary);
    assert.equal(await page.evaluate(() => window.qa.count), count);
    for (let i = 0; i < 10; i++) await primary.click({ delay: 2 });
    await page.waitForTimeout(140); await atRest(primary);
    assert.equal(await page.evaluate(() => window.qa.count), count + 10);
    await hold(primary);
    for (const patch of [{ disabled: true }, { disabled: false, loading: true }]) {
      await update(patch); await page.waitForTimeout(30);
      assert.equal(await primary.getAttribute('aria-disabled'), 'true');
      await primary.dispatchEvent('click'); await atRest(primary);
      assert.equal(await page.evaluate(() => window.qa.count), count + 10);
      await page.mouse.up();
    }
    assert.equal(await primary.getAttribute('aria-busy'), 'true');
    await update({ loading: false, turn: 2, feedback: true });
    await page.waitForTimeout(30);
    assert.ok(Number(await question.evaluate(e => getComputedStyle(e).opacity)) < 1);
    assert.equal(await page.getByTestId('header').evaluate(e => getComputedStyle(e).transform), 'none');
    await update({ turn: 3 }); await page.waitForTimeout(330); await atRest(question);
    assert.equal(await question.innerText(), 'Question 3');
    const progress = page.getByRole('progressbar');
    for (const [value, expected] of [[NaN, 0], [Infinity, 0], [-2, 0], [2, 100], [0.01, 1], [1, 100], [0, 0]]) {
      await page.evaluate(value => window.qa.update({ progress: value }), value);
      await page.waitForTimeout(20);
      assert.equal(Number(await progress.getAttribute('aria-valuenow')), expected);
    }
    await update({ progress: 0.9 }); await page.waitForTimeout(45);
    await update({ progress: 0.2 }); await page.waitForTimeout(420);
    const width = await progress.evaluate(e => e.firstElementChild.getBoundingClientRect().width / e.getBoundingClientRect().width);
    assert.ok(Math.abs(width - 0.2) < 0.01);
    await hold(primary); await update({ turn: 4 });
    await page.evaluate(() => window.qa.mode('off'));
    await atRest(primary); await atRest(question); await page.mouse.up();
    for (const mode of ['reduced', 'off', 'full']) {
      await page.evaluate(mode => window.qa.mode(mode), mode); await page.waitForTimeout(30);
      if (mode === 'full') await page.emulateMedia({ reducedMotion: 'reduce' });
      await update({ turn: mode, progress: 0.7 }); await hold(primary); await atRest(primary); await atRest(question);
      assert.equal(await question.evaluate(e => getComputedStyle(e).opacity), '1');
      await page.mouse.up();
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(30);
    await hold(primary); await update({ turn: 8, progress: 0.8 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(30); await atRest(primary); await atRest(question);
    assert.equal(Number(await progress.getAttribute('aria-valuenow')), 80);
    await page.mouse.up();
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await update({ turn: 9 }); await page.evaluate(() => window.qa.unmount());
    await page.waitForTimeout(400); assert.deepEqual(errors, []);
    console.log('PASS: first turn, 100 ms press/release, variants, cancel, 10 taps, disabled/loading, turn retarget, progress bounds/retarget, reduced/off/OS, simulated visibility, unmount. WEB ONLY.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
