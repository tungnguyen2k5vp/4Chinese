"""Open the native practice screen first; run only against a disposable Android emulator."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--serial', required=True)
parser.add_argument('--port', default='5037')
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--recognize', action='store_true', help='Download model if needed, test offline result/history and app restart')
args = parser.parse_args()
adb = Path(os.environ.get('ANDROID_HOME', Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk')) / 'platform-tools/adb.exe'
args.output.mkdir(parents=True, exist_ok=True)

def call(*items):
    return subprocess.check_output([str(adb), '-P', args.port, '-s', args.serial, *items], timeout=45)

def shell(*items):
    return call('shell', *items).decode('utf-8', errors='replace').strip()

assert shell('getprop', 'ro.kernel.qemu') == '1', 'Refusing to change a physical device'

def ui():
    shell('uiautomator', 'dump', '/sdcard/jobprep-check.xml')
    return ET.fromstring(shell('cat', '/sdcard/jobprep-check.xml'))

def find(tree, value):
    return next(n for n in tree.iter('node') if n.get('text') == value or n.get('content-desc') == value)

def bounds(node):
    return list(map(int, re.findall(r'\d+', node.get('bounds'))))

def tap(tree, text):
    node = find(tree, text)
    assert node.get('enabled') == 'true', text + ' is disabled'
    x1, y1, x2, y2 = bounds(node)
    shell('input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def has_count(tree, count):
    return any(n.get('text', '').startswith(f'{count} nét ·') for n in tree.iter('node'))

def screenshot(name):
    (args.output / name).write_bytes(call('exec-out', 'screencap', '-p'))

def wait_for(predicate, seconds=60):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        tree = ui()
        try:
            if predicate(tree):
                return tree
        except StopIteration:
            pass
        time.sleep(2)
    raise AssertionError('Timed out waiting for expected UI state')

def reveal(value):
    for _ in range(7):
        tree = ui()
        if any(n.get('text') == value or n.get('content-desc') == value for n in tree.iter('node')):
            return tree
        shell('input', 'swipe', '950', '2050', '950', '950', '400')
    raise AssertionError('UI item not found: ' + value)

auto = shell('settings', 'get', 'system', 'accelerometer_rotation')
rotation = shell('settings', 'get', 'system', 'user_rotation')
wifi = shell('settings', 'get', 'global', 'wifi_on')
mobile = shell('settings', 'get', 'global', 'mobile_data')
network_changed = False
checks = []
try:
    tree = wait_for(lambda t: find(t, 'XÓA HẾT').get('enabled') == 'true')
    paper_name = 'Vùng luyện viết Hán tự bằng ngón tay'
    missing = any('chưa có mô hình' in n.get('text', '') for n in tree.iter('node'))
    if missing:
        assert find(tree, 'NHẬN DIỆN').get('enabled') == 'false'
    tap(tree, 'XÓA HẾT')
    tree = ui()
    assert has_count(tree, 0), 'Clear did not finish before drawing'
    x1, y1, x2, y2 = bounds(find(tree, paper_name))
    assert x2 > x1 and y2-y1 > 120
    for count, (start, end) in enumerate([((.45, .25), (.2, .7)), ((.5, .4), (.8, .75))], 1):
        shell('input', 'swipe', str(int(x1+(x2-x1)*start[0])), str(int(y1+(y2-y1)*start[1])),
              str(int(x1+(x2-x1)*end[0])), str(int(y1+(y2-y1)*end[1])), '500')
        assert has_count(ui(), count), f'Stroke {count} was not recorded'
    assert has_count(ui(), 2), 'Two strokes were not recorded'
    screenshot('native-two-strokes.png')
    checks.append('two touch strokes recorded')
    shell('settings', 'put', 'system', 'accelerometer_rotation', '0')
    shell('settings', 'put', 'system', 'user_rotation', '1')
    time.sleep(2)
    tree = ui()
    assert tree.get('rotation') == '1', 'Landscape rotation did not occur'
    assert has_count(tree, 2), 'Strokes lost after Activity recreation'
    x1, y1, x2, y2 = bounds(find(tree, paper_name))
    screenshot('native-landscape.png')
    assert y2-y1 > 120, 'Landscape drawing surface is too small'
    checks.append('landscape recreation retains strokes and usable canvas')
    shell('settings', 'put', 'system', 'user_rotation', '0')
    time.sleep(2)
    tree = ui()
    assert has_count(tree, 2), 'Strokes lost when returning to portrait'
    tap(tree, 'HOÀN TÁC')
    tree = ui()
    assert has_count(tree, 1), 'Undo did not remove exactly one stroke'
    tap(tree, 'XÓA HẾT')
    tree = ui()
    assert has_count(tree, 0), 'Clear did not remove all strokes'
    checks.append('undo and clear update stroke count')
    if missing:
        assert find(tree, 'NHẬN DIỆN').get('enabled') == 'false'
        checks.append('recognition disabled without downloaded model')
    screenshot('native-cleared.png')
    tap(tree, '← TRỞ LẠI')
    tree = ui()
    assert not any(n.get('content-desc') == paper_name for n in tree.iter('node'))
    assert any(n.get('package') == 'com.tungnguyen2k5vp.fourchinese' for n in tree.iter('node'))
    checks.append('Back returns to React Native application')
    if args.recognize:
        open_label = 'Mở luyện viết toàn màn hình, không thay đổi tiến độ học'
        tap(reveal(open_label), open_label)
        tree = wait_for(lambda t: find(t, 'XÓA HẾT').get('enabled') == 'true')
        if find(tree, 'NHẬN DIỆN').get('enabled') != 'true':
            tap(tree, 'TẢI MÔ HÌNH NHẬN DIỆN (CẦN MẠNG)')
            tree = wait_for(lambda t: find(t, 'NHẬN DIỆN').get('enabled') == 'true', 240)
            checks.append('ML Kit model downloaded through native UI')
        tap(tree, 'XÓA HẾT')
        x1, y1, x2, y2 = bounds(find(ui(), paper_name))
        for start, end in [((.5, .2), (.22, .8)), ((.45, .37), (.78, .8))]:
            shell('input', 'swipe', str(int(x1+(x2-x1)*start[0])), str(int(y1+(y2-y1)*start[1])),
                  str(int(x1+(x2-x1)*end[0])), str(int(y1+(y2-y1)*end[1])), '600')
        assert has_count(ui(), 2)
        network_changed = True
        shell('svc', 'wifi', 'disable')
        shell('svc', 'data', 'disable')
        time.sleep(3)
        assert 'default' not in shell('ip', 'route'), 'Emulator still has a default network route'
        tap(ui(), 'NHẬN DIỆN')
        prefix = 'Chọn gợi ý '
        tree = wait_for(lambda t: any(n.get('content-desc', '').startswith(prefix) for n in t.iter('node')))
        choices = [n for n in tree.iter('node') if n.get('content-desc', '').startswith(prefix)]
        chosen = choices[0].get('text')
        description = choices[0].get('content-desc')
        screenshot('native-offline-candidates.png')
        checks.append('real ML Kit inference returns candidates without a default network route')
        shell('settings', 'put', 'system', 'user_rotation', '1')
        time.sleep(2)
        tree = ui()
        assert has_count(tree, 2) and find(tree, description).get('enabled') == 'true'
        screenshot('native-candidates-landscape.png')
        shell('settings', 'put', 'system', 'user_rotation', '0')
        time.sleep(2)
        tap(ui(), description)
        history_title = 'Gợi ý đã lưu · không chấm đúng/sai'
        tree = reveal(history_title)
        rows = [n.get('text', '') for n in tree.iter('node') if n.get('text', '').startswith(chosen + ' · 2 nét · ')]
        assert rows, 'Selected native result did not appear in SQLite history'
        saved_row = rows[0]
        screenshot('react-native-saved-history.png')
        checks.append('candidate survives rotation, returns to RN and is recorded in SQLite history')
        package = 'com.tungnguyen2k5vp.fourchinese'
        shell('am', 'force-stop', package)
        shell('am', 'start', '-a', 'android.intent.action.VIEW', '-d',
              '4chinese://memory/session?character=%E8%AF%B7', package)
        wait_for(lambda t: any(n.get('content-desc') == open_label for n in t.iter('node')), 180)
        tree = reveal(history_title)
        assert sum(n.get('text') == saved_row for n in tree.iter('node')) == 1, 'History lost or duplicated after restart'
        screenshot('react-native-history-after-restart.png')
        checks.append('saved history survives force-stop/reopen exactly once')
    result = {'passed': True, 'serial': args.serial, 'checks': checks,
              'recognitionModelInferenceTested': args.recognize}
    (args.output / 'native-check-result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)
finally:
    if network_changed:
        shell('svc', 'wifi', 'enable' if wifi in ('1', '2') else 'disable')
        shell('svc', 'data', 'enable' if mobile == '1' else 'disable')
    shell('settings', 'put', 'system', 'user_rotation', rotation)
    shell('settings', 'put', 'system', 'accelerometer_rotation', auto)
