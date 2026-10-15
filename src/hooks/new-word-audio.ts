interface TurnAudioDependencies {
  speak: (text: string, rate: number) => Promise<unknown>;
  stop: () => Promise<unknown>;
}

/** One attempted automatic pronunciation per visible turn, not per render/focus. */
export function createNewWordAudio(dependencies: TurnAudioDependencies) {
  const played = new Set<string>();
  return {
    play(key: string, text: string, rate: number) {
      if (played.has(key)) return () => undefined;
      // Defer until after focus settles; StrictMode cleanup must not consume a turn.
      const timer = setTimeout(() => {
        if (played.has(key)) return;
        played.add(key);
        void dependencies.speak(text, rate).catch(() => undefined);
      }, 150);
      return () => {
        clearTimeout(timer);
        void dependencies.stop().catch(() => undefined);
      };
    },
    stop() { void dependencies.stop().catch(() => undefined); },
  };
}
