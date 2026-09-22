#!/usr/bin/env bash
# Install all Losi Context Bank agent skills + merge Losi MCP into Cursor/Claude.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/losi-ai/context-bank/main/scripts/install-with-mcp.sh | bash
#   bash scripts/install-with-mcp.sh
set -euo pipefail

REPO="${LOSI_CONTEXT_BANK_REPO:-losi-ai/context-bank}"
MCP_TEMPLATE_URL="${LOSI_MCP_TEMPLATE_URL:-https://raw.githubusercontent.com/losi-ai/context-bank/main/mcp/losi.mcp.json}"

echo "==> Installing Losi Context Bank skills from ${REPO} (--all)"
npx --yes skills add "${REPO}" --all

TMP_TPL="$(mktemp)"
cleanup() { rm -f "$TMP_TPL"; }
trap cleanup EXIT

echo "==> Fetching MCP template"
curl -fsSL "$MCP_TEMPLATE_URL" -o "$TMP_TPL"

merge_one() {
  local target="$1"
  mkdir -p "$(dirname "$target")"
  if [[ ! -f "$target" ]]; then
    cp "$TMP_TPL" "$target"
    echo "    wrote $target"
    return
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "    skip merge (no node): $target — copy from $MCP_TEMPLATE_URL"
    return
  fi
  node -e '
const fs = require("fs");
const target = process.argv[1];
const tpl = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let cur = {};
try { cur = JSON.parse(fs.readFileSync(target, "utf8")); } catch (_) {}
cur.mcpServers = Object.assign({}, cur.mcpServers || {}, tpl.mcpServers || {});
fs.writeFileSync(target, JSON.stringify(cur, null, 2) + "\n");
console.log("    merged losi into " + target);
' "$target" "$TMP_TPL"
}

echo "==> Merging Losi MCP (set LOSI_API_KEY in vault/env)"
if [[ -d .cursor ]] || [[ -f package.json ]] || [[ -d .git ]]; then
  merge_one "$(pwd)/.cursor/mcp.json"
fi
merge_one "${HOME}/.cursor/mcp.json"

if [[ -f "${HOME}/.claude.json" ]] && command -v node >/dev/null 2>&1; then
  node -e '
const fs = require("fs");
const p = process.env.HOME + "/.claude.json";
const tpl = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
let cur = {};
try { cur = JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) {}
cur.mcpServers = Object.assign({}, cur.mcpServers || {}, tpl.mcpServers || {});
fs.writeFileSync(p, JSON.stringify(cur, null, 2) + "\n");
console.log("    merged losi into ~/.claude.json");
' "$TMP_TPL" || true
fi

echo ""
echo "Done. Set LOSI_API_KEY in your host vault/env, then restart MCP."
echo "Skills: connect-losi-context, use-losi-context, store-losi-context, migrate-to-losi-context"
echo "Docs:   https://losi.ai/docs/context-bank"
