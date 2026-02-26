import { useCallback, useRef } from "react";

const SOUND_URL = "/assets/sounds/pop-notification.wav";

/**
 * Hook to play notification sound.
 * Respects prefers-reduced-motion and provides mute control.
 * Audio instance is lazily created and reused.
 */
export const useNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_URL);
      audioRef.current.volume = 0.5;
      // Preload the audio file so it's ready when needed
      audioRef.current.load();
    }
    return audioRef.current;
  }, []);

  const play = useCallback(() => {
    if (isMutedRef.current) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    try {
      const audio = getAudio();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked — try creating a fresh Audio instance
          // Some browsers release the autoplay lock per-element
          try {
            const fresh = new Audio(SOUND_URL);
            fresh.volume = 0.5;
            fresh.play().catch(() => {});
          } catch {
            // Give up silently
          }
        });
      }
    } catch {
      // Audio not supported — silently ignore
    }
  }, [getAudio]);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
  }, []);

  return { play, setMuted };
};
