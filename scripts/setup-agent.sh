#!/bin/bash
# Generates tool-specific adapters from .agent/ source of truth.
# Run after cloning: bash scripts/setup-agent.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- Claude Code ---
mkdir -p .claude/commands/opsx .claude/skills

for cmd in apply archive explore propose; do
  ln -sf "../../../.agent/workflows/opsx-${cmd}.md" ".claude/commands/opsx/${cmd}.md"
done

for skill in openspec-apply-change openspec-archive-change openspec-explore openspec-propose; do
  ln -sf "../../.agent/skills/${skill}" ".claude/skills/${skill}"
done

ln -sf "../../.agent/skills/nextjs-dev.md" ".claude/skills/nextjs-dev.md"
ln -sf "../.agent/config/claude/settings.json" ".claude/settings.json"

echo "✓ .claude/ configured"
