# VISUAL QA & DESIGN EVALUATION REPORT (V7.1)

## 1. Overview & Visual Quality Objectives

The 4Chinese V7.1 English Experience Redesign elevates the English learning experience (`learningLanguage === 'en'`) from an unadorned administrative utility into a modern, vibrant, engaging, and motivating language-learning app.

### Visual Identity Principles:
- **Color Identity**: Dedicated semantic palette for English (Royal Blue `#2563EB` as primary brand color, supported by Violet `#7C3AED`, Teal `#0D9488`, Amber `#D97706`, Coral `#EA580C`, and Indigo `#4F46E5`). This contrasts cleanly with the Chinese mode's traditional Imperial Red / Gold palette while maintaining cohesive typography and iconography.
- **Micro-Animations & Visual Hierarchy**: Cards feature subtle elevations (`shadowColor: '#000'`, elevation 2–4), rounded surface boundaries (16–20dp border radii), and high-contrast typographic scaling.
- **Original Vector Illustrations**: Pure SVG components rendered via `react-native-svg`, eliminating raster pixelation and ensuring crisp rendering across 1080p, 1440p, and high-DPI retina displays.

---

## 2. Visual Quality Standards & Accessibility

### 2.1. Typography Hierarchy
| Role | Font Size / Weight | Contrast Ratio (Light) | Contrast Ratio (Dark) | Sample Usage |
| :--- | :--- | :--- | :--- | :--- |
| English Headword | 28–32pt Bold | > 12:1 (Black on White) | > 14:1 (White on Slate) | "perseverance", "eloquent" |
| IPA Pronunciation | 15pt Regular / Italic | > 6.5:1 (Slate 600) | > 7:1 (Slate 300) | `/ˌpɜːrsəˈvɪrəns/` |
| Vietnamese Gloss | 16–18pt Semibold | > 9:1 (Slate 800) | > 10:1 (Slate 100) | "sự kiên trì, bền bỉ" |
| Section Header | 18–20pt Bold | > 11:1 | > 12:1 | "Tiến độ hôm nay", "Kho từ" |
| Chip / Badge Label | 12–13pt Bold | > 4.5:1 (WCAG AA) | > 5:1 (WCAG AA) | "CEFR B1", "ĐẾN HẠN: 18" |

### 2.2. Safe Areas & Layout Ergonomics
- **Bottom Navigation Clearance**: All scrollable views feature `contentContainerStyle={{ paddingBottom: 96 }}` to prevent sticky bottom navigation bars or gesture home bars from obscuring buttons or primary CTAs.
- **Form Ergonomics**: Bulk input and Card editors provide `keyboardShouldPersistTaps="handled"` and ample vertical padding to prevent virtual keyboards from occluding submit actions.
- **Horizontal Overflow**: Zero horizontal scrollbars or clipping across 360dp, 390dp, and 412dp screen widths.

---

## 3. Side-by-Side Contact Sheet Comparisons

### Sheet 1: English Home (`cs-01-home-comparison.png`)
- **Before (Build 42)**: Flat title, solitary blue button, wall of zero-value statistics in plain text, stacked buttons, unformatted mistake paragraph.
- **After (V7.1)**: English Hero banner with vector illustration, 4-metric progress grid (Due, Learned, Streak, XP), 3/5/10 min Quick Learning chips, Explore Skills matrix, structured mistake book with instant retry.

### Sheet 2: CEFR Level Journey (`cs-02-cefr-comparison.png`)
- **Before (Build 42)**: Blank screen displaying an unstyled error message about unverified curriculum.
- **After (V7.1)**: Interactive 6-level CEFR Journey explorer (A1 through C2) with distinct level badges, honest "curriculum in progress" status, and direct CTAs to open personal decks and flashcard reviews.

### Sheet 3: English Vocabulary Hub (`cs-03-vocabulary-comparison.png`)
- **Before (Build 42)**: Cluttered list of administrative buttons, textareas, and technical schema notes.
- **After (V7.1)**: Dedicated Vocabulary Hub featuring hero metrics, side-by-side primary action buttons ("Tạo bộ từ" & "Thêm nhiều từ"), rich deck cards with word count and due review badges, and inline quick tools.

### Sheet 4: English Reader (`cs-04-reader-comparison.png`)
- **Before (Build 42)**: Raw form with title input, large textarea, and technical instructions occupying the entire screen.
- **After (V7.1)**: Separated Reader Landing with recent articles and illustrated paste action; dedicated calm reading surface with font-size controls and instant word-tap bottom sheet lookup.

### Sheet 5: Bulk Add Wizard (`cs-05-bulk-comparison.png`)
- **Before (Build 42)**: Monolithic textarea with long instruction text.
- **After (V7.1)**: 4-step wizard with step indicator, collapsible format guide toggle, instant syntax validation counter, and individual parsed card preview chips.

### Sheet 6: English Review / SRS (`cs-06-review-comparison.png`)
- **Before (Build 42)**: Empty screen filled with verbose technical text about missing cards.
- **After (V7.1)**: Vibrant illustrated empty state with motivational guidance; lively flashcard review surface with IPA, audio playback, flip reveal animation, and 4 distinct SRS rating levels.

### Sheet 7: English Statistics (`cs-07-statistics-comparison.png`)
- **Before (Build 42)**: Large white card listing 10 zero metrics in a single unstyled block.
- **After (V7.1)**: Progressive dashboard with seedling growth illustration, 4-tile metric grid (Study Time, Words Mastered, Reviews, Accuracy), and XP retention projection card.

### Sheet 8: Language Settings & Isolation (`cs-08-settings-comparison.png`)
- **Before (Build 42)**: Chinese-specific options (Pinyin display, Tone colors) visible while studying English.
- **After (V7.1)**: High-contrast Language Switcher cards (Mandarin vs English); English-context options (US/UK accent toggle, TTS rate) displayed while Chinese settings remain 100% preserved and isolated.

---

## 4. Theme & Appearance Validation
- **Light Theme**: Crisp off-white backgrounds (`#F8FAFC`, `#FFFFFF`), subtle borders (`#E2E8F0`), vibrant Royal Blue accents.
- **Dark Theme**: Deep slate/charcoal backgrounds (`#0F172A`, `#1E293B`), refined borders (`#334155`), glowing indigo/blue accents (`#3B82F6`), high legibility white text (`#F8FAFC`).
- **Reduced Motion**: Gracefully falls back to instantaneous opacity transitions without jerky spring animations when system Reduced Motion is enabled.
