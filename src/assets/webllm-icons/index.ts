/**
 * Barrel file for WebLLM UI icons and model brand assets.
 *
 * All icons are resolved at build time by Vite — no runtime requests to
 * github.com, raw.githubusercontent.com, or chat.webllm.ai.
 *
 * Usage:
 *   import { BotIcon, FAMILY_ICONS } from '@/assets/webllm-icons';
 *   <img src={BotIcon} alt="assistant" />
 *   <img src={FAMILY_ICONS['Qwen 3']} alt="Qwen" />
 */

// ─── UI icons (from mlc-ai/web-llm-chat) ────────────────────────────────────

import AddUrl from './add.svg?url';
import AttachmentUrl from './attachment.svg?url';
import AutoUrl from './auto.svg?url';
import BlackBotUrl from './black-bot.svg?url';
import BotUrl from './bot.svg?url';
import BottomUrl from './bottom.svg?url';
import BrainUrl from './brain.svg?url';
import BreakUrl from './break.svg?url';
import CancelUrl from './cancel.svg?url';
import ChatUrl from './chat.svg?url';
import ChatGptUrl from './chatgpt.svg?url';
import ClearUrl from './clear.svg?url';
import CloseUrl from './close.svg?url';
import CloudFailUrl from './cloud-fail.svg?url';
import CloudSuccessUrl from './cloud-success.svg?url';
import ConfigUrl from './config.svg?url';
import ConfirmUrl from './confirm.svg?url';
import ConnectionUrl from './connection.svg?url';
import CopyUrl from './copy.svg?url';
import DarkUrl from './dark.svg?url';
import DeepSeekUrl from './deepseek.svg?url';
import DeleteUrl from './delete.svg?url';
import DownUrl from './down.svg?url';
import DownloadUrl from './download.svg?url';
import DragUrl from './drag.svg?url';
import EditUrl from './edit.svg?url';
import ExportUrl from './export.svg?url';
import EyeOffUrl from './eye-off.svg?url';
import EyeUrl from './eye.svg?url';
import GearUrl from './gear.svg?url';
import GitHubUrl from './github.svg?url';
import GoogleUrl from './google.svg?url';
import ImageUrl from './image.svg?url';
import InfoUrl from './info.svg?url';
import InternetUrl from './internet.svg?url';
import LeftUrl from './left.svg?url';
import LightUrl from './light.svg?url';
import LightningUrl from './lightning.svg?url';
import LoadingUrl from './loading.svg?url';
import MaskUrl from './mask.svg?url';
import MaxUrl from './max.svg?url';
import MenuUrl from './menu.svg?url';
import MetaUrl from './meta.svg?url';
import MicrosoftUrl from './microsoft.svg?url';
import MinUrl from './min.svg?url';
import MistralUrl from './mistral.svg?url';
import MlcPngUrl from './mlc.png?url';
import MlcUrl from './mlc.svg?url';
import PauseUrl from './pause.svg?url';
import PinUrl from './pin.svg?url';
import PluginUrl from './plugin.svg?url';
import PromptUrl from './prompt.svg?url';
import ReloadUrl from './reload.svg?url';
import RenameUrl from './rename.svg?url';
import ReturnUrl from './return.svg?url';
import RobotUrl from './robot.svg?url';
import RoundGearUrl from './round-gear.svg?url';
import SendWhiteUrl from './send-white.svg?url';
import ShareUrl from './share.svg?url';
import SnowflakeUrl from './snowflake.svg?url';
import StableLmUrl from './stablelm.svg?url';
import ThreeDotsUrl from './three-dots.svg?url';
import UploadUrl from './upload.svg?url';

export const AddIcon = AddUrl;
export const AttachmentIcon = AttachmentUrl;
export const AutoIcon = AutoUrl;
export const BlackBotIcon = BlackBotUrl;
export const BotIcon = BotUrl;
export const BottomIcon = BottomUrl;
export const BrainIcon = BrainUrl;
export const BreakIcon = BreakUrl;
export const CancelIcon = CancelUrl;
export const ChatIcon = ChatUrl;
export const ChatGptIcon = ChatGptUrl;
export const ClearIcon = ClearUrl;
export const CloseIcon = CloseUrl;
export const CloudFailIcon = CloudFailUrl;
export const CloudSuccessIcon = CloudSuccessUrl;
export const ConfigIcon = ConfigUrl;
export const ConfirmIcon = ConfirmUrl;
export const ConnectionIcon = ConnectionUrl;
export const CopyIcon = CopyUrl;
export const DarkIcon = DarkUrl;
export const DeepSeekIcon = DeepSeekUrl;
export const DeleteIcon = DeleteUrl;
export const DownIcon = DownUrl;
export const DownloadIcon = DownloadUrl;
export const DragIcon = DragUrl;
export const EditIcon = EditUrl;
export const ExportIcon = ExportUrl;
export const EyeOffIcon = EyeOffUrl;
export const EyeIcon = EyeUrl;
export const GearIcon = GearUrl;
export const GitHubIcon = GitHubUrl;
export const GoogleIcon = GoogleUrl;
export const ImageIcon = ImageUrl;
export const InfoIcon = InfoUrl;
export const InternetIcon = InternetUrl;
export const LeftIcon = LeftUrl;
export const LightIcon = LightUrl;
export const LightningIcon = LightningUrl;
export const LoadingIcon = LoadingUrl;
export const MaskIcon = MaskUrl;
export const MaxIcon = MaxUrl;
export const MenuIcon = MenuUrl;
export const MetaIcon = MetaUrl;
export const MicrosoftIcon = MicrosoftUrl;
export const MinIcon = MinUrl;
export const MistralIcon = MistralUrl;
export const MlcPng = MlcPngUrl;
export const MlcIcon = MlcUrl;
export const PauseIcon = PauseUrl;
export const PinIcon = PinUrl;
export const PluginIcon = PluginUrl;
export const PromptIcon = PromptUrl;
export const ReloadIcon = ReloadUrl;
export const RenameIcon = RenameUrl;
export const ReturnIcon = ReturnUrl;
export const RobotIcon = RobotUrl;
export const RoundGearIcon = RoundGearUrl;
export const SendWhiteIcon = SendWhiteUrl;
export const ShareIcon = ShareUrl;
export const SnowflakeIcon = SnowflakeUrl;
export const StableLmIcon = StableLmUrl;
export const ThreeDotsIcon = ThreeDotsUrl;
export const UploadIcon = UploadUrl;

// ─── Model brand icons (from mlc-ai/web-llm-chat + chat.webllm.ai) ──────────

import ModelDeepSeekUrl from './models/deepseek.svg?url';
import ModelMetaUrl from './models/meta.svg?url';
import ModelMistralUrl from './models/mistral.svg?url';
import ModelMlcUrl from './models/mlc.svg?url';
import ModelQwenUrl from './models/qwen.webp?url';
import ModelSmolLMUrl from './models/smollm.png?url';

export const ModelDeepSeek = ModelDeepSeekUrl;
export const ModelMeta = ModelMetaUrl;
export const ModelMistral = ModelMistralUrl;
export const ModelMlc = ModelMlcUrl;
export const ModelQwen = ModelQwenUrl;
export const ModelSmolLM = ModelSmolLMUrl;

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
