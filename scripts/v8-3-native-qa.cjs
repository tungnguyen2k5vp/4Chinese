// Every command is scoped to the new V8.3 emulator. Physical devices cannot pass the guard.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "artifacts/v8-3-hanzi-memory"),
  adb = "C:/Users/Admin/AppData/Local/Android/Sdk/platform-tools/adb.exe";
const pkg = "com.tungnguyen2k5vp.fourchinese",
  serial = "127.0.0.1:5567",
  port = "5045";
const run = (...args) =>
  execFileSync(adb, ["-P", port, "-s", serial, ...args], {
    timeout: 45000,
    maxBuffer: 128 * 1024 * 1024,
  });
if (
  run("shell", "getprop", "ro.kernel.qemu").toString().trim() !== "1" ||
  run("shell", "getprop", "ro.boot.qemu.avd_name").toString().trim() !==
    "FourChineseV83QA"
)
  throw new Error("New V8.3 isolated QA emulator required");
const [command, value] = process.argv.slice(2);
fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });
const decode = (v) =>
  v
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
function nodes() {
  run("shell", "uiautomator", "dump", "/sdcard/v83-qa.xml");
  const xml = run("shell", "cat", "/sdcard/v83-qa.xml").toString();
  return [...xml.matchAll(/<node\b([^>]+)>/g)].map((m) =>
    Object.fromEntries(
      [...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [
        a[1],
        decode(a[2]),
      ]),
    ),
  );
}
if (command === "install")
  console.log(
    run(
      "install",
      "-r",
      path.join(root, "android/app/build/outputs/apk/debug/app-debug.apk"),
    ).toString(),
  );
else if (command === "install-standalone")
  console.log(
    run(
      "install",
      "-r",
      path.join(root, "android/app/build/outputs/apk/release/app-release.apk"),
    ).toString(),
  );
else if (command === "dev")
  console.log(
    run(
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "'4chinese://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8085'",
      pkg,
    ).toString(),
  );
else if (command === "open") {
  if (!/^[a-zA-Z0-9/_?=&%.-]+$/.test(value)) throw new Error("Invalid route");
  console.log(
    run(
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      `'4chinese://${value}'`,
      pkg,
    ).toString(),
  );
} else if(command==='wait') {
  const deadline=Date.now()+30000;let found=false;
  do {found=nodes().some(n=>n.text===value||n['content-desc']===value);} while(!found&&Date.now()<deadline);
  if(!found)throw new Error('UI did not become ready: '+value);console.log('Ready: '+value);
} else if (command === "dump")
  console.log(
    JSON.stringify(
      nodes()
        .filter((n) => n.text || n["content-desc"])
        .map((n) => ({
          text: n.text,
          label: n["content-desc"],
          bounds: n.bounds,
          clickable: n.clickable,
        })),
      null,
      2,
    ),
  );
else if (command === "tap") {
  let hits = nodes().filter(
    (n) =>
      (n.text === value || n["content-desc"] === value) && n.enabled === "true",
  );
  const clickable = hits.filter((n) => n.clickable === "true");
  if (clickable.length === 1) hits = clickable;
  if (hits.length !== 1)
    throw new Error(`Expected unique UI target ${value}, found ${hits.length}`);
  const b = hits[0].bounds.match(/\d+/g).map(Number);
  const size = run("shell", "wm", "size")
    .toString()
    .match(/(\d+)x(\d+)/g)
    .at(-1)
    .split("x")
    .map(Number);
  if (b[2] <= b[0] || b[3] <= b[1] || b[1] >= size[1] - 70 || b[3] <= 20)
    throw new Error("Target clipped; scroll first");
  run(
    "shell",
    "input",
    "tap",
    String(Math.floor((b[0] + b[2]) / 2)),
    String(Math.floor((Math.max(24, b[1]) + Math.min(size[1] - 70, b[3])) / 2)),
  );
} else if (command === "scroll") {
  const size = run("shell", "wm", "size")
    .toString()
    .match(/(\d+)x(\d+)/g)
    .at(-1)
    .split("x")
    .map(Number);
  const down = value !== "up";
  run(
    "shell",
    "input",
    "swipe",
    String(Math.floor(size[0] / 2)),
    String(Math.floor(size[1] * (down ? 0.78 : 0.3))),
    String(Math.floor(size[0] / 2)),
    String(Math.floor(size[1] * (down ? 0.3 : 0.78))),
    "350",
  );
} else if (command === "ink") {
  const node=nodes().find(n=>n['content-desc']==='Vùng giấy viết chữ 1 trên 1');
  if(!node)throw new Error('Visible writing canvas required');
  const [x,y,right,bottom]=node.bounds.match(/\d+/g).map(Number),w=right-x,h=bottom-y;
  const strokes=value==='person'?[[.58,.16,.25,.82],[.49,.4,.81,.84]]:[[.18,.5,.82,.5]];
  for(const [a,b,c,d] of strokes)run('shell','input','swipe',String(Math.round(x+a*w)),String(Math.round(y+b*h)),String(Math.round(x+c*w)),String(Math.round(y+d*h)),'600');
} else if (command === "back") run("shell", "input", "keyevent", "4");
else if (command === "capture") {
  if (!/^[a-z0-9-]+$/.test(value)) throw new Error("Safe image name required");
  const dump = nodes(),
    png = run("exec-out", "screencap", "-p");
  fs.writeFileSync(path.join(out, "screenshots", value + ".png"), png);
  fs.writeFileSync(
    path.join(out, "screenshots", value + ".json"),
    JSON.stringify(
      {
        nodes: dump,
        at: new Date().toISOString(),
        serial,
        avd: "FourChineseV83QA",
        data: "ISOLATED_SYNTHETIC_QA_ONLY",
        font: run("shell", "settings", "get", "system", "font_scale")
          .toString()
          .trim(),
        size: run("shell", "wm", "size").toString().trim(),
        night: run("shell", "cmd", "uimode", "night").toString().trim(),
        sha256: crypto.createHash("sha256").update(png).digest("hex"),
      },
      null,
      2,
    ),
  );
  console.log(value);
} else if (command === "font") {
  if (!["1", "1.5", "2"].includes(value))
    throw new Error("Allowed QA scale required");
  run("shell", "settings", "put", "system", "font_scale", value);
} else if (command === "night") {
  if (!["yes", "no"].includes(value))
    throw new Error("Allowed QA night state required");
  run("shell", "cmd", "uimode", "night", value);
} else if (command === "size") {
  if (!["720x1280", "1080x1920"].includes(value))
    throw new Error("Allowed QA size required");
  run("shell", "wm", "size", value);
} else if (command === "offline") {
  const state = value === "yes" ? "disable" : "enable";
  run("shell", "svc", "wifi", state);
  run("shell", "svc", "data", state);
} else if (command === "restart") {
  run("shell", "am", "force-stop", pkg);
  run("shell", "monkey", "-p", pkg, "1");
} else if (command === "snapshot" || command === "fixture") {
  if (command === "snapshot" && !/^[a-z0-9-]+$/.test(value))
    throw new Error("Safe snapshot stage required");
  const folder = path.join(
    out,
    "database",
    command === "fixture" ? "isolated-fixture" : value,
  );
  fs.mkdirSync(folder, { recursive: true });
  run("shell", "am", "force-stop", pkg);
  const names = run("shell", "run-as", pkg, "ls", "files/SQLite")
    .toString()
    .trim()
    .split(/\s+/);
  const report = {};
  for (const name of [
    "hanzi30.db",
    "english-learner.db",
    "learning-preferences.db",
  ]) {
    if (!names.includes(name)) continue;
    for (const suffix of ["", "-wal"])
      if (names.includes(name + suffix))
        fs.writeFileSync(
          path.join(folder, name + suffix),
          run(
            "exec-out",
            "run-as",
            pkg,
            "cat",
            "files/SQLite/" + name + suffix,
          ),
        );
    const db = new DatabaseSync(path.join(folder, name));
    if (command === "fixture" && name === "hanzi30.db") {
      const chars = [
        "书",
        "水",
        "人",
        "家",
        "学校",
        "请",
        "情",
        "清",
        "晴",
        "未",
        "末",
        "土",
      ];
      chars.forEach((char, index) => {
        const word = db
          .prepare(
            "SELECT id FROM vocabulary WHERE simplified=? AND deck_id IS NULL LIMIT 1",
          )
          .get(char);
        if (!word) return;
        db.prepare(
          `INSERT INTO user_vocabulary_progress(vocabulary_id,status,studied,due,next_review_at,learned_at,memory_level,wrong_count,lapse_count,review_count,correct_count,created_at,updated_at)
          VALUES(?,'LEARNING',1,?,?,?,3,?,?,8,5,?,?) ON CONFLICT(vocabulary_id) DO NOTHING`,
        ).run(
          word.id,
          index < 6 ? "2026-10-01T00:00:00Z" : "2099-01-01T00:00:00Z",
          index < 6 ? "2026-10-01T00:00:00Z" : "2099-01-01T00:00:00Z",
          "2026-07-01T00:00:00Z",
          index < 3 ? 3 : 0,
          index < 3 ? 2 : 0,
          "2026-07-01T00:00:00Z",
          "2026-10-14T00:00:00Z",
        );
        if (index < 2) {
          const id = `word:${word.id}:PINYIN:hanzi_to_pinyin`;
          db.prepare(
            `INSERT OR IGNORE INTO mistake_records(id,vocabulary_id,skill_type,exercise_type,wrong_count,correct_streak,last_wrong_at,resolved,metadata,updated_at) VALUES(?,?,'PINYIN','hanzi_to_pinyin',3,0,'2026-10-14T00:00:00Z',0,'{}','2026-10-14T00:00:00Z')`,
          ).run(id, word.id);
          db.prepare(
            `INSERT OR IGNORE INTO practice_attempt_daily(mistake_id,skill_type,exercise_type,utc_day,attempt_count,error_count) VALUES(?,'PINYIN','hanzi_to_pinyin','2026-10-14',6,3)`,
          ).run(id);
        }
      });
      fs.writeFileSync(path.join(folder,'words.json'),JSON.stringify(db.prepare("SELECT v.id,v.simplified FROM vocabulary v JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id WHERE p.studied=1").all(),null,2));
    }
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    const entries = {};
    for (const { name: table } of tables) {
      let rows = db
        .prepare('SELECT * FROM "' + table.replaceAll('"', '""') + '"')
        .all();
      if (table === "user_vocabulary_progress")
        rows = rows.map(({ notes, ...row }) => row);
      const canonical = rows
        .map((row) => JSON.stringify(row))
        .sort()
        .join("\n");
      entries[table] = {
        count: rows.length,
        sha256: crypto.createHash("sha256").update(canonical).digest("hex"),
      };
    }
    report[name] = {
      schema: db.prepare("PRAGMA user_version").get(),
      tables: entries,
    };
    db.close();
    if (command === "fixture" && name === "hanzi30.db") {
      run(
        "push",
        path.join(folder, name),
        "/data/local/tmp/v83-isolated-fixture.db",
      );
      run(
        "shell",
        "run-as",
        pkg,
        "cp",
        "/data/local/tmp/v83-isolated-fixture.db",
        "files/SQLite/hanzi30.db",
      );
      for (const suffix of ["-wal", "-shm"])
        if (names.includes(name + suffix))
          run("shell", "run-as", pkg, "rm", "files/SQLite/" + name + suffix);
    }
  }
  fs.writeFileSync(
    path.join(folder, "report.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        data: "NEW_ISOLATED_AVD_SYNTHETIC_QA",
        report,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(report, null, 2));
} else throw new Error("Unsupported QA command");
