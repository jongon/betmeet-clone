import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const sourcePath = ".agent/config/mcp/source.json";
const absoluteSourcePath = resolve(root, sourcePath);

let source;
try {
  source = JSON.parse(readFileSync(absoluteSourcePath, "utf-8"));
} catch {
  console.error(`ERROR: ${sourcePath} not found or invalid JSON`);
  process.exit(1);
}

const servers = source.servers ?? {};
const serverNames = Object.keys(servers);

function toStdioEntry(name) {
  switch (name) {
    case "context7":
      return {
        type: "stdio",
        command: "npx",
        args: ["-y", "@upstash/context7-mcp"],
      };
    default:
      console.error(`ERROR: no adapter for MCP server '${name}' in ${sourcePath}`);
      process.exit(1);
  }
}

const stdioServers = Object.fromEntries(serverNames.map((name) => [name, toStdioEntry(name)]));

const toolOutputs = [
  { dir: ".claude", file: "settings.json", type: "mcpServers" },
  { dir: ".opencode", file: "opencode.json", type: "opencode" },
  { dir: ".cursor", file: "mcp.json", type: "mcpServers" },
  { dir: ".kiro", file: "mcp.json", type: "mcpServers" },
  { dir: ".kilocode", file: "mcp.json", type: "mcpServers" },
  { dir: ".copilot", file: "mcp.json", type: "mcpServers" },
  { dir: ".codex", file: "mcp.json", type: "mcpServers" },
  { dir: ".antigravity", file: "mcp.json", type: "mcpServers" },
];

for (const { dir, file, type } of toolOutputs) {
  mkdirSync(resolve(root, dir), { recursive: true });

  const content =
    type === "opencode"
      ? { $schema: "https://opencode.ai/config.json", mcp: servers }
      : { mcpServers: stdioServers };

  writeFileSync(resolve(root, dir, file), `${JSON.stringify(content, null, 2)}\n`);

  console.log(`✓ ${dir}/${file}`);
}

console.log(`Done — generated from ${sourcePath}`);
