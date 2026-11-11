import assert from "node:assert/strict";
import test from "node:test";

import {
  AIAgentSSEDecoder,
  applyActionEvent,
  attachAIAgentActionsToMessages,
  buildConfigInput,
  collectActionResourceLinks,
  decodeStoredActions,
  decodeStoredMessages,
  formatAIAgentActionArguments,
  getAIAgentConfirmationParentID,
  getProviderPreset,
  getAIAgentMessageDisplayMode,
	geometryStorageKey,
	legacyGeometryStorageKey,
	migrateAIAgentGeometryStorage,
	shouldShowAIAgentStreamingIndicator,
  restoreAIAgentGeometry,
	shouldShowPostActionReplyIndicator,
	shouldReloadConversationAfterRun,
	shouldShowAIAgentLauncher,
} from "./model.ts";

test("SSE decoder preserves events split across network chunks", () => {
  const decoder = new AIAgentSSEDecoder();
  assert.deepEqual(decoder.push('event: textDelta\ndata: {"text":"你'), []);
  assert.deepEqual(decoder.push('好","messageId":8}\n\nevent: messageDone\ndata: {"messageId":8}\n\n'), [
    { type: "textDelta", text: "你好", messageId: "8" },
    { type: "messageDone", messageId: "8" },
  ]);
});

test("SSE decoder reports action payloads without base64 conversion", () => {
  const decoder = new AIAgentSSEDecoder();
  assert.deepEqual(
    decoder.push(
      'event: actionPending\ndata: {"actionId":12,"messageId":8,"toolName":"create_server","argumentsJSON":{"domains":["example.com"]},"status":"pending"}\n\n',
    ),
    [
      {
        type: "actionPending",
        actionId: "12",
        messageId: "8",
        toolName: "create_server",
        argumentsJSON: { domains: ["example.com"] },
        status: "pending",
      },
    ],
  );
});

test("displayed website patches preserve compression extensions and redact certificate keys", () => {
  assert.deepEqual(
    formatAIAgentActionArguments("update_site_config", {
      server: {
        web: { compression: { extensions: [".mjs", ".wasm"] } },
        https: { sslPolicy: { certs: [{ id: "7", keyData: "private" }] } },
      },
    }),
    {
      server: {
        web: { compression: { extensions: [".mjs", ".wasm"] } },
        https: { sslPolicy: { certs: [{ id: "7", keyData: "••••••••" }] } },
      },
    },
  );
});

test("SSE decoder preserves safe reasoning deltas", () => {
	const decoder = new AIAgentSSEDecoder();
	assert.deepEqual(decoder.push('event: reasoningDelta\ndata: {"messageId":8,"text":"正在分析请求"}\n\n'), [
		{ type: "reasoningDelta", messageId: "8", text: "正在分析请求" },
	]);
});

test("action events advance a confirmation card without duplicating it", () => {
  const pending = applyActionEvent([], {
    type: "actionPending",
    actionId: "12",
    messageId: "8",
    toolName: "create_server",
    argumentsJSON: { domains: ["example.com"] },
    status: "pending",
  });
  assert.equal(pending.length, 1);
  const running = applyActionEvent(pending, { type: "actionStarted", actionId: "12", toolName: "create_server", status: "running" });
  const succeeded = applyActionEvent(running, {
    type: "actionResult",
    actionId: "12",
    toolName: "create_server",
    resultJSON: { serverId: 42 },
    status: "succeeded",
  });
  assert.deepEqual(succeeded, [
    {
      id: "12",
      messageId: "8",
      toolName: "create_server",
      argumentsJSON: { domains: ["example.com"] },
      resultJSON: { serverId: 42 },
      status: "succeeded",
    },
  ]);
});

test("a confirmed action keeps its reply indicator until the follow-up reply finishes", () => {
  assert.equal(shouldShowPostActionReplyIndicator("12", "12"), true);
  assert.equal(shouldShowPostActionReplyIndicator("12", "13"), false);
  assert.equal(shouldShowPostActionReplyIndicator("", "12"), false);
});

test("batch create results expose links for every created resource", () => {
  assert.deepEqual(
    collectActionResourceLinks({
      sites: [
        { serverId: 41, sslCertIds: [7, 8] },
        { serverId: "42", sslCertIds: [9] },
        { error: "duplicate domain" },
      ],
    }),
    [
      { type: "server", id: "41" },
      { type: "certificate", id: "7" },
      { type: "certificate", id: "8" },
      { type: "server", id: "42" },
      { type: "certificate", id: "9" },
    ],
  );
});

test("a completed run with a pending action reloads its persisted conversation", () => {
  assert.equal(shouldReloadConversationAfterRun([{ type: "textDelta" }, { type: "actionPending" }]), true);
  assert.equal(shouldReloadConversationAfterRun([{ type: "textDelta" }, { type: "messageDone" }]), false);
  assert.equal(shouldReloadConversationAfterRun([{ type: "actionResult" }], true), true);
});

test("a confirmation reply stays attached to its action message", () => {
  assert.equal(getAIAgentConfirmationParentID("action-message", "newer-message"), "action-message");
  assert.equal(getAIAgentConfirmationParentID("", "latest-message"), "latest-message");
  assert.equal(getAIAgentConfirmationParentID("", undefined), null);
});

test("stored Eino messages become assistant-ui history and skip tool rows", () => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
  assert.deepEqual(
    decodeStoredMessages([
      { id: "1", role: "user", status: "completed", contentJSON: encode({ role: "user", content: "创建 example.com" }) },
      { id: "2", role: "tool", status: "completed", contentJSON: encode({ role: "tool", content: "{}" }) },
      { id: "3", role: "assistant", status: "completed", contentJSON: encode({ role: "assistant", content: "请确认创建。" }) },
    ]),
    [
      { id: "1", role: "user", content: [{ type: "text", text: "创建 example.com" }] },
      {
        id: "3",
        role: "assistant",
        content: [{ type: "text", text: "请确认创建。" }],
        status: { type: "complete", reason: "stop" },
      },
    ],
  );
});

test("stored confirmation message prefers display-only process text", () => {
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
	assert.deepEqual(
		decodeStoredMessages([
			{
				id: "3",
				role: "assistant",
				status: "completed",
				contentJSON: encode({ role: "assistant", content: "", displayContent: "已找到网站 #42，等待确认更新。" }),
			},
		]),
		[
			{
				id: "3",
				role: "assistant",
				content: [{ type: "text", text: "已找到网站 #42，等待确认更新。" }],
				status: { type: "complete", reason: "stop" },
			},
		],
	);
});

test("stored messages restore only the safe reasoning summary", () => {
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
	assert.deepEqual(
		decodeStoredMessages([
			{
				id: "3",
				role: "assistant",
				status: "completed",
				contentJSON: encode({
					role: "assistant",
					content: "网站已创建。",
					displayReasoning: "已确认网站配置并准备执行。",
					reasoning_content: "绝不能显示的原始推理",
				}),
			},
		]),
		[
			{
				id: "3",
				role: "assistant",
				content: [
					{ type: "reasoning", text: "已确认网站配置并准备执行。" },
					{ type: "text", text: "网站已创建。" },
				],
				status: { type: "complete", reason: "stop" },
			},
		],
	);
});

test("stored action JSON fields are decoded for confirmation restoration", () => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");
  assert.deepEqual(
    decodeStoredActions([
      {
        id: "12",
        messageId: "3",
        toolName: "create_server",
        argumentsJSON: encode({ domains: ["example.com"] }),
        resultJSON: encode({ serverId: 42 }),
        status: "succeeded",
      },
    ]),
    [
      {
        id: "12",
        messageId: "3",
        toolName: "create_server",
        argumentsJSON: { domains: ["example.com"] },
        resultJSON: { serverId: 42 },
        status: "succeeded",
      },
    ],
  );
});

test("stored actions become Assistant UI tool-call parts with their lifecycle", () => {
	const messages = decodeStoredMessages([
		{
			id: "3",
			role: "assistant",
			status: "completed",
			contentJSON: Buffer.from(JSON.stringify({ role: "assistant", content: "请确认操作。" })).toString("base64"),
		},
	]);
	assert.deepEqual(
		attachAIAgentActionsToMessages(messages, [
			{ id: "pending", messageId: "3", toolName: "create_server", argumentsJSON: { domains: ["example.com"] }, status: "pending" },
		]),
		[
			{
				id: "3",
				role: "assistant",
				content: [
					{ type: "text", text: "请确认操作。" },
					{
						type: "tool-call",
						toolCallId: "pending",
						toolName: "create_server",
						args: { domains: ["example.com"] },
						argsText: '{"domains":["example.com"]}',
					},
				],
				status: { type: "requires-action", reason: "tool-calls" },
			},
		],
	);
	assert.deepEqual(
		attachAIAgentActionsToMessages(messages, [
			{ id: "done", messageId: "3", toolName: "create_server", resultJSON: { serverId: 42 }, status: "succeeded" },
			{ id: "failed", messageId: "3", toolName: "update_site_config", resultJSON: { error: "conflict" }, status: "failed", error: "conflict" },
			{ id: "cancelled", messageId: "3", toolName: "purge_site_cache", status: "cancelled" },
		]),
		[
			{
				id: "3",
				role: "assistant",
				content: [
					{ type: "text", text: "请确认操作。" },
					{ type: "tool-call", toolCallId: "done", toolName: "create_server", args: {}, argsText: "{}", result: { serverId: 42 } },
					{ type: "tool-call", toolCallId: "failed", toolName: "update_site_config", args: {}, argsText: "{}", result: { error: "conflict" }, isError: true },
					{ type: "tool-call", toolCallId: "cancelled", toolName: "purge_site_cache", args: {}, argsText: "{}", result: { cancelled: true } },
				],
				status: { type: "complete", reason: "stop" },
			},
		],
	);
});

test("provider presets and config input preserve an existing secret", () => {
	assert.deepEqual(getProviderPreset("openaiCompatible"), {
		endpoint: "https://api.openai.com/v1",
		model: "gpt-5.6",
		contextWindowTokens: 1050000,
	});
	assert.deepEqual(getProviderPreset("claude"), {
		endpoint: "https://api.anthropic.com",
		model: "claude-sonnet-5",
		contextWindowTokens: 1000000,
	});
  assert.deepEqual(
    buildConfigInput(
      {
        enabled: true,
        provider: "claude",
			apiProtocol: "chatCompletions",
        endpoint: "https://api.anthropic.com",
        apiKey: "",
        model: "claude-sonnet-4-5",
        contextWindowTokens: 200000,
        maxOutputTokens: 4096,
        telegramEnabled: false,
        telegramToken: "",
        telegramProxyURL: "",
      },
      true,
      false,
    ),
    {
      enabled: true,
      provider: "claude",
			apiProtocol: "chatCompletions",
      endpoint: "https://api.anthropic.com",
      apiKey: "",
      model: "claude-sonnet-4-5",
      contextWindowTokens: "200000",
      maxOutputTokens: "4096",
      clearApiKey: false,
      telegramEnabled: false,
      telegramToken: "",
      telegramProxyURL: "",
      clearTelegramToken: false,
    },
  );
});

test("Telegram config input preserves token unless explicitly cleared", () => {
  assert.deepEqual(
    buildConfigInput(
      {
        enabled: true,
        provider: "openaiCompatible",
        apiProtocol: "chatCompletions",
        endpoint: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-5",
        contextWindowTokens: 128000,
        maxOutputTokens: 4096,
        telegramEnabled: true,
        telegramToken: "",
        telegramProxyURL: "socks5://127.0.0.1:1080",
      },
      false,
      false,
      true,
      false,
    ),
    {
      enabled: true,
      provider: "openaiCompatible",
      apiProtocol: "chatCompletions",
      endpoint: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-5",
      contextWindowTokens: "128000",
      maxOutputTokens: "4096",
      clearApiKey: false,
      telegramEnabled: true,
      telegramToken: "",
      telegramProxyURL: "socks5://127.0.0.1:1080",
      clearTelegramToken: false,
    },
  );
});

test("geometry restore clamps stale values into the current viewport", () => {
  assert.deepEqual(
    restoreAIAgentGeometry('{"version":1,"width":900,"height":900,"x":1200,"y":800}', 1280, 720),
    { version: 1, width: 900, height: 680, x: 356, y: 16 },
  );
  assert.deepEqual(restoreAIAgentGeometry("not json", 1440, 900), {
    version: 1,
    width: 440,
    height: 640,
    x: 976,
    y: 236,
  });
  assert.deepEqual(restoreAIAgentGeometry('{"version":1,"width":null,"height":"bad","x":null,"y":null}', 1440, 900), {
    version: 1,
    width: 440,
    height: 640,
    x: 976,
    y: 236,
  });
});

test("legacy AI Assistant geometry migrates to the AI Agent storage key", () => {
	const storage = new Map<string, string>([[legacyGeometryStorageKey, '{"version":1,"width":500}']]);
	const localStorageLike = {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
	};
	assert.equal(migrateAIAgentGeometryStorage(localStorageLike), '{"version":1,"width":500}');
	assert.equal(storage.get(geometryStorageKey), '{"version":1,"width":500}');
	assert.equal(storage.has(legacyGeometryStorageKey), false);
});

test("enabled AI assistant always shows its launcher", () => {
	assert.equal(shouldShowAIAgentLauncher({ enabled: true, hasApiKey: false }), true);
	assert.equal(shouldShowAIAgentLauncher({ enabled: true, hasApiKey: true }), true);
	assert.equal(shouldShowAIAgentLauncher({ enabled: false, hasApiKey: true }), false);
});

test("an empty active assistant reply renders a thinking indicator", () => {
	assert.equal(getAIAgentMessageDisplayMode("", true), "thinking");
	assert.equal(getAIAgentMessageDisplayMode("  ", true), "thinking");
	assert.equal(getAIAgentMessageDisplayMode("已有回复", true), "content");
	assert.equal(getAIAgentMessageDisplayMode("", false), "empty");
	assert.equal(shouldShowAIAgentStreamingIndicator("已有回复", true), true);
	assert.equal(shouldShowAIAgentStreamingIndicator("", true), false);
	assert.equal(shouldShowAIAgentStreamingIndicator("已有回复", false), false);
});
