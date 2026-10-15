/* Emit a checked apply_patch patch; never rewrite source files or signing configuration. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const [nextVersion, buildText] = process.argv.slice(2);
const nextBuild = Number(buildText);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const gradle = read('android/app/build.gradle');
const versionTuple = value => value.split('.').map(Number);
if (!/^\d+\.\d+\.\d+$/.test(nextVersion || '') || !Number.isSafeInteger(nextBuild))
  throw new Error('Usage: node scripts/prepare-android-version.cjs VERSION BUILD');
const old = versionTuple(app.version), next = versionTuple(nextVersion);
const firstDifference = next.findIndex((part, index) => part !== old[index]);
if (firstDifference < 0 || next[firstDifference] <= old[firstDifference] || nextBuild <= app.android.versionCode)
  throw new Error('Versions must increase monotonically');
if (pkg.version !== app.version || lock.version !== app.version || lock.packages[''].version !== app.version ||
    !gradle.includes(`versionCode ${app.android.versionCode}`) || !gradle.includes(`versionName "${app.version}"`))
  throw new Error('Existing version files disagree; no patch emitted');
const patch = ['*** Begin Patch'];
for (const file of ['app.json', 'package.json', 'package-lock.json', 'android/app/build.gradle']) {
  const lines = read(file).split(/\r?\n/);
  const changed = lines.map(line => {
    if (line.includes(`"version": "${app.version}"`) || line.includes(`versionName "${app.version}"`))
      return line.replace(app.version, nextVersion);
    if (file === 'app.json' && line.includes(`"versionCode": ${app.android.versionCode}`))
      return line.replace(String(app.android.versionCode), String(nextBuild));
    if (file.endsWith('build.gradle') && line.trim() === `versionCode ${app.android.versionCode}`)
      return line.replace(String(app.android.versionCode), String(nextBuild));
    return line;
  });
  patch.push(`*** Update File: ${path.join(root, file).replaceAll('\\', '/')}`);
  lines.forEach((line, index) => {
    if (line !== changed[index]) patch.push('@@', `-${line}`, `+${changed[index]}`);
  });
}
patch.push('*** End Patch');
process.stdout.write(patch.join('\n') + '\n');
