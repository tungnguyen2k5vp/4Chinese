"""Extract the versioned official PDF; preserve source pages for inspection.
Usage: python -X utf8 scripts/extract-hsk-syllabus.py PDF PYPDF_PATH
"""
import sys, re, json, hashlib
from pathlib import Path
sys.path.insert(0, sys.argv[2])
from pypdf import PdfReader

pdf = Path(sys.argv[1])
reader = PdfReader(pdf)
source = 'https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf'
levels = ['1', '2', '3', '4', '5', '6', '7-9']
vocabulary = []
for page_index in range(79, 354):
    text = reader.pages[page_index].extract_text()
    for line in text.splitlines():
        match = re.match(r'^(\d+)\s+(\d|7—9|7-9|7～9|7－9)(?:（[^）]+）)*\s+(\S+)\s+(.+)$', line.strip())
        if not match:
            continue
        serial, level, headword, tail = match.groups()
        if level not in levels:
            level = '7-9' if level.startswith('7') else level
        # POS labels are Hanzi, pinyin only uses Latin/diacritics and spaces.
        reading = re.split(r'\s+(?=[\u3400-\u9fff（])', tail)[0].strip()
        word = re.sub(r'[0-9]+$', '', headword)
        vocabulary.append({'identifier': serial, 'level': level, 'simplified': word, 'pinyin': reading, 'page': page_index + 1})

if not vocabulary or len({v['identifier'] for v in vocabulary}) != len(vocabulary):
    raise RuntimeError('Invalid or duplicate extracted vocabulary identifiers')
# Printed page + 2 = zero-based PDF index.
sections = {
    'tasks': [2, 6, 11, 18, 29, 37, 45, 55],
    'topics': [56, 58, 60, 63, 66, 69, 72, 76],
    'characters': [353, 355, 356, 358, 361, 364, 367, 374],
    'grammar': [383, 386, 389, 392, 395, 398, 400, 405],
}
content = {}
for kind, starts in sections.items():
    content[kind] = {}
    for i, level in enumerate(levels):
        pages = []
        for index in range(starts[i] + 2, min(starts[i+1] + 2, len(reader.pages))):
            lines = [line.strip() for line in reader.pages[index].extract_text().splitlines()]
            clean = [line for line in lines if line and '汉考国际' not in line and not re.fullmatch(r'\d+|际', line)]
            pages.append({'page': index + 1, 'text': '\n'.join(clean)})
        content[kind][level] = pages
result = {'version': '2025-11 / 2026-07', 'source': source, 'sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(), 'vocabulary': vocabulary, 'sections': content}
target = Path('src/data/hsk-syllabus-official.json')
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'entries': len(vocabulary), 'levels': {level: sum(v['level'] == level for v in vocabulary) for level in levels}}, ensure_ascii=False))
