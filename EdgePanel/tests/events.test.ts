import assert from "node:assert/strict";
import test from "node:test";

import type { EventSourceClient, EventSourceOptions } from "eventsource-client";

import {
  EMPTY_GLOBAL_TASK_SUMMARY,
  mergeGlobalTaskSummaryEvent,
  subscribeEvents,
  type SubscribeEventsOptions,
} from "../src/services/events.ts";

function createFakeClient(): EventSourceClient {
  return {
    close() {},
    connect() {},
    get lastEventId() {
      return undefined;
    },
    get readyState() {
      return "open";
    },
    get url() {
      return "/api/events";
    },
    [Symbol.iterator]() {
      throw new Error("sync iteration is not supported in tests");
    },
    async *[Symbol.asyncIterator]() {},
  } as EventSourceClient;
}

test("mergeGlobalTaskSummaryEvent only updates the matching summary domain", () => {
  const next = mergeGlobalTaskSummaryEvent(EMPTY_GLOBAL_TASK_SUMMARY, {
    type: "dnsTasks",
    payload: {
      hasTasks: true,
      hasError: false,
    },
  });

  assert.deepEqual(next, {
    hasNodeTasks: false,
    nodeTaskError: false,
    hasDNSTasks: true,
    dnsTaskError: false,
    unreadMessageCount: 0,
  });
});

test("subscribeEvents skips connection creation without a token", () => {
  let callCount = 0;

  const client = subscribeEvents({
    token: null,
    onEvent() {},
    createEventSourceImpl: (() => {
      callCount++;
      return createFakeClient();
    }) as NonNullable<SubscribeEventsOptions["createEventSourceImpl"]>,
  });

  assert.equal(client, null);
  assert.equal(callCount, 0);
});

test("subscribeEvents configures headers and forwards named events", () => {
  const seen: unknown[] = [];
  let options: EventSourceOptions | undefined;
  const fakeClient = createFakeClient();

  const client = subscribeEvents({
    token: "token-123",
    onEvent(event) {
      seen.push(event);
    },
    createEventSourceImpl(createOptions) {
      options = createOptions;
      createOptions.onMessage?.({ event: "nodeTasks", data: '{"hasTasks":true,"hasError":false}' } as never);
      createOptions.onMessage?.({ event: "messages", data: '{"unreadCount":"3"}' } as never);
      createOptions.onMessage?.({ event: "ping", data: "{}" } as never);
      return fakeClient;
    },
  });

  assert.equal(client, fakeClient);
  assert.equal(options?.url, "/api/events");
  assert.deepEqual(options?.headers, {
    Authorization: "token-123",
    Accept: "text/event-stream",
  });
  assert.deepEqual(seen, [
    {
      type: "nodeTasks",
      payload: {
        hasTasks: true,
        hasError: false,
      },
    },
    {
      type: "messages",
      payload: {
        unreadCount: 3,
      },
    },
    {
      type: "ping",
      payload: {},
    },
  ]);
});
