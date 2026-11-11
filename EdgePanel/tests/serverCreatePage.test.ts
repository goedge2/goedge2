import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const createPagePath = resolve(workspaceRoot, "src/pages/servers/create.tsx");
const createFormPath = resolve(workspaceRoot, "src/pages/servers/createForm.ts");

test("server create page exposes the expected default enable options", () => {
  assert.equal(existsSync(createPagePath), true, "src/pages/servers/create.tsx should exist");

  const source = readFileSync(createFormPath, "utf8");
  assert.match(source, /DEFAULT_ENABLED_CONFIG_KEYS(?:\s*:\s*[^=]+)?\s*=\s*\[\s*["']enableAccessLog["'],\s*["']enableWebsocket["'],\s*["']enableCache["']\s*\]/s);
  assert.match(source, /label:\s*["']访问日志["']\s*,\s*value:\s*["']enableAccessLog["']/);
  assert.match(source, /label:\s*["']WebSocket["']\s*,\s*value:\s*["']enableWebsocket["']/);
  assert.match(source, /label:\s*["']缓存["']\s*,\s*value:\s*["']enableCache["']/);
  assert.match(source, /label:\s*["']WAF["']\s*,\s*value:\s*["']enableWaf["']/);
  assert.match(source, /label:\s*["']从上级代理中读取 IP["']\s*,\s*value:\s*["']enableRemoteAddr["']/);
});

test("server create page maps checkbox state into createBasicHTTPServer flags", () => {
  assert.equal(existsSync(createPagePath), true, "src/pages/servers/create.tsx should exist");

  const source = readFileSync(createFormPath, "utf8");
  assert.match(source, /enableAccessLog:\s*enabledConfigKeys\.has\(["']enableAccessLog["']\)/);
  assert.match(source, /enableWebsocket:\s*enabledConfigKeys\.has\(["']enableWebsocket["']\)/);
  assert.match(source, /enableCache:\s*enabledConfigKeys\.has\(["']enableCache["']\)/);
  assert.match(source, /enableWaf:\s*enabledConfigKeys\.has\(["']enableWaf["']\)/);
  assert.match(source, /enableRemoteAddr:\s*enabledConfigKeys\.has\(["']enableRemoteAddr["']\)/);
});

test("server create page exposes all website types and unified create API", () => {
  const source = readFileSync(createPagePath, "utf8") + readFileSync(createFormPath, "utf8");
  assert.match(source, /Menu/);
  assert.match(source, /createServer\(/);
  assert.match(source, /httpProxy/);
  assert.match(source, /tcpProxy/);
  assert.match(source, /udpProxy/);
  assert.match(source, /httpWeb/);
  assert.match(source, /portRange: ["']80["']/);
  assert.match(source, /portRange: ["']443["']/);
});

test("route config exposes the dedicated /servers/create page", () => {
  const routesSource = readFileSync(resolve(workspaceRoot, "config/routes.ts"), "utf8");

  assert.match(routesSource, /path:\s*["']\/servers\/create["']/);
  assert.match(routesSource, /component:\s*["']\.\/servers\/create["']/);
});
