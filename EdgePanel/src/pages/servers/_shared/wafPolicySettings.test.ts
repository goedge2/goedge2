import assert from "node:assert/strict";
import test from "node:test";
import type { HTTPFirewallPolicy } from "@/pb/models/model_http_firewall_pb";
import { buildWafPolicySettingsValues, defaultWafPageBody, validateWafCaptchaTemplate, wafCaptchaTypes } from "./wafPolicySettings.ts";

test("WAF action defaults match backend policy constructors", () => {
  const values = buildWafPolicySettingsValues({} as HTTPFirewallPolicy);
  assert.equal(values.blockOptions?.statusCode, 403);
  assert.equal(values.blockOptions?.timeout, 300);
  assert.equal(values.pageOptions?.status, 403);
  assert.equal(values.pageOptions?.body, defaultWafPageBody);
  assert.equal(values.captchaOptions?.captchaType, "default");
  assert.equal(values.captchaOptions?.countLetters, 6);
  assert.equal(values.captchaOptions?.maxFails, 100);
  assert.equal(values.jsCookieOptions?.life, 600);
  assert.deepEqual(wafCaptchaTypes.map((item) => item.value), ["default", "oneClick", "slide", "geetest"]);
});

test("WAF settings preserve explicit zero, false, blank and unregistered fields without mutating the response", () => {
  const policy = {
    id: "42",
    blockOptions: { timeout: 0, timeoutMax: 900, failBlockScopeAll: false, isPrior: true, scope: "service", body: "" },
    pageOptions: { body: "" },
    captchaOptions: { life: 0, maxFails: 0, failBlockTimeout: 0, uiIsOn: false, uiBody: "custom", uiShowRequestId: false, geeTestConfig: { isOn: false, hasCaptchaKey: true } },
    jsCookieOptions: { life: 0, maxFails: 0, failBlockTimeout: 0, failBlockScopeAll: false, scope: "service" },
    inbound: { isOn: false, groups: [], greyListRef: { isOn: true, listId: "7" } },
  } as unknown as HTTPFirewallPolicy;
  const original = structuredClone(policy);
  const values = buildWafPolicySettingsValues(policy);
  assert.deepEqual(values.blockOptions, { statusCode: 403, ...policy.blockOptions });
  assert.equal(values.pageOptions?.body, "");
  assert.equal(values.captchaOptions?.life, 0);
  assert.equal(values.captchaOptions?.maxFails, 0);
  assert.equal(values.captchaOptions?.failBlockTimeout, 0);
  assert.equal(values.captchaOptions?.uiShowRequestId, false);
  assert.equal(values.captchaOptions?.geeTestConfig?.hasCaptchaKey, true);
  assert.equal(values.captchaOptions?.geeTestConfig?.captchaKey, undefined);
  assert.deepEqual(values.jsCookieOptions, policy.jsCookieOptions);
  assert.equal(values.inbound?.isOn, false);
  assert.deepEqual(values.inbound?.greyListRef, policy.inbound?.greyListRef);
  assert.deepEqual(values.inbound?.publicWhiteLists?.refs, []);
  assert.deepEqual(values.inbound?.publicBlackLists?.refs, []);
  assert.deepEqual(policy, original);
});

test("captcha templates require the form placeholder and reject nested forms", () => {
  assert.equal(validateWafCaptchaTemplate(""), undefined);
  assert.equal(validateWafCaptchaTemplate("<main>${body}</main>"), undefined);
  assert.ok(validateWafCaptchaTemplate("<main>No captcha</main>"));
  assert.ok(validateWafCaptchaTemplate("<form>\n${body}\n</form>"));
  assert.ok(validateWafCaptchaTemplate('<FORM method="post">${body}</FORM>'));
});

test("presence-aware public list values override legacy refs, including explicit empty lists", () => {
  const policy = { inbound: {
    isOn: true,
    allowListRef: { listId: "11", isOn: true },
    denyListRef: { listId: "12", isOn: true },
    publicWhiteListRefs: [{ listId: "21", isOn: true }],
    publicBlackListRefs: [{ listId: "22", isOn: false }],
    publicWhiteLists: { refs: [] },
  } } as unknown as HTTPFirewallPolicy;
  const values = buildWafPolicySettingsValues(policy);
  assert.deepEqual(values.inbound?.publicWhiteLists?.refs, []);
  assert.deepEqual(values.inbound?.publicBlackLists?.refs, [{ listId: "22", isOn: false }]);
  assert.equal(values.inbound?.publicWhiteListRefs, undefined);
  assert.equal(values.inbound?.publicBlackListRefs, undefined);
  assert.deepEqual(values.inbound?.allowListRef, policy.inbound?.allowListRef);
  assert.deepEqual(values.inbound?.denyListRef, policy.inbound?.denyListRef);
});
