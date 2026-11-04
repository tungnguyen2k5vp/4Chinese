# V8.2 exam question UI

Question UI changes are presentation-only around the existing local exam engine: compact header and progress, stable question number, answer controls, question navigator, review flag, saved-answer indication, and explicit submit confirmation. Screen route: `src/app/exam/session.tsx`.

## Android walkthrough evidence

The 4-question practice session was opened on the private API 36 emulator. A wrong option was selected on question 1, then the learner went back and confirmed it remained selected; the navigator showed answer/review state. The next questions accepted answers, question 4 was intentionally left unanswered, and the confirmation showed 3/4 answered before submission.

The attempt saved locally and appeared in history. The countdown screen was inspected using direct screen captures because its per-second updates make the Android accessibility tree unstable. The test did not wait for timeout, so expired-attempt behavior remains automated/code-level rather than native verified in this pass.

Native evidence: `11-exam-session-q1-qa2.png`, `12-exam-answer-saved.png`, `16-exam-q2-previous.png`, `18-exam-question-navigator.png`, `23-exam-q4-unanswered.png`, `24-exam-submit-confirmation.png`.

Option count and content remain those of each source question. Answering a prompt is separate from playing audio; no auto-answer behavior is introduced. Speech, recording, and writing workflows are not converted into official scored questions.
