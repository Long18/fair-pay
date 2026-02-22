const PUTER_AUTO_SIGNIN_FLAG = "fairpay:puter:auto-signin-pending";
let puterSigninInFlight: Promise<void> | null = null;

type PuterAuthApi = {
  isSignedIn: () => boolean;
  signIn: (options?: { attempt_temp_user_creation?: boolean }) => Promise<unknown>;
  signOut: () => void;
};

type PuterGlobal = {
  auth?: PuterAuthApi;
};

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const signInWithPuterAuth = async (auth: PuterAuthApi): Promise<"signed_in" | "already_signed_in"> => {
  if (auth.isSignedIn()) {
    return "already_signed_in";
  }

  if (!puterSigninInFlight) {
    puterSigninInFlight = auth
      .signIn({ attempt_temp_user_creation: true })
      .then(() => undefined)
      .finally(() => {
        puterSigninInFlight = null;
      });
  }

  await puterSigninInFlight;
  return "signed_in";
};

export const markPuterAutoSigninPending = (): void => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PUTER_AUTO_SIGNIN_FLAG, "1");
};

export const consumePuterAutoSigninPending = (): boolean => {
  if (typeof window === "undefined") return false;
  const pending = window.sessionStorage.getItem(PUTER_AUTO_SIGNIN_FLAG) === "1";
  if (pending) {
    window.sessionStorage.removeItem(PUTER_AUTO_SIGNIN_FLAG);
  }
  return pending;
};

export const hasPuterAutoSigninPending = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(PUTER_AUTO_SIGNIN_FLAG) === "1";
};

export const clearPuterAutoSigninPending = (): void => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PUTER_AUTO_SIGNIN_FLAG);
};

export const getPuter = (): PuterGlobal | null => {
  if (typeof window === "undefined") return null;
  return window.puter ?? null;
};

export const waitForPuter = async (
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<PuterGlobal | null> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const puter = getPuter();
    if (puter?.auth) return puter;
    await sleep(intervalMs);
  }

  return getPuter();
};

export const ensurePuterSignedIn = async (): Promise<"signed_in" | "already_signed_in" | "unavailable"> => {
  const puter = await waitForPuter();
  if (!puter?.auth) return "unavailable";

  return signInWithPuterAuth(puter.auth);
};

export const kickoffPuterSigninFromUserGesture = (): Promise<"signed_in" | "already_signed_in" | "unavailable"> => {
  const puter = getPuter();
  if (!puter?.auth) return Promise.resolve("unavailable");
  return signInWithPuterAuth(puter.auth);
};

export const signOutPuterIfAvailable = (): void => {
  try {
    getPuter()?.auth?.signOut();
  } catch (error) {
    console.warn("Failed to sign out Puter session", error);
  }
};
