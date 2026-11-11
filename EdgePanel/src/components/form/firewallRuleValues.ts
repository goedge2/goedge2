import type { JsonObject } from "@bufbuild/protobuf";
import { arrayMove } from "@dnd-kit/sortable";
import type { HTTPFirewallAction, HTTPFirewallRuleGroup } from "../../pb/models/model_http_firewall_pb";

let nextGroupDraftId = -1;

export function buildFirewallRuleGroupDraft(values: HTTPFirewallRuleGroup): HTTPFirewallRuleGroup {
  return { ...values, id: values.id || String(nextGroupDraftId--) };
}

export function reorderFirewallGroups(groups: HTTPFirewallRuleGroup[], activeId: string, overId: string): HTTPFirewallRuleGroup[] {
  const groupIndex = groups.findIndex((group) => group.id === activeId);
  if (groupIndex !== -1) {
    const targetIndex = groups.findIndex((group) => group.id === overId);
    return targetIndex === -1 ? groups : arrayMove(groups, groupIndex, targetIndex);
  }

  const parentIndex = groups.findIndex((group) => group.sets?.some((set) => `${group.id}-${set.id}` === activeId));
  if (parentIndex === -1) return groups;

  const parent = groups[parentIndex];
  const activeIndex = parent.sets.findIndex((set) => `${parent.id}-${set.id}` === activeId);
  const targetIndex = parent.sets.findIndex((set) => `${parent.id}-${set.id}` === overId);
  if (targetIndex === -1) return groups;

  const reorderedGroups = [...groups];
  reorderedGroups[parentIndex] = { ...parent, sets: arrayMove(parent.sets, activeIndex, targetIndex) };
  return reorderedGroups;
}

export function parseFirewallRuleParam(param = "") {
  const match = /^\$\{([^}.]+)(?:\.(.*))?\}$/.exec(param);
  return { paramPrefix: match?.[1] ?? "", paramSuffix: match?.[2] ?? "" };
}

export function getFirewallActionDefaultOptions(code: string): JsonObject {
  switch (code) {
    case "page":
      return { status: 403, body: "" };
    case "block":
      return { blockScope: "global", timeout: 1800 };
    case "redirect":
      return { status: 307 };
    default:
      return {};
  }
}

export function getFirewallActionSummary({ code, options = {} }: HTTPFirewallAction): string {
  switch (code) {
    case "page":
      return options.status == null ? "" : `HTTP ${options.status}`;
    case "block": {
      const timeout = options.timeout;
      if (typeof timeout !== "number" || timeout <= 0) return "";
      const timeoutMax = options.timeoutMax;
      return `封禁 ${timeout}${typeof timeoutMax === "number" && timeoutMax > timeout ? `-${timeoutMax}` : ""} 秒`;
    }
    case "redirect":
      return [options.status, options.url].filter((value) => value != null && value !== "").join(" · ");
    case "tag":
      return Array.isArray(options.tags) ? options.tags.join(", ") : "";
    case "captcha":
    case "js_cookie":
    case "get_302":
    case "post_307":
      return [
        typeof options.life === "number" && options.life > 0 ? `有效期 ${options.life} 秒` : "",
        typeof options.maxFails === "number" && options.maxFails > 0 ? `最多失败 ${options.maxFails} 次` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    default:
      return "";
  }
}
