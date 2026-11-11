export type RequestErrorOptions = {
  skipErrorHandler?: boolean;
};

type UnhandledRejectionEventLike = {
  reason: unknown;
};

export type RequestErrorFallbackTarget = {
  addEventListener: (type: "unhandledrejection", listener: (event: UnhandledRejectionEventLike) => void) => void;
};

export type RequestErrorHandler = (error: unknown) => void;

export type RequestErrorRegistrar = (error: unknown, options?: RequestErrorOptions) => void;

export type UnauthorizedHandlerDependencies = {
  getAccessToken: () => string | null;
  getPathname: () => string;
  clearAccessToken: () => void;
  applyBranding: () => void;
  redirectToLogin: () => void;
};

type RequestErrorRecord = {
  skipErrorHandler: boolean;
  handled: boolean;
};

export type RequestErrorFallback = {
  register: RequestErrorRegistrar;
  install: (target: RequestErrorFallbackTarget) => void;
  setHandler: (handler: RequestErrorHandler) => void;
};

const runtimeStateProperty = "__edgePanelRequestErrorFallback";

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

export function getRequestErrorStatus(error: unknown): number | undefined {
  if (!isObject(error)) {
    return undefined;
  }

  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === "number" ? status : undefined;
}

export function createRequestErrorFallback(handler: RequestErrorHandler): RequestErrorFallback {
  const records = new WeakMap<object, RequestErrorRecord>();
  let installedTarget: RequestErrorFallbackTarget | undefined;
  let currentHandler = handler;

  const onUnhandledRejection = (event: UnhandledRejectionEventLike): void => {
    if (!isObject(event.reason)) {
      return;
    }

    const record = records.get(event.reason);
    if (!record || record.skipErrorHandler || record.handled) {
      return;
    }

    record.handled = true;
    currentHandler(event.reason);
  };

  return {
    register: (error, options) => {
      if (!isObject(error)) {
        return;
      }

      records.set(error, {
        skipErrorHandler: Boolean(options?.skipErrorHandler),
        handled: false,
      });
    },
    install: (target) => {
      if (installedTarget === target) {
        return;
      }

      target.addEventListener("unhandledrejection", onUnhandledRejection);
      installedTarget = target;
    },
    setHandler: (nextHandler) => {
      currentHandler = nextHandler;
    },
  };
}

const moduleFallback = createRequestErrorFallback(() => undefined);

function getRuntimeFallback(): RequestErrorFallback {
  if (typeof window === "undefined") {
    return moduleFallback;
  }

  const runtimeWindow = window as Window & { [runtimeStateProperty]?: RequestErrorFallback };
  runtimeWindow[runtimeStateProperty] ??= moduleFallback;
  return runtimeWindow[runtimeStateProperty];
}

export function installRequestErrorFallback(handler: RequestErrorHandler): void {
  const fallback = getRuntimeFallback();
  fallback.setHandler(handler);

  if (typeof window !== "undefined") {
    fallback.install(window as unknown as RequestErrorFallbackTarget);
  }
}

export function registerRequestError(error: unknown, options?: RequestErrorOptions): void {
  getRuntimeFallback().register(error, options);
}

export function createRequestErrorHandler({ onUnauthorized, register }: { onUnauthorized: () => void; register: RequestErrorRegistrar }) {
  return (error: unknown, options?: RequestErrorOptions): void => {
    if (getRequestErrorStatus(error) === 401) {
      onUnauthorized();
    }

    register(error, options);
  };
}

export function createUnauthorizedHandler({
  getAccessToken,
  getPathname,
  clearAccessToken,
  applyBranding,
  redirectToLogin,
}: UnauthorizedHandlerDependencies): () => void {
  let redirectingToLogin = false;

  return () => {
    const pathname = getPathname();
    if (pathname === "/login") {
      clearAccessToken();
      return;
    }

    if (redirectingToLogin && !getAccessToken()) {
      return;
    }

    clearAccessToken();
    redirectingToLogin = true;
    applyBranding();
    redirectToLogin();
  };
}
