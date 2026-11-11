import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { MessageChannel } from "node:worker_threads";
import type { Server } from "../../pb/models/model_server_pb";
import { buildCacheSettingsValues, cacheRefWithoutTemporaryId } from "./cacheSettings.ts";

test("cache control defaults on without overriding explicit false or unrelated fields", () => {
  for (const enabled of [undefined, true, false]) {
    const server = { web: { cache: { isOn: true, enableCacheControl: enabled, addAgeHeader: false } } } as Server;
    const result = buildCacheSettingsValues(server);
    assert.equal(result.web?.cache?.enableCacheControl, enabled ?? true);
    assert.equal(result.web?.cache?.addAgeHeader, false);
    assert.equal(server.web?.cache?.enableCacheControl, enabled);
  }
});

test("form submission retains unregistered rule fields and explicit empty restrictions", async (context) => {
  context.mock.method(globalThis, "MessageChannel", class extends MessageChannel {
    constructor() {
      super();
      this.port1.once("message", () => {
        this.port1.close();
        this.port2.close();
      });
    }
  });
  const require = createRequire(import.meta.url);
  const { FormStore } = require("@rc-component/form/lib/hooks/useForm.js");
  const { HOOK_MARK } = require("@rc-component/form/lib/FieldContext.js");
  const form = new FormStore(() => {}).getForm();
  const hooks = form.getInternalHooks(HOOK_MARK);
  for (const fieldName of ["key", "skipCacheControlValues"]) {
    hooks.registerField({ props: {}, getNamePath: () => [fieldName], onStoreChange: () => {}, isList: () => false, isListField: () => false });
  }
  form.setFieldsValue({ id: 7, isOn: true, methods: ["GET"], key: "original", skipCacheControlValues: ["private"] });
  form.setFieldsValue({ key: "edited", skipCacheControlValues: [] });
  await form.validateFields();
  const result = cacheRefWithoutTemporaryId(form.getFieldsValue(true));
  assert.equal(result.isOn, true);
  assert.deepEqual(result.methods, ["GET"]);
  assert.deepEqual(result.skipCacheControlValues, []);
  assert.equal(result.key, "edited");
  assert.equal("id" in result, false);
});
