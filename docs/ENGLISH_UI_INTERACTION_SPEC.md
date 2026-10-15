# ENGLISH UI INTERACTION SPECIFICATION (V7.1)

## 1. Overview & Interaction Principles

The English Experience Redesign (V7.1) establishes a modern, responsive, mobile-first design system tailored for Vietnamese learners of English within the 4Chinese multi-language platform.

### Core Interaction Principles:
1. **Immediate Feedback & Low Latency**: Every tap or touch target responds within 16ms with visual press state (`opacity: 0.85` or scale `0.98`).
2. **Progressive Disclosure**: Primary learning actions are prominent; advanced forms, sample guides, and dictionary notes are accessible via elegant toggle chips rather than overwhelming walls of text.
3. **Graceful Zero-States**: When decks, review queues, or reading texts are empty, custom vector illustrations explain the benefit and provide a single, high-contrast primary Call-to-Action (CTA).
4. **Accessible Typography & Touch Targets**: Minimum touch target of 44×44pt, high-contrast text conforming to WCAG AA, and legible English headword hierarchy.

---

## 2. Screen-by-Screen Interaction Specifications

### 2.1. English Home (`src/app/english/activity.tsx`)
* **Hero Banner (`EnglishHeroCard`)**:
  - Dynamic status: Displays "Tiếp tục học từ vựng" when cards are due or "Khởi đầu hành trình tiếng Anh" when empty.
  - Interactive chip: Directly launches due review or guides to first deck creation.
* **Today's Progress (`EnglishMetricTile` Grid)**:
  - 4-column metric matrix: Due cards (Amber), Learned words (Royal Blue), Streak (Coral), and XP (Violet).
  - Tap interaction: Directly filters or routes to the corresponding review or stats page.
* **Quick Learning Chips**:
  - Time-boxed learning sessions: "⚡ 3 phút (5 thẻ)", "⚡ 5 phút (10 thẻ)", "⚡ 10 phút (20 thẻ)".
  - Feedback: If review queue has cards, launches time-boxed session; if empty, smoothly toasts guidance to add words.
* **Explore Skills Matrix**:
  - Dedicated visual tiles for Vocabulary Hub, Flashcard Review, Reading Center, and CEFR Journey.
* **Mistake Notebook (`Sổ lỗi tiếng Anh`)**:
  - Replaces plain narrative paragraph with structured, reviewable error card and instant retry button.

### 2.2. CEFR Level Explorer (`src/components/EnglishOverview.tsx`)
* **Interactive Level Selector**:
  - 6 CEFR level tabs: A1 (Foundations), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Mastery).
  - Active tab: Vibrant accent badge with distinct level theme color.
* **Honest Curriculum State**:
  - Explicit badge: "Đang biên soạn & kiểm định".
  - Clear rationale: Transparently communicates that verified CEFR syllabus is being curated, without presenting fake progress bars.
  - Fallback Actions: "Mở kho từ vựng cá nhân" and "Ôn tập flashcards".

### 2.3. English Vocabulary Hub (`src/app/english/index.tsx`)
* **Overview Summary Hero**:
  - Real-time deck count, personal word count, and due reviews count.
* **Dual Primary Action Row**:
  - **Tạo bộ từ** (Accent royal blue button with `+` icon): Toggles inline deck creation modal/card.
  - **Thêm nhiều từ** (Violet secondary button with import icon): Navigates directly to 4-step Bulk Add wizard.
* **Deck List (`EnglishDeckCard`)**:
  - Each deck card displays deck title, word count badge, due card indicator, and a prominent "Học ngay" button.
* **Inline Quick Actions**:
  - Filter chips: All, Due, Recent.
  - Quick action toolbar: Add word manually, Manage decks, View Trash.

### 2.4. English Bulk Add Wizard (`src/app/english/bulk.tsx`)
* **4-Step Guided Flow**:
  - `EnglishStepIndicator`: Step 1 (Nhập danh sách) -> Step 2 (Kiểm tra cú pháp) -> Step 3 (Chọn nghĩa) -> Step 4 (Xác nhận lưu).
* **Sample Format Helper**:
  - Collapsible toggle: "Xem định dạng mẫu" revealing TSV / tab-separated examples (`word [tab] nghĩa`).
* **Instant Syntax Validator**:
  - Live count: Total lines, valid entries, duplicate words, and empty lines.
* **Parse Preview Cards**:
  - Each parsed row is rendered as an isolated review chip with status badge before database insertion.

### 2.5. English Review / SRS (`src/app/english/review.tsx`)
* **Flashcard Surface**:
  - Large English headword (32pt bold), IPA phonetics (`/pɜːrsəˈvɪrəns/`), audio pronunciation button.
* **Interactive Reveal**:
  - "Hiện nghĩa tiếng Việt" button initiates smooth fade/flip reveal.
  - Revealed state displays Vietnamese definitions, part of speech badge, and context sentence.
* **SRS Grade Hierarchy**:
  - 4 distinct grade actions: Quên (Red, 1 ngày), Khó (Amber, 2 ngày), Nhớ (Royal Blue, 4 ngày), Dễ (Green, 7 ngày).
* **Spelling Review Variant**:
  - Audio prompt + clue definition -> Clean text input with auto-capitalization disabled -> Instant check feedback.

### 2.6. English Reader (`src/app/english/reader.tsx`)
* **Reader Landing vs Reading Surface**:
  - Landing screen: Recent reading documents list, document word counts, and an illustrated "Dán bài đọc mới" CTA.
* **Reading Typography Controls**:
  - Floating font size adjuster (A- / A+) and line-height toggle.
* **Interactive Word Token Lookup**:
  - Tapping any word in reading view immediately opens an in-situ bottom sheet modal showing IPA, part of speech, Vietnamese gloss, and an "Lưu vào bộ từ" action.

### 2.7. English Statistics Dashboard (`src/components/EnglishOverview.tsx`)
* **Growth Illustration Hero**:
  - Seedling vector illustration with personalized learning greeting.
* **Metric Cards Matrix**:
  - Study Time (Phút học), Words Mastered (Từ đã thuộc), Total Reviews (Lượt ôn), and Accuracy Rate (Tỉ lệ nhớ).
* **Visual Retention XP Spotlight**:
  - Milestone progress card displaying current streak and SRS retention projection.

### 2.8. Language Settings & Isolation (`src/components/LanguageSettings.tsx`, `src/app/(tabs)/profile.tsx`)
* **Language Switcher Card**:
  - Side-by-side cards for "Tiếng Trung" (Mandarin) and "Tiếng Anh" (English) with active checkmarks and flags.
* **English Context Isolation**:
  - Displays US / UK voice toggle and speech speed slider.
  - Chinese-specific settings (Pinyin display, Tone coloration, Stroke order) are hidden in English mode, while their stored configuration is preserved 100% in database storage.
