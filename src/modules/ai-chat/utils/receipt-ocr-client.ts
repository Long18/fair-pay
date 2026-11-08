const MAX_OCR_MS = 45_000;

type OcrPending = {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, OcrPending>();

function ensureReceiptOcrWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./receipt-ocr.worker.ts", import.meta.url), { type: "module" });

  worker.addEventListener("message", (event) => {
    const message = event.data as { id: number; type: string; text?: string; message?: string };
    const slot = pending.get(message.id);
    if (!slot) return;

    if (message.type === "text") {
      slot.resolve(message.text ?? "");
      return;
    }
    slot.reject(new Error(message.message ?? "OCR failed"));
  });

  worker.addEventListener("error", () => {
    pending.forEach(({ reject }) => reject(new Error("Receipt OCR worker failed")));
    pending.clear();
  });

  return worker;
}

function postRecognize(file: File): Promise<string> {
  const id = ++requestId;
  const activeWorker = ensureReceiptOcrWorker();

  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("OCR_TIMEOUT"));
    }, MAX_OCR_MS);

    pending.set(id, {
      resolve: (text) => {
        clearTimeout(timer);
        pending.delete(id);
        resolve(text);
      },
      reject: (err) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(err);
      },
    });

    void file
      .arrayBuffer()
      .then((buffer) => {
        activeWorker.postMessage({
          id,
          type: "recognize",
          buffer,
          mime: file.type || "image/jpeg",
        });
      })
      .catch((err) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(err instanceof Error ? err : new Error("Could not read image file"));
      });
  });
}

/**
 * Run receipt OCR in a dedicated worker (keeps the main thread responsive).
 */
export async function recognizeReceiptText(file: File): Promise<string> {
  try {
    return await postRecognize(file);
  } catch {
    return "";
  }
}

export function disposeReceiptOcrWorker(): void {
  if (!worker) return;
  worker.postMessage({ id: 0, type: "dispose" });
  worker.terminate();
  worker = null;
  pending.clear();
}
