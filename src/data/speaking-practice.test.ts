import { describe, expect, it } from 'vitest';

import { timedSpeakingPrompts, type TimedSpeakingPrompt } from './speaking-practice';

import { validateSpeakingAttemptBackupRecord } from '@/db/speaking-attempts';

// Literal fixtures lock every field of the seven pre-expansion prompts, not just their IDs.
const originals: Omit<TimedSpeakingPrompt, 'sourceType' | 'reviewStatus'>[] = [
  {
    id: 'speak-1-read', level: '1', title: 'Đọc câu ngắn',
    prompt: '朗读：你好！我叫小明。我是学生。我喜欢学习中文。',
    preparationSeconds: 10, recordingSeconds: 30,
    checklist: ['Đọc rõ từng từ, không thêm câu ngoài đề.', 'Để ý thanh điệu 你好 và 学习.', 'Ngắt câu theo dấu câu.'],
  },
  {
    id: 'speak-2-introduce', level: '2', title: 'Giới thiệu sinh hoạt',
    prompt: '请介绍你的一天。你几点起床？你什么时候学习中文？',
    preparationSeconds: 15, recordingSeconds: 30,
    checklist: ['Có ít nhất hai hoạt động.', 'Dùng giờ/thời điểm rõ.', 'Câu nghe được và không chỉ đọc câu hỏi.'],
  },
  {
    id: 'speak-3-directions', level: '3', title: 'Chỉ đường cho bạn',
    prompt: '朋友想去图书馆。请告诉他怎么去，并提醒他图书馆几点关门。你可以自己设定地点和时间。',
    preparationSeconds: 20, recordingSeconds: 60,
    checklist: ['Nêu điểm xuất phát và hướng đi.', 'Nêu giờ đóng cửa.', 'Diễn đạt liên tục, không cần nói thật nhanh.'],
  },
  {
    id: 'speak-4-experience', level: '4', title: 'Kể một chuyến đi',
    prompt: '介绍一次让你印象深刻的旅行。你去了哪里？发生了什么？为什么难忘？',
    preparationSeconds: 20, recordingSeconds: 60,
    checklist: ['Nêu nơi đến.', 'Kể một sự việc cụ thể.', 'Giải thích vì sao khó quên.'],
  },
  {
    id: 'speak-5-opinion', level: '5', title: 'Nêu ý kiến có lý do',
    prompt: '你认为学生应该参加志愿活动吗？请说明你的观点，并举一个例子。',
    preparationSeconds: 30, recordingSeconds: 90,
    checklist: ['Quan điểm rõ.', 'Lý do liên quan trực tiếp.', 'Có ví dụ thay vì chỉ lặp quan điểm.'],
  },
  {
    id: 'speak-6-retell', level: '6', title: 'Kể lại và nhận xét',
    prompt: '阅读后用自己的话复述并评论：一家社区书店原来顾客很少。店主开始举办免费读书会，让居民分享喜欢的书。几个月后，书店成为大家交流的地方。但活动增加了成本，店主仍在寻找可持续的经营方式。',
    preparationSeconds: 30, recordingSeconds: 90,
    checklist: ['Kể được vấn đề, hành động và kết quả.', 'Không bỏ khó khăn về chi phí.', 'Phân biệt thông tin trong đoạn và nhận xét của mình.'],
  },
  {
    id: 'speak-79-policy', level: '7-9', title: 'Thảo luận lựa chọn chính sách',
    prompt: '如果城市中心限制私家车进入，会带来哪些好处和困难？请提出一种配套措施，并说明它如何帮助居民。',
    preparationSeconds: 30, recordingSeconds: 120,
    checklist: ['Nêu lợi ích và khó khăn.', 'Đề xuất giải pháp cụ thể.', 'Lập luận có điều kiện, không tuyệt đối hóa.', 'Kết thúc bằng kết luận ngắn.'],
  },
];
const bands = [
  { level: '1', preparation: 10, recording: 30 },
  { level: '2', preparation: 15, recording: 30 },
  { level: '3', preparation: 20, recording: 60 },
  { level: '4', preparation: 20, recording: 60 },
  { level: '5', preparation: 30, recording: 90 },
  { level: '6', preparation: 30, recording: 90 },
  { level: '7-9', preparation: 30, recording: 120 },
];
const expectedKeys = ['id', 'level', 'title', 'prompt', 'preparationSeconds', 'recordingSeconds',
  'checklist', 'sourceType', 'reviewStatus'].sort();
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim();

describe('original timed-speaking bank: 21 self-review prompts', () => {
  it('adds exactly fourteen entries without replacing or editing the original seven', () => {
    expect(timedSpeakingPrompts).toHaveLength(21);
    expect(timedSpeakingPrompts.slice(0, 7)).toEqual(originals.map((prompt) => ({
      ...prompt, sourceType: 'CURATED', reviewStatus: 'UNREVIEWED',
    })));
    expect(timedSpeakingPrompts.slice(7)).toHaveLength(14);
  });

  it('has unique IDs, Chinese prompt content and learner-facing titles', () => {
    for (const field of ['id', 'prompt', 'title'] as const) {
      expect(new Set(timedSpeakingPrompts.map((prompt) => normalize(prompt[field]))).size).toBe(21);
    }
  });

  it.each(bands)('has three prompts and bounded timings at band $level', ({ level, preparation, recording }) => {
    const entries = timedSpeakingPrompts.filter((prompt) => prompt.level === level);
    expect(entries).toHaveLength(3);
    expect(entries.filter((prompt) => !originals.some((original) => original.id === prompt.id))).toHaveLength(2);
    for (const prompt of entries) {
      expect(prompt.preparationSeconds).toBe(preparation);
      expect(prompt.recordingSeconds).toBe(recording);
    }
  });

  it.each(timedSpeakingPrompts)('$id preserves exact snapshot shape, content and self-review checklist', (prompt) => {
    expect(Object.keys(prompt).sort()).toEqual(expectedKeys);
    expect(prompt.id).toMatch(/^[a-zA-Z0-9_-]{1,160}$/u);
    expect(bands.some((band) => band.level === prompt.level)).toBe(true);
    expect(prompt.sourceType).toBe('CURATED');
    expect(prompt.reviewStatus).toBe('UNREVIEWED');
    expect(prompt.title).toBe(prompt.title.trim());
    expect(prompt.title.length).toBeGreaterThan(5);
    expect(prompt.title.length).toBeLessThanOrEqual(300);
    expect(prompt.prompt).toBe(prompt.prompt.trim());
    expect(prompt.prompt.match(/\p{Script=Han}/gu)!.length).toBeGreaterThanOrEqual(10);
    expect(prompt.prompt.length).toBeLessThanOrEqual(8000);
    expect(`${prompt.title} ${prompt.prompt} ${prompt.checklist.join(' ')}`).not.toMatch(/TODO|PLACEHOLDER|lorem ipsum/iu);
    expect(Number.isInteger(prompt.preparationSeconds)).toBe(true);
    expect(prompt.preparationSeconds).toBeGreaterThanOrEqual(0);
    expect(prompt.preparationSeconds).toBeLessThanOrEqual(120);
    expect(Number.isInteger(prompt.recordingSeconds)).toBe(true);
    expect(prompt.recordingSeconds).toBeGreaterThanOrEqual(1);
    expect(prompt.recordingSeconds).toBeLessThanOrEqual(120);
    expect(prompt.checklist.length).toBeGreaterThanOrEqual(3);
    expect(prompt.checklist.length).toBeLessThanOrEqual(4);
    expect(new Set(prompt.checklist.map(normalize)).size).toBe(prompt.checklist.length);
    for (const item of prompt.checklist) {
      expect(item).toBe(item.trim());
      expect(item.length).toBeGreaterThan(10);
      expect(item.length).toBeLessThanOrEqual(500);
      expect(item).toMatch(/[À-ỹ]/u);
    }
    // Exercise the production allowlist rather than permitting test-only snapshot fields.
    expect(() => validateSpeakingAttemptBackupRecord({
      id: `test-${prompt.id}`, prompt_id: prompt.id, snapshot_json: JSON.stringify(prompt),
      recorded_at: '2026-10-01T00:00:00.000Z', duration_ms: prompt.recordingSeconds * 1000,
      self_review: '', checklist_json: JSON.stringify(prompt.checklist), transcript_opt_in: 0,
      transcript: null, audio_retention: 'SESSION_ONLY',
    })).not.toThrow();
  });

  it('anchors every addition in a distinct real-life scene instead of generic study advice', () => {
    const scenes: Record<string, string[]> = {
      'speak-1-buy-water': ['小店', '几瓶'],
      'speak-1-meeting-message': ['学校门口', '喝茶'],
      'speak-2-lost-umbrella': ['饭店', '黑色的伞'],
      'speak-2-zoo-message': ['动物园门口', '二十元'],
      'speak-3-dinner-plan': ['四个人', '蔬菜'],
      'speak-3-running-notice': ['周五前报名', '体育馆'],
      'speak-4-lamp-exchange': ['台灯', '换货'],
      'speak-4-neighbor-repairs': ['装修', '周日早上七点'],
      'speak-5-vegetable-summary': ['菜篮', '电话预订'],
      'speak-5-office-space': ['会议室', '管理成本'],
      'speak-6-museum-summary': ['博物馆', '三个月'],
      'speak-6-bus-detour': ['接驳车', '十五分钟'],
      'speak-79-logistics-summary': ['共同仓库', '两条商业街'],
      'speak-79-night-exhibition': ['灯光展', '收益分配'],
    };
    expect(Object.keys(scenes)).toHaveLength(14);
    for (const prompt of timedSpeakingPrompts.slice(7)) {
      expect(prompt.prompt).not.toMatch(/学习中文|学习计划|提高汉语/u);
      expect(scenes[prompt.id]).toBeDefined();
      for (const anchor of scenes[prompt.id]!) expect(prompt.prompt).toContain(anchor);
    }
  });

  it('varies reading, restatement, explanation, opinion and summary tasks', () => {
    const byId = (id: string) => timedSpeakingPrompts.find((prompt) => prompt.id === id)!.prompt;
    expect(byId('speak-1-meeting-message')).toContain('朗读');
    expect(byId('speak-2-zoo-message')).toContain('用自己的话');
    expect(byId('speak-6-bus-detour')).toContain('解释');
    expect(byId('speak-5-office-space')).toContain('说明理由');
    expect(byId('speak-79-logistics-summary')).toContain('口头摘要');
  });
});
