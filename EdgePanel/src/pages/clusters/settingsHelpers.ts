import type { SettingsTabItem } from "./settingsTabItems";

export type ClusterMessageSelection = {
  type: "recipient" | "group" | string;
  id: string | number;
};

function encodeBase64(value: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(value);
  }

  return Buffer.from(value, "utf-8").toString("base64");
}

function decodeBase64(value: string): string {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(value);
  }

  return Buffer.from(value, "base64").toString("utf-8");
}

export function findSettingsTabByKey(items: SettingsTabItem[], key: string) {
  const item = items.find((candidate) => candidate.key === key);
  if (!item) {
    return undefined;
  }

  return {
    ...item,
    independent: item.independent === true,
  };
}

export function shouldForceRenderSettingsTab(item?: SettingsTabItem) {
  if (!item) {
    return true;
  }

  return item.independent !== true;
}

function isEmptyPlainObject(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  return Object.values(value).every((nestedValue) => nestedValue === undefined || isEmptyPlainObject(nestedValue));
}

export function normalizeEmptyRootObjectsForSubmit<T extends object>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, isEmptyPlainObject(value) ? null : value])) as T;
}

export function encodeThresholdValue(value: string): string {
  return encodeBase64(JSON.stringify(value));
}

export function decodeThresholdValue(valueJSON?: string | Uint8Array): string {
  if (!valueJSON) {
    return "";
  }

  try {
    const raw = typeof valueJSON === "string" ? decodeBase64(valueJSON) : new TextDecoder().decode(valueJSON);
    const decoded = JSON.parse(raw);
    return decoded == null ? "" : String(decoded);
  } catch {
    return "";
  }
}

export function buildClusterMessageReceiverPayload(clusterId: string, selections: ClusterMessageSelection[]) {
  const recipientOptions = selections.flatMap((selection) => {
    const id = Number(selection.id);
    if (!Number.isFinite(id) || id <= 0) {
      return [];
    }

    if (selection.type === "recipient") {
      return [{ messageRecipientId: id, messageRecipientGroupId: 0 }];
    }

    if (selection.type === "group") {
      return [{ messageRecipientId: 0, messageRecipientGroupId: id }];
    }

    return [];
  });

  return {
    role: "node",
    nodeClusterId: Number(clusterId),
    nodeId: 0,
    serverId: 0,
    paramsJSON: "",
    recipientOptions: {
      "*": {
        recipientOptions,
      },
    },
  };
}

export function encodeScheduleJSON<T>(value: T): string {
  return encodeBase64(JSON.stringify(value));
}

export function decodeScheduleJSON<T>(valueJSON?: string | Uint8Array): T | undefined {
  if (!valueJSON) {
    return undefined;
  }

  try {
    const raw = typeof valueJSON === "string" ? decodeBase64(valueJSON) : new TextDecoder().decode(valueJSON);
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function decodeScheduleDate(value?: string) {
  if (!value || value.length !== 8) {
    return "";
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function encodeScheduleDate(value?: string) {
  if (!value) {
    return "";
  }

  return value.split("-").join("");
}
