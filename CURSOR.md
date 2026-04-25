# Using FairPay with Cursor

This project includes a **Cursor project rule** so the Karpathy-inspired behavioral guidelines apply automatically when you work here.

## In this repository

1. Open the folder in Cursor.
2. The rule [`.cursor/rules/karpathy-guidelines.mdc`](.cursor/rules/karpathy-guidelines.mdc) is committed with `alwaysApply: true`, so you do not need extra installation steps.
3. In Cursor, you can confirm it under **Settings -> Rules** or the project rules UI, where `karpathy-guidelines` should appear.

## Use the same guidelines in another project

**Cursor (recommended):** Copy `.cursor/rules/karpathy-guidelines.mdc` into that project's `.cursor/rules/` directory. Create the folders if needed. Adjust or merge with existing rules as needed.

**Other tools:** If a stack only supports a root instruction file, copy [`CLAUDE.md`](CLAUDE.md) into that project instead, or merge its contents into existing instructions.

## Optional: personal Agent Skills

If you want the same content as a reusable skill under `~/.cursor/skills`, copy or symlink the source repo's `skills/karpathy-guidelines/SKILL.md` into your personal skills directory.

## Claude Code vs Cursor

- **Claude Code:** The guidelines can be installed via the plugin marketplace from `forrestchang/andrej-karpathy-skills`, or applied per project through `CLAUDE.md`.
- **Cursor:** Use the committed `.cursor/rules/` file. Cursor does not read `.claude-plugin/` or `CLAUDE.md` by default.

## For contributors

When changing the four principles, keep [`CLAUDE.md`](CLAUDE.md) and [`.cursor/rules/karpathy-guidelines.mdc`](.cursor/rules/karpathy-guidelines.mdc) in sync. If a reusable skill is added later, keep that skill text in sync too.
