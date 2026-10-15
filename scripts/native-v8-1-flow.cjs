const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function action(...args) {
  const output = execFileSync(process.execPath, ['scripts/native-v8-qa.cjs', ...args], { cwd: root, env: { ...process.env, NATIVE_QA_OUTPUT: 'artifacts/v8-1-native-2026-10-13' }, timeout: 55000, encoding: 'utf8', maxBuffer: 2e6 });
  console.log(output.trim());
}
const flow = process.argv[2];
if (flow === 'listen-complete') {
  for (let turn = 1; turn <= 8; turn++) {
    action('wait-text', `Nghe mẫu · lượt ${turn}/8`);
    if (turn === 2) action('capture', '13-speaking-listen-second-turn');
    action('tap', 'Đã nghe/xem · lượt tiếp');
  }
  action('wait-text', 'Hoàn thành bài thử');
  action('capture', '14-speaking-result');
} else if (flow === 'repeat') {
  action('tap', 'Xem bài thử chưa duyệt');
  action('tap', 'Meeting a new neighbour');
  action('tap', 'Nghe và nhắc lại');
  action('wait-text', 'Nhắc lại · lượt 1/8');
  action('capture', '23-repeat-after-restart');
  action('tap', 'Thử nói lượt này');
  action('dump');
} else if (flow === 'reader') {
  action('route', '/english/reader?lesson=everyday-learning&draft=1');
  action('wait-text', 'Learning a little every day');
  action('capture', '21-reader-article');
  action('dump');
} else if (flow === 'reader-final-return') {
  action('wait-text', 'learning → learn · 4 nghĩa');
  action('capture', '38-reader-learning-results-final');
  action('tap', 'Đóng');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '39-reader-return-no-blocker');
  action('tap-xy', '289,1008');
  action('wait-text', 'learning → learn · 4 nghĩa');
  action('tap-prefix', 'learn, learning');
  action('tap', 'Chọn nghĩa phù hợp trong 4 nghĩa');
  action('wait-text', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('capture', '40-reader-learn-senses-final');
  action('tap', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('tap', 'Chọn nghĩa này');
  action('wait-text', 'Đổi nghĩa');
  action('capture', '41-reader-learn-selected-final');
  action('scroll');
  action('dump');
} else if (flow === 'reader-select-final') {
  action('tap', 'Chọn nghĩa phù hợp trong 4 nghĩa');
  action('wait-text', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('capture', '42-learn-sense-picker-safe-final');
  action('tap', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('tap', 'Chọn nghĩa này');
  action('capture', '43-reader-learn-final');
  action('scroll');
  action('dump');
} else if (flow === 'reader-save-final') {
  action('tap-prefix', '□ Lưu câu này riêng');
  action('capture', '44-reader-local-consent-final');
  action('tap', 'Lưu nghĩa này');
  action('scroll-up');
  action('dump');
  action('capture', '45-reader-saved-final');
  action('tap', 'Đóng');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '46-reader-return-final');
  action('route', '/english/library');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('tap', 'Xem bài thử chưa duyệt');
  action('capture', '47-library-final');
  action('route', '/explore');
  action('wait-text', 'Mở thư viện bài đọc →');
  action('capture', '48-explore-final');
  action('route', '/english/profile');
  action('wait-text', 'Bạn học tiếng Anh để làm gì?');
  action('capture', '49-profile-final');
  action('route', '/english/onboarding');
  action('wait-text', 'Bạn học tiếng Anh để làm gì?');
  action('capture', '50-onboarding-final');
  action('route', '/english/reader');
  action('capture', '51-reader-personal-home-final');
} else if (flow === 'game-final') {
  action('capture', '53-game-active-final');
  action('tap', 'Từ tiếp theo trong trò chơi Word Chain');
  action('type', 'table');
  action('tap', 'Nối từ');
  action('back');
  action('wait-text', 'TỪ ĐÃ NỐI · 3');
  action('capture', '54-game-turn-final');
  action('tap', 'Kết thúc ván');
  action('capture', '55-game-result-final');
  action('route', '/english/review');
  action('capture-only', '56-review-front-final');
  action('dump');
} else if (flow === 'save-context-rerun') {
  action('tap-prefix', 'learn, learning');
  action('tap', 'Chọn nghĩa phù hợp trong 4 nghĩa');
  action('wait-text', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('tap', 'Động từ: Học, học tập, nghiên cứu, tìm hiểu.');
  action('tap', 'Chọn nghĩa này');
  action('scroll');
  action('tap-prefix', '□ Lưu dạng');
  action('tap-prefix', '□ Lưu câu này riêng');
  action('capture', '69-context-consent-surface');
  action('tap', 'Lưu nghĩa này');
  action('wait-text', 'Đã lưu “learning” vào bộ “Unit 8 native”.');
  for (let i = 0; i < 3; i++) action('scroll-sheet-up');
  action('capture', '70-context-surface-saved');
  action('scroll');
  action('tap-prefix', '☑ Lưu dạng');
  action('tap', 'Lưu nghĩa này');
  action('wait-text', 'Đã lưu “learn” vào bộ “Unit 8 native”.');
  for (let i = 0; i < 3; i++) action('scroll-sheet-up');
  action('capture', '71-context-lemma-saved');
  action('tap', 'Đóng');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '72-reader-return-current');
  action('route', '/english/library');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('tap', 'Xem bài thử chưa duyệt');
  action('capture', '73-library-current');
  action('route', '/vocabulary');
  action('wait-text', 'Kho từ tiếng Anh');
  action('capture', '74-vocabulary-current');
  action('route', '/english-speaking');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('capture', '75-speaking-current');
} else if (flow === 'save-lemma-and-hubs') {
  action('scroll'); action('scroll');
  action('tap-prefix', '☑ Lưu dạng');
  action('tap', 'Lưu nghĩa này');
  for (let i = 0; i < 3; i++) action('scroll-sheet-up');
  action('wait-text', 'Đã lưu “learn” vào bộ “Unit 8 native”.');
  action('capture', '71-context-lemma-saved');
  action('tap', 'Đóng');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '72-reader-return-current');
  action('route', '/english/library');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('tap', 'Xem bài thử chưa duyệt');
  action('capture', '73-library-current');
  action('route', '/vocabulary');
  action('wait-text', 'Kho từ tiếng Anh');
  action('capture', '74-vocabulary-current');
  action('route', '/english-speaking');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('capture', '75-speaking-current');
  action('tap', 'Xem bài thử chưa duyệt');
  action('wait-text', 'Meeting a new neighbour');
  action('capture', '76-dialogues-current');
  action('tap', 'Meeting a new neighbour');
  action('capture', '77-dialogue-current');
  action('scroll');
  action('tap', 'Bắt đầu hội thoại đóng vai');
  action('wait-text', 'Đóng vai · lượt 1/8');
  action('capture', '78-role-current');
  action('dump');
} else if (flow === 'role-and-listen-current') {
  action('scroll');
  action('tap', 'Bắt đầu hội thoại đóng vai');
  action('wait-text', 'Đóng vai · lượt 1/8');
  action('capture', '78-role-current');
  action('tap', 'Đã tự luyện · lượt tiếp');
  action('wait-text', 'Đóng vai · lượt 2/8');
  action('capture', '79-role-partner-current');
  action('tap', 'Dừng và về danh sách');
  action('tap', 'Meeting a new neighbour');
  action('tap', 'Nghe mẫu từng lượt');
  action('wait-text', 'Nghe mẫu · lượt 1/8');
  action('capture', '80-listen-current');
  for (let turn = 1; turn <= 8; turn++) {
    action('wait-text', `Nghe mẫu · lượt ${turn}/8`);
    if (turn === 2) action('capture', '81-listen-second-current');
    action('tap', 'Đã nghe/xem · lượt tiếp');
  }
  action('wait-text', 'Hoàn thành bài thử');
  action('capture', '82-dialogue-result-current');
  action('tap', 'Chọn hội thoại tiếp theo');
  action('tap', 'Meeting a new neighbour');
  action('tap', 'Nghe và nhắc lại');
  action('wait-text', 'Nhắc lại · lượt 1/8');
  action('capture', '83-repeat-current');
  action('tap', 'Thử nói lượt này');
  action('capture', '84-native-permission-current');
  action('dump');
} else if (flow === 'speech-denied-current') {
  action('tap', 'Xem bài thử chưa duyệt');
  action('tap', 'Meeting a new neighbour');
  action('tap', 'Nghe và nhắc lại');
  action('tap', 'Thử nói lượt này');
  action('wait-text', 'Bạn chưa cấp quyền microphone. Vẫn có thể nghe và tự luyện.');
  action('capture', '85-microphone-denied-current');
} else if (flow === 'reader-and-settings-current') {
  action('tap', 'Two words');
  action('capture', '86-reader-answer-current');
  action('route', '/english/library');
  action('wait-text', 'Xem bài thử chưa duyệt');
  action('tap', 'Xem bài thử chưa duyệt');
  action('capture', '87-library-progress-current');
  action('route', '/explore');
  action('wait-text', 'Mở thư viện bài đọc →');
  action('capture', '88-explore-current');
  action('route', '/english/profile');
  action('wait-text', 'Bạn học tiếng Anh để làm gì?');
  action('capture', '89-profile-current');
  action('route', '/english/onboarding');
  action('wait-text', 'Bạn học tiếng Anh để làm gì?');
  action('capture', '90-onboarding-current');
  action('route', '/english/reader');
  action('wait-text', 'Bật chế độ thử nghiệm bài đọc có sẵn');
  action('capture', '91-reader-home-current');
  action('route', '/english/decks');
  action('wait-text', 'Tên bộ từ tiếng Anh mới');
  action('tap', 'Unit 8 native');
  action('wait-text', 'Đổi tên bộ từ');
  action('capture', '92-deck-current');
} else if (flow === 'dark-width-current') {
  const display = (...args) => execFileSync(process.execPath, ['scripts/native-v8-1-display.cjs', ...args], { cwd: root, env: process.env, encoding: 'utf8', timeout: 35000 });
  display('theme', 'yes');
  action('route', '/');
  action('wait-text', '4Chinese English');
  action('capture', '93-dark-home-current');
  action('route', '/english/reader?lesson=everyday-learning&draft=1');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '94-dark-reader-current');
  action('route', '/english-speaking');
  action('wait-text', 'Luyện nói tiếng Anh');
  action('capture', '95-dark-speaking-current');
  display('theme', 'no');
  for (const [width, id] of [['320', '96'], ['360', '97'], ['390', '98']]) {
    display('width', width);
    action('route', '/english/reader?lesson=everyday-learning&draft=1');
    action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
    action('capture', `${id}-native-reader-${width}dp`);
  }
  display('width', '412');
  for (const [font, id] of [['1.3', '99'], ['1.6', '100']]) {
    display('font', font);
    action('route', '/english/reader?lesson=everyday-learning&draft=1');
    action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
    action('capture', `${id}-native-reader-font-${font.replace('.', '')}`);
  }
  display('restore');
  action('route', '/profile');
  action('wait-text', 'Chọn học Tiếng Trung');
  action('capture', '101-language-settings-current');
  action('tap', 'Chọn học Tiếng Trung');
  action('wait-text', 'Đã lưu lựa chọn ngôn ngữ trên thiết bị.');
  action('route', '/');
  action('capture', '102-chinese-home-current');
  action('route', '/hsk');
  action('capture', '103-chinese-hsk-current');
  action('snapshot-db', 'after');
} else if (flow === 'chinese-pinyin-current') {
  for (let index = 0; index < 10; index++) {
    action('wait-text', `Chọn từ để bắt đầu học (${index}/10)`);
    action('tap', 'Học từ này');
  }
  action('wait-text', 'LƯỢT 1 · ĐÁP ÁN HIỂN THỊ');
  action('capture', '112-chinese-lesson-pinyin-under-audio');
  action('dump');
} else if (flow === 'reader-display-final') {
  const display = (...args) => execFileSync(process.execPath, ['scripts/native-v8-1-display.cjs', ...args], { cwd: root, env: process.env, encoding: 'utf8', timeout: 35000 });
  for (const [width, id] of [['320', '122'], ['360', '123'], ['390', '124']]) {
    display('width', width);
    action('wait-any-text', '4Chinese English||Chạm từ để tra và lưu vào bộ của bạn.');
    action('route', '/english/reader?lesson=everyday-learning&draft=1');
    action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
    action('capture', `${id}-native-reader-${width}dp-final`);
  }
  display('width', '412');
  action('wait-any-text', '4Chinese English||Chạm từ để tra và lưu vào bộ của bạn.');
  for (const [font, id] of [['1.3', '125'], ['1.6', '126']]) {
    display('font', font);
    action('wait-any-text', '4Chinese English||Chạm từ để tra và lưu vào bộ của bạn.');
    action('route', '/english/reader?lesson=everyday-learning&draft=1');
    action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
    action('capture', `${id}-native-reader-font-${font.replace('.', '')}-final`);
  }
  display('restore');
  action('wait-any-text', '4Chinese English||Chạm từ để tra và lưu vào bộ của bạn.');
  action('route', '/english/reader?lesson=everyday-learning&draft=1');
  action('wait-text', 'Chạm từ để tra và lưu vào bộ của bạn.');
  action('capture', '127-reader-final-completion-label');
} else throw new Error('Known emulator-only V8.1 flow required');
