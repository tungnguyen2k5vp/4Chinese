import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateVocabularyDataset } from '../src/services/data-import/validation';

async function main() {
  const data=JSON.parse(await readFile(resolve('src/data/hsk-vocabulary.json'),'utf8')) as unknown[];
  const issues=validateVocabularyDataset(data); const distribution:Record<string,number>={};
  for(const item of data){if(typeof item==='object'&&item&&'hskBand'in item){const band=String(item.hskBand);distribution[band]=(distribution[band]??0)+1;}}
  const report={generatedAt:new Date().toISOString(),records:data.length,valid:issues.length===0,issues,distribution};
  await writeFile(resolve('data-validation-report.json'),JSON.stringify(report,null,2));
  process.stdout.write(JSON.stringify({...report,issues:issues.slice(0,25)},null,2)+'\n');
  if(issues.length)process.exitCode=1;
}
void main();
