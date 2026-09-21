import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type HskSource = { simplified: string; radical?: string; level: string[]; frequency?: number; pos?: string[]; forms: { traditional: string; transcriptions: { pinyin: string; numeric: string }; meanings: string[]; classifiers?: string[] }[] };
type CvEntry = { meanings: string[]; numeric: string };

function chooseMatchingForm(item: HskSource, numericHint: string) {
  const normalizedHint = normalizeNumeric(numericHint);
  const matching = item.forms.filter(
    (form) => normalizeNumeric(form.transcriptions.numeric) === normalizedHint,
  );
  const candidates = matching.length ? matching : item.forms;
  return [...candidates].sort((left, right) => {
    const score = (form: HskSource["forms"][number]) => {
      const pinyin = form.transcriptions.pinyin.trim();
      const first = Array.from(pinyin)[0];
      const looksLikeProperName = Boolean(first && first !== first.toLocaleLowerCase());
      const onlyMetadata = form.meanings.every((meaning) => /^(surname|variant of|old variant of)\b/i.test(meaning));
      return form.meanings.length * 10 - (looksLikeProperName ? 1_000 : 0) - (onlyMetadata ? 500 : 0);
    };
    return score(right) - score(left);
  })[0];
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'data/raw/complete-hsk-vocabulary.json');
const dictionaryPath = resolve(root, 'data/raw/CVDICT.u8');
const outputPath = resolve(root, 'src/data/hsk-vocabulary.json');

const posNames: Record<string,string> = { a:'tính từ',ad:'tính từ làm trạng ngữ',an:'tính từ danh hoá',b:'tính từ phi vị ngữ',c:'liên từ',d:'phó từ',e:'thán từ',f:'phương vị từ',i:'thành ngữ',l:'cụm từ cố định',m:'số từ',n:'danh từ',nr:'tên riêng',ns:'địa danh',nt:'tổ chức',nz:'danh từ riêng',o:'từ tượng thanh',p:'giới từ',q:'lượng từ',r:'đại từ',s:'từ chỉ không gian',t:'từ chỉ thời gian',u:'trợ từ',v:'động từ',vd:'động từ làm trạng ngữ',vn:'động từ danh hoá',y:'trợ từ tình thái',z:'từ miêu tả' };
const vietnameseOverrides: Record<string,string[]> = {
  '不肯':['không chịu','không bằng lòng'], '不利于':['bất lợi cho','có hại cho'], '不难':['không khó'],
  '不如说':['nói đúng hơn là'], '不太':['không quá','không được... lắm'], '不一会儿':['chẳng bao lâu','một lát sau'],
  '不予':['không cấp','từ chối'], '车上':['trên xe'], '趁着':['nhân lúc','tranh thủ lúc'], '城里':['trong thành phố'],
  '定为':['được xác định là','đặt thành'], '放到':['đặt vào','đưa đến'], '飞往':['bay tới'], '公益性':['tính công ích'],
  '很难说':['rất khó nói'], '怀着':['mang trong lòng','ôm ấp'], '见过':['đã từng gặp','đã từng thấy'],
  '难以想象':['khó tưởng tượng'], '能不能':['có thể hay không'], '说起来':['nói đến','nhắc đến'],
  '送到':['gửi đến','đưa đến'], '眼里':['trong mắt','theo cách nhìn'], '一番':['một phen','một lượt'],
  '有劲儿':['có sức','hăng hái'], '这时候':['lúc này'], '着眼于':['tập trung vào','nhằm vào'],
  '指着':['chỉ vào'], '致力于':['dốc sức cho','cống hiến cho'],
};
const numericPinyinOverrides: Record<string,string> = {
  '不予':'bu4 yu3', '趁着':'chen4 zhe5', '城里':'cheng2 li3', '大笔':'da4 bi3',
  '电动车':'dian4 dong4 che1', '怀着':'huai2 zhe5', '见过':'jian4 guo4',
  '难以想象':'nan2 yi3 xiang3 xiang4', '眼里':'yan3 li5', '指着':'zhi3 zhe5', '致力于':'zhi4 li4 yu2',
};

export function parseCvdict(text: string): Map<string,CvEntry> {
  const exact = new Map<string,CvEntry>(); const byWord = new Map<string,CvEntry>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(.+?)\s+(.+?)\s+\[([^\]]+)]\s+\/(.+)\/$/);
    if (!match?.[2] || !match[3] || !match[4]) continue;
    const simplified = match[2].trim(); const numeric = normalizeNumeric(match[3]);
    const meanings = match[4].split('/').map((value) => value.trim()).filter(Boolean);
    const entry = { meanings, numeric }; exact.set(`${simplified}|${numeric}`, entry);
    if (!byWord.has(simplified)) byWord.set(simplified, entry);
  }
  for (const [word,entry] of byWord) exact.set(`${word}|*`,entry);
  return exact;
}

export function parseHskDataset(source: HskSource[], dictionary: Map<string,CvEntry>) {
  const imported: Record<string,unknown>[] = []; const missing: string[] = [];
  for (const item of source) {
    const level = item.level.map((value) => value.match(/^new-(\d)$/)?.[1]).find(Boolean);
    if (!level) continue;
    const band = Number(level) >= 7 ? '7-9' : Number(level);
    const dictionaryHint = dictionary.get(`${item.simplified}|*`);
    const pinyinNumeric = numericPinyinOverrides[item.simplified] ?? dictionaryHint?.numeric ?? item.forms[0]?.transcriptions.numeric ?? '';
    const form = chooseMatchingForm(item, pinyinNumeric); if (!form) continue;
    const numeric = normalizeNumeric(pinyinNumeric);
    const vi = dictionary.get(`${item.simplified}|${numeric}`) ?? dictionaryHint;
    const override = vietnameseOverrides[item.simplified];
    if (!vi?.meanings.length && !override) missing.push(item.simplified);
    const meaningsVi = override ?? vi?.meanings ?? ['Chưa có bản dịch tiếng Việt'];
    const id = `hsk-${createHash('sha1').update(`${item.simplified}|${numeric}`).digest('hex').slice(0,12)}`;
    imported.push({ id, simplified:item.simplified, traditional:form.traditional || item.simplified,
      pinyin:form.transcriptions.pinyin, pinyinNumeric,
      primaryMeaningVi:meaningsVi[0], meaningsVi, meaningsEn:form.meanings, pos:(item.pos??[]).map((code)=>posNames[code]??code),
      hskBand:band, frequencyRank:item.frequency??null, classifiers:form.classifiers??[], radical:item.radical??null,
      strokeCount:null, visualType:'illustration', imageUri:null, imageSource:null, imageLicense:null, imageAttribution:null,
      audioUri:null, source:'complete-hsk-vocabulary + CVDICT', sourceVersion:'complete-hsk 2026-09 / CVDICT 1.0.1 / sense-selection 2',
      sourceUrl:'https://github.com/drkameleon/complete-hsk-vocabulary', translationStatus:vi||override?'machine':'missing', examples:[] });
  }
  return { imported, missing };
}

function normalizeNumeric(value: string) { return value.toLowerCase().replace(/u:/g,'v').replace(/ü/g,'v').replace(/[^a-z0-9]+/g,' ').trim(); }

async function main(){
  const [rawHsk,rawDictionary]=await Promise.all([readFile(sourcePath,'utf8'),readFile(dictionaryPath,'utf8')]);
  const hsk=JSON.parse(rawHsk) as HskSource[]; const dictionary=parseCvdict(rawDictionary); const {imported,missing}=parseHskDataset(hsk,dictionary);
  await mkdir(dirname(outputPath),{recursive:true}); await writeFile(outputPath,JSON.stringify(imported));
  const distribution=Object.fromEntries(['1','2','3','4','5','6','7-9'].map((band)=>[band,imported.filter((item)=>String(item.hskBand)===band).length]));
  process.stdout.write(JSON.stringify({imported:imported.length,missingVietnamese:missing.length,missingSample:missing.slice(0,20),distribution},null,2)+'\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main();
