const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/* global __dirname */
const root = path.resolve(__dirname, '..');
const historyRoot = path.join(root, 'artifacts/english-v7-4-2026-10-11');
const curatedRoot = path.join(root, 'artifacts/english-v7-4-verified-2026-10-11');
const sourceScreenshots = path.join(historyRoot, 'screenshots');
const outputScreenshots = path.join(curatedRoot, 'screenshots');
const manifest = JSON.parse(fs.readFileSync(path.join(historyRoot, 'capture-manifest.json'), 'utf8'));

if (fs.existsSync(curatedRoot)) throw new Error(`Refusing to overwrite curated QA output: ${curatedRoot}`);
const valid = [...manifest.screenshots, ...manifest.supplementalScreenshots]
  .filter((item) => item.validity === 'VALID')
  .sort((left, right) => Number.parseInt(left.file, 10) - Number.parseInt(right.file, 10));
if (valid.length !== 40 || manifest.validScreenshotCount !== 40) {
  throw new Error(`Expected 40 valid V7.4 captures; found manifest=${manifest.validScreenshotCount}, records=${valid.length}.`);
}
fs.mkdirSync(outputScreenshots, { recursive: true });

for (const item of valid) {
  const source = path.join(sourceScreenshots, item.file);
  const destination = path.join(outputScreenshots, item.file);
  if (!fs.existsSync(source)) throw new Error(`Missing valid screenshot: ${source}`);
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  item.sha256 = crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
}

const contactSheets = Array.from({ length: 5 }, (_, index) => `final-contact-sheet-v7.4-polished-${String(index + 1).padStart(2, '0')}.png`);
for (const file of contactSheets) {
  const source = path.join(historyRoot, file);
  if (!fs.existsSync(source)) throw new Error(`Missing final contact sheet: ${source}`);
  fs.copyFileSync(source, path.join(curatedRoot, file), fs.constants.COPYFILE_EXCL);
}

const { supplementalScreenshots, screenshots, ...metadata } = manifest;
const curatedManifest = {
  ...metadata,
  curatedPackage: true,
  fullHistoryFolder: '../english-v7-4-2026-10-11',
  totalManifestedCaptures: screenshots.length + supplementalScreenshots.length,
  supersededCaptureCount: screenshots.length + supplementalScreenshots.length - valid.length,
  validScreenshotCount: valid.length,
  screenshots: valid,
  contactSheets,
};
fs.writeFileSync(path.join(curatedRoot, 'capture-manifest.json'), JSON.stringify(curatedManifest, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ curatedRoot, screenshots: valid.length, contactSheets: contactSheets.length, sha256s: valid.length }));
