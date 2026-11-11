import assert from "node:assert/strict";
import test from "node:test";

import { OTP_CODE_LENGTH, shouldAutoVerifyOTP } from "../src/runtime/otp.ts";

test("shouldAutoVerifyOTP starts verification only for a complete code", () => {
  assert.equal(shouldAutoVerifyOTP("12345", false), false);
  assert.equal(shouldAutoVerifyOTP("123456", false), true);
  assert.equal(shouldAutoVerifyOTP("1234567", false), false);
});

test("shouldAutoVerifyOTP does not start another request while submitting", () => {
  assert.equal(shouldAutoVerifyOTP("123456", true), false);
  assert.equal(OTP_CODE_LENGTH, 6);
});
