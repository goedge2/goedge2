import assert from "node:assert/strict";
import test from "node:test";

import { cloudFlareDefaultAPIType, getCloudFlareAPIType } from "../src/pages/dns/_shared/providers/cloudFlareApiType.ts";

test("Cloudflare creation defaults to API Token authentication", () => {
  assert.equal(cloudFlareDefaultAPIType, "apiToken");
});

test("Cloudflare authentication type keeps legacy providers on Global API Key", () => {
  assert.equal(getCloudFlareAPIType("apiToken"), "apiToken");
  assert.equal(getCloudFlareAPIType("globalKey"), "globalKey");
  assert.equal(getCloudFlareAPIType(undefined), "globalKey");
  assert.equal(getCloudFlareAPIType(""), "globalKey");
});
