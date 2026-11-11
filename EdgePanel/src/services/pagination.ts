import type { UIConfig } from "../pb/service_sys_setting_pb";

export const DEFAULT_PAGE_SIZE_FALLBACK = 20;
export const MAX_DEFAULT_PAGE_SIZE = 100;

export function normalizeDefaultPageSize(value: unknown): number {
  const pageSize = Number(value);
  if (!Number.isFinite(pageSize) || pageSize <= 0 || pageSize > MAX_DEFAULT_PAGE_SIZE) {
    return DEFAULT_PAGE_SIZE_FALLBACK;
  }

  return Math.floor(pageSize);
}

export function getDefaultPageSize(uiConfig?: Pick<UIConfig, "defaultPageSize"> | null): number {
  return normalizeDefaultPageSize(uiConfig?.defaultPageSize);
}

export function getPageSize(searchParams: URLSearchParams, defaultPageSize = DEFAULT_PAGE_SIZE_FALLBACK): number {
  const sizeParam = searchParams.get("size");
  if (sizeParam) {
    const pageSize = Number(sizeParam);
    if (Number.isFinite(pageSize) && pageSize > 0) {
      return pageSize;
    }
  }

  return normalizeDefaultPageSize(defaultPageSize);
}

export function withDefaultPageSize(searchParams: URLSearchParams, defaultPageSize = DEFAULT_PAGE_SIZE_FALLBACK): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (!next.get("size")) {
    next.set("size", String(normalizeDefaultPageSize(defaultPageSize)));
  }

  return next;
}
