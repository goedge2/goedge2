import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMessageMediaConfigPayload,
  buildMessageMediaDraftValues,
  buildMessageRatePayload,
  recipientTabList,
  taskStatusOptions,
} from "../src/pages/admins/recipients/formValues.ts";

test("recipientTabList keeps the five notification management tabs stable", () => {
  assert.deepEqual(
    recipientTabList,
    [
      { key: "/admins/recipients", tab: "接收人" },
      { key: "/admins/recipients/groups", tab: "接收人分组" },
      { key: "/admins/recipients/media", tab: "媒介" },
      { key: "/admins/recipients/logs", tab: "发送记录" },
      { key: "/admins/recipients/tasks", tab: "任务队列" },
    ],
  );
});

test("taskStatusOptions keeps the queue filters lightweight and stable", () => {
  assert.deepEqual(taskStatusOptions, [
    { label: "待发送", value: "0" },
    { label: "发送中", value: "1" },
    { label: "成功", value: "2" },
    { label: "失败", value: "3" },
  ]);
});

test("buildMessageMediaConfigPayload builds email config with only the active branch", () => {
  assert.deepEqual(
    buildMessageMediaConfigPayload("email", {
      email: {
        smtp: "smtp.example.com:465",
        username: "ops",
        password: "secret",
        from: "ops@example.com",
        fromName: "Ops",
        protocol: "tls",
      },
      telegram: {
        token: "ignored",
        proxyUrl: "socks5://127.0.0.1:7890",
      },
    }),
    {
      email: {
        smtp: "smtp.example.com:465",
        username: "ops",
        password: "secret",
        from: "ops@example.com",
        fromName: "Ops",
        protocol: "tls",
      },
    },
  );
});

test("buildMessageMediaConfigPayload cleans empty webhook variables and body", () => {
  assert.deepEqual(
    buildMessageMediaConfigPayload("webHook", {
      webHook: {
        url: "https://example.com/hook",
        method: "POST",
        contentType: "json",
        headers: [
          { name: "Authorization", value: "Bearer 123" },
          { name: "", value: "" },
        ],
        params: [
          { name: "severity", value: "critical" },
          { name: "", value: "skip" },
        ],
        body: "hello",
      },
    }),
    {
      webHook: {
        url: "https://example.com/hook",
        method: "POST",
        contentType: "json",
        headers: [{ name: "Authorization", value: "Bearer 123" }],
        params: [{ name: "severity", value: "critical" }],
        body: "hello",
      },
    },
  );
});

test("buildMessageMediaConfigPayload supports telegram and aliyun sms configs", () => {
  assert.deepEqual(
    buildMessageMediaConfigPayload("telegram", {
      telegram: {
        token: "123:abc",
        proxyUrl: "socks5://127.0.0.1:7890",
      },
    }),
    {
      telegram: {
        token: "123:abc",
        proxyUrl: "socks5://127.0.0.1:7890",
      },
    },
  );

  assert.deepEqual(
    buildMessageMediaConfigPayload("aliyunSms", {
      aliyunSms: {
        sign: "GoEdge",
        templateCode: "SMS_123",
        accessKeyId: "ak",
        accessKeySecret: "sk",
        variables: [
          { name: "code", value: "9527" },
          { name: "", value: "" },
        ],
      },
    }),
    {
      aliyunSms: {
        sign: "GoEdge",
        templateCode: "SMS_123",
        accessKeyId: "ak",
        accessKeySecret: "sk",
        variables: [{ name: "code", value: "9527" }],
      },
    },
  );
});

test("buildMessageMediaDraftValues maps response config back into tab-scoped form drafts", () => {
  assert.deepEqual(
    buildMessageMediaDraftValues("qyWeixinRobot", {
      qyWeixinRobot: {
        webHookURL: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc",
        textFormat: "markdown",
      },
    }),
    {
      qyWeixinRobot: {
        webHookURL: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc",
        textFormat: "markdown",
      },
    },
  );
});

test("buildMessageRatePayload omits empty values and keeps valid limits", () => {
  assert.equal(buildMessageRatePayload({ rateMinutes: 0, rateCount: 0 }), undefined);
  assert.equal(buildMessageRatePayload({ rateMinutes: "", rateCount: undefined }), undefined);

  assert.deepEqual(buildMessageRatePayload({ rateMinutes: 15, rateCount: 3 }), {
    minutes: 15,
    count: 3,
  });
});
