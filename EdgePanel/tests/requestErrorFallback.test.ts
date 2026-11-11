import assert from "node:assert/strict";
import test from "node:test";

import {
  createRequestErrorFallback,
  createRequestErrorHandler,
  createUnauthorizedHandler,
  getRequestErrorStatus,
} from "../src/runtime/requestErrorFallback.ts";

class FakeUnhandledRejectionTarget {
  private listener?: (event: { reason: unknown }) => void;

  addEventListener(type: "unhandledrejection", listener: (event: { reason: unknown }) => void): void {
    assert.equal(type, "unhandledrejection");
    this.listener = listener;
  }

  dispatch(reason: unknown): void {
    this.listener?.({ reason });
  }
}

test("request fallback ignores handled and unrelated rejections", () => {
  const target = new FakeUnhandledRejectionTarget();
  const error = { response: { status: 400 } };
  let handled = 0;
  const fallback = createRequestErrorFallback(() => {
    handled += 1;
  });

  fallback.install(target);
  fallback.register(error);
  assert.equal(handled, 0);
  target.dispatch({ response: { status: 500 } });
  assert.equal(handled, 0);
  target.dispatch(error);
  target.dispatch(error);
  assert.equal(handled, 1);
});

test("skipErrorHandler suppresses the ordinary fallback", () => {
  const target = new FakeUnhandledRejectionTarget();
  const error = { response: { status: 409 } };
  let handled = 0;
  const fallback = createRequestErrorFallback(() => {
    handled += 1;
  });

  fallback.install(target);
  fallback.register(error, { skipErrorHandler: true });
  target.dispatch(error);
  assert.equal(handled, 0);
});

test("401 is handled immediately even when the caller skips the ordinary handler", () => {
  const events: string[] = [];
  const requestHandler = createRequestErrorHandler({
    onUnauthorized: () => events.push("unauthorized"),
    register: () => events.push("registered"),
  });

  requestHandler({ response: { status: 401 } }, { skipErrorHandler: true });
  assert.deepEqual(events, ["unauthorized", "registered"]);
  assert.equal(getRequestErrorStatus({ response: { status: 403 } }), 403);
});

test("403 stays an ordinary error and does not trigger unauthorized handling", () => {
  const events: string[] = [];
  const requestHandler = createRequestErrorHandler({
    onUnauthorized: () => events.push("unauthorized"),
    register: () => events.push("registered"),
  });

  requestHandler({ response: { status: 403 } });
  assert.deepEqual(events, ["registered"]);
});

test("unauthorized handling clears the token and redirects once for concurrent failures", () => {
  let token: string | null = "token";
  let cleared = 0;
  let branded = 0;
  let redirects = 0;
  const handleUnauthorized = createUnauthorizedHandler({
    getAccessToken: () => token,
    getPathname: () => "/dashboard",
    clearAccessToken: () => {
      token = null;
      cleared += 1;
    },
    applyBranding: () => {
      branded += 1;
    },
    redirectToLogin: () => {
      redirects += 1;
    },
  });

  handleUnauthorized();
  handleUnauthorized();
  assert.equal(cleared, 1);
  assert.equal(branded, 1);
  assert.equal(redirects, 1);
});

test("unauthorized handling still clears a token while already on login", () => {
  let cleared = 0;
  let redirects = 0;
  const handleUnauthorized = createUnauthorizedHandler({
    getAccessToken: () => "token",
    getPathname: () => "/login",
    clearAccessToken: () => {
      cleared += 1;
    },
    applyBranding: () => undefined,
    redirectToLogin: () => {
      redirects += 1;
    },
  });

  handleUnauthorized();
  assert.equal(cleared, 1);
  assert.equal(redirects, 0);
});
