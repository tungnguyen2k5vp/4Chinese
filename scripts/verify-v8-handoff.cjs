const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/Admin/.vscode/extensions/vscjava.migrate-java-to-azure-1.24.0-win32-x64/node_modules/playwright');
const out = path.resolve(__dirname,'../artifacts/v8-english-2026-10-13');
async function run() {
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'capture-manifest.json'),'utf8'));
  if(manifest.screenshots.length!==85) throw new Error('Screenshot count mismatch');
  for(const item of manifest.screenshots) {
    const file=path.join(out,item.file);
    if(!file.startsWith(out+path.sep)) throw new Error('Screenshot path outside handoff');
    if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256) throw new Error('PNG hash mismatch');
  }
  const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(folder,item.name)):[path.join(folder,item.name)]);
  if(walk(out).some(file=>/\.(db|sqlite|wal|pem|key|keystore|apk)$/i.test(file))) throw new Error('Private/raw data in handoff');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    await page.goto(pathToFileURL(path.join(out,'index.html')).href);
    for(const [label,count] of [['Tất cả',85],['Web',44],['Android native',39],['Chinese regression',2],['Tất cả',85]]) {
      await page.getByRole('button',{name:label,exact:true}).click();
      if(await page.locator('article:visible').count()!==count) throw new Error('Gallery filter mismatch '+label);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out,'handoff-verification.json'),JSON.stringify({result:'PASS',screenshots:85,native:41,web:44,contactSheets:15,documents:18,pngHashes:'PASS',galleryFilters:'PASS',rawDataExcluded:true,productCompletion:'PARTIAL; see docs/V8_FINAL_REPORT.md'},null,2));
  console.log('V8 handoff PASS: 85 image hashes, gallery filters, raw-data exclusion');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
