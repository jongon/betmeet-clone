#!/usr/bin/env bash
# Generates tool-specific AI adapters from .agent/ source of truth.
#
# Source layout (under .agent/):
#   config/claude/settings.json   - hand-maintained, Claude-specific config
#   config/mcp/source.json        - canonical MCP server definitions
#   skills/<name>                  - reusable skill definitions
#   workflows/opsx-<name>.md       - command templates
#
# Generated outputs (committed to repo so they work out-of-the-box):
#   .claude/settings.json          - real file (was symlink, now generated)
#   opencode.json                  - real file at project root
#   .claude/commands/opsx/<name>   - symlinks
#   .claude/skills/<name>          - symlinks
#   .opencode/skills/<name>        - symlinks
#   .opencode/commands/<file>      - symlinks
#
# Re-run after editing anything under .agent/:
#   bash scripts/setup-agent.sh
#
# Drift between source and generated files is caught by the pre-commit hook
# in lefthook.yml (runs this script and aborts the commit on changes).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- Claude Code: commands and skills (symlinks) ---
mkdir -p .claude/commands/opsx .claude/skills

for cmd in apply archive explore propose; do
  ln -sfn "../../../.agent/workflows/opsx-${cmd}.md" ".claude/commands/opsx/${cmd}.md"
done

for skill in openspec-apply-change openspec-archive-change openspec-explore openspec-propose; do
  ln -sfn "../../.agent/skills/${skill}" ".claude/skills/${skill}"
done

ln -sfn "../../.agent/skills/nextjs-dev.md" ".claude/skills/nextjs-dev.md"

# --- opencode: skills and commands (symlinks) ---
mkdir -p .opencode/skills .opencode/commands

for skill in openspec-apply-change openspec-archive-change openspec-explore openspec-propose; do
  ln -sfn "../../.agent/skills/${skill}" ".opencode/skills/${skill}"
done

for cmd in apply archive explore propose; do
  ln -sfn "../../.agent/workflows/opsx-${cmd}.md" ".opencode/commands/opsx-${cmd}.md"
done

# --- MCP source-of-truth generator ---
MCP_SOURCE=".agent/config/mcp/source.json"

if [[ ! -f "$MCP_SOURCE" ]]; then
  echo "ERROR: $MCP_SOURCE not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to generate MCP configs" >&2
  exit 1
fi

# Translate one server entry from the neutral source into Claude Code format.
# Context7 is canonical remote (mcp.context7.com). Claude Code here uses the
# stdio+npx shim because that is what is installed and tested locally; we keep
# that working. New servers added to the source can extend this branch.
to_claude_entry() {
  local name="$1"
  case "$name" in
    context7)
      printf '    "%s": {\n      "type": "stdio",\n      "command": "npx",\n      "args": ["-y", "@upstash/context7-mcp"]\n    }' "$name"
      ;;
    *)
      echo "ERROR: no Claude adapter for MCP server '$name' in $MCP_SOURCE" >&2
      exit 1
      ;;
  esac
}

CLAUDE_MCP='{'
first=1
while IFS= read -r name; do
  [[ $first -eq 1 ]] && first=0 || CLAUDE_MCP+=','
  CLAUDE_MCP+='
'"$(to_claude_entry "$name")"
done < <(jq -r '.servers | keys[]' "$MCP_SOURCE")
CLAUDE_MCP+='
}'

CLAUDE_SETTINGS="{
  \"mcpServers\": ${CLAUDE_MCP}
}"

# Replace the symlink with a real, generated file
rm -f .claude/settings.json
printf '%s\n' "$CLAUDE_SETTINGS" | jq . > .claude/settings.json

# --- opencode: native config at project root ---
OPENCODE_CONFIG='{
  "$schema": "https://opencode.ai/config.json",
  "mcp": '"$(jq '.servers' "$MCP_SOURCE")"'
}'

printf '%s\n' "$OPENCODE_CONFIG" | jq . > opencode.json

echo "✓ .claude/ and opencode.json regenerated from $MCP_SOURCE"
echo "✓ .opencode/skills/ and .opencode/commands/ symlinked from .agent/"
