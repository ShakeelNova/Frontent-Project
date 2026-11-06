#!/usr/bin/env node
/**
 * api:check — fails when the generated API client is stale vs the contract.
 *
 * Two checks (both must pass):
 *  1. SHA-256 of packages/api-contract/openapi.yaml matches the value recorded
 *     in contracts/CONTRACT_VERSION.txt (catches contract edits that were
 *     never recorded/regenerated).
 *  2. Re-generating types into a temp file produces byte-identical output to
 *     the committed src/api/generated.ts (catches hand-edits / stale output).
 *
 * Timestamps are deliberately NOT used: they are unreliable under git/CI.
 * Run `npm run api:types` and update CONTRACT_VERSION.txt to fix failures.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..", "..");
const contractPath = join(repoRoot, "packages", "api-contract", "openapi.yaml");
const generatedPath = join(frontendRoot, "src", "api", "generated.ts");
const versionRecordPath = join(repoRoot, "contracts", "CONTRACT_VERSION.txt");

function fail(message) {
  console.error(`\n❌ api:check failed: ${message}\n`);
  console.error("Fix: run `npm run api:types`, update contracts/CONTRACT_VERSION.txt");
  console.error("(version + SHA-256), then commit openapi.yaml, generated.ts and");
  console.error("CONTRACT_VERSION.txt together. Never hand-edit generated.ts.\n");
  process.exit(1);
}

for (const [label, path] of [
  ["contract", contractPath],
  ["generated client", generatedPath],
  ["CONTRACT_VERSION.txt", versionRecordPath],
]) {
  if (!existsSync(path)) fail(`missing ${label} at ${path}`);
}

// Check 1: recorded checksum matches the contract on disk.
const sha256 = createHash("sha256")
  .update(readFileSync(contractPath))
  .digest("hex");
const record = readFileSync(versionRecordPath, "utf8");
const recorded = record.match(/SHA-256:\s*([0-9a-f]{64})/i)?.[1]?.toLowerCase();
if (!recorded) {
  fail("contracts/CONTRACT_VERSION.txt does not contain a `SHA-256: <hex>` line.");
}
if (recorded !== sha256) {
  fail(
    `contract checksum drift — CONTRACT_VERSION.txt records ${recorded}, ` +
      `but openapi.yaml hashes to ${sha256}.`,
  );
}
console.log(`✓ Contract SHA-256 matches CONTRACT_VERSION.txt (${sha256.slice(0, 12)}…)`);

// Check 2: committed generated output matches a fresh generation.
const tmpDir = mkdtempSync(join(tmpdir(), "fluxeaze-api-check-"));
const freshPath = join(tmpDir, "generated.ts");
try {
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["openapi-typescript", contractPath, "--output", freshPath],
    { cwd: frontendRoot, stdio: "inherit" },
  );
} catch {
  fail("openapi-typescript generation failed (see output above).");
}
try {
  const fresh = readFileSync(freshPath, "utf8");
  const committed = readFileSync(generatedPath, "utf8");
  // Normalise line endings only; any content drift is a failure.
  const norm = (s) => s.replace(/\r\n/g, "\n");
  if (norm(fresh) !== norm(committed)) {
    fail("src/api/generated.ts is stale or was hand-edited vs a fresh generation.");
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
console.log("✓ src/api/generated.ts matches a fresh generation from openapi.yaml");
console.log("\n✅ api:check passed — generated client is in sync with the contract.");
