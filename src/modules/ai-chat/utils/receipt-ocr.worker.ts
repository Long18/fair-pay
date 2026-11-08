import { createWorker } from "tesseract.js";

type ReceiptOcrWorkerRequest =
  | { id: number; type: "recognize"; buffer: ArrayBuffer; mime: string }
  | { id: number; type: "dispose" };

type ReceiptOcrWorkerResponse =
  | { id: number; type: "text"; text: string }
  | { id: number; type: "error"; message: string }
  | { id: number; type: "ready" };

let tess: Awaited<ReturnType<typeof createWorker>> | null = null;

async function ensureTesseract() {
  if (!tess) {
    tess = await createWorker(["vie", "eng"], undefined, { logger: () => {} });
  }
  return tess;
}

self.addEventListener("message", (event: MessageEvent<ReceiptOcrWorkerRequest>) => {
  const request = event.data;

  void (async () => {
    try {
      if (request.type === "dispose") {
        if (tess) {
          await tess.terminate();
          tess = null;
        }
        return;
      }

      if (request.type === "recognize") {
        const worker = await ensureTesseract();
        const blob = new Blob([request.buffer], { type: request.mime || "image/jpeg" });
        const {
          data: { text },
        } = await worker.recognize(blob);
        const response: ReceiptOcrWorkerResponse = {
          id: request.id,
          type: "text",
          text: text.replace(/\s+/g, " ").trim(),
        };
        self.postMessage(response);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR failed";
      self.postMessage({ id: request.id, type: "error", message } satisfies ReceiptOcrWorkerResponse);
    }
  })();
});
