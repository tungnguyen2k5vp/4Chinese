# Gemini V5 verification

Status: authenticated provider E2E NOT RUN. Unit/contract tests do not prove that a deployed model/key/account works. No app QA access token was provided; CLI management login is not an authenticated learner session. No account, session, secret, key, function or deployment was created/changed for this checkpoint.

An optional text-only operator probe is available:

```powershell
npx --no-install tsx scripts/probe-gemini-v5.ts
# After supplying a short-lived QA learner token locally (never in chat/Git):
npx --no-install tsx scripts/probe-gemini-v5.ts --run
```

The second command requires `FOURCHINESE_QA_ACCESS_TOKEN` and existing public project configuration. It sends one synthetic 你好 message, zero chat history and no audio; the operator should account for provider usage. It logs only status/timing, never token, project configuration, response text or user data. No automatic login or anonymous-user creation. A successful text contract is not microphone, native TTS, pronunciation grading or load testing.

Pending on real device/account: consent, speech → text → authenticated function → validated reply → TTS → scene-goal completion; auth expiry/permission/network/quota/cancellation/re-entry. No E2E, rate-limit scalability or production-readiness claim is made before those checks.
