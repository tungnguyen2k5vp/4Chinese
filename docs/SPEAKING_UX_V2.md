# Speaking AI UX V2

Status: V5.2 UX and implementation notes based on current source. The current screen already separates setup from conversation and supports offline scripts, optional consent-gated AI, typed input, optional system speech-to-text, text-to-speech playback, a self-check, a local quota, and optional manual summaries. The prior screenshot audit captured the setup view only; it did not verify a full conversation, mic permissions, AI service, quota edge cases, or audio behavior.

## Verified current behavior and limits

- The screen is src/app/speaking/ai.tsx. Initial session mode is OFFLINE; changing the HSK level/topic resets the current in-memory roleplay, and “Làm mới” clears it. Setup and conversation are separate states in this route.
- A fixed offline script is available without network or consent. It returns a predefined partner line and explicitly does not analyze/score the learner’s input.
- AI mode requires an explicit privacy consent action. The current disclosure says the checked text, scenario/level, current goal, suggested words/structures, and up to six prior AI text turns are sent through the server to Gemini. It says no audio file, offline history, or learning database is sent; the provider may process/store data under its own policy. The disclosure advises avoiding real names/private information.
- The AI session chat is held in screen memory and is not automatically written to DB/backup. Resetting or changing topic/level clears it. Withdrawing consent cancels a pending request, returns to offline, and cannot retract text already transmitted.
- Typed input is 1–300 UTF-16 units. Starting a turn consumes the per-session attempt. A failed or canceled started attempt is not automatically retried; the draft is restored for editing. AI calls reserve local quota before transport, with no refund after reservation.
- Voice input uses an optional native speech-recognition module on Android/iOS, not on web. Before requesting permission, the screen explains that the OS speech service may use a network and that speech becomes an editable draft. It is never auto-submitted. Recognition stops after 20 seconds; empty, no-match, denied, unavailable-service, and network errors have typed-input fallback. Long recognition text is truncated to 300 units with an instruction to review it.
- Recognized text is not pronunciation scoring. AI feedback is labeled as written-text guidance, not a speech score. No audio recording is uploaded to Gemini by this roleplay flow, and roleplay audio is not persisted.
- Optional reply playback uses system Mandarin TTS; unavailable voice/playback errors leave the text readable. Playback and voice recognition are stopped when the screen loses focus/backgrounds.
- The learner can self-check scenario goals. The completion summary is based on self-checked goals and text matching against target words; it is not an AI-verified goal, pronunciation score, HSK score, or official exam result.
- Turn limits are 4, 8, or 12 per roleplay session. AI has a separate local daily quota (default 20/day UTC; setup offers 10/20/40/day) and local AI session limit (4/8/12). The repository allows daily limits 1–100. If the local limit cannot be read/validated, the UI fails closed for AI and leaves offline available. The local budget is not server/account enforcement. Deleting saved summaries does not reset daily usage.
- Local history is explicitly saved and stores scenario, HSK level, attempts, self-checked-goal counts, and matching target words. An optional learner-authored note up to 600 characters requires opt-in. Despite the schema field name transcript_summary, source says no generated/raw transcript is saved.

Source references: src/app/speaking/ai.tsx, src/services/speaking/roleplay-v5.ts, src/services/speaking/gemini-conversation.ts, src/services/speaking/gemini-conversation-contract.ts, src/db/roleplay-history.ts, src/db/speaking.ts, src/services/speaking/local-recording.ts. Separate local recording features elsewhere in the app do not change this AI roleplay privacy contract.

## V2 experience

Default mode: LEARN. Make the learner’s next conversational action the visual center. Configuration, consent, limits, and saved-history controls are important but should not compete with the conversation composer during an active turn. The current setup view contains extensive configuration, quota, history, self-check, and consent content; a future visual simplification may group advanced controls, but must retain their meaning and accessibility.

### Setup

Present one setup sequence:

1. Choose a scenario and optional HSK practice level.
2. Read the scenario’s suggested words, structure, and self-check goals.
3. Choose offline by default or explicitly opt into AI after seeing the consent disclosure.
4. Show the applicable turn limit and local AI quota before beginning.

Keep scenario wording recognizable and label the HSK value as desired practice level, not certification. Keep internal/script material labeled as fixed/unverified where applicable. If the learner selects AI without consent or the quota cannot be checked, explain why and preserve the offline option.

If changing scenario/level or resetting would discard an unfinished draft or in-memory exchange, propose a confirmation before clearing it. The current source clears the in-memory roleplay on scenario/level change; the confirmation behavior is a proposal and must not secretly persist chat.

### Conversation

After start, prioritize:

- A clear mode badge: Kịch bản offline or AI tùy chọn.
- Scenario/current goal and remaining turns in compact form.
- A readable user/partner exchange with Hanzi, pinyin, Vietnamese meaning, and clearly labeled text guidance.
- A composer that remains reachable with the keyboard, a visible character count, typed send, and optional speech-to-text button.
- A visible, labeled busy/cancel action while a response is pending.
- An explicit return to setup. Do not unexpectedly scroll away from privacy/help content; current source scrolls to the end without animation after an exchange.

Keep a received transcript as an editable draft. Require a deliberate Send action after review. Do not auto-send speech recognition output, silently remove more than the current 300-character policy, or imply that a recognized sentence was evaluated for tone/pronunciation.

### End of session

Show attempts used, self-check count, and target-word text matches with careful labels. Keep any summary distinctly learner-authored and opt-in. Do not award a grade, proficiency score, pronunciation score, pass probability, or HSK certificate. Make “Lưu tóm tắt” and “Không lưu” separate intentional actions.

## State and edge-case contract

| State | Required UX |
|---|---|
| Setup, offline default | Start with fixed script available; no login/network/consent gate for this path. |
| AI mode without consent | Keep AI disabled and explain consent; do not call the provider. |
| Consent granted | Keep disclosure accessible from setup; show revoke action. Revocation applies to future requests, not text already sent. |
| Quota loading/unavailable | Distinguish loading from unavailable. Fail closed for AI if quota cannot be checked; provide offline action. |
| Draft input | Preserve input on ordinary network/quota/service failure so the learner can edit. Count characters and enforce 300-unit maximum. |
| Speech recognition permission | Explain before requesting; if denied/unavailable, keep keyboard input usable and do not repeatedly prompt. |
| Recognition running | Show listening state, stop control, and 20-second bound. Stop when screen backgrounds or loses focus. |
| Transcript ready | Populate editable draft and explicitly say it has not been sent. If over limit, truncate visibly and require review. |
| Sending/pending | Disable duplicate submission; communicate whether the response is offline or AI. Offer cancel and prevent late canceled response from appearing. |
| AI timeout/network/rate limit/auth failure | Do not auto-retry. Restore draft; explain that a reserved AI attempt may count; offer offline, and login only for auth-required responses. |
| Offline reply | Identify it as fixed, local, and non-analytical; never imply AI evaluated the user text. |
| Session limit reached | Stop further turns, preserve existing in-memory exchange/checklist for review, and offer explicit reset/new scenario. |
| TTS unavailable | Keep reply visible; explain Mandarin system voice may need installing, with no loss of the conversation. |
| Save summary | Save only the metadata and optional note already defined by the source; confirm local save. No hidden transcript/audio persistence. |
| Delete summary | Confirm destructive deletion; state that used AI quota is not reset. |
| App background/route exit | Stop speech/TTS and cancel pending work as current source does. Do not claim chat survives route teardown. |

## Privacy and correctness guardrails

- Preserve the consent text and its actual request scope. If request payload changes, review the privacy disclosure before implementation.
- Keep the offline transport completely separate from the network provider; OFFLINE must not invoke auth or Gemini.
- Do not store microphone audio, raw recognition events, full chat, or AI transcript in roleplay history/backup. If the learner opts into a note, save only their explicit note and existing minimized session metadata.
- Do not claim that audio is never handled by any service: the OS speech-recognition service may use network according to device settings. The source’s narrower statement is that the roleplay app does not send an audio file to Gemini and does not save audio.
- Do not claim quota is enforced globally by the local SQLite counter. It is a local budget; preserve server/account enforcement separately if present.
- Do not infer goal completion from the AI. The current self-check is user-controlled, and used-word detection is text matching.
- The phrase “AI says” must not be presented as factual teaching authority; the current UI labels AI text advice as requiring self-check.

## Accessibility, theme, and motion

- Preserve accessible labels/state for scenario, HSK level, limits, goal checkboxes, consent, switches, input, microphone, send, playback, and setup/reset controls.
- Put pending/error/listening notices in a polite live region and ensure they remain visible/readable after keyboard resize.
- Give the text field and send/mic controls stable focus order; test keyboard submit versus explicit send so it never bypasses review.
- Distinguish user versus partner turns with text labels, not bubble color alone. Keep Chinese/pinyin/Vietnamese text scalable.
- Use semantic theme/status colors. Dark mode, contrast, TalkBack/VoiceOver, keyboard resizing on small screens, and reduced motion have not been certified.
- Keep motion subordinate. Do not add typing indicators that loop indefinitely or interrupt the learner. Existing AI reply auto-read is off by default and uses system speech; preserve stop behavior.

## Validation checklist

- [ ] Capture setup and active conversation in both offline and consented-AI modes.
- [ ] Verify AI cannot start before consent and OFFLINE invokes no network/auth transport.
- [ ] Verify consent withdrawal during/after an AI turn and clearly distinguish future from already-sent data.
- [ ] Verify 0/300, 300, and over-limit text; successful send; timeout; cancellation; malformed reply; login-required; rate limit; quota unavailable; and no automatic retry.
- [ ] Verify transcript review/edit/explicit send, denied microphone, unavailable speech service, no match, network error, and 20-second stop on Android/iOS; verify typed fallback on web.
- [ ] Verify TTS absent/error/stop, app background, and route exit.
- [ ] Verify turn limit, daily UTC quota, app restart, reset, summary deletion, and failed summary write without claiming local quota is global enforcement.
- [ ] Verify local summary opt-in off/on, 600-character cap, deletion, and backup allowlist contains no chat/audio.
- [ ] Test large font, keyboard, screen reader, dark mode, and reduced motion on target devices.

These are test targets, not pass results. The screenshot audit’s AI image is a setup-state capture only.
