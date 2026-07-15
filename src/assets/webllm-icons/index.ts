/**
 * Barrel file for WebLLM UI icons and model brand assets.
 *
 * All icons are resolved at build time by Vite — no runtime requests to
 * github.com, raw.githubusercontent.com, or chat.webllm.ai.
 *
 * Usage:
 *   <img src={FAMILY_ICONS['Qwen 3']} alt="Qwen" />
 */

// ─── Model brand icons (from mlc-ai/web-llm-chat + chat.webllm.ai) ──────────

import GoogleUrl from './google.svg?url';
import MicrosoftUrl from './microsoft.svg?url';
import RobotUrl from './robot.svg?url';
import StableLmUrl from './stablelm.svg?url';
import ModelDeepSeekUrl from './models/deepseek.svg?url';
import ModelMetaUrl from './models/meta.svg?url';
import ModelMistralUrl from './models/mistral.svg?url';
import ModelQwenUrl from './models/qwen.webp?url';
import ModelSmolLMUrl from './models/smollm.png?url';

// ─── Family → brand icon mapping ─────────────────────────────────────────────
//
// Used by ModelSelectDialog to show a brand logo next to each family heading.
// Families without a dedicated brand logo fall back to a generic icon.

import type { WebLlmModelFamily } from '@/lib/local-llm/types';

export const FAMILY_ICONS: Readonly<Record<WebLlmModelFamily, string>> = {
  // Llama families → Meta logo
  'Llama 3.2': ModelMetaUrl,
  'Llama 3.1': ModelMetaUrl,
  'Llama 3': ModelMetaUrl,
  'Llama 2': ModelMetaUrl,
  // Hermes is a Llama finetune (NousResearch), use Meta as closest brand
  Hermes: ModelMetaUrl,
  // DeepSeek → DeepSeek logo
  'DeepSeek R1': ModelDeepSeekUrl,
  // Phi → Microsoft (already in models/ as microsoft.svg copy)
  Phi: MicrosoftUrl,
  // Mistral → Mistral logo
  Mistral: ModelMistralUrl,
  // Qwen families → Qwen logo
  'Qwen 3': ModelQwenUrl,
  'Qwen 2.5': ModelQwenUrl,
  'Qwen 2': ModelQwenUrl,
  // Gemma → Google logo
  Gemma: GoogleUrl,
  // SmolLM2 → SmolLM mascot
  SmolLM2: ModelSmolLMUrl,
  // OLMo 2 → generic robot (Allen AI has no downloadable brand SVG)
  'OLMo 2': RobotUrl,
  // StableLM → StableLM logo
  StableLM: StableLmUrl,
  // RedPajama → generic (Together AI, no public SVG)
  RedPajama: RobotUrl,
  // TinyLlama → generic
  TinyLlama: RobotUrl,
};
