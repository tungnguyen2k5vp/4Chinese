# AI role-play V5 — bounded goals and optional cloud text

## Delivered in this disjoint slice

Only `src/app/speaking/ai.tsx`, new `src/services/speaking/roleplay-v5.ts`, its test file, and this document are owned/modified. No provider adapter/API contract, backend, keys, auth configuration, schema, backup, package or other screen changes.

The existing `/speaking/ai` route, three provider-supported scenes (`daily`, `restaurant`, `directions`), HSK 1–6 selection, typed input, native speech recognition, Mandarin replay/pinyin/Vietnamese explanation, read-replies switch, clear-session control and Cloud navigation are retained. This slice does **not** falsely label unsupported shopping/hotel/etc. scene IDs as supported by the unchanged backend; those additional scenes remain pending a separately owned provider/content expansion.

## Goals and honest self-assessment

Each scene now has a setting, explicit goals, a few target words/grammar forms, useful learner phrases and bilingual scripted partner lines. Restaurant goals are greet → ask for menu → order two items → ask price → request bill. Daily practice covers introduction/work or study/interests; directions covers polite asking/route/distance/confirmation.

The goal checklist is **self-assessed**, never automatically checked by transcript matching or AI output. The summary shows user-marked goals and exact-text target-word occurrences, explicitly not speaking quality, exam readiness or pronunciation. AI corrections are labelled suggestions about text requiring user review, not verified teacher feedback. No STT/acoustic/pronunciation score is produced. Scripts are original internal practice drafts, not official HSK material or teacher-verified content; human linguistic review is still a release-content gate. HSK selection expresses desired practice level; offline examples are fixed, not adaptively level-validated.

## Offline alternative

Every fresh/reset session starts in **OFFLINE** mode with cloud consent unset. Offline turns never invoke the provider/auth adapter or upload conversation data. They return the clearly labelled fixed script for the current unchecked goal, regardless of the submitted text, and explicitly say the script does not analyze/correct the user's sentence. Users can read/say the phrase, use it as a typed draft, replay the partner line when a Mandarin voice exists, and mark their goal manually.

Missing login/expired session, unavailable configuration/deployment, network failure, timeout, provider failure, invalid reply and rate/quota limits have clear error hints and an explicit “Tiếp tục bằng kịch bản offline” path. Failed text stays in the composer. No automatic retry or silent offline reply masquerading as AI. The Cloud route remains available but this worker did not log in, create accounts or configure/deploy anything.

Offline **typed/script practice** requires no network/auth. Optional system STT and TTS may depend on OS services, downloaded voices or OS network settings; they are not represented as guaranteed on-device/offline inference.

## Consent and minimization

Before the first AI send, users must read the disclosure and explicitly consent, then choose optional AI mode and submit their reviewed text. Consent alone does not send anything. It can be withdrawn; pending requests are aborted and subsequent turns return to offline. Already-sent text cannot be recalled from the provider.

The unchanged API receives only its existing `message`, `history`, `level`, `scene`, plus the adapter's abort signal. `message` contains a compact current-scene/current-goal/few-target-words/grammar instruction and the reviewed user text; the instruction explicitly prohibits pronunciation assessment from text. History is at most **six text items (three AI exchanges)**, never the full session, never private offline practice, and never the learning DB, recordings, goal-checkbox history or backup. Switching offline → AI cannot silently transmit earlier offline exchanges. The disclosure warns that provider handling/retention follows its policies and advises against real names/private details.

Speech recognition no longer auto-sends final transcripts: it fills a bounded editable draft with an explicit “not sent” notice. The microphone has a separate purpose/network disclosure and OS permission flow. Audio files are not uploaded by this screen. Permission denial, unavailable service, silence and recognizer errors retain the typed alternative.

## Bounds, timeout and cancellation

- Session cap is configurable **before the first attempt**: 4, 8 (default), or 12 attempts. Started attempts, including failures/cancellations, consume the cap. Exchanges cannot grow beyond it. The limit is a session UI safeguard, **not a durable daily/account quota**; reset can start another session. Persistent daily quota/usage remains pending under separately owned backend/settings policy.
- User input: **300 UTF-16 units**, leaving space inside the unchanged provider's 500-unit message cap. Long recognized text is visibly shortened to a 300-unit draft for editing, not automatically sent. Provider replies retain the existing field validation.
- One pending turn at a time; synchronous session-ref publication prevents double-submit races.
- Wrapper hard timeout: **30 seconds**, including auth/provider stalls. Existing provider's **25-second** fetch timeout remains unchanged. No hidden retries.
- Microphone acquisition/recognition is bounded by **20 seconds**, with manual stop. Background, blur and clear/reset abort recognition, pending cloud calls and TTS. Permission resolutions and reply completions use generation/controller identity guards, so a canceled old attempt cannot restart capture or append into a new session. A permission prompt that triggers a background interruption can require an explicit microphone retry after granting access; it never starts capture silently after cancellation.
- Cancellation promptly clears pending UI, preserves the attempted draft and ignores late results. Offline mode/reset/consent withdrawal invalidate pending turn IDs; reset changes the generation and clears the session.

## Retention

Conversation, draft, consent and checklist are held **only in screen memory**. “Làm mới” deletes that session memory; changing scene/level resets it and consent, avoiding mixed-scene context. Back navigation may retain mounted screen state until unmount; app restart does not restore chat. No private chat is silently written to SQLite, AsyncStorage, backups, analytics or cloud-history storage. The existing foreground study-time hook is retained and does not receive chat text. Persistent lightweight summaries/history and durable retention/delete settings are explicitly **pending**.

## Verification gates

Focused tests: `npx vitest run src/services/speaking/roleplay-v5.test.ts src/services/speaking/gemini-conversation.test.ts`.

Tests cover scene metadata, all configured caps, input bounds, duplicate submit, self-only checklist, reset/stale completion, consent/revocation, fixed-script offline flows with zero transport calls, minimal unchanged provider payload, maximum-input payload bounds in every goal, offline-history exclusion, six-item AI history, auth/network/quota/config/provider failure alternatives, cancel-before-send, cancel-stalled-provider with signal/late result, hard timeout/no retry and response validation.

Scoped lint: `npx eslint src/app/speaking/ai.tsx src/services/speaking/roleplay-v5.ts src/services/speaking/roleplay-v5.test.ts`. Typecheck: `npm run typecheck`. No full suite/build/export by this parallel slice.

Frozen worker checkpoint (2026-10-01): **2 focused test files / 25 tests PASS**, owned-file lint **PASS with no warnings**, repository typecheck **PASS** (`4chinese@0.1.26`). Main owns the subsequent offline/consent browser smoke and wider integration checks; no runtime result is inferred from compilation.

Authenticated Gemini E2E (login/token/Edge Function/secret/provider/quota) is **NOT TESTED**. No auth was performed, no real provider request was used as a success claim, and no production-ready/E2E claim is made. Android/iOS permissions, background/recognition/audio/TalkBack/font scaling and browser UI smoke remain **NOT DEVICE/RUNTIME TESTED** in this worker; no device is connected. Typed offline practice and helper cancellation are unit tested, not device certified. Optional recognition remains dependent on the existing supported native build; web keeps typing/replay with the microphone visibly unavailable.

Versioned references inspected before code: [Expo SDK 57 Speech](https://docs.expo.dev/versions/v57.0.0/sdk/speech/), [Expo SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/); existing optional recognition module/types and provider contracts were read directly from the current repository. Audio/AI/mobile skill guidance influenced explicit opt-in, transcript review, bounded lifecycle and non-scoring/offline labels.
