# Accessibility and inclusive interaction checks

## Implemented

- Theme follows the operating-system appearance by default and offers system/light/dark overrides in settings.
- Motion preference supports full, reduced, and off modes; decorative progress animation follows the reduced-motion setting.
- Progress indicators and learning feedback expose semantic values/announcements; interactive settings use explicit switch/radio roles and selected/checked state.
- Daily reminder time choices are individually labeled for screen readers. Permission is requested only after the user explicitly enables reminders.
- Study surfaces retain large touch targets and text-first controls so audio, handwriting, and review actions are not represented by color alone.

## Manual device checks still required

Automated React Native tests and lint cannot establish TalkBack or WCAG conformance. Before calling this release accessibility-verified, test on the actual phone:

1. Navigate Home, quick-session choices, profile settings, reminder times, and a study result using TalkBack only.
2. Confirm the reminder switch announces on/off, each radio choice announces its selected state, and every interactive control has a useful Vietnamese label.
3. Enable Android large font/display size and verify labels, buttons, and cards do not clip or overlap.
4. Check light/dark contrast, focus order, reduced motion, and error/success announcements during a real learn/review session.
5. Deny notification permission, confirm the setting returns to off with a clear explanation, then grant it in system settings and opt in again.
