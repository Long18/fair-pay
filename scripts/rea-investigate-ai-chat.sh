#!/usr/bin/env bash
# Prints the REA feature string and source_paths for FairPay in-app AI chat.
# Usage: ./scripts/rea-investigate-ai-chat.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

FEATURE='FairPay in-app AI: WebLLM (client + worker) → use-ai-chat → FairPayChatOrchestrator → deterministic-planner + McpClient → fairpay-agent-mcp (JWT); legacy read tools via ai-chat Edge Function'

echo "=== REA investigate_feature (paste into chat) ==="
echo "/rea/investigate_feature ${FEATURE}"
echo
echo "=== analyze_javascript_application source_paths ==="
printf '%s\n' \
  "src/modules/ai-chat/hooks/use-ai-chat.ts" \
  "src/modules/ai-chat/orchestrator/FairPayChatOrchestrator.ts" \
  "src/modules/ai-chat/orchestrator/deterministic-planner.ts" \
  "src/modules/ai-chat/orchestrator/mcp-client.ts" \
  "src/modules/ai-chat/orchestrator/system-prompt.ts" \
  "src/lib/local-llm/client.ts" \
  "src/lib/local-llm/web-llm.worker.ts" \
  | while read -r p; do echo "  - $ROOT/$p"; done
echo
echo "See docs/ai-chat-rea-investigation.md"
