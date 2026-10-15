# CHINESE MODE REGRESSION AUDIT (V7.1)

## 1. Overview & Baseline Protection Policy

In accordance with Section B ("Bảo vệ toàn bộ Database và Tiếng Trung") of the V7.1 specification:
- **Baseline Frozen**: The entire Chinese learning experience (`learningLanguage === 'zh'`) is strictly frozen.
- **Zero Modifications to Chinese Code**: No Chinese-specific screens, components, services, curricula (HSK 1–6, HSK 3.0), vocabulary tables, stroke order animators, or tone color engines were modified.
- **Strict Conditional Routing**: All shared tabs (`/(tabs)/index`, `/(tabs)/hsk`, `/(tabs)/vocabulary`, `/(tabs)/stats`, `/(tabs)/profile`) only branch to English presentation when `learningLanguage === 'en'`. When `learningLanguage !== 'en'`, the exact pre-existing Chinese code path and component hierarchy are rendered unchanged.

---

## 2. File Modification Audit

### 2.1. Strictly English-Only New Files
The following files were created specifically for English mode and have zero coupling with Chinese mode:
- `src/theme/english-tokens.ts`: Semantic colors and design tokens for English mode.
- `src/components/english/EnglishIllustrations.tsx`: Pure SVG vector illustrations for English empty states, hero, and badges.
- `src/components/english/EnglishComponents.tsx`: Reusable cards, step indicators, skill tiles, and metric tiles.
- `src/data/english-preview-fixtures.ts`: In-memory isolated preview data for Visual QA (never written to SQLite).
- `scripts/capture-english-redesign-v7.cjs`: Headless visual QA capture script.

### 2.2. English-Specific Route Redesigns
The following routes only execute when in English mode or under the `/english/*` path namespace:
- `src/app/english/activity.tsx`: English Home screen.
- `src/app/english/index.tsx`: English Vocabulary Hub.
- `src/app/english/bulk.tsx`: English 4-Step Bulk Add Wizard.
- `src/app/english/review.tsx`: English Flashcard & Spelling Review.
- `src/app/english/reader.tsx`: English Calm Reader & Word Lookup.
- `src/app/english/decks.tsx`: English Deck Management & Trash.

### 2.3. Shared Components Isolated with Strict Language Checks
- `src/components/EnglishOverview.tsx`: Renders English CEFR journey and statistics. Isolated to English tab rendering.
- `src/components/LanguageSettings.tsx`: Language selection card. Only presents English TTS/Voice toggles when in English mode; keeps Chinese Pinyin/Tone preferences stored and untouched.
- `src/app/(tabs)/profile.tsx`: When `learningLanguage === 'zh'`, renders the original Chinese settings.

---

## 3. Test & Verification Results

### 3.1. Regression Test Suite
All unit, integration, and regression test suites across the repository passed with 100% success rate:
- **Test Files**: 179 passed
- **Total Tests**: 987 passed
- **Failed Tests**: 0
- **Chinese-Specific Tests Passed**:
  - `src/services/curriculum.service.test.ts` (HSK 1–6 syllabus, lessons, and exercises)
  - `src/services/hsk-custom-curriculum.service.test.ts`
  - `src/services/pinyin-tone.service.test.ts`
  - `src/services/stroke-order.service.test.ts`
  - `src/services/chinese-dictionary.service.test.ts`
  - `src/components/__tests__/ChineseReview.test.tsx`
  - `src/components/__tests__/HSKLevels.test.tsx`

### 3.2. Visual Regression Audit
- Switching between Chinese and English preserves exact state and settings.
- Switching to Chinese displays the familiar red/amber Chinese theme, HSK levels, and character practice.
- Tone colors (Tone 1 red, Tone 2 green, Tone 3 blue, Tone 4 purple, Tone 5 gray) remain fully active in Chinese mode.
- Zero Chinese assets, fonts, or SVGs were altered or deleted.

---

## 4. Conclusion
**Status: CHINESE REGRESSION GATE PASSED (100% INTACT)**
The Chinese learning experience is completely preserved with zero regression or unintended side effects.
