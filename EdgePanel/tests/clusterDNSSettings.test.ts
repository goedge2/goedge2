import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const settingsPath = resolve(workspaceRoot, "src/pages/clusters/settings.tsx");
const dnsNameFieldPath = resolve(workspaceRoot, "src/pages/clusters/_shared/ClusterDNSNameField.tsx");

test("cluster DNS settings use the shared DNS name field", () => {
  const source = readFileSync(settingsPath, "utf8");

  assert.match(source, /<ClusterDNSNameField\s+domainName=\{dnsDomainName\}\s+isEditing\s*\/>/);
});

test("shared cluster DNS name field keeps dnsName bound to the compact input", () => {
  const source = readFileSync(dnsNameFieldPath, "utf8");

  assert.match(source, /<Form\.Item\s+label="DNS子域名"\s+name="dnsName"/);
  assert.match(source, />\s*<CompactField\b[^>]*>\s*<Input\b[^>]*\/>\s*<\/CompactField>\s*<\/Form\.Item>/);
});

test("shared cluster DNS name field displays the domain suffix with a placeholder fallback", () => {
  const source = readFileSync(dnsNameFieldPath, "utf8");

  assert.match(source, /<CompactField\s+addonAfter=\{`\.\$\{domainName \|\| "主域名"\}`\}/);
});
