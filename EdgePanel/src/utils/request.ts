import { request } from "@umijs/max";
import { useCallback, useEffect, useRef, useState } from "react";

function extractErrorText(value: unknown, visited = new Set<object>()): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Error) {
    const trimmed = value.message.trim();
    return trimmed !== "" ? trimmed : null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (visited.has(value)) {
    return null;
  }
  visited.add(value);

  const record = value as Record<string, unknown>;
  return extractErrorText(record.message, visited) ?? extractErrorText(record.error, visited);
}

export function getErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (typeof error === "object" && error !== null) {
    const requestError = error as {
      response?: { data?: unknown; statusText?: string };
      data?: unknown;
      info?: unknown;
      message?: string;
    };

    const detail =
      extractErrorText(requestError.response?.data) ??
      extractErrorText(requestError.data) ??
      extractErrorText(requestError.info) ??
      extractErrorText(requestError.message);
    if (detail) {
      return detail;
    }
  }

  return extractErrorText(error) ?? fallback;
}

export function formatErrorMessage(prefix: string, error: unknown): string {
  const detail = getErrorMessage(error, "");
  return detail ? `${prefix}: ${detail}` : prefix;
}

export function useFetchData<T>(
  url: string,
  method: string = "get",
  paramsOrData: unknown = "",
): {
  data: T | undefined;
  loading: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const paramsOrDataJSON = JSON.stringify(paramsOrData);
  const paramsOrDataRef = useRef(paramsOrData);
  paramsOrDataRef.current = paramsOrData;

  // Keep value-based request invalidation without refetching on object identity changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The serialized parameter key intentionally controls this callback's identity.
  const fetchData = useCallback(async () => {
    const currentParamsOrData = paramsOrDataRef.current;
    setLoading(true);
    try {
      const response = await request<T>(url, {
        method: method.toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
        ...(method === "get" && currentParamsOrData ? { params: currentParamsOrData } : { data: currentParamsOrData }),
      });

      setData(response);
    } finally {
      setLoading(false);
    }
  }, [method, paramsOrDataJSON, url]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData, setData, setLoading };
}
