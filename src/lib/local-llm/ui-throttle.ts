const DEFAULT_LOADING_INTERVAL_MS = 200;

export function createLoadingStatusThrottle(
  emit: () => void,
  intervalMs = DEFAULT_LOADING_INTERVAL_MS,
): () => void {
  let lastEmit = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    const now = Date.now();
    const flush = () => {
      lastEmit = Date.now();
      timer = null;
      emit();
    };

    if (now - lastEmit >= intervalMs) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
      return;
    }

    if (!timer) {
      timer = setTimeout(flush, intervalMs - (now - lastEmit));
    }
  };
}

export function createChunkBatcher(onFlush: (delta: string) => void): {
  push: (delta: string) => void;
  flush: () => void;
  dispose: () => void;
} {
  let buffer = "";
  let rafId = 0;

  const flush = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (!buffer) return;
    const chunk = buffer;
    buffer = "";
    onFlush(chunk);
  };

  const push = (delta: string) => {
    if (!delta) return;
    buffer += delta;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        flush();
      });
    }
  };

  const dispose = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    buffer = "";
  };

  return { push, flush, dispose };
}
