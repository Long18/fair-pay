#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/.tools/craft-anything"
REPO="https://github.com/storytold/craft-anything.git"

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: Rust/cargo required. Install: https://rustup.rs/"
  exit 1
fi

mkdir -p "$ROOT/.tools"

if [[ ! -d "$DEST/.git" ]]; then
  echo "Cloning motion analysis CLI into $DEST"
  git clone --depth 1 "$REPO" "$DEST"
else
  echo "Updating existing clone at $DEST"
  git -C "$DEST" pull --ff-only
fi

cd "$DEST"
echo "Building CLI (release)…"
cargo build -p craft-anything-cli --release

CLI="$DEST/target/release/craft-anything-cli"
if [[ ! -x "$CLI" ]]; then
  echo "error: expected binary at $CLI"
  exit 1
fi

cat <<EOF

Local motion analysis CLI ready (gitignored under .tools/).

  CLI: $CLI

Next:
  1. Read docs/motion/local-analysis-setup.md
  2. Capture timing notes into docs/motion/load-scroll-route-patterns.md
  3. Tune src/lib/motion/* from evidence (FairPay assets only)

EOF
