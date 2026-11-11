import type { UIConfig } from "../pb/service_sys_setting_pb";
import { UI_CONFIG_CACHE_KEY, readCachedJSON } from "./auth";

export const DEFAULT_APP_TITLE = "GoEdge2";
export const DEFAULT_FAVICON_HREF = "/static/goedge2.svg";

function hasFileId(fileId: string | null | undefined): boolean {
  return typeof fileId === "string" && fileId !== "" && fileId !== "0";
}

function getDocument(): Document | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document;
}

export function getUIConfigFaviconHref(uiConfig?: Pick<UIConfig, "faviconFileId"> | null): string {
  const faviconFileId = uiConfig?.faviconFileId;
  if (hasFileId(faviconFileId)) {
    return `/file/${faviconFileId}`;
  }

  return DEFAULT_FAVICON_HREF;
}

export function getUIConfigLogoHref(uiConfig?: Pick<UIConfig, "logoFileId"> | null): string {
  const logoFileId = uiConfig?.logoFileId;
  if (hasFileId(logoFileId)) {
    return `/file/${logoFileId}`;
  }

  return DEFAULT_FAVICON_HREF;
}

export function getUIConfigDocumentTitle(uiConfig?: Pick<UIConfig, "systemName" | "productName"> | null): string {
  return uiConfig?.systemName || uiConfig?.productName || DEFAULT_APP_TITLE;
}

export function applyDocumentBranding(uiConfig?: UIConfig | null): void {
  const currentDocument = getDocument();
  if (!currentDocument) {
    return;
  }

  let iconLink = currentDocument.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!iconLink) {
    iconLink = currentDocument.createElement("link");
    iconLink.rel = "icon";
    currentDocument.head.appendChild(iconLink);
  }

  iconLink.href = getUIConfigFaviconHref(uiConfig);
  currentDocument.title = getUIConfigDocumentTitle(uiConfig);
}

export function applyCachedDocumentBranding(): void {
  if (typeof window === "undefined") {
    return;
  }

  applyDocumentBranding(readCachedJSON<UIConfig>(window.localStorage, UI_CONFIG_CACHE_KEY));
}
