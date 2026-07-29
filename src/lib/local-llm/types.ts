import type { ConversationMessage } from "@/modules/ai-chat/orchestrator";

/**
 * Curated catalog of web-llm models, mirroring the chat models from
 * https://github.com/mlc-ai/web-llm `prebuiltAppConfig` (model_type=LLM).
 *
 * Each entry captures the metadata needed to render the model picker:
 *  - `id`            – the exact web-llm model id (passed to CreateMLCEngine)
 *  - `label`         – human-friendly display name
 *  - `family`        – grouping bucket shown as a section header
 *  - `vramMB`        – approximate VRAM cost in MB (from prebuiltAppConfig)
 *  - `lowResource`   – flagged as broadly compatible by web-llm
 *  - `contextLength` – context window the model exposes
 *  - `quantization`  – e.g. `q4f16_1`, `q4f32_1`
 *  - `description`   – short tagline shown under the picker trigger
 *  - `recommended`   – marks the curated "starter" model for its family
 */

/** Default for expense tool workflows (~2.2 GB VRAM). Users on 1B keep prior choice via localStorage. */
export const DEFAULT_WEB_LLM_MODEL = "Hermes-3-Llama-3.2-3B-q4f16_1-MLC";
export const WEB_LLM_COMPAT_MODEL = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k";
export const WEB_LLM_MODEL_STORAGE_KEY = "fairpay:local-llm:model";

export type WebLlmModelFamily =
  | "Llama 3.2"
  | "Llama 3.1"
  | "Llama 3"
  | "Llama 2"
  | "DeepSeek R1"
  | "Hermes"
  | "Phi"
  | "Mistral"
  | "Qwen 3"
  | "Qwen 2.5"
  | "Qwen 2"
  | "Gemma"
  | "SmolLM2"
  | "OLMo 2"
  | "StableLM"
  | "RedPajama"
  | "TinyLlama";

export interface WebLlmModelEntry {
  id: string;
  label: string;
  family: WebLlmModelFamily;
  vramMB: number;
  lowResource: boolean;
  contextLength: number;
  quantization: "q4f16_1" | "q4f32_1" | "q0f16" | "q0f32" | "q3f16_1";
  description: string;
  recommended?: boolean;
}

// Curated subset of web-llm models. We pick the most useful quantization for
// each (size, family) pair to keep the picker readable while still covering
// the full breadth of the upstream catalog.
export const WEB_LLM_MODEL_LIST: readonly WebLlmModelEntry[] = [
  // --- Llama 3.2 (small, low-resource) ---
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 · 1B",
    family: "Llama 3.2",
    vramMB: 879,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Lightweight reads only — switch to Hermes 3B for adding expenses.",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 · 1B (f32)",
    family: "Llama 3.2",
    vramMB: 1129,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f32_1",
    description: "1B Llama with f32 weights, slightly higher quality.",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 · 3B",
    family: "Llama 3.2",
    vramMB: 2264,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Balanced 3B Llama with solid reasoning on modern WebGPU.",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 · 3B (f32)",
    family: "Llama 3.2",
    vramMB: 2952,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f32_1",
    description: "3B Llama with f32 weights for sharper outputs.",
  },

  // --- Llama 3.1 (8B) ---
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC-1k",
    label: "Llama 3.1 · 8B (1k ctx)",
    family: "Llama 3.1",
    vramMB: 4598,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "8B Llama trimmed to 1k context for tighter VRAM.",
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    label: "Llama 3.1 · 8B",
    family: "Llama 3.1",
    vramMB: 5001,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Full 8B Llama, strong general assistant.",
    recommended: true,
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
    label: "Llama 3.1 · 8B (f32)",
    family: "Llama 3.1",
    vramMB: 6101,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f32_1",
    description: "8B Llama with f32 precision for highest fidelity.",
  },

  // --- Llama 3 (legacy) ---
  {
    id: "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
    label: "Llama 3 · 8B (1k ctx)",
    family: "Llama 3",
    vramMB: 4598,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Original Llama 3 8B with 1k context.",
  },
  {
    id: "Llama-3-8B-Instruct-q4f16_1-MLC",
    label: "Llama 3 · 8B",
    family: "Llama 3",
    vramMB: 5001,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Original Llama 3 8B with full context.",
  },

  // --- Llama 2 (legacy) ---
  {
    id: "Llama-2-7b-chat-hf-q4f16_1-MLC-1k",
    label: "Llama 2 · 7B (1k ctx)",
    family: "Llama 2",
    vramMB: 4619,
    lowResource: false,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Legacy Llama 2 chat model.",
  },

  // --- DeepSeek R1 distilled (reasoning) ---
  {
    id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC",
    label: "DeepSeek R1 · Qwen 7B",
    family: "DeepSeek R1",
    vramMB: 5107,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Reasoning-distilled DeepSeek over Qwen 7B.",
    recommended: true,
  },
  {
    id: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC",
    label: "DeepSeek R1 · Llama 8B",
    family: "DeepSeek R1",
    vramMB: 5001,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Reasoning-distilled DeepSeek over Llama 3 8B.",
  },

  // --- Hermes ---
  {
    id: "Hermes-3-Llama-3.2-3B-q4f16_1-MLC",
    label: "Hermes 3 · Llama 3.2 3B",
    family: "Hermes",
    vramMB: 2264,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Best quality for FairPay tools — larger ~1.7 GB download.",
    recommended: true,
  },
  {
    id: "Hermes-3-Llama-3.2-3B-q4f32_1-MLC",
    label: "Hermes 3 · Llama 3.2 3B (f32)",
    family: "Hermes",
    vramMB: 2952,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f32_1",
    description: "Hermes 3 on Llama 3.2 3B with f32 weights.",
  },
  {
    id: "Hermes-3-Llama-3.1-8B-q4f16_1-MLC",
    label: "Hermes 3 · Llama 3.1 8B",
    family: "Hermes",
    vramMB: 4876,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Hermes 3 finetune on Llama 3.1 8B.",
  },
  {
    id: "Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC",
    label: "Hermes 2 Pro · Llama 3 8B",
    family: "Hermes",
    vramMB: 4976,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Hermes 2 Pro finetune, tool-use friendly.",
  },
  {
    id: "Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC",
    label: "Hermes 2 Theta · Llama 3 8B",
    family: "Hermes",
    vramMB: 4976,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Hermes 2 Theta merge, strong instruction follow.",
  },

  // --- Phi ---
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC-1k",
    label: "Phi 3.5 Mini (1k ctx)",
    family: "Phi",
    vramMB: 2520,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Fast Phi 3.5 with 1k context for lower memory use.",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi 3.5 Mini",
    family: "Phi",
    vramMB: 3672,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Microsoft Phi 3.5 mini, strong reasoning per byte.",
    recommended: true,
  },
  {
    id: "Phi-4-mini-instruct-q4f16_1-MLC",
    label: "Phi 4 Mini",
    family: "Phi",
    vramMB: 3438,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Latest Phi 4 mini with refined reasoning.",
  },

  // --- Mistral ---
  {
    id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
    label: "Mistral 7B v0.3",
    family: "Mistral",
    vramMB: 4573,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Mistral 7B v0.3 instruct.",
    recommended: true,
  },
  {
    id: "Mistral-7B-Instruct-v0.2-q4f16_1-MLC",
    label: "Mistral 7B v0.2",
    family: "Mistral",
    vramMB: 4573,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Earlier Mistral 7B instruct.",
  },
  {
    id: "OpenHermes-2.5-Mistral-7B-q4f16_1-MLC",
    label: "OpenHermes 2.5 · Mistral 7B",
    family: "Mistral",
    vramMB: 4573,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "OpenHermes finetune on Mistral 7B.",
  },
  {
    id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
    label: "Hermes 2 Pro · Mistral 7B",
    family: "Mistral",
    vramMB: 4033,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Hermes 2 Pro finetune on Mistral 7B.",
  },

  // --- Qwen 3 ---
  {
    id: "Qwen3-0.6B-q4f16_1-MLC",
    label: "Qwen 3 · 0.6B",
    family: "Qwen 3",
    vramMB: 1403,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Ultra-light Qwen 3 for fast local replies.",
  },
  {
    id: "Qwen3-1.7B-q4f16_1-MLC",
    label: "Qwen 3 · 1.7B",
    family: "Qwen 3",
    vramMB: 2037,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Mid-size Qwen 3, snappy and capable.",
    recommended: true,
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    label: "Qwen 3 · 4B",
    family: "Qwen 3",
    vramMB: 3432,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Qwen 3 4B, strong all-rounder.",
  },
  {
    id: "Qwen3-8B-q4f16_1-MLC",
    label: "Qwen 3 · 8B",
    family: "Qwen 3",
    vramMB: 5696,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Qwen 3 8B – flagship of the family.",
  },

  // --- Qwen 2.5 (general / coder / math) ---
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 0.5B",
    family: "Qwen 2.5",
    vramMB: 945,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Tiny Qwen 2.5 for resource-constrained devices.",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 1.5B",
    family: "Qwen 2.5",
    vramMB: 1630,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "1.5B Qwen 2.5 instruct.",
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 3B",
    family: "Qwen 2.5",
    vramMB: 2505,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "3B Qwen 2.5, balanced everyday assistant.",
    recommended: true,
  },
  {
    id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 7B",
    family: "Qwen 2.5",
    vramMB: 5107,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "7B Qwen 2.5 with strong general performance.",
  },
  {
    id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 Coder · 1.5B",
    family: "Qwen 2.5",
    vramMB: 1630,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Qwen 2.5 specialized for code completion.",
  },
  {
    id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 Coder · 7B",
    family: "Qwen 2.5",
    vramMB: 5107,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Larger Qwen 2.5 Coder for richer code reasoning.",
  },
  {
    id: "Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 Math · 1.5B",
    family: "Qwen 2.5",
    vramMB: 1630,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Qwen 2.5 tuned for math reasoning.",
  },

  // --- Qwen 2 (legacy) ---
  {
    id: "Qwen2-0.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2 · 0.5B",
    family: "Qwen 2",
    vramMB: 945,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Legacy tiny Qwen 2.",
  },
  {
    id: "Qwen2-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2 · 1.5B",
    family: "Qwen 2",
    vramMB: 1630,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Legacy 1.5B Qwen 2.",
  },
  {
    id: "Qwen2-7B-Instruct-q4f16_1-MLC",
    label: "Qwen 2 · 7B",
    family: "Qwen 2",
    vramMB: 5107,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Legacy 7B Qwen 2.",
  },

  // --- Gemma ---
  {
    id: "gemma3-1b-it-q4f16_1-MLC",
    label: "Gemma 3 · 1B",
    family: "Gemma",
    vramMB: 711,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Lightest Gemma 3 for low-VRAM devices.",
    recommended: true,
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Gemma 2 · 2B",
    family: "Gemma",
    vramMB: 1895,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Google's Gemma 2 instruct 2B.",
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC-1k",
    label: "Gemma 2 · 2B (1k ctx)",
    family: "Gemma",
    vramMB: 1583,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Gemma 2 2B trimmed for lower memory.",
  },
  {
    id: "gemma-2-9b-it-q4f16_1-MLC",
    label: "Gemma 2 · 9B",
    family: "Gemma",
    vramMB: 6422,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Larger Gemma 2 9B for richer answers.",
  },
  {
    id: "gemma-2-2b-jpn-it-q4f16_1-MLC",
    label: "Gemma 2 · 2B JPN",
    family: "Gemma",
    vramMB: 1895,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Gemma 2 finetuned for Japanese.",
  },

  // --- SmolLM2 ---
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    label: "SmolLM2 · 360M",
    family: "SmolLM2",
    vramMB: 376,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Tiniest chat model – runs almost anywhere.",
  },
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    label: "SmolLM2 · 1.7B",
    family: "SmolLM2",
    vramMB: 1774,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Lightweight SmolLM2 for quick replies.",
    recommended: true,
  },

  // --- OLMo 2 ---
  {
    id: "OLMo-2-0425-1B-Instruct-q4f16_1-MLC",
    label: "OLMo 2 · 1B",
    family: "OLMo 2",
    vramMB: 1777,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Allen AI OLMo 2 1B, fully open.",
    recommended: true,
  },
  {
    id: "OLMo-2-1124-7B-Instruct-q4f16_1-MLC",
    label: "OLMo 2 · 7B",
    family: "OLMo 2",
    vramMB: 6479,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "OLMo 2 7B for stronger answers.",
  },

  // --- StableLM ---
  {
    id: "stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k",
    label: "StableLM 2 Zephyr · 1.6B (1k)",
    family: "StableLM",
    vramMB: 1512,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Stable Zephyr 1.6B, conversational.",
  },
  {
    id: "stablelm-2-zephyr-1_6b-q4f16_1-MLC",
    label: "StableLM 2 Zephyr · 1.6B",
    family: "StableLM",
    vramMB: 2088,
    lowResource: false,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "Stable Zephyr 1.6B with full context.",
  },

  // --- RedPajama ---
  {
    id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k",
    label: "RedPajama 3B (1k ctx)",
    family: "RedPajama",
    vramMB: 2041,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Legacy RedPajama 3B chat.",
  },

  // --- TinyLlama (fallback / compat) ---
  {
    id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k",
    label: "TinyLlama 1.1B (1k ctx)",
    family: "TinyLlama",
    vramMB: 675,
    lowResource: true,
    contextLength: 1024,
    quantization: "q4f16_1",
    description: "Smallest chat model – best for low-VRAM browsers.",
    recommended: true,
  },
  {
    id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
    label: "TinyLlama 1.1B",
    family: "TinyLlama",
    vramMB: 697,
    lowResource: true,
    contextLength: 4096,
    quantization: "q4f16_1",
    description: "TinyLlama with full context window.",
  },
];

export type WebLlmModelId = (typeof WEB_LLM_MODEL_LIST)[number]["id"];

// Build a Set of valid IDs once for cheap runtime validation.
const WEB_LLM_MODEL_ID_SET = new Set<string>(WEB_LLM_MODEL_LIST.map((m) => m.id));

export function isWebLlmModelId(model: string): model is WebLlmModelId {
  return WEB_LLM_MODEL_ID_SET.has(model);
}

export function getWebLlmModelEntry(id: string): WebLlmModelEntry | undefined {
  return WEB_LLM_MODEL_LIST.find((m) => m.id === id);
}

/** Models below this quality bar often fail JSON tool calls for expense preview. */
export function isWeakExpenseChatModel(modelId: string): boolean {
  const entry = getWebLlmModelEntry(modelId);
  if (!entry) return false;
  if (entry.family === "TinyLlama" || entry.family === "SmolLM2") return true;
  if (entry.lowResource && entry.vramMB <= 1500) return true;
  return false;
}

/**
 * Stable iteration order for grouping. Listed roughly in order of
 * "modern → legacy" so the picker surfaces fresh families first.
 */
export const WEB_LLM_FAMILY_ORDER: readonly WebLlmModelFamily[] = [
  "Llama 3.2",
  "Llama 3.1",
  "Llama 3",
  "Llama 2",
  "DeepSeek R1",
  "Hermes",
  "Phi",
  "Mistral",
  "Qwen 3",
  "Qwen 2.5",
  "Qwen 2",
  "Gemma",
  "SmolLM2",
  "OLMo 2",
  "StableLM",
  "RedPajama",
  "TinyLlama",
];

/**
 * @deprecated Kept for backward compatibility with older callers.
 * Use {@link WEB_LLM_MODEL_LIST} for the full catalog. This alias exposes
 * just `id`/`label`/`description` for legacy code paths that imported it.
 */
export interface WebLlmModelOption {
  id: WebLlmModelId;
  label: string;
  description: string;
}

export const WEB_LLM_MODEL_OPTIONS: readonly WebLlmModelOption[] = WEB_LLM_MODEL_LIST.map((m) => ({
  id: m.id,
  label: m.label,
  description: m.description,
}));

export type LocalLlmStatus =
  | { state: "unsupported"; reason: string }
  | { state: "idle"; model: string }
  | {
      state: "loading";
      model: string;
      progress: number;
      message: string;
      /** True when weights are already on-device (GPU reload, not a network download). */
      fromCache?: boolean;
    }
  | { state: "ready"; model: string }
  | { state: "error"; model: string; message: string };

export type LocalLlmStatusListener = (status: LocalLlmStatus) => void;

export interface LocalLlmChatRequest {
  messages: readonly ConversationMessage[];
  model: string;
}

export type LocalLlmWorkerRequest =
  | { id: number; type: "load"; model: string }
  | { id: number; type: "chat"; payload: LocalLlmChatRequest }
  | { id: number; type: "delete-model-cache"; model: string };

export type LocalLlmWorkerResponse =
  | {
      id?: number;
      type: "loading";
      model: string;
      progress: number;
      message: string;
      fromCache?: boolean;
    }
  | { id?: number; type: "ready"; model: string }
  | { id: number; type: "chunk"; delta: string }
  | { id: number; type: "response"; content: string }
  | { id: number; type: "cache-deleted"; model: string }
  | { id?: number; type: "error"; model?: string; message: string };
