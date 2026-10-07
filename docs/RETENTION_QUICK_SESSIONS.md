# Quick sessions and adaptive pacing

## Quick-session contract

The daily plan accepts only 3, 5, or 10 minutes. Invalid route parameters fall back to the ordinary daily plan. The quick budget changes the session target only; it does not alter the saved daily study goal, review queue due dates, or scheduler intervals.

When due cards exist, they are selected before new vocabulary. The session records a local start timestamp and reports the session type and elapsed duration to the analytics provider. It does not send card IDs, answers, pinyin, meanings, or user identity. Result recording is idempotent for a mounted result screen.

## Adaptive fatigue guard

The planner inspects up to five most recent review skill attempts. At three or more incorrect attempts, it halves the recommendation for new words (rounding up), labels the plan as a lighter pace, and recommends a short break. It does not hide or reschedule due cards and does not alter SRS state.

## Comeback path

After at least one full local calendar day away, Home offers a supportive return action. The default recommendation is three minutes; if review is due it suggests five minutes so the user can resume without a large catch-up demand.

## Verification

Pure planner tests cover next-action priority, date gaps, invalid durations, and fatigue behavior. Device UX, audio interruptions, and actual elapsed-time behavior should still be checked on a physical Android device before release.
