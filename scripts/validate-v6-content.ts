/** Read-only CI gate: structural/content references only, never academic approval. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateVocabularyDataset } from '../src/services/data-import/validation';
import { buildV5ReadinessReport } from './report-v5-readiness';

async function main() {
  const vocabulary = JSON.parse(await readFile(resolve('src/data/hsk-vocabulary.json'), 'utf8')) as unknown[];
  const issues = validateVocabularyDataset(vocabulary);
  const readiness = buildV5ReadinessReport();
  if (issues.length) {
    process.stderr.write(`${JSON.stringify({valid:false,issueCount:issues.length,issues:issues.slice(0,50)},null,2)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${JSON.stringify({
    valid:true,
    scope:'BUNDLED_SOURCE_STRUCTURE_ONLY_NOT_ACADEMIC_VERIFICATION',
    vocabularyRecords:vocabulary.length,
    internalVocabularyRecords: readiness.levels.reduce((sum, row) => sum + row.internalVocabulary, 0),
    grammarDrafts:readiness.inventory.totals.grammarPendingPoints,
    lexicalDraftSenses:readiness.inventory.totals.lexicalDraftSenses,
    storyDrafts:readiness.inventory.totals.storyDrafts,
    examDraftCandidates:readiness.inventory.totals.examDraftCandidates,
    verifiedFullMocks:readiness.inventory.verifiedFullMocks,
    licensedAudioAssets:readiness.inventory.nativeOrLicensedAudioAssets,
  },null,2)}\n`);
}

void main().catch(error=>{
  process.stderr.write(`${error instanceof Error?error.message:'CONTENT_VALIDATION_FAILED'}\n`);
  process.exitCode=1;
});
