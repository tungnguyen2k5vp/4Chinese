# Speaking V4 status

The existing offline tone and shadowing flows persist attempts independently from SRS, preserve their state in backup, and explicitly avoid presenting speech recognition as an acoustic pronunciation score. Native recognition and optional AI scoring remain capability-gated.

Not complete for production certification: a real Android/iOS development build must exercise microphone permission denial, recording/playback interruption, backgrounding, recognition availability, Vietnamese device locale, and any deployed AI endpoint. The app must keep the local self-recording flow usable when those capabilities are unavailable.

