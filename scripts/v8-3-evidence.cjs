// Generate an auditable comparison of the isolated emulator snapshots.
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/v8-3-hanzi-memory');
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const before=read('database/baseline/report.json').report,after=read('database/after-supplemental/report.json').report;
const auxiliary=new Set(['mistake_records','practice_attempt_daily','vocabulary_skill_mastery']);
const changes=[],violations=[];
for(const [database,original]of Object.entries(before)){
  if(JSON.stringify(original.schema)!==JSON.stringify(after[database]?.schema))violations.push(database+':schema');
  for(const [table,record]of Object.entries(original.tables))if(record.sha256!==after[database]?.tables[table]?.sha256){
    const allowed=database==='hanzi30.db'&&auxiliary.has(table);
    changes.push({database,table,before:record.count,after:after[database]?.tables[table]?.count,allowed});
    if(!allowed)violations.push(database+':'+table);
  }
}
// notes excluded from the broad progress hash must be checked separately, not ignored.
const oldDb=new DatabaseSync(path.join(out,'database/baseline/hanzi30.db'),{readOnly:true});
const newDb=new DatabaseSync(path.join(out,'database/after-supplemental/hanzi30.db'),{readOnly:true});
const oldNotes=oldDb.prepare('SELECT vocabulary_id,notes FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
const noteChanges=[];
for(const old of oldNotes){const current=newDb.prepare('SELECT notes FROM user_vocabulary_progress WHERE vocabulary_id=?').get(old.vocabulary_id);
  if(current?.notes!==old.notes){
    const expected=old.vocabulary_id==='hsk-7630c71400dc'&&current.notes===old.notes+(old.notes?'\n\n':'')+'[4Chinese:mnemonic:请]\nMy memory QA\n[/4Chinese:mnemonic]';
    noteChanges.push({id:old.vocabulary_id,expectedUserSave:expected});if(!expected)violations.push('notes:'+old.vocabulary_id);
  }
}
oldDb.close();newDb.close();
const tests=read('tests-final.json'),source=read('source-safety.json');
const result={at:new Date().toISOString(),scope:'Only FourChineseV83QA synthetic data. No physical-device DB snapshot or installation.',schema:before['hanzi30.db'].schema,vocabularyCount:before['hanzi30.db'].tables.vocabulary.count,examplesCount:before['hanzi30.db'].tables.example_sentence.count,progressCount:before['hanzi30.db'].tables.user_vocabulary_progress.count,changes,noteChanges,violations,protectedSourceChanges:source.protectedChanges,testFiles:tests.testResults.length,tests:{total:tests.numTotalTests,passed:tests.numPassedTests,failed:tests.numFailedTests},safe:!violations.length&&source.safe&&tests.success};
fs.writeFileSync(path.join(out,'database-safety.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.safe)process.exitCode=1;
