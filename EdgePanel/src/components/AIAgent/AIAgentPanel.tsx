import {
  AssistantRuntimeProvider,
  AuiIf,
  AuiConfig,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  Tools,
  ThreadPrimitive,
  type ChatModelAdapter,
  type ToolCallMessagePartProps,
  type ThreadMessage,
  type ThreadMessageLike,
  defineToolkit,
  groupPartByType,
  useInlineRender,
  useAuiState,
  useLocalRuntime,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import "@assistant-ui/react-markdown/styles/dot.css";
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  LinkOutlined,
  MenuOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Drawer, Dropdown, Empty, Input, Modal, Popconfirm, Space, Spin, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import {
  applyActionEvent,
  attachAIAgentActionsToMessages,
  formatAIAgentActionArguments,
  decodeStoredMessages,
  collectActionResourceLinks,
  shouldReloadConversationAfterRun,
  getAIAgentConfirmationParentID,
  type AIAgentAction,
  type AIAgentStreamEvent,
} from "./model";
import {
  aiAgentQueryKeys,
  cancelAIAgentAction,
  clearAIAgentSession,
  confirmAIAgentAction,
  createAIAgentSession,
  deleteAIAgentSession,
  listAIAgentSessions,
  readAIAgentConfig,
  readAIAgentConversation,
  renameAIAgentSession,
  createTelegramBinding,
  deleteTelegramBinding,
  readTelegramBinding,
  streamAIAgentChat,
  type AIAgentSession,
} from "@/services/aiAgent";
import { formatErrorMessage } from "@/utils";

type AIAgentPanelProps = {
  onClose: () => void;
};

type AIAgentThreadProps = {
  sessionId: string;
  initialMessages: ThreadMessageLike[];
  actions: AIAgentAction[];
  busyActionId: string;
  onActionEvent: (event: AIAgentStreamEvent) => void;
  onRunningChange: (running: boolean) => void;
  onRunComplete: (hasPendingAction: boolean) => Promise<void>;
  onBusyActionChange: (actionId: string) => void;
  onCancelAction: (action: AIAgentAction) => void;
};

const toolLabels: Record<string, string> = {
  request_automatic_certificate: "申请自动证书",
  create_server: "创建网站",
  update_site_config: "更新网站配置",
  purge_site_cache: "清理网站缓存",
  create_node_grant: "创建节点凭证",
  create_node: "创建节点",
  install_node: "安装节点",
};

function getLastUserText(messages: readonly ThreadMessage[]): string {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message || message.role !== "user") {
    return "";
  }
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

const groupedMessageParts = groupPartByType({
  reasoning: ["group-reasoning"],
  "standalone-tool-call": [],
});

function AIAgentMessageText() {
  return <MarkdownTextPrimitive className="edge-ai-message-text edge-ai-markdown" remarkPlugins={[remarkGfm, remarkBreaks]} defer />;
}

function UserMessageText() {
  return <MessagePartPrimitive.Text component="div" className="edge-ai-message-text" />;
}

function ThinkingIndicator() {
  return (
    <div className="edge-ai-thinking" role="status" aria-label="AI 正在思考">
      <Spin size="small" />
      <span>正在思考</span>
      <span className="edge-ai-thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function AIAgentReasoningSection({ children, running }: { children: React.ReactNode; running: boolean }) {
  return (
    <details className={`edge-ai-reasoning${running ? " edge-ai-reasoning-running" : ""}`} open={running}>
      <summary>{running ? "正在分析" : "推理摘要"}</summary>
      <div className="edge-ai-reasoning-content">{children}</div>
    </details>
  );
}

function AIAgentReasoningText() {
  const text = useAuiState((state) => (state.part.type === "reasoning" ? state.part.text : ""));
  return <div className="edge-ai-reasoning-text">{text}</div>;
}

function AIAgentThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  return (
    <MessagePrimitive.Root className={`edge-ai-message edge-ai-message-${role}`}>
      <div className="edge-ai-message-content">
        {role === "assistant" ? (
          <MessagePrimitive.GroupedParts groupBy={groupedMessageParts} indicator="empty">
            {({ part, children }) => {
              switch (part.type) {
                case "group-reasoning":
                  return <AIAgentReasoningSection running={part.status.type === "running"}>{children}</AIAgentReasoningSection>;
                case "reasoning":
                  return <AIAgentReasoningText />;
                case "text":
                  return (
                    <div className="edge-ai-message-bubble">
                      <AIAgentMessageText />
                    </div>
                  );
                case "tool-call":
                  return part.toolUI ?? null;
                case "indicator":
                  return <ThinkingIndicator />;
                default:
                  return null;
              }
            }}
          </MessagePrimitive.GroupedParts>
        ) : (
          <div className="edge-ai-message-bubble">
            <MessagePrimitive.Parts components={{ Text: UserMessageText }} />
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  );
}

function AIAgentThread({
  sessionId,
  initialMessages,
  actions,
  busyActionId,
  onActionEvent,
  onRunningChange,
  onRunComplete,
  onBusyActionChange,
  onCancelAction,
}: AIAgentThreadProps) {
  const confirmationActionRef = useRef<AIAgentAction | null>(null);
  const chatModel = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const confirmationAction = confirmationActionRef.current;
        confirmationActionRef.current = null;
        const userText = getLastUserText(messages);
        let responseText = "";
        let reasoningText = "";
        let emittedActionPlaceholder = false;
        const events: AIAgentStreamEvent[] = [];
        onRunningChange(true);
        try {
          const stream = confirmationAction
            ? confirmAIAgentAction(sessionId, confirmationAction.id, abortSignal)
            : streamAIAgentChat(sessionId, userText, abortSignal);
          for await (const event of stream) {
            events.push(event);
            if (event.type.startsWith("action")) {
              onActionEvent(event);
            }
            if (event.type === "textDelta" && event.text) {
              responseText += event.text;
              yield {
                content: [
                  ...(reasoningText ? [{ type: "reasoning" as const, text: reasoningText }] : []),
                  { type: "text" as const, text: responseText },
                ],
              };
            }
            if (event.type === "reasoningDelta" && event.text) {
              reasoningText += event.text;
              yield {
                content: [
                  { type: "reasoning" as const, text: reasoningText },
                  ...(responseText ? [{ type: "text" as const, text: responseText }] : []),
                ],
              };
            }
            if (event.type === "actionPending") {
              emittedActionPlaceholder = true;
              yield {
                content: [
                  ...(reasoningText ? [{ type: "reasoning" as const, text: reasoningText }] : []),
                  { type: "text" as const, text: responseText || "请确认以下操作后继续。" },
                  {
                    type: "tool-call" as const,
                    toolCallId: event.actionId ?? event.messageId ?? "pending-action",
                    toolName: event.toolName ?? "action",
                    args: (event.argumentsJSON ?? {}) as never,
                    argsText: JSON.stringify(event.argumentsJSON ?? {}),
                  },
                ],
                status: { type: "requires-action" as const, reason: "tool-calls" as const },
              };
            }
          }
          if (responseText.length === 0 && !emittedActionPlaceholder) {
            yield { content: [{ type: "text", text: "操作已处理。" }] };
          }
        } catch (error) {
          yield { content: [{ type: "text", text: formatErrorMessage("AI Agent 请求失败", error) }] };
        } finally {
          await onRunComplete(shouldReloadConversationAfterRun(events, Boolean(confirmationAction)));
          if (confirmationAction) {
            onBusyActionChange("");
          }
          onRunningChange(false);
        }
      },
    }),
    [onActionEvent, onBusyActionChange, onRunComplete, onRunningChange, sessionId],
  );
  const runtime = useLocalRuntime(chatModel, { initialMessages });
  const handleConfirmAction = useCallback(
    (action: AIAgentAction) => {
      if (confirmationActionRef.current || busyActionId) {
        return;
      }
      confirmationActionRef.current = action;
      onBusyActionChange(action.id);
      onRunningChange(true);
      const messages = runtime.thread.getState().messages;
      runtime.thread.startRun({ parentId: getAIAgentConfirmationParentID(action.messageId, messages[messages.length - 1]?.id) });
    },
    [busyActionId, onBusyActionChange, onRunningChange, runtime],
  );
  const toolkit = useAIAgentToolkit({ actions, busyActionId, onConfirmAction: handleConfirmAction, onCancelAction });
  const runtimeConfig = useMemo(() => AuiConfig({ tools: Tools({ toolkit }) }), [toolkit]);
  return (
    <AssistantRuntimeProvider runtime={runtime} config={runtimeConfig}>
      <ThreadPrimitive.Root className="edge-ai-thread">
        <ThreadPrimitive.Viewport className="edge-ai-thread-viewport" autoScroll turnAnchor="top">
          <AuiIf condition={(state) => state.thread.isEmpty}>
            <div className="edge-ai-empty">
              <div className="edge-ai-empty-icon">
                <RobotOutlined />
              </div>
              <Typography.Title level={5}>从一句话开始</Typography.Title>
              <Typography.Text type="secondary">例如：为 example.com 申请证书，或在默认集群创建一个网站。</Typography.Text>
            </div>
          </AuiIf>
          <ThreadPrimitive.Messages>{() => <AIAgentThreadMessage />}</ThreadPrimitive.Messages>
          <ThreadPrimitive.ViewportFooter className="edge-ai-thread-footer">
            <ComposerPrimitive.Root className="edge-ai-composer" compact>
              <ComposerPrimitive.Input
                cancelOnEscape
                className="edge-ai-composer-input"
                placeholder="描述你想创建的网站或证书…"
                rows={1}
                submitMode="enter"
              />
              <AuiIf condition={(state) => !state.thread.isRunning}>
                <ComposerPrimitive.Send render={<Button type="primary" shape="circle" icon={<SendOutlined />} aria-label="发送消息" />} />
              </AuiIf>
              <AuiIf condition={(state) => state.thread.isRunning}>
                <ComposerPrimitive.Cancel render={<Button danger shape="circle" icon={<StopOutlined />} aria-label="停止生成" />} />
              </AuiIf>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function ResourceLinks({ result }: { result?: Record<string, unknown> }) {
  if (!result) {
    return null;
  }
  const links = collectActionResourceLinks(result);
  if (links.length === 0) {
    return null;
  }
  return (
    <Space wrap size={4}>
      {links.map((link) =>
        link.type === "server" ? (
          <Button key={`server-${link.id}`} type="link" size="small" icon={<LinkOutlined />} href={`#/servers/${link.id}/dashboard`}>
            查看网站 #{link.id}
          </Button>
        ) : (
          <Button key={`certificate-${link.id}`} type="link" size="small" icon={<LinkOutlined />} href="#/servers/certs">
            查看证书 #{link.id}
          </Button>
        ),
      )}
    </Space>
  );
}

type AIAgentToolUIProps = ToolCallMessagePartProps & {
  action?: AIAgentAction;
  busy: boolean;
  onConfirmAction: (action: AIAgentAction) => void;
  onCancelAction: (action: AIAgentAction) => void;
};

function AIAgentToolUI({ action, args, isError, result, status, toolCallId, toolName, busy, onConfirmAction, onCancelAction }: AIAgentToolUIProps) {
  const actionStatus =
    action?.status ??
    (status.type === "requires-action" ? "pending" : status.type === "running" ? "running" : isError ? "failed" : result ? "succeeded" : "running");
  const statusDisplay = {
    pending: { color: "warning", text: "等待确认" },
    running: { color: "processing", text: "执行中" },
    succeeded: { color: "success", text: "已完成" },
    failed: { color: "error", text: "执行失败" },
    cancelled: { color: "default", text: "已取消" },
  }[actionStatus] ?? { color: "default", text: actionStatus };
  const error = action?.error ?? (typeof result === "object" && result && "error" in result && typeof result.error === "string" ? result.error : "");
  const displayArguments = useMemo(() => formatAIAgentActionArguments(toolName, args as Record<string, unknown>), [args, toolName]);
  const renderedAction: AIAgentAction = action ?? {
    id: toolCallId,
    messageId: "",
    toolName,
    argumentsJSON: args as Record<string, unknown>,
    status: actionStatus,
  };
  return (
    <section className={`edge-ai-tool edge-ai-tool-${actionStatus}`} aria-label={`${toolLabels[toolName] ?? toolName}：${statusDisplay.text}`}>
      <div className="edge-ai-tool-heading">
        <Typography.Text strong>{toolLabels[toolName] ?? toolName}</Typography.Text>
        <Tag color={statusDisplay.color}>{statusDisplay.text}</Tag>
      </div>
      <pre className="edge-ai-tool-arguments">{JSON.stringify(displayArguments, null, 2)}</pre>
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
      <ResourceLinks result={result && typeof result === "object" ? (result as Record<string, unknown>) : undefined} />
      {busy && actionStatus !== "pending" ? (
        <div className="edge-ai-tool-replying" role="status">
          <Spin size="small" />
          <span>正在回复</span>
        </div>
      ) : null}
      {actionStatus === "pending" ? (
        <Space className="edge-ai-tool-actions">
          <Button type="primary" size="small" onClick={() => onConfirmAction(renderedAction)} loading={busy}>
            批准
          </Button>
          <Button size="small" onClick={() => onCancelAction(renderedAction)} disabled={busy}>
            拒绝
          </Button>
        </Space>
      ) : null}
    </section>
  );
}

function useAIAgentToolkit({
  actions,
  busyActionId,
  onConfirmAction,
  onCancelAction,
}: Pick<AIAgentThreadProps, "actions" | "busyActionId" | "onCancelAction"> & { onConfirmAction: (action: AIAgentAction) => void }) {
  const render = useInlineRender((props) => {
    const action = actions.find((item) => item.id === props.toolCallId);
    return (
      <AIAgentToolUI
        {...props}
        action={action}
        busy={busyActionId === props.toolCallId}
        onConfirmAction={onConfirmAction}
        onCancelAction={onCancelAction}
      />
    );
  });
  return useMemo(
    () =>
      defineToolkit({
        request_automatic_certificate: { type: "backend", display: "standalone", render },
        create_server: { type: "backend", display: "standalone", render },
        update_site_config: { type: "backend", display: "standalone", render },
        purge_site_cache: { type: "backend", display: "standalone", render },
        create_node_grant: { type: "backend", display: "standalone", render },
        create_node: { type: "backend", display: "standalone", render },
        install_node: { type: "backend", display: "standalone", render },
      }),
    [render],
  );
}

export default function AIAgentPanel({ onClose }: AIAgentPanelProps) {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [actions, setActions] = useState<AIAgentAction[]>([]);
  const [running, setRunning] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [telegramBindingOpen, setTelegramBindingOpen] = useState(false);
  const [telegramBindingLink, setTelegramBindingLink] = useState("");
  const [telegramBindingBusy, setTelegramBindingBusy] = useState(false);
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const configQuery = useQuery({ queryKey: aiAgentQueryKeys.config, queryFn: readAIAgentConfig });
  const sessionsQuery = useQuery({ queryKey: aiAgentQueryKeys.sessions, queryFn: listAIAgentSessions });
  const conversationQuery = useQuery({
    queryKey: aiAgentQueryKeys.conversation(selectedSessionId),
    queryFn: () => readAIAgentConversation(selectedSessionId),
    enabled: Boolean(selectedSessionId),
  });
  const telegramBindingQuery = useQuery({
    queryKey: aiAgentQueryKeys.telegramBinding,
    queryFn: readTelegramBinding,
    enabled:
      telegramBindingOpen && Boolean(configQuery.data?.telegramEnabled && configQuery.data.hasTelegramToken && configQuery.data.telegramBotUsername),
  });

  const selectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setRevision((value) => value + 1);
    setSessionsOpen(false);
  }, []);

  useEffect(() => {
    const sessions = sessionsQuery.data;
    if (!sessions) {
      return;
    }
    if (sessions.length === 0) {
      void createAIAgentSession()
        .then(async (session) => {
          await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.sessions });
          selectSession(session.id);
        })
        .catch((error) => message.error(formatErrorMessage("创建会话失败", error)));
      return;
    }
    if (!selectedSessionId || !sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [message, queryClient, selectSession, selectedSessionId, sessionsQuery.data]);

  useEffect(() => {
    setActions(conversationQuery.data?.actions ?? []);
  }, [conversationQuery.data?.actions]);

  const currentSession = sessionsQuery.data?.find((session) => session.id === selectedSessionId);
  const telegramReady = Boolean(configQuery.data?.telegramEnabled && configQuery.data.hasTelegramToken && configQuery.data.telegramBotUsername);
  const initialMessages = useMemo(
    () => attachAIAgentActionsToMessages(decodeStoredMessages(conversationQuery.data?.messages ?? []), conversationQuery.data?.actions ?? []),
    [conversationQuery.data?.actions, conversationQuery.data?.messages],
  );

  const handleNewSession = async () => {
    try {
      const session = await createAIAgentSession();
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.sessions });
      selectSession(session.id);
    } catch (error) {
      message.error(formatErrorMessage("创建会话失败", error));
    }
  };

  const handleRename = (session: AIAgentSession) => {
    let title = session.title;
    modal.confirm({
      title: "重命名对话",
      content: <Input defaultValue={session.title} maxLength={255} autoFocus onChange={(event) => (title = event.target.value)} />,
      okText: "保存",
      cancelText: "取消",
      onOk: async () => {
        if (!title.trim()) {
          throw new Error("对话名称不能为空");
        }
        await renameAIAgentSession(session.id, title.trim());
        await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.sessions });
      },
    });
  };

  const handleDelete = async (session: AIAgentSession) => {
    try {
      await deleteAIAgentSession(session.id);
      if (session.id === selectedSessionId) {
        setSelectedSessionId("");
      }
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.sessions });
    } catch (error) {
      message.error(formatErrorMessage("删除对话失败", error));
    }
  };

  const handleClear = async () => {
    if (!selectedSessionId) {
      return;
    }
    try {
      await clearAIAgentSession(selectedSessionId);
      setActions([]);
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.conversation(selectedSessionId) });
      setRevision((value) => value + 1);
      message.success("当前对话已清空");
    } catch (error) {
      message.error(formatErrorMessage("清空对话失败", error));
    }
  };

  const handleCreateTelegramBinding = async () => {
    if (!selectedSessionId) return;
    setTelegramBindingBusy(true);
    try {
      const result = await createTelegramBinding(selectedSessionId);
      setTelegramBindingLink(result.bindURL);
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.telegramBinding });
      message.success("绑定链接已生成，请在 10 分钟内打开");
    } catch (error) {
      message.error(formatErrorMessage("生成 Telegram 绑定链接失败", error));
    } finally {
      setTelegramBindingBusy(false);
    }
  };

  const handleDeleteTelegramBinding = async () => {
    setTelegramBindingBusy(true);
    try {
      await deleteTelegramBinding();
      setTelegramBindingLink("");
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.telegramBinding });
      message.success("Telegram 绑定已解除");
    } catch (error) {
      message.error(formatErrorMessage("解除 Telegram 绑定失败", error));
    } finally {
      setTelegramBindingBusy(false);
    }
  };

  const handleActionEvent = useCallback((event: AIAgentStreamEvent) => {
    setActions((current) => applyActionEvent(current, event));
  }, []);

  const refreshConversation = useCallback(
    async (hasPendingAction: boolean) => {
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.sessions });
      if (!hasPendingAction || !selectedSessionId) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.conversation(selectedSessionId) });
      setRevision((value) => value + 1);
    },
    [queryClient, selectedSessionId],
  );

  const handleCancelAction = async (action: AIAgentAction) => {
    if (!selectedSessionId) {
      return;
    }
    try {
      await cancelAIAgentAction(selectedSessionId, action.id);
      setActions((current) => current.map((item) => (item.id === action.id ? { ...item, status: "cancelled" } : item)));
    } catch (error) {
      message.error(formatErrorMessage("取消操作失败", error));
    }
  };

  return (
    <div className="edge-ai-panel">
      <header className="edge-ai-panel-header edge-ai-drag-handle">
        <Space size={10}>
          <button type="button" className="edge-ai-header-icon edge-ai-no-drag" onClick={() => setSessionsOpen(true)} aria-label="打开会话列表">
            <MenuOutlined />
          </button>
          <div>
            <Typography.Text strong className="edge-ai-panel-title">
              AI Agent
            </Typography.Text>
            <div className="edge-ai-panel-subtitle">{currentSession?.title || "准备新对话"}</div>
          </div>
        </Space>
        <Space size={2} className="edge-ai-no-drag">
          {telegramReady ? (
            <Tooltip title="绑定 Telegram BOT（需在系统设置中启用并配置有效 Token）">
              <Dropdown
                menu={{
                  items: [{ key: "telegram", label: "绑定 Telegram" }],
                  onClick: () => {
                    setTelegramBindingOpen(true);
                    setTelegramBindingLink("");
                  },
                }}
                trigger={["click"]}
              >
                <Button type="text" size="small" icon={<LinkOutlined />} aria-label="绑定 Telegram" />
              </Dropdown>
            </Tooltip>
          ) : null}
          <Tooltip title="新建对话">
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => void handleNewSession()} disabled={running} />
          </Tooltip>
          <Popconfirm
            title="清空当前对话？"
            description="消息和待确认操作将一并删除。"
            onConfirm={() => void handleClear()}
            disabled={!selectedSessionId || running}
          >
            <Tooltip title="清空当前对话">
              <Button type="text" size="small" icon={<DeleteOutlined />} disabled={!selectedSessionId || running} />
            </Tooltip>
          </Popconfirm>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="关闭 AI Agent" />
        </Space>
      </header>

      <main className="edge-ai-panel-body">
        {sessionsQuery.isPending || (selectedSessionId && conversationQuery.isPending) ? (
          <div className="edge-ai-loading">
            <Spin />
          </div>
        ) : selectedSessionId ? (
          <>
            <AIAgentThread
              key={`${selectedSessionId}:${revision}`}
              sessionId={selectedSessionId}
              initialMessages={initialMessages}
              actions={actions}
              busyActionId={busyActionId}
              onActionEvent={handleActionEvent}
              onRunningChange={setRunning}
              onRunComplete={refreshConversation}
              onBusyActionChange={setBusyActionId}
              onCancelAction={(action) => void handleCancelAction(action)}
            />
          </>
        ) : (
          <Empty description="暂时没有可用会话" />
        )}
      </main>

      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            对话记录
          </Space>
        }
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        getContainer={false}
        size="86%"
        rootStyle={{ position: "absolute" }}
        extra={<Button type="text" icon={<PlusOutlined />} onClick={() => void handleNewSession()} disabled={running} />}
      >
        <div className="edge-ai-session-list">
          {(sessionsQuery.data ?? []).map((session) => (
            <div key={session.id} className={`edge-ai-session-item${session.id === selectedSessionId ? " edge-ai-session-active" : ""}`}>
              <button type="button" className="edge-ai-session-copy" onClick={() => selectSession(session.id)}>
                <Typography.Text strong ellipsis>
                  {session.title}
                </Typography.Text>
                <Typography.Text type="secondary" ellipsis className="edge-ai-session-description">
                  {session.provider} · {session.model}
                </Typography.Text>
              </button>
              <Space size={0}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleRename(session)} disabled={running} />
                <Popconfirm title="删除这个对话？" onConfirm={() => void handleDelete(session)} disabled={running}>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={running} />
                </Popconfirm>
              </Space>
            </div>
          ))}
          {(sessionsQuery.data?.length ?? 0) === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无对话" /> : null}
        </div>
      </Drawer>
      <Modal
        title="绑定 Telegram BOT"
        open={telegramBindingOpen}
        zIndex={1100}
        onCancel={() => setTelegramBindingOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Space orientation="vertical" style={{ width: "100%" }} size={12}>
          <Typography.Paragraph type="secondary">
            仅支持 Telegram 私聊。生成链接后打开并点击开始，即可将当前管理员账号绑定到该 Telegram 用户。
          </Typography.Paragraph>
          {telegramBindingQuery.data?.binding?.bound ? (
            <Typography.Text>
              当前绑定：@{telegramBindingQuery.data.binding.telegramUsername || telegramBindingQuery.data.binding.telegramUserId}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">当前尚未绑定 Telegram 用户。</Typography.Text>
          )}
          {telegramBindingLink ? (
            <Space.Compact block>
              <Input value={telegramBindingLink} readOnly />
              <Button onClick={() => void navigator.clipboard?.writeText(telegramBindingLink)}>复制</Button>
            </Space.Compact>
          ) : null}
          <Space>
            <Button type="primary" onClick={() => void handleCreateTelegramBinding()} loading={telegramBindingBusy} disabled={!selectedSessionId}>
              {telegramBindingLink ? "重新生成链接" : "生成绑定链接"}
            </Button>
            {telegramBindingQuery.data?.binding?.bound ? (
              <Popconfirm title="解除 Telegram 绑定？" onConfirm={() => void handleDeleteTelegramBinding()}>
                <Button danger loading={telegramBindingBusy}>
                  解除绑定
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        </Space>
      </Modal>
    </div>
  );
}
