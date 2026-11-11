export type MessageMediaType = "email" | "webHook" | "script" | "dingTalk" | "qyWeixin" | "qyWeixinRobot" | "aliyunSms" | "telegram";

export type VariableRow = {
  name?: string;
  value?: string;
};

export type RestMessageMediaConfig = {
  email?: {
    smtp?: string;
    username?: string;
    password?: string;
    from?: string;
    fromName?: string;
    protocol?: string;
  };
  webHook?: {
    url?: string;
    method?: string;
    contentType?: string;
    headers?: VariableRow[];
    params?: VariableRow[];
    body?: string;
  };
  script?: {
    path?: string;
    scriptType?: string;
    scriptLang?: string;
    script?: string;
    cwd?: string;
    env?: VariableRow[];
  };
  dingTalk?: {
    webHookURL?: string;
  };
  qyWeixin?: {
    corporateId?: string;
    agentId?: string;
    appSecret?: string;
    textFormat?: string;
  };
  qyWeixinRobot?: {
    webHookURL?: string;
    textFormat?: string;
  };
  aliyunSms?: {
    sign?: string;
    templateCode?: string;
    variables?: VariableRow[];
    accessKeyId?: string;
    accessKeySecret?: string;
  };
  telegram?: {
    token?: string;
    proxyUrl?: string;
  };
};

export type MessageMediaDraftValues = Partial<Record<MessageMediaType, Record<string, unknown>>>;

export const recipientTabList = [
  { key: "/admins/recipients", tab: "接收人" },
  { key: "/admins/recipients/groups", tab: "接收人分组" },
  { key: "/admins/recipients/media", tab: "媒介" },
  { key: "/admins/recipients/logs", tab: "发送记录" },
  { key: "/admins/recipients/tasks", tab: "任务队列" },
] as const;

export const taskStatusOptions = [
  { label: "待发送", value: "0" },
  { label: "发送中", value: "1" },
  { label: "成功", value: "2" },
  { label: "失败", value: "3" },
] as const;

export const mediaTypeLabels: Record<MessageMediaType, string> = {
  email: "邮件",
  webHook: "WebHook",
  script: "脚本",
  dingTalk: "钉钉",
  qyWeixin: "企微应用",
  qyWeixinRobot: "企微机器人",
  aliyunSms: "阿里云短信",
  telegram: "Telegram",
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanVariableRows(rows: unknown): VariableRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => ({
      name: cleanText((row as VariableRow | undefined)?.name),
      value: cleanText((row as VariableRow | undefined)?.value),
    }))
    .filter((row) => row.name);
}

export function buildMessageMediaConfigPayload(mediaType: MessageMediaType, drafts: MessageMediaDraftValues): RestMessageMediaConfig {
  switch (mediaType) {
    case "email": {
      const email = (drafts.email ?? {}) as RestMessageMediaConfig["email"];
      return {
        email: {
          smtp: cleanText(email?.smtp),
          username: cleanText(email?.username),
          password: cleanText(email?.password),
          from: cleanText(email?.from),
          fromName: cleanText(email?.fromName),
          protocol: cleanText(email?.protocol),
        },
      };
    }
    case "webHook": {
      const webHook = (drafts.webHook ?? {}) as RestMessageMediaConfig["webHook"];
      return {
        webHook: {
          url: cleanText(webHook?.url),
          method: cleanText(webHook?.method),
          contentType: cleanText(webHook?.contentType),
          headers: cleanVariableRows(webHook?.headers),
          params: cleanVariableRows(webHook?.params),
          body: typeof webHook?.body === "string" ? webHook.body : "",
        },
      };
    }
    case "script": {
      const script = (drafts.script ?? {}) as RestMessageMediaConfig["script"];
      return {
        script: {
          path: cleanText(script?.path),
          scriptType: cleanText(script?.scriptType),
          scriptLang: cleanText(script?.scriptLang),
          script: typeof script?.script === "string" ? script.script : "",
          cwd: cleanText(script?.cwd),
          env: cleanVariableRows(script?.env),
        },
      };
    }
    case "dingTalk": {
      const dingTalk = (drafts.dingTalk ?? {}) as RestMessageMediaConfig["dingTalk"];
      return {
        dingTalk: {
          webHookURL: cleanText(dingTalk?.webHookURL),
        },
      };
    }
    case "qyWeixin": {
      const qyWeixin = (drafts.qyWeixin ?? {}) as RestMessageMediaConfig["qyWeixin"];
      return {
        qyWeixin: {
          corporateId: cleanText(qyWeixin?.corporateId),
          agentId: cleanText(qyWeixin?.agentId),
          appSecret: cleanText(qyWeixin?.appSecret),
          textFormat: cleanText(qyWeixin?.textFormat),
        },
      };
    }
    case "qyWeixinRobot": {
      const qyWeixinRobot = (drafts.qyWeixinRobot ?? {}) as RestMessageMediaConfig["qyWeixinRobot"];
      return {
        qyWeixinRobot: {
          webHookURL: cleanText(qyWeixinRobot?.webHookURL),
          textFormat: cleanText(qyWeixinRobot?.textFormat),
        },
      };
    }
    case "aliyunSms": {
      const aliyunSms = (drafts.aliyunSms ?? {}) as RestMessageMediaConfig["aliyunSms"];
      return {
        aliyunSms: {
          sign: cleanText(aliyunSms?.sign),
          templateCode: cleanText(aliyunSms?.templateCode),
          variables: cleanVariableRows(aliyunSms?.variables),
          accessKeyId: cleanText(aliyunSms?.accessKeyId),
          accessKeySecret: cleanText(aliyunSms?.accessKeySecret),
        },
      };
    }
    case "telegram": {
      const telegram = (drafts.telegram ?? {}) as RestMessageMediaConfig["telegram"];
      return {
        telegram: {
          token: cleanText(telegram?.token),
          proxyUrl: cleanText(telegram?.proxyUrl),
        },
      };
    }
    default:
      return {};
  }
}

export function buildMessageMediaDraftValues(mediaType: MessageMediaType, config?: RestMessageMediaConfig | null): MessageMediaDraftValues {
  if (!config) {
    return {};
  }

  const branch = config[mediaType];
  if (!branch || typeof branch !== "object") {
    return {};
  }

  return {
    [mediaType]: branch as Record<string, unknown>,
  };
}

export function buildMessageRatePayload(values: { rateMinutes?: unknown; rateCount?: unknown }): { minutes: number; count: number } | undefined {
  const minutes = Number(values.rateMinutes);
  const count = Number(values.rateCount);

  if (!Number.isFinite(minutes) || !Number.isFinite(count) || minutes <= 0 || count <= 0) {
    return undefined;
  }

  return {
    minutes,
    count,
  };
}
