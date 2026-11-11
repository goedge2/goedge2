import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  clearAccessToken,
  getAccessToken,
  getAuthorizationHeaders,
  readCachedJSON,
  storeAccessToken,
  writeCachedJSON,
} from "../src/runtime/auth.ts";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function createStorage(initial: Record<string, string> = {}): StorageLike {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("getAccessToken reads the configured storage key and ignores blank values", () => {
  assert.equal(getAccessToken(createStorage()), null);
  assert.equal(getAccessToken(createStorage({ [ACCESS_TOKEN_STORAGE_KEY]: "" })), null);
  assert.equal(getAccessToken(createStorage({ [ACCESS_TOKEN_STORAGE_KEY]: "token-123" })), "token-123");
});

test("getAccessToken falls back to session storage when no persistent token exists", () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createStorage(),
      sessionStorage: createStorage({ [ACCESS_TOKEN_STORAGE_KEY]: "session-token" }),
    },
  });

  assert.equal(getAccessToken(), "session-token");

  if (previousWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});

test("storeAccessToken selects one storage and clearAccessToken removes both", () => {
  const persistentStorage = createStorage({ [ACCESS_TOKEN_STORAGE_KEY]: "old-persistent" });
  const sessionStorage = createStorage({ [ACCESS_TOKEN_STORAGE_KEY]: "old-session" });

  storeAccessToken("session-token", false, persistentStorage, sessionStorage);
  assert.equal(persistentStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), null);
  assert.equal(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), "session-token");

  storeAccessToken("persistent-token", true, persistentStorage, sessionStorage);
  assert.equal(persistentStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), "persistent-token");
  assert.equal(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), null);

  clearAccessToken(persistentStorage, sessionStorage);
  assert.equal(persistentStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), null);
  assert.equal(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY), null);
});

test("getAuthorizationHeaders only sets Authorization when a token exists", () => {
  assert.deepEqual(getAuthorizationHeaders(null), {});
  assert.deepEqual(getAuthorizationHeaders(undefined), {});
  assert.deepEqual(getAuthorizationHeaders("token-123"), { Authorization: "token-123" });
});

test("readCachedJSON returns parsed values and shields callers from invalid JSON", () => {
  assert.equal(readCachedJSON(createStorage(), "ui-config"), undefined);
  assert.deepEqual(readCachedJSON(createStorage({ "ui-config": '{"name":"GoEdge2"}' }), "ui-config"), { name: "GoEdge2" });
  assert.equal(readCachedJSON(createStorage({ "ui-config": "{" }), "ui-config"), undefined);
});

test("writeCachedJSON serializes objects for later reads", () => {
  const storage = createStorage();

  writeCachedJSON(storage, "ui-config", { name: "GoEdge2", count: 2 });

  assert.equal(storage.getItem("ui-config"), '{"name":"GoEdge2","count":2}');
  assert.deepEqual(readCachedJSON(storage, "ui-config"), { name: "GoEdge2", count: 2 });
});
