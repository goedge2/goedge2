import test from "node:test";
import assert from "node:assert/strict";

import { buildHTTPSFirstEnableDefaults } from "../src/pages/servers/_shared/httpsDefaults.ts";

test("buildHTTPSFirstEnableDefaults fills HTTPS defaults when fields are empty", () => {
  assert.deepStrictEqual(buildHTTPSFirstEnableDefaults({ isOn: true }), {
    listen: [{ protocol: "https", portRange: "443" }],
    sslPolicy: {
      minVersion: "TLS 1.1",
      http2Enabled: true,
    },
  });
});

test("buildHTTPSFirstEnableDefaults preserves existing HTTPS values", () => {
  assert.deepStrictEqual(
    buildHTTPSFirstEnableDefaults({
      isOn: true,
      listen: [{ protocol: "https", portRange: "8443" }],
      sslPolicy: {
        minVersion: "TLS 1.3",
        http2Enabled: false,
      },
    }),
    null,
  );
});

test("buildHTTPSFirstEnableDefaults only fills missing HTTPS fields", () => {
  assert.deepStrictEqual(
    buildHTTPSFirstEnableDefaults({
      isOn: true,
      listen: [{ protocol: "https", portRange: "9443" }],
      sslPolicy: {
        minVersion: "TLS 1.2",
      },
    }),
    {
      sslPolicy: {
        http2Enabled: true,
      },
    },
  );
});

test("buildHTTPSFirstEnableDefaults treats blank minVersion as empty", () => {
  assert.deepStrictEqual(
    buildHTTPSFirstEnableDefaults({
      isOn: true,
      listen: [{ protocol: "https", portRange: "9443" }],
      sslPolicy: {
        minVersion: "   ",
        http2Enabled: false,
      },
    }),
    {
      sslPolicy: {
        minVersion: "TLS 1.1",
      },
    },
  );
});
