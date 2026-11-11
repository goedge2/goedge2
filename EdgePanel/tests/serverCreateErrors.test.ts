import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workspaceRoot = resolve(import.meta.dirname, "..");
const servicesSource = readFileSync(resolve(workspaceRoot, "src/services/servers.ts"), "utf8");
const createServerSource = servicesSource.slice(servicesSource.indexOf("export async function createServer("), servicesSource.indexOf("export async function listServers("));

test("locally handled creation rejects to the page and opts out of the global error handler", async () => {
  const error = { response: { status: 409, data: { code: 6, message: "port 12008 is already used" } } };
  let capturedOptions: Record<string, unknown> | undefined;
  const createServer = runInNewContext(
    stripTypeScriptTypes(createServerSource.replace("export ", "")) + "\ncreateServer",
    {
      request: async (url: string, options: Record<string, unknown>) => {
        assert.equal(url, "/api/server");
        capturedOptions = options;
        throw error;
      },
    },
  );
  const payload = { type: "tcpProxy", nodeClusterId: "1" };
  await assert.rejects(createServer(payload, { skipErrorHandler: true }), (caught: unknown) => caught === error);
  assert.equal(capturedOptions?.skipErrorHandler, true);
  assert.equal(capturedOptions?.method, "POST");
  assert.equal(capturedOptions?.data, payload);
  await assert.rejects(createServer(payload), (caught: unknown) => caught === error);
  assert.equal(capturedOptions?.skipErrorHandler, undefined);
});

test("the creation page opts out of global errors and displays its own contextual message", () => {
  const source = readFileSync(resolve(workspaceRoot, "src/pages/servers/create.tsx"), "utf8");
  assert.match(source, /createServer\(buildCreateServerPayloadFromForm\(serverType, values\),\s*\{ skipErrorHandler: true \}\)/);
  assert.match(source, /catch \(error\)\s*\{\s*message\.error\(formatErrorMessage\("创建网站失败", error\)\);\s*\}/);
});
