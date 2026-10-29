let polyfillPromise: Promise<unknown> | null = null;

/** React Email's browser renderer streams via ReadableByteStreamController, which older Safari/iOS lack. */
export function ensureEmailRenderReady(): Promise<unknown> {
  if (typeof globalThis.ReadableByteStreamController !== "undefined") return Promise.resolve();
  polyfillPromise ??= import("web-streams-polyfill/polyfill");
  return polyfillPromise;
}
