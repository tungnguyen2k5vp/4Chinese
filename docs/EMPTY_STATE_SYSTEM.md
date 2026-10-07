# Empty, Loading, and Error State System

Status: V5.2 UX specification grounded in the current shared EmptyState component and its current uses. This is not a claim that all routes use the shared component or that all states have been visually/accessibility tested.

## Verified current implementation

src/components/EmptyState.tsx currently provides:

- A theme-aware decorative icon mark, title, message, and optional primary/secondary action.
- A general accent from theme.primary or a skill accent from theme.skillColors.
- A semantic header role for the title.
- A decorative mark excluded from accessibility traversal.
- Actions rendered through PrimaryButton, which exposes button role, label, and disabled/loading behavior.
- No loading spinner, retry/error model, status-announcement mechanism, route state classifier, or persistence behavior. It is an empty-content component, not a generic async-state controller.

Current code uses the component in several places, including review/index, review/upcoming, review/weak, learn/setup, daily plan fallback, mistakes/index, vocabulary no-results, decks/index, decks/detail, decks/trash, deck listening/quiz/pronunciation, Reader no-token chunk, and missing-word/no-example states. These use cases do not all mean the same thing: “nothing due today,” “no matches,” “all new words used,” “no words in this deck,” and “no known vocabulary in this paragraph” must stay distinct.

Other routes still render empty/error/loading content locally using text, ActivityIndicator, Alert, or route guards. Examples include story lists/details, grammar, exam, Cloud, mistake detail, and Learning Path. Source usage is therefore partial, not a complete app-wide state audit. No dedicated EmptyState component test file was found during this inspection; tests for current coverage were not run.

## State vocabulary

Do not use “empty” as a catch-all. Select a state based on the underlying result:

| State kind | Meaning | Presentation/action |
|---|---|---|
| Initial loading | Data has not resolved yet | Brief, stable progress indicator with a concise accessible status; do not show a zero-data empty state while loading. |
| True empty | The query succeeded and no records exist | Explain what is absent and why; offer only a real, safe next action. |
| All caught up | Records exist, but none require action now | Reassuring completion copy; state the scope/time window and the next available action, without claiming a practice session occurred. |
| Filter/search no results | Data exists but the current query/filter matches nothing | Echo the search/filter condition and offer clear/reset filters or edit the query. Do not recommend creating unrelated data. |
| Prerequisite/guard | The route cannot start because required data/permission/ID is missing | Explain the exact prerequisite and navigate back or offer the permitted setup route. Do not disguise a guard as success. |
| Feature unavailable | Platform/build/voice is unsupported or not configured | Explain the requirement and provide an alternate path. A disabled feature is not a zero-content result. |
| Recoverable error | The request failed; prior data may still be intact | Keep stale/current user data when safe, state what failed, provide retry/back/offline fallback, and never erase progress. |
| Destructive confirmation | A user requested deletion/reset | Use a confirmation and describe scope/reversibility. It is not an empty state. |

When content already exists, prefer an inline status/retry instead of replacing the whole content with a generic error. Loading, empty, and error should not all be visible simultaneously for the same data source, unless the UI intentionally communicates partial content plus a separate refresh error.

## EmptyState content contract

Use the existing component for true empty or no-results presentation, with copy specific to the underlying domain:

1. **Icon:** short visual cue only. Keep it decorative if adjacent text explains the state. Do not use an emoji/Hanzi glyph as the only action or status.
2. **Title:** one concise statement naming the current state. “Chưa có từ đến hạn” is different from “Đã ôn xong.”
3. **Message:** one or two sentences explaining scope/cause and what event/data would change the state. Avoid blame, pressure, or invented curriculum.
4. **Primary action:** one safe action directly related to the state. If none exists, omit it rather than adding a dead-end CTA.
5. **Secondary action:** a real alternative/back path, visually subordinate.
6. **Accent:** general or existing skill accent only. Category color identifies content type, never correctness, urgency, completion, or availability by itself.

Keep the existing component API as the default starting point. A future ErrorState or LoadingState component can be considered separately; do not make EmptyState pretend to own retries, network, permission, or loading state. If the component is extended, keep it presentation-only and theme-aware.

## Copy and routing examples

- Review with zero due words: say no words are due now; do not say a session is complete unless a session actually ran.
- Review weak/upcoming lists with no rows: describe what causes an item to appear later.
- New-word selection after the daily goal is met: say that goal is complete and direct to due review if available.
- Deck with no words: direct to add/import words. Keep quiz/listening minimum-count requirements specific to those activities.
- Search with zero matches: suggest alternate Hanzi/pinyin/meaning or clearing a filter.
- Reader chunk with no known Hanzi vocabulary: keep source text and chunk navigation available; do not imply the document is empty.
- Mistake route with nonexistent/resolved ID: explain that the item is unavailable and provide a route back to the mistake book. Do not render a success/completion state.
- Content unavailable by platform/build (such as optional OCR): state the requirement and offer paste/file input where supported.

## Accessibility and visual rules

- Keep EmptyState title as a heading and the icon decorative when redundant.
- PrimaryButton already supplies button semantics; all custom Pressable actions must add a localized accessible name and exposed disabled/selected state.
- When a state changes asynchronously, announce the new status politely without unexpectedly stealing screen-reader focus. The current EmptyState component itself does not implement a live region; call sites must decide when an announcement is needed.
- Do not express “complete,” “error,” “locked,” or “unavailable” with hue alone. Use explicit text and/or familiar icon.
- Use semantic foreground/background pairs from the current theme in both light and dark mode; no fixed white surface or raw skill-color text. Large text must wrap and actions must remain reachable.
- Empty screens should not start loops or celebratory animation. Respect OS/app reduced-motion settings for any future entrance transition.
- Keep primary target at least 48 dp per the current UI guideline; ensure secondary actions remain visible on short screens and when the keyboard is open.
- Confirm screen reader reads title, message, primary action, secondary action in a sensible order. Do not expose the decorative icon as a redundant extra stop.

Dark-mode appearance, TalkBack/VoiceOver output, large-text layout, live announcements, and reduced-motion behavior have not been comprehensively tested across current call sites.

## Migration guidance

1. Inventory each state source (query/loading/error/permission/prerequisite) before adding EmptyState. Do not infer a true empty result from an uninitialized array.
2. Use the shared component for consistent true-empty copy/layout, while retaining route-specific title, message, variant, and safe actions.
3. Keep recoverable error/retry handling distinct. Explain whether source/local data remains intact and preserve retry inputs.
4. Keep route guards and missing IDs truthful; do not convert a missing record into a blank page or “completed” state.
5. Keep interactions and data contracts unchanged when migrating visuals: no automatic record creation, progress increment, SRS scheduling, delete, deck restore, or reward.
6. Test each route’s empty and populated state; a screenshot of an empty state does not prove the populated workflow.

## Minimum verification matrix

| Representative route | State to verify | Regression risk |
|---|---|---|
| /review | No due words vs populated due queue | “All caught up” is not confused with a completed session. |
| /review/result | No session/0 items vs actual completed session | Never report 0/0 as a successful review. |
| /learn/setup | Daily goal met vs no remaining new words vs loading | Preserve due-review alternative and existing word-selection logic. |
| /decks and /decks/[id] | No decks vs empty deck vs populated deck | Empty action creates/adds only when explicitly requested; never lose deck IDs. |
| /decks/listening, /decks/quiz, /decks/pronunciation | Activity-specific minimum-data guard | State exact minimum and route back safely; do not start invalid session. |
| /search and vocabulary tab | No query vs no results vs load error | Clearing filters/query remains distinct from network/database retry. |
| /reader | No document vs no Hanzi in current chunk vs analysis failure | Preserve source text, chunking, and resume location. |
| /mistakes/practice | Valid item vs missing/resolved ID | Negative guard is not evidence of valid practice. |
| /path | No courses vs loading failure vs valid course list | Never seed fake course data or imply progress. |

These checks are proposed. This document does not report that any route-wide matrix has passed.
