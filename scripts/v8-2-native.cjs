process.env.NATIVE_QA_ADB_PORT = '5043';
process.env.NATIVE_QA_SERIAL = '127.0.0.1:5563';
process.env.NATIVE_QA_OUTPUT = 'artifacts/v8-2-chinese-redesign-2026-10-14';
process.env.NATIVE_QA_BUILD = 'V8.2 in progress; app 0.1.49/versionCode51; isolated new QA AVD';
require('./native-v8-qa.cjs');
