import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const sharedInputPath = resolve(workspaceRoot, "src/components/SharedInput.tsx");

test("CompactField forwards Form.Item control props to its child input", () => {
  const source = readFileSync(sharedInputPath, "utf8");

  assert.match(source, /controlProps/);
  assert.match(source, /cloneElement/);
});
