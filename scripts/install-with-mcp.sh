#!/usr/bin/env bash
# Install Losi Context Bank agent skills + wire the hosted MCP server.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/losi-ai/context-bank/main/scripts/install-with-mcp.sh | bash
#   bash scripts/install-with-mcp.sh [--project|--global] [--skills-only|--mcp-only]
set -euo pipefail

SCOPE="-g"
MODE="all" # all | skills | mcp
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)" || ROOT=""

for arg in "$@"; do
  case "$arg" in
    --project) SCOPE="" ;;
    --global|-g) SCOPE="-g" ;;
    --skills-only) MODE="skills" ;;
    --mcp-only) MODE="mcp" ;;
    -h|--help)
      cat <<'EOF'
Install Losi Context Bank skills + MCP config.

  --global / -g     Install skills globally (default)
  --project         Install skills into the current project
  --skills-only     Only run npx skills add
  --mcp-only        Only write/merge MCP config

Requires LOSI_API_KEY in your environment or host vault after install.
EOF
      exit 0
      ;;
  esac
done

echo "==> Losi Context Bank: skills + MCP"

if [[ "$MODE" == "all" || "$MODE" == "skills" ]]; then
  echo "==> Installing agent skills (losi-ai/context-bank)…"
  # shellcheck disable=SC2086
  npx --yes skills add losi-ai/context-bank --skill '*' --agent '*' -y ${SCOPE}
fi

write_mcp_snippet() {
  cat <<'EOF'
{
  "mcpServers": {
    "losi": {
      "url": "https://losi.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:LOSI_API_KEY}"
      }
    }
  }
}
EOF
}

merge_cursor_mcp() {
  local target="$1"
  mkdir -p "$(dirname "$target")"
  if [[ ! -f "$target" ]]; then
    write_mcp_snippet >"$target"
    echo "    wrote $target"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    node <<NODE
const fs = require("fs");
const path = ${JSON.stringify(target)};
const raw = fs.readFileSync(path, "utf8");
const json = JSON.parse(raw);
json.mcpServers = json.mcpServers || {};
if (!json.mcpServers.losi) {
  json.mcpServers.losi = {
    url: "https://losi.ai/api/mcp",
    headers: { Authorization: "Bearer \${env:LOSI_API_KEY}" },
  };
  fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("    merged losi into " + path);
} else {
  console.log("    losi already present in " + path + " (left unchanged)");
}
NODE
  else
    echo "    $target exists — add the losi block manually (node not available to merge)."
  fi
}

if [[ "$MODE" == "all" || "$MODE" == "mcp" ]]; then
  echo "==> Wiring hosted MCP (https://losi.ai/api/mcp)…"

  # Project Cursor config (when run from a repo)
  if [[ -d .cursor ]] || [[ -f package.json ]] || [[ -d .git ]]; then
    merge_cursor_mcp ".cursor/mcp.json"
  fi

  # User-level Cursor config
  if [[ -d "$HOME/.cursor" ]]; then
    merge_cursor_mcp "$HOME/.cursor/mcp.json"
  fi

  # Claude Code CLI if present
  if command -v claude >/dev/null 2>&1; then
    if claude mcp list 2>/dev/null | grep -qi '^losi\b\|losi '; then
      echo "    claude: losi MCP already registered"
    else
      # Remote HTTP MCP — Claude Code supports url via mcp add-json in recent versions;
      # fall back to printing the snippet if the CLI shape differs.
      if claude mcp add-json losi "$(write_mcp_snippet | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify(j.mcpServers.losi))})')" 2>/dev/null; then
        echo "    claude: registered losi MCP"
      else
        echo "    claude: could not auto-add; paste MCP JSON from docs/connect.md"
      fi
    fi
  fi

  # Always drop a shareable template next to the install
  if [[ -n "$ROOT" && -d "$ROOT/mcp" ]]; then
    write_mcp_snippet >"$ROOT/mcp/losi.mcp.json"
  fi

  cat <<'EOF'

==> Next
1. Create a workspace-scoped API key at https://losi.ai (Profile → API Access)
2. Set LOSI_API_KEY in your shell profile / Cursor env / Private vault
   (never paste the key into chat)
3. Restart Cursor / Claude so MCP reloads
4. Agents with the installed skills will connect, use, store, and migrate
   autonomously (connect / use / store / migrate-to-losi-context)

EOF
fi

echo "Done."
