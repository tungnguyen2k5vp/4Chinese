# 4Chinese V5.3 — Speaking redesign

Date: 2026-10-06

## Studio (`/speaking`)

The destination now leads with a voice-themed studio hero, truthful local summary, and distinct routes for tones, shadowing, AI roleplay, sound pairs, and saved recordings. The studio explicitly avoids claiming an automated pronunciation score when no verified scorer is configured.

## AI roleplay (`/speaking/ai`)

The setup surface now has an illustrated scenario focus, clear offline scenario availability, level/topic selection, and a sticky start action. AI remains optional and follows the existing consent/quota/network gates. Audio is not silently uploaded or sent from a prerecorded clip. Conversation and scoring behavior were not changed.

Evidence: [Speaking studio](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/speaking-v2.png), [roleplay setup](../artifacts/ui-audit-2026-10-06/screens-v5-3-qa/speaking-ai-v2.png).

QA opened the studio and setup routes. Microphone permission, live audio, network AI, and a completed roleplay were not activated in this pass.

