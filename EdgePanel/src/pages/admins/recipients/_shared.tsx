import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined, RedoOutlined, SendOutlined } from "@ant-design/icons";
import { PageContainer, ProTable, type ProColumns } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useSearchParams } from "@umijs/max";
import {
  Button,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  TableProps,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";
import dayjs from "dayjs";

import TableActionIcon from "@/components/TableActionIcon";
import PasswordInput from "@/components/PasswordInput";
import { adminQueryKeys, messageQueryKeys } from "@/queries/keys";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import type { FindAllMessageMediasResponse } from "@/pb/service_message_media_pb";
import type { FindAllEnabledMessageRecipientGroupsResponse } from "@/pb/service_message_recipient_group_pb";
import type { ListEnabledMessageMediaInstancesResponse } from "@/pb/service_message_media_instance_pb";
import type { ListEnabledMessageRecipientsResponse } from "@/pb/service_message_recipient_pb";
import type { ListMessageTaskLogsResponse } from "@/pb/service_message_task_log_pb";
import type { ListMessageTasksWithStatusResponse } from "@/pb/service_message_task_pb";
import { listAdmins } from "@/services/admins";
import {
  createMessageMediaInstance,
  createMessageRecipient,
  createMessageRecipientGroup,
  deleteMessageMediaInstance,
  deleteMessageRecipient,
  deleteMessageReceiver,
  deleteMessageRecipientGroup,
  deleteMessageTask,
  listMessageMediaInstances,
  listMessageMedias,
  listMessageRecipientGroups,
  listMessageRecipients,
  listMessageRecipientReceivers,
  listMessageTaskLogs,
  listMessageTasks,
  sendMessageTask,
  testMessageMediaInstance,
  testMessageRecipient,
  updateMessageMediaInstance,
  updateMessageRecipient,
  updateMessageRecipientGroup,
} from "@/services/messageRecipients";
import { withDefaultPageSize } from "@/services/pagination";
import { formatErrorMessage } from "@/utils";

import {
  buildMessageMediaConfigPayload,
  buildMessageMediaDraftValues,
  buildMessageRatePayload,
  mediaTypeLabels,
  recipientTabList,
  taskStatusOptions,
  type MessageMediaDraftValues,
  type MessageMediaType,
  type RestMessageMediaConfig,
} from "./formValues";

type IdValue = bigint | number | string;

type AdminOptionRecord = {
  id: IdValue;
  fullname?: string;
  username?: string;
};

type MessageMediaRecord = {
  id: IdValue;
  type: MessageMediaType;
  name: string;
  description?: string;
  userDescription?: string;
  isOn?: boolean;
};

type MessageMediaInstanceRecord = {
  id: IdValue;
  isOn: boolean;
  name: string;
  description: string;
  hashLife?: number;
  messageMedia?: MessageMediaRecord;
  config?: RestMessageMediaConfig;
  rate?: {
    minutes?: number;
    count?: number;
  };
};

type RecipientGroupRecord = {
  id: IdValue;
  name: string;
  isOn: boolean;
};

type RecipientRecord = {
  id: IdValue;
  admin?: AdminOptionRecord;
  messageMediaInstance?: MessageMediaInstanceRecord;
  isOn: boolean;
  messageRecipientGroups: RecipientGroupRecord[];
  description: string;
  user: string;
  timeFrom: string;
  timeTo: string;
};

type MessageReceiverRecord = {
  id: IdValue;
  clusterId: IdValue;
  nodeId: IdValue;
  serverId: IdValue;
  role?: string;
  clusterName?: string;
  nodeName?: string;
  serverName?: string;
};

type TaskResultRecord = {
  isOk: boolean;
  error: string;
  response: string;
};

type TaskRecord = {
  id: IdValue;
  messageRecipient?: RecipientRecord;
  messageMediaInstance?: MessageMediaInstanceRecord;
  user: string;
  subject: string;
  body: string;
  createdAt: IdValue;
  status: number;
  sentAt: IdValue;
  result?: TaskResultRecord;
};

type TaskLogRecord = {
  id: IdValue;
  createdAt: IdValue;
  isOk: boolean;
  error: string;
  response: string;
  messageTask?: TaskRecord;
};

type SelectOption = {
  label: string;
  value: string;
};

type RecipientFormValues = {
  adminId?: string;
  messageMediaInstanceId?: string;
  messageRecipientGroupIds?: string[];
  description?: string;
  isOn?: boolean;
  user?: string;
  timeFrom?: string;
  timeTo?: string;
};

type MediaFormValues = {
  name?: string;
  mediaType?: MessageMediaType;
  description?: string;
  hashLife?: number;
  isOn?: boolean;
  rateMinutes?: number | string;
  rateCount?: number | string;
  configDrafts?: MessageMediaDraftValues;
};

type TestSendValues = {
  user?: string;
  subject?: string;
  body?: string;
};

type DirectSendValues = {
  messageMediaInstanceId?: string;
  user?: string;
  subject?: string;
  body?: string;
};

const modalWidth = {
  xs: "95%",
  sm: "88%",
  md: "78%",
  lg: "68%",
  xl: "60%",
  xxl: "54%",
} as const;

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

function stringifyId(value: IdValue | undefined): string {
  return value == null ? "" : String(value);
}

function boolStatusTag(isOn: boolean) {
  return isOn ? <Tag color="success">启用</Tag> : <Tag color="default">禁用</Tag>;
}

function formatUnix(value?: IdValue): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "-";
  }

  return dayjs.unix(numeric).format("YYYY-MM-DD HH:mm:ss");
}

function formatRate(rate?: { minutes?: number; count?: number }): string {
  const minutes = Number(rate?.minutes ?? 0);
  const count = Number(rate?.count ?? 0);
  if (minutes <= 0 || count <= 0) {
    return "-";
  }

  return `${minutes} 分钟 / ${count} 次`;
}

function renderText(value?: string, placeholder = "-") {
  const text = value?.trim();
  if (!text) {
    return placeholder;
  }

  return <Typography.Text ellipsis={{ tooltip: text }}>{text}</Typography.Text>;
}

function getStatusTag(status: number) {
  switch (status) {
    case 1:
      return <Tag color="processing">发送中</Tag>;
    case 2:
      return <Tag color="success">成功</Tag>;
    case 3:
      return <Tag color="error">失败</Tag>;
    default:
      return <Tag>未知</Tag>;
  }
}

function buildAdminOptions(admins?: AdminOptionRecord[]): SelectOption[] {
  return (admins ?? []).map((admin) => ({
    label: admin.fullname?.trim() || admin.username?.trim() || `管理员 ${admin.id}`,
    value: stringifyId(admin.id),
  }));
}

function buildGroupOptions(groups?: RecipientGroupRecord[]): SelectOption[] {
  return (groups ?? []).map((group) => ({
    label: group.name,
    value: stringifyId(group.id),
  }));
}

function buildMediaInstanceOptions(instances?: MessageMediaInstanceRecord[]): SelectOption[] {
  return (instances ?? [])
    .filter((instance) => instance.isOn)
    .map((instance) => ({
      label: instance.messageMedia?.name ? `${instance.name} (${instance.messageMedia.name})` : instance.name,
      value: stringifyId(instance.id),
    }));
}

function buildMediaTypeOptions(medias?: MessageMediaRecord[]): SelectOption[] {
  const enabledTypes = new Map<string, string>();
  for (const media of medias ?? []) {
    enabledTypes.set(media.type, media.name || mediaTypeLabels[media.type]);
  }

  return (Object.keys(mediaTypeLabels) as MessageMediaType[])
    .filter((type) => enabledTypes.has(type))
    .map((type) => ({
      label: enabledTypes.get(type) || mediaTypeLabels[type],
      value: type,
    }));
}

function VariableListFields({
  name,
  addLabel,
  keyPlaceholder,
  valuePlaceholder,
}: {
  name: (string | number)[];
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          {fields.map((field) => (
            <Space key={field.key} align="baseline" style={{ display: "flex" }}>
              <Form.Item name={[field.name, "name"]} style={{ marginBottom: 0, width: 220 }}>
                <Input placeholder={keyPlaceholder} />
              </Form.Item>
              <Form.Item name={[field.name, "value"]} style={{ marginBottom: 0, flex: 1 }}>
                <Input placeholder={valuePlaceholder} />
              </Form.Item>
              <Button icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
            </Space>
          ))}
          <Button type="dashed" onClick={() => add({ name: "", value: "" })} icon={<PlusOutlined />}>
            {addLabel}
          </Button>
        </Space>
      )}
    </Form.List>
  );
}

function MediaConfigFields({ mediaType, form }: { mediaType?: MessageMediaType; form: FormInstance<MediaFormValues> }) {
  const scriptType = (Form.useWatch(["configDrafts", "script", "scriptType"], form) as string | undefined) || "path";

  if (!mediaType) {
    return null;
  }

  switch (mediaType) {
    case "email":
      return (
        <>
          <Form.Item
            name={["configDrafts", "email", "smtp"]}
            label="SMTP"
            extra="只支持SSL（或TLS）连接，端口通常为：465或587。"
            rules={[{ required: true, message: "请输入 SMTP 地址" }]}
          >
            <Input placeholder="smtp.example.com:465" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "email", "username"]}
            label="账号"
            extra="邮箱账号，比如 123456@qq.com。"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input placeholder="请输入 SMTP 账号" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "email", "password"]}
            label="密码"
            extra="账号对应的密码或者授权码（比如QQ邮箱就需要授权码）。"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <PasswordInput placeholder="请输入 SMTP 密码" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "email", "from"]}
            label="发送者Email"
            extra="默认和账号一致"
            rules={[{ required: true, message: "请输入发件人地址" }]}
          >
            <Input placeholder="ops@example.com" />
          </Form.Item>
          <Form.Item name={["configDrafts", "email", "fromName"]} label="发送者名称">
            <Input placeholder="GoEdge" />
          </Form.Item>
          <Form.Item name={["configDrafts", "email", "protocol"]} label="协议" rules={[{ required: true, message: "请选择协议" }]} initialValue="tls">
            <Select
              options={[
                { label: "TLS", value: "tls" },
                { label: "STARTTLS", value: "starttls" },
                { label: "SSL", value: "ssl" },
              ]}
            />
          </Form.Item>
        </>
      );
    case "webHook":
      return (
        <>
          <Form.Item
            name={["configDrafts", "webHook", "url"]}
            label="URL"
            extra={
              <>
                可以在URL中使用 <code>${"{MessageUser}"}</code>、<code>${"{MessageSubject}"}</code> 和 <code>${"{MessageBody}"}</code>{" "}
                来代表接收人标识、标题和内容。
              </>
            }
            rules={[{ required: true, message: "请输入 WebHook URL" }]}
          >
            <Input placeholder="https://example.com/hook" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "webHook", "method"]}
            label="请求方法"
            extra="POST方式下会发送接收人标识、标题和内容。"
            initialValue="POST"
          >
            <Select
              options={[
                { label: "GET", value: "GET" },
                { label: "POST", value: "POST" },
                { label: "PUT", value: "PUT" },
              ]}
            />
          </Form.Item>
          <Form.Item name={["configDrafts", "webHook", "contentType"]} label="自定义内容" initialValue="params">
            <Select
              options={[
                { label: "参数对", value: "params" },
                { label: "文本内容", value: "body" },
              ]}
            />
          </Form.Item>
          <Form.Item label="自定义报头">
            <VariableListFields
              name={["configDrafts", "webHook", "headers"]}
              addLabel="添加 Header"
              keyPlaceholder="Header 名称"
              valuePlaceholder="Header 值"
            />
          </Form.Item>
          <Form.Item label="参数对">
            <VariableListFields name={["configDrafts", "webHook", "params"]} addLabel="添加参数" keyPlaceholder="参数名" valuePlaceholder="参数值" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "webHook", "body"]}
            label="文本内容"
            extra={
              <>
                内容中可以使用三个变量：<code>${"{MessageUser}"}</code>、<code>${"{MessageSubject}"}</code> 和 <code>${"{MessageBody}"}</code>
                ，分别代表接收人标识、标题和内容。
              </>
            }
          >
            <Input.TextArea rows={4} placeholder='{"subject":"${MessageSubject}","body":"${MessageBody}"}' />
          </Form.Item>
        </>
      );
    case "script": {
      return (
        <>
          <Form.Item name={["configDrafts", "script", "scriptType"]} label="脚本" initialValue="path">
            <Select
              options={[
                { label: "脚本文件", value: "path" },
                { label: "脚本代码", value: "code" },
              ]}
            />
          </Form.Item>
          <Form.Item name={["configDrafts", "script", "scriptLang"]} label="脚本语言">
            <Input placeholder="shell / python / powershell" />
          </Form.Item>
          {scriptType === "code" ? (
            <Form.Item
              name={["configDrafts", "script", "script"]}
              label="脚本代码"
              extra={
                <>
                  如果是Shell脚本，请不要忘记在头部添加 <em>#!脚本解释工具</em>，比如 <em>#!/bin/bash</em>。执行此脚本时，在脚本中可以使用
                  <code>${"{MessageUser}"}</code>、<code>${"{MessageSubject}"}</code>、<code>${"{MessageBody}"}</code>{" "}
                  三个环境变量分别代表通知的接收人标识、标题和内容。
                </>
              }
              rules={[{ required: true, message: "请输入脚本代码" }]}
            >
              <Input.TextArea rows={8} placeholder="#!/bin/sh" />
            </Form.Item>
          ) : (
            <Form.Item
              name={["configDrafts", "script", "path"]}
              label="脚本文件"
              extra={
                <>
                  如果是Shell脚本，请不要忘记在头部添加 <em>#!脚本解释工具</em>，比如 <em>#!/bin/bash</em>。执行此脚本时，在脚本中可以使用
                  <code>${"{MessageUser}"}</code>、<code>${"{MessageSubject}"}</code>、<code>${"{MessageBody}"}</code>{" "}
                  三个环境变量分别代表通知的接收人标识、标题和内容。
                </>
              }
              rules={[{ required: true, message: "请输入脚本路径" }]}
            >
              <Input placeholder="/usr/local/bin/send-message.sh" />
            </Form.Item>
          )}
          <Form.Item name={["configDrafts", "script", "cwd"]} label="当前工作目录（CWD）">
            <Input placeholder="/tmp" />
          </Form.Item>
          <Form.Item label="环境变量（ENV）">
            <VariableListFields name={["configDrafts", "script", "env"]} addLabel="添加环境变量" keyPlaceholder="变量名" valuePlaceholder="变量值" />
          </Form.Item>
        </>
      );
    }
    case "dingTalk":
      return (
        <Form.Item
          name={["configDrafts", "dingTalk", "webHookURL"]}
          label="Hook地址"
          extra={
            <>
              填入自定义群机器人的Hook地址，
              <a href="https://open.dingtalk.com/document/orgapp/custom-robot-access" target="_blank" rel="noreferrer">
                获取方法
              </a>
              。
            </>
          }
          rules={[{ required: true, message: "请输入 Webhook" }]}
        >
          <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
        </Form.Item>
      );
    case "qyWeixin":
      return (
        <>
          <Form.Item name={["configDrafts", "qyWeixin", "corporateId"]} label="企业ID" rules={[{ required: true, message: "请输入 CorporateId" }]}>
            <Input />
          </Form.Item>
          <Form.Item name={["configDrafts", "qyWeixin", "agentId"]} label="应用AgentId" rules={[{ required: true, message: "请输入 AgentId" }]}>
            <Input />
          </Form.Item>
          <Form.Item name={["configDrafts", "qyWeixin", "appSecret"]} label="应用Secret" rules={[{ required: true, message: "请输入 AppSecret" }]}>
            <PasswordInput />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "qyWeixin", "textFormat"]}
            label="内容文本格式"
            extra={
              <>
                企业微信目前只支持少数的Markdown语法，
                <a
                  href="https://work.weixin.qq.com/api/doc#90000/90135/90236/%E6%94%AF%E6%8C%81%E7%9A%84markdown%E8%AF%AD%E6%B3%95"
                  target="_blank"
                  rel="noreferrer"
                >
                  点击这里了解
                </a>
                。
              </>
            }
            initialValue="text"
          >
            <Select
              options={[
                { label: "普通文本", value: "text" },
                { label: "Markdown", value: "markdown" },
              ]}
            />
          </Form.Item>
        </>
      );
    case "qyWeixinRobot":
      return (
        <>
          <Form.Item
            name={["configDrafts", "qyWeixinRobot", "webHookURL"]}
            label="WebHook地址"
            extra={
              <>
                填入自定义群机器人的WebHook地址，
                <a href="https://open.work.weixin.qq.com/help2/pc/14931" target="_blank" rel="noreferrer">
                  获取方法
                </a>
                。
              </>
            }
            rules={[{ required: true, message: "请输入 Webhook" }]}
          >
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "qyWeixinRobot", "textFormat"]}
            label="内容文本格式"
            extra={
              <>
                企业微信目前只支持少数的Markdown语法，
                <a href="https://work.weixin.qq.com/api/doc#90000/90135/91760/markdown%E7%B1%BB%E5%9E%8B" target="_blank" rel="noreferrer">
                  点击这里了解
                </a>
                。
              </>
            }
            initialValue="text"
          >
            <Select
              options={[
                { label: "普通文本", value: "text" },
                { label: "Markdown", value: "markdown" },
              ]}
            />
          </Form.Item>
        </>
      );
    case "aliyunSms":
      return (
        <>
          <Form.Item
            name={["configDrafts", "aliyunSms", "sign"]}
            label="签名名称"
            extra="已经审核通过的短信签名名称"
            rules={[{ required: true, message: "请输入短信签名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "aliyunSms", "templateCode"]}
            label="模板CODE"
            extra="已经审核通过的模板CODE"
            rules={[{ required: true, message: "请输入模板 Code" }]}
          >
            <Input placeholder="类似于 SMS_12345" />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "aliyunSms", "accessKeyId"]}
            label="AccessKey ID"
            extra="在阿里云控制台中的访问控制中某个用户的AccessKey ID"
            rules={[{ required: true, message: "请输入 AccessKeyId" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "aliyunSms", "accessKeySecret"]}
            label="AccessKey Secret"
            extra="在阿里云控制台中的访问控制中某个用户的AccessKey Secret，和上面的AccessKey ID匹配"
            rules={[{ required: true, message: "请输入 AccessKeySecret" }]}
          >
            <PasswordInput />
          </Form.Item>
          <Form.Item
            label="模板变量"
            extra={
              <>
                模板中使用的变量，在变量中可以使用 <code>${"{MessageUser}"}</code>、<code>${"{MessageSubject}"}</code>、
                <code>${"{MessageBody}"}</code> 来代表接收人标识、标题和内容。
              </>
            }
          >
            <VariableListFields
              name={["configDrafts", "aliyunSms", "variables"]}
              addLabel="添加变量"
              keyPlaceholder="变量名"
              valuePlaceholder="变量值"
            />
          </Form.Item>
        </>
      );
    case "telegram":
      return (
        <>
          <Form.Item
            name={["configDrafts", "telegram", "token"]}
            label="机器人Token"
            extra={
              <>
                在创建机器人的时候可以获得，类似于 <code>123456:AAAA-AAAAAAAAAAAAAAAAAAAA</code>，可以向 <code>@BotFather</code> 发送{" "}
                <code>/newbot</code> 指令创建新的机器人。
              </>
            }
            rules={[{ required: true, message: "请输入 Telegram Token" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={["configDrafts", "telegram", "proxyUrl"]}
            label="代理服务"
            extra={
              <>
                可选项，仅当API节点所在服务器无法直接连接Telegram API时填写；测试是否能够连接Telegram API的方法：
                <code>curl https://api.telegram.org</code>
                出现2XX、3XX、4XX之类提示时说明能够直接连接；如果你设置了代理，请使用 <code>curl -x "你的代理服务地址" https://api.telegram.org</code>{" "}
                来测试你的代理是否可用。
              </>
            }
          >
            <Input placeholder="socks5://127.0.0.1:7890" />
          </Form.Item>
        </>
      );
    default:
      return null;
  }
}

function RecipientModal({
  record,
  adminOptions,
  groupOptions,
  mediaInstanceOptions,
  mediaInstances,
  onClose,
  onSuccess,
}: {
  record?: RecipientRecord;
  adminOptions: SelectOption[];
  groupOptions: SelectOption[];
  mediaInstanceOptions: SelectOption[];
  mediaInstances: MessageMediaInstanceRecord[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm<RecipientFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [removingReceiverId, setRemovingReceiverId] = useState<string>();
  const queryClient = useQueryClient();
  const selectedInstanceId = Form.useWatch("messageMediaInstanceId", form) as string | undefined;

  const receiversQuery = useQuery({
    queryKey: messageQueryKeys.recipientReceivers(record ? stringifyId(record.id) : undefined),
    queryFn: () => listMessageRecipientReceivers(stringifyId(record!.id)),
    enabled: !!record?.id,
  });

  const clusterReceivers = useMemo(() => {
    const receivers = (receiversQuery.data?.messageReceivers ?? []) as MessageReceiverRecord[];
    return receivers.filter((receiver) => {
      return (
        (receiver.role || "") === "node" &&
        Number(receiver.clusterId ?? 0) > 0 &&
        Number(receiver.nodeId ?? 0) === 0 &&
        Number(receiver.serverId ?? 0) === 0
      );
    });
  }, [receiversQuery.data?.messageReceivers]);

  const initialValues: RecipientFormValues = {
    adminId: stringifyId(record?.admin?.id),
    messageMediaInstanceId: stringifyId(record?.messageMediaInstance?.id),
    messageRecipientGroupIds: (record?.messageRecipientGroups ?? []).map((group) => stringifyId(group.id)),
    description: record?.description || "",
    isOn: record?.isOn ?? true,
    user: record?.user || "",
    timeFrom: record?.timeFrom || "",
    timeTo: record?.timeTo || "",
  };
  const activeInstanceId = selectedInstanceId || initialValues.messageMediaInstanceId;
  const activeInstance = mediaInstances.find((instance) => stringifyId(instance.id) === activeInstanceId);
  const userDescription = activeInstance?.messageMedia?.userDescription?.trim();

  const onFinish = async (values: RecipientFormValues) => {
    try {
      setSubmitting(true);
      const payload = {
        ...(record ? { messageRecipientId: stringifyId(record.id) } : null),
        adminId: values.adminId || "0",
        messageMediaInstanceId: values.messageMediaInstanceId || "0",
        messageRecipientGroupIds: values.messageRecipientGroupIds || [],
        description: values.description || "",
        isOn: values.isOn ?? true,
        user: values.user || "",
        timeFrom: values.timeFrom || "",
        timeTo: values.timeTo || "",
      };
      if (record) {
        await updateMessageRecipient(payload);
      } else {
        await createMessageRecipient(payload);
      }
      onSuccess();
    } catch (error) {
      message.error(formatErrorMessage(record ? "修改接收人失败" : "创建接收人失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReceiver = async (receiverId: IdValue) => {
    if (!record?.id) {
      return;
    }

    const key = stringifyId(receiverId);
    try {
      setRemovingReceiverId(key);
      await deleteMessageReceiver({ messageReceiverId: key });
      await queryClient.invalidateQueries({ queryKey: messageQueryKeys.recipientReceivers(stringifyId(record.id)) });
      message.success("已取消关联");
    } catch (error) {
      message.error(formatErrorMessage("取消关联失败", error));
    } finally {
      setRemovingReceiverId(undefined);
    }
  };

  return (
    <Modal
      title={record ? "修改接收人" : "创建接收人"}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      width={modalWidth}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
        <Form.Item name="adminId" label="系统用户" extra="选择关联的系统用户。" rules={[{ required: true, message: "请选择管理员" }]}>
          <Select showSearch optionFilterProp="label" options={adminOptions} placeholder="请选择管理员" />
        </Form.Item>
        <Form.Item name="messageMediaInstanceId" label="媒介" rules={[{ required: true, message: "请选择媒介实例" }]}>
          <Select showSearch optionFilterProp="label" options={mediaInstanceOptions} placeholder="请选择媒介实例" />
        </Form.Item>
        <Form.Item name="messageRecipientGroupIds" label="分组" extra="选择当前接收人所属分组。">
          <Select mode="multiple" options={groupOptions} placeholder="请选择分组" />
        </Form.Item>
        <Form.Item name="user" label="接收人标识" extra={userDescription || undefined} rules={[{ required: true, message: "请输入接收人标识" }]}>
          <Input placeholder="邮箱 / 手机号 / Telegram Chat ID" />
        </Form.Item>
        <Space style={{ display: "flex" }} size={16}>
          <Form.Item name="timeFrom" label="开始时间" style={{ flex: 1 }} extra=" ">
            <Input placeholder="09:00" />
          </Form.Item>
          <Form.Item
            name="timeTo"
            label="结束时间"
            extra="24小时制，即小时从0到23。如果填写了发送时间，系统只会在这个时间段内给当前接收人发送消息。"
            style={{ flex: 1 }}
          >
            <Input placeholder="18:00" />
          </Form.Item>
        </Space>
        <Form.Item name="description" label="备注">
          <Input.TextArea rows={3} placeholder="备注信息" />
        </Form.Item>
        <Form.Item name="isOn" label="启用当前接收人" valuePropName="checked">
          <Switch />
        </Form.Item>

        {record?.id ? (
          <div style={{ marginTop: 8 }}>
            <Typography.Title level={5} style={{ marginBottom: 8 }}>
              关联的 CDN 集群
            </Typography.Title>
            {receiversQuery.isPending || receiversQuery.isFetching ? (
              <Typography.Text type="secondary">加载中...</Typography.Text>
            ) : clusterReceivers.length === 0 ? (
              <Typography.Text type="secondary">暂时还没有关联的 CDN 集群。</Typography.Text>
            ) : (
              <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 4 }}>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {clusterReceivers.map((receiver) => {
                    const clusterId = stringifyId(receiver.clusterId);
                    const receiverId = stringifyId(receiver.id);

                    return (
                      <Space
                        key={receiverId}
                        align="center"
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                          border: "1px solid var(--ant-color-border-secondary)",
                          borderRadius: 8,
                          padding: "8px 12px",
                        }}
                      >
                        <a href={`#/clusters/${clusterId}/settings`}>{receiver.clusterName || `集群 #${clusterId}`}</a>
                        <Popconfirm title="确定取消当前接收人和集群的关联吗？" onConfirm={() => handleDeleteReceiver(receiver.id)}>
                          <Button type="link" danger loading={removingReceiverId === receiverId} style={{ paddingInline: 0 }}>
                            取消
                          </Button>
                        </Popconfirm>
                      </Space>
                    );
                  })}
                </Space>
              </div>
            )}
          </div>
        ) : null}
      </Form>
    </Modal>
  );
}

function RecipientTestModal({ record, onClose }: { record: RecipientRecord; onClose: () => void }) {
  const [form] = Form.useForm<TestSendValues>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: TestSendValues) => {
    try {
      setSubmitting(true);
      const result = await testMessageRecipient({
        messageRecipientId: stringifyId(record.id),
        subject: values.subject || "",
        body: values.body || "",
      });
      if (result?.isOk === false) {
        Modal.error({ title: "测试发送失败", content: result.error || "发送失败" });
        return;
      }
      Modal.success({ title: "测试发送成功", content: result?.response || "已发送测试消息" });
      onClose();
    } catch (error) {
      message.error(formatErrorMessage("测试发送失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="测试发送" open onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={modalWidth}>
      <Form form={form} layout="vertical" initialValues={{ subject: "测试消息", body: "这是一条测试消息。" }} onFinish={onFinish}>
        <Form.Item label="接收人标识" extra={record.messageMediaInstance?.messageMedia?.userDescription || undefined}>
          <Input value={record.user} disabled />
        </Form.Item>
        <Form.Item name="subject" label="通知标题" rules={[{ required: true, message: "请输入主题" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="body" label="通知内容" rules={[{ required: true, message: "请输入内容" }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function RecipientGroupModal({ record, onClose, onSuccess }: { record?: RecipientGroupRecord; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<{ name?: string; isOn?: boolean }>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { name?: string; isOn?: boolean }) => {
    try {
      setSubmitting(true);
      if (record) {
        await updateMessageRecipientGroup({
          messageRecipientGroupId: stringifyId(record.id),
          name: values.name || "",
          isOn: values.isOn ?? true,
        });
      } else {
        await createMessageRecipientGroup({
          name: values.name || "",
        });
      }
      onSuccess();
    } catch (error) {
      message.error(formatErrorMessage(record ? "修改接收人分组失败" : "创建接收人分组失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={record ? "修改接收人分组" : "创建接收人分组"}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      width={modalWidth}
    >
      <Form form={form} layout="vertical" initialValues={{ name: record?.name || "", isOn: record?.isOn ?? true }} onFinish={onFinish}>
        <Form.Item name="name" label="分组名称" rules={[{ required: true, message: "请输入分组名称" }]}>
          <Input />
        </Form.Item>
        {record ? (
          <Form.Item name="isOn" label="启用当前分组" valuePropName="checked">
            <Switch />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}

function MediaInstanceModal({
  record,
  mediaTypeOptions,
  onClose,
  onSuccess,
}: {
  record?: MessageMediaInstanceRecord;
  mediaTypeOptions: SelectOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm<MediaFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const activeMediaType =
    (Form.useWatch("mediaType", form) as MessageMediaType | undefined) ||
    record?.messageMedia?.type ||
    (mediaTypeOptions[0]?.value as MessageMediaType | undefined);

  const initialMediaType = record?.messageMedia?.type || (mediaTypeOptions[0]?.value as MessageMediaType | undefined) || "email";
  const initialValues: MediaFormValues = {
    name: record?.name || "",
    mediaType: initialMediaType,
    description: record?.description || "",
    hashLife: record?.hashLife ?? 0,
    isOn: record?.isOn ?? true,
    rateMinutes: record?.rate?.minutes ?? "",
    rateCount: record?.rate?.count ?? "",
    configDrafts: buildMessageMediaDraftValues(initialMediaType, record?.config),
  };

  const onFinish = async (values: MediaFormValues) => {
    try {
      const mediaType = values.mediaType;
      if (!mediaType) {
        message.error("请选择媒介类型");
        return;
      }

      setSubmitting(true);
      const payload = {
        ...(record ? { messageMediaInstanceId: stringifyId(record.id) } : null),
        name: values.name || "",
        mediaType,
        config: buildMessageMediaConfigPayload(mediaType, values.configDrafts || {}),
        description: values.description || "",
        isOn: values.isOn ?? true,
        hashLife: Number(values.hashLife || 0),
        rate: buildMessageRatePayload(values),
      };
      if (record) {
        await updateMessageMediaInstance(payload);
      } else {
        await createMessageMediaInstance(payload);
      }
      onSuccess();
    } catch (error) {
      message.error(formatErrorMessage(record ? "修改媒介实例失败" : "创建媒介实例失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={record ? "修改媒介实例" : "创建媒介实例"}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      width={modalWidth}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
        <Form.Item name="name" label="媒介名称" extra="给当前媒介填写一个容易识别的名称。" rules={[{ required: true, message: "请输入名称" }]}>
          <Input placeholder="告警邮件" />
        </Form.Item>
        <Form.Item name="mediaType" label="媒介类型" rules={[{ required: true, message: "请选择媒介类型" }]}>
          <Select options={mediaTypeOptions} />
        </Form.Item>
        <Form.Item name="description" label="备注">
          <Input.TextArea rows={3} placeholder="媒介说明" />
        </Form.Item>
        <Space style={{ display: "flex" }} size={16}>
          <Form.Item name="rateCount" label="发送频率（次）" extra="用来限制此媒介在统计周期内最多可发送的次数。" style={{ flex: 1 }}>
            <InputNumber min={0} style={{ width: "100%" }} placeholder="3" />
          </Form.Item>
          <Form.Item name="rateMinutes" label="发送频率（分钟）" extra="用来限制此媒介的发送频率，防止短时间内消息数量过载。" style={{ flex: 1 }}>
            <InputNumber min={0} style={{ width: "100%" }} placeholder="15" />
          </Form.Item>
        </Space>
        <Form.Item
          name="hashLife"
          label="忽略相似消息周期"
          extra="可以在这个时间内忽略相似消息，防止短时间内消息数量过载。不填或者为0，表示默认为60秒。"
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="isOn" label="启用当前媒介" valuePropName="checked">
          <Switch />
        </Form.Item>
        <MediaConfigFields mediaType={activeMediaType} form={form} />
      </Form>
    </Modal>
  );
}

function MediaTestModal({ record, onClose }: { record: MessageMediaInstanceRecord; onClose: () => void }) {
  const [form] = Form.useForm<TestSendValues>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: TestSendValues) => {
    try {
      const mediaType = record.messageMedia?.type;
      if (!mediaType) {
        message.error("媒介类型不存在");
        return;
      }

      setSubmitting(true);
      const result = await testMessageMediaInstance({
        mediaType,
        config: record.config || {},
        user: values.user || "",
        subject: values.subject || "",
        body: values.body || "",
      });
      if (result?.isOk === false) {
        Modal.error({ title: "测试发送失败", content: result.error || "发送失败" });
        return;
      }
      Modal.success({ title: "测试发送成功", content: result?.response || "已发送测试消息" });
      onClose();
    } catch (error) {
      message.error(formatErrorMessage("测试发送失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="测试发送" open onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={modalWidth}>
      <Form form={form} layout="vertical" initialValues={{ subject: "测试消息", body: "这是一条测试消息。" }} onFinish={onFinish}>
        <Form.Item label="媒介实例">
          <Input value={record.name} disabled />
        </Form.Item>
        <Form.Item name="user" label="接收人标识" extra={record.messageMedia?.userDescription || undefined}>
          <Input placeholder="邮箱 / 手机号 / Telegram Chat ID" />
        </Form.Item>
        <Form.Item name="subject" label="通知标题" rules={[{ required: true, message: "请输入主题" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="body" label="通知内容" rules={[{ required: true, message: "请输入内容" }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function DirectSendTaskModal({
  mediaInstanceOptions,
  initialValues,
  onClose,
  onSuccess,
}: {
  mediaInstanceOptions: SelectOption[];
  initialValues?: DirectSendValues;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm<DirectSendValues>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: DirectSendValues) => {
    try {
      setSubmitting(true);
      const result = await sendMessageTask({
        messageMediaInstanceId: values.messageMediaInstanceId || "0",
        user: values.user || "",
        subject: values.subject || "",
        body: values.body || "",
      });
      if (result?.isOk === false) {
        Modal.error({ title: "发送失败", content: result.error || "发送失败" });
        return;
      }
      Modal.success({ title: "发送成功", content: result?.response || "消息已发送" });
      onSuccess();
    } catch (error) {
      message.error(formatErrorMessage("发送消息失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="直接发送消息" open onCancel={onClose} onOk={() => form.submit()} confirmLoading={submitting} destroyOnHidden width={modalWidth}>
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
        <Form.Item name="messageMediaInstanceId" label="媒介实例" rules={[{ required: true, message: "请选择媒介实例" }]}>
          <Select showSearch optionFilterProp="label" options={mediaInstanceOptions} placeholder="请选择媒介实例" />
        </Form.Item>
        <Form.Item name="user" label="接收人标识">
          <Input placeholder="邮箱 / 手机号 / Telegram Chat ID" />
        </Form.Item>
        <Form.Item name="subject" label="通知标题" rules={[{ required: true, message: "请输入主题" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="body" label="通知内容" rules={[{ required: true, message: "请输入内容" }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function NotificationRecipientsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeKey =
    recipientTabList.find((item) => location.pathname === item.key)?.key ||
    recipientTabList.find((item) => location.pathname.startsWith(`${item.key}/`))?.key ||
    "/admins/recipients";

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList: recipientTabList,
      })}
      header={{ title: "通知媒介" }}
      tabList={recipientTabList as unknown as { key: string; tab: string }[]}
      tabActiveKey={activeKey}
      onTabChange={(key) => navigate(key)}
    >
      <Outlet />
    </PageContainer>
  );
}

export function NotificationRecipientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const queryClient = useQueryClient();

  const [editingRecord, setEditingRecord] = useState<RecipientRecord | undefined>();
  const [testingRecord, setTestingRecord] = useState<RecipientRecord | undefined>();

  const recipientsQuery = useQuery<ListEnabledMessageRecipientsResponse>({
    queryKey: messageQueryKeys.recipients(effectiveSearchParams),
    queryFn: () => listMessageRecipients(effectiveSearchParams),
  });
  const groupsQuery = useQuery<FindAllEnabledMessageRecipientGroupsResponse>({
    queryKey: messageQueryKeys.recipientGroups(),
    queryFn: listMessageRecipientGroups,
  });
  const adminsQuery = useQuery({
    queryKey: adminQueryKeys.list(
      new URLSearchParams([
        ["page", "1"],
        ["size", "100"],
      ]),
    ),
    queryFn: () =>
      listAdmins(
        new URLSearchParams([
          ["page", "1"],
          ["size", "100"],
        ]),
      ),
  });
  const mediaInstancesQuery = useQuery<ListEnabledMessageMediaInstancesResponse>({
    queryKey: messageQueryKeys.mediaInstances(
      new URLSearchParams([
        ["page", "1"],
        ["size", "1000"],
      ]),
    ),
    queryFn: () =>
      listMessageMediaInstances(
        new URLSearchParams([
          ["page", "1"],
          ["size", "1000"],
        ]),
      ),
  });

  const adminOptions = useMemo(() => buildAdminOptions(adminsQuery.data?.admins as AdminOptionRecord[] | undefined), [adminsQuery.data]);
  const groupOptions = useMemo(
    () => buildGroupOptions(groupsQuery.data?.messageRecipientGroups as RecipientGroupRecord[] | undefined),
    [groupsQuery.data],
  );
  const mediaInstanceOptions = useMemo(
    () => buildMediaInstanceOptions(mediaInstancesQuery.data?.messageMediaInstances as MessageMediaInstanceRecord[] | undefined),
    [mediaInstancesQuery.data],
  );

  const reload = () => void queryClient.invalidateQueries({ queryKey: messageQueryKeys.recipientsBase() });

  const onTableChange: TableProps<RecipientRecord>["onChange"] = (pagination) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(pagination.current || 1));
    next.set("size", String(pagination.pageSize || defaultPageSize));
    setSearchParams(next);
  };

  const columns: ProColumns<RecipientRecord>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "搜索接收人或备注" },
    },
    {
      title: "管理员",
      dataIndex: "adminId",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        allowClear: true,
        showSearch: true,
        optionFilterProp: "label",
        options: adminOptions,
        placeholder: "筛选管理员",
      },
    },
    {
      title: "分组",
      dataIndex: "messageRecipientGroupId",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        allowClear: true,
        options: groupOptions,
        placeholder: "筛选分组",
      },
    },
    {
      title: "管理员",
      key: "admin",
      search: false,
      render: (_, record) => record.admin?.fullname || record.admin?.username || "-",
    },
    {
      title: "媒介实例",
      key: "messageMediaInstance",
      search: false,
      render: (_, record) => record.messageMediaInstance?.name || "-",
    },
    {
      title: "接收人标识",
      dataIndex: "user",
      search: false,
      render: (_, record) => renderText(record.user),
    },
    {
      title: "分组",
      key: "groups",
      search: false,
      render: (_, record) => (record.messageRecipientGroups?.length ? record.messageRecipientGroups.map((group) => group.name).join(", ") : "-"),
    },
    {
      title: "时间范围",
      key: "timeRange",
      search: false,
      render: (_, record) => (record.timeFrom || record.timeTo ? `${record.timeFrom || "--"} ~ ${record.timeTo || "--"}` : "-"),
    },
    {
      title: "备注",
      dataIndex: "description",
      search: false,
      render: (_, record) => renderText(record.description),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      render: (_, record) => boolStatusTag(record.isOn),
    },
    {
      title: "操作",
      key: "action",
      valueType: "option",
      fixed: "right",
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon tooltip="修改" icon={<EditOutlined />} onClick={() => setEditingRecord(record)} />
          <TableActionIcon tooltip="测试发送" icon={<SendOutlined />} onClick={() => setTestingRecord(record)} />
          <Popconfirm
            title="确定删除这个接收人吗？"
            onConfirm={() =>
              deleteMessageRecipient(record.id)
                .then(reload)
                .catch((error) => message.error(formatErrorMessage("删除接收人失败", error)))
            }
          >
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<RecipientRecord>
        cardBordered
        columns={columns}
        dataSource={recipientsQuery.data?.messageRecipients as RecipientRecord[] | undefined}
        loading={recipientsQuery.isPending || recipientsQuery.isFetching}
        rowKey={(record) => stringifyId(record.id)}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        options={{ reload, density: true, setting: true }}
        onChange={onTableChange}
        scroll={{ x: "max-content" }}
        headerTitle="接收人"
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setEditingRecord({} as RecipientRecord)}>
            创建接收人
          </Button>,
        ]}
        form={{
          initialValues: {
            keyword: params.keyword,
            adminId: searchParams.get("adminId") || undefined,
            messageRecipientGroupId: searchParams.get("messageRecipientGroupId") || undefined,
          },
        }}
        onSubmit={(values) => {
          const next = new URLSearchParams(searchParams);
          const keyword = String(values.keyword || "");
          if (keyword) next.set("keyword", keyword);
          else next.delete("keyword");
          if (values.adminId) next.set("adminId", String(values.adminId));
          else next.delete("adminId");
          if (values.messageRecipientGroupId) next.set("messageRecipientGroupId", String(values.messageRecipientGroupId));
          else next.delete("messageRecipientGroupId");
          next.set("page", "1");
          setSearchParams(next);
        }}
        onReset={() => {
          const next = new URLSearchParams(searchParams);
          ["keyword", "adminId", "messageRecipientGroupId"].forEach((key) => next.delete(key));
          next.set("page", "1");
          setSearchParams(next);
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          current: Number(params.page),
          pageSize: Number(params.size),
          total: Number(recipientsQuery.data?.total || 0),
        }}
      />

      {editingRecord ? (
        <RecipientModal
          record={editingRecord.id ? editingRecord : undefined}
          adminOptions={adminOptions}
          groupOptions={groupOptions}
          mediaInstanceOptions={mediaInstanceOptions}
          mediaInstances={(mediaInstancesQuery.data?.messageMediaInstances as MessageMediaInstanceRecord[] | undefined) || []}
          onClose={() => setEditingRecord(undefined)}
          onSuccess={() => {
            setEditingRecord(undefined);
            reload();
          }}
        />
      ) : null}

      {testingRecord ? <RecipientTestModal record={testingRecord} onClose={() => setTestingRecord(undefined)} /> : null}
    </>
  );
}

export function NotificationRecipientGroupsPage() {
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState<RecipientGroupRecord | undefined>();

  const groupsQuery = useQuery<FindAllEnabledMessageRecipientGroupsResponse>({
    queryKey: messageQueryKeys.recipientGroups(),
    queryFn: listMessageRecipientGroups,
  });

  const reload = () => void queryClient.invalidateQueries({ queryKey: messageQueryKeys.recipientGroups() });

  const columns: ProColumns<RecipientGroupRecord>[] = [
    { title: "ID", dataIndex: "id", width: 90, search: false, render: (_, record) => stringifyId(record.id) },
    { title: "分组名称", dataIndex: "name", search: false },
    { title: "状态", dataIndex: "isOn", search: false, render: (_, record) => boolStatusTag(record.isOn) },
    {
      title: "操作",
      key: "action",
      search: false,
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon tooltip="修改" icon={<EditOutlined />} onClick={() => setEditingRecord(record)} />
          <Popconfirm
            title="确定删除这个分组吗？"
            onConfirm={() =>
              deleteMessageRecipientGroup(record.id)
                .then(reload)
                .catch((error) => message.error(formatErrorMessage("删除接收人分组失败", error)))
            }
          >
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<RecipientGroupRecord>
        cardBordered
        search={false}
        options={{ reload, density: true, setting: true }}
        headerTitle="接收人分组"
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setEditingRecord({} as RecipientGroupRecord)}>
            创建分组
          </Button>,
        ]}
        rowKey={(record) => stringifyId(record.id)}
        columns={columns}
        dataSource={groupsQuery.data?.messageRecipientGroups as RecipientGroupRecord[] | undefined}
        loading={groupsQuery.isPending || groupsQuery.isFetching}
      />

      {editingRecord ? (
        <RecipientGroupModal
          record={editingRecord.id ? editingRecord : undefined}
          onClose={() => setEditingRecord(undefined)}
          onSuccess={() => {
            setEditingRecord(undefined);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

export function NotificationMediaInstancesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const queryClient = useQueryClient();

  const [editingRecord, setEditingRecord] = useState<MessageMediaInstanceRecord | undefined>();
  const [testingRecord, setTestingRecord] = useState<MessageMediaInstanceRecord | undefined>();

  const instancesQuery = useQuery<ListEnabledMessageMediaInstancesResponse>({
    queryKey: messageQueryKeys.mediaInstances(effectiveSearchParams),
    queryFn: () => listMessageMediaInstances(effectiveSearchParams),
  });
  const mediasQuery = useQuery<FindAllMessageMediasResponse>({
    queryKey: messageQueryKeys.mediaDefinitions(),
    queryFn: listMessageMedias,
  });

  const mediaTypeOptions = useMemo(
    () => buildMediaTypeOptions(mediasQuery.data?.messageMedias as MessageMediaRecord[] | undefined),
    [mediasQuery.data],
  );
  const reload = () => void queryClient.invalidateQueries({ queryKey: messageQueryKeys.mediaInstancesBase() });

  const onTableChange: TableProps<MessageMediaInstanceRecord>["onChange"] = (pagination) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(pagination.current || 1));
    next.set("size", String(pagination.pageSize || defaultPageSize));
    setSearchParams(next);
  };

  const columns: ProColumns<MessageMediaInstanceRecord>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "搜索名称或说明" },
    },
    {
      title: "媒介类型",
      dataIndex: "mediaType",
      hideInTable: true,
      valueType: "select",
      fieldProps: {
        allowClear: true,
        options: mediaTypeOptions,
        placeholder: "筛选媒介类型",
      },
    },
    { title: "名称", dataIndex: "name", search: false },
    {
      title: "媒介",
      key: "media",
      search: false,
      render: (_, record) => mediaTypeLabels[record.messageMedia?.type || "email"] || record.messageMedia?.name || "-",
    },
    {
      title: "说明",
      dataIndex: "description",
      search: false,
      render: (_, record) => renderText(record.description),
    },
    {
      title: "频率限制",
      key: "rate",
      search: false,
      render: (_, record) => formatRate(record.rate),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      render: (_, record) => boolStatusTag(record.isOn),
    },
    {
      title: "操作",
      key: "action",
      width: 140,
      search: false,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon tooltip="修改" icon={<EditOutlined />} onClick={() => setEditingRecord(record)} />
          <TableActionIcon tooltip="测试发送" icon={<SendOutlined />} onClick={() => setTestingRecord(record)} />
          <Popconfirm
            title="确定删除这个媒介实例吗？"
            onConfirm={() =>
              deleteMessageMediaInstance(record.id)
                .then(reload)
                .catch((error) => message.error(formatErrorMessage("删除媒介实例失败", error)))
            }
          >
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<MessageMediaInstanceRecord>
        cardBordered
        columns={columns}
        dataSource={instancesQuery.data?.messageMediaInstances as MessageMediaInstanceRecord[] | undefined}
        loading={instancesQuery.isPending || instancesQuery.isFetching}
        rowKey={(record) => stringifyId(record.id)}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        options={{ reload, density: true, setting: true }}
        onChange={onTableChange}
        scroll={{ x: "max-content" }}
        headerTitle="媒介"
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setEditingRecord({} as MessageMediaInstanceRecord)}>
            创建媒介
          </Button>,
        ]}
        form={{
          initialValues: {
            keyword: params.keyword,
            mediaType: searchParams.get("mediaType") || undefined,
          },
        }}
        onSubmit={(values) => {
          const next = new URLSearchParams(searchParams);
          if (values.keyword) next.set("keyword", String(values.keyword));
          else next.delete("keyword");
          if (values.mediaType) next.set("mediaType", String(values.mediaType));
          else next.delete("mediaType");
          next.set("page", "1");
          setSearchParams(next);
        }}
        onReset={() => {
          const next = new URLSearchParams(searchParams);
          next.delete("keyword");
          next.delete("mediaType");
          next.set("page", "1");
          setSearchParams(next);
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          current: Number(params.page),
          pageSize: Number(params.size),
          total: Number(instancesQuery.data?.total || 0),
        }}
      />

      {editingRecord ? (
        <MediaInstanceModal
          record={editingRecord.id ? editingRecord : undefined}
          mediaTypeOptions={mediaTypeOptions}
          onClose={() => setEditingRecord(undefined)}
          onSuccess={() => {
            setEditingRecord(undefined);
            reload();
          }}
        />
      ) : null}

      {testingRecord ? <MediaTestModal record={testingRecord} onClose={() => setTestingRecord(undefined)} /> : null}
    </>
  );
}

export function NotificationTaskLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { page: 1, size: 20, ...Object.fromEntries(effectiveSearchParams.entries()) };

  const logsQuery = useQuery<ListMessageTaskLogsResponse>({
    queryKey: messageQueryKeys.taskLogs(effectiveSearchParams),
    queryFn: () => listMessageTaskLogs(effectiveSearchParams),
  });

  const onTableChange: TableProps<TaskLogRecord>["onChange"] = (pagination) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(pagination.current || 1));
    next.set("size", String(pagination.pageSize || defaultPageSize));
    setSearchParams(next);
  };

  const columns: ProColumns<TaskLogRecord>[] = [
    { title: "时间", key: "createdAt", search: false, render: (_, record) => formatUnix(record.createdAt) },
    {
      title: "结果",
      key: "isOk",
      search: false,
      render: (_, record) => (record.isOk ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>),
    },
    { title: "媒介", key: "media", search: false, render: (_, record) => record.messageTask?.messageMediaInstance?.name || "-" },
    {
      title: "接收人",
      key: "user",
      search: false,
      render: (_, record) => record.messageTask?.user || record.messageTask?.messageRecipient?.user || "-",
    },
    { title: "主题", key: "subject", search: false, render: (_, record) => renderText(record.messageTask?.subject) },
    { title: "错误", key: "error", search: false, render: (_, record) => renderText(record.error) },
    { title: "响应", key: "response", search: false, render: (_, record) => renderText(record.response) },
  ];

  return (
    <ProTable<TaskLogRecord>
      cardBordered
      search={false}
      options={{ density: true, setting: true, reload: () => logsQuery.refetch() }}
      headerTitle="发送记录"
      columns={columns}
      rowKey={(record) => stringifyId(record.id)}
      dataSource={logsQuery.data?.messageTaskLogs as TaskLogRecord[] | undefined}
      loading={logsQuery.isPending || logsQuery.isFetching}
      onChange={onTableChange}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        current: Number(params.page),
        pageSize: Number(params.size),
        total: Number(logsQuery.data?.total || 0),
      }}
      scroll={{ x: "max-content" }}
    />
  );
}

export function NotificationTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { page: 1, size: 20, status: "0", ...Object.fromEntries(effectiveSearchParams.entries()) };
  const queryClient = useQueryClient();

  const [sendingTask, setSendingTask] = useState<DirectSendValues | undefined>();

  const tasksQuery = useQuery<ListMessageTasksWithStatusResponse>({
    queryKey: messageQueryKeys.tasks(effectiveSearchParams),
    queryFn: () => listMessageTasks(effectiveSearchParams),
  });
  const mediaInstancesQuery = useQuery<ListEnabledMessageMediaInstancesResponse>({
    queryKey: messageQueryKeys.mediaInstances(
      new URLSearchParams([
        ["page", "1"],
        ["size", "1000"],
      ]),
    ),
    queryFn: () =>
      listMessageMediaInstances(
        new URLSearchParams([
          ["page", "1"],
          ["size", "1000"],
        ]),
      ),
  });
  const mediaInstanceOptions = useMemo(
    () => buildMediaInstanceOptions(mediaInstancesQuery.data?.messageMediaInstances as MessageMediaInstanceRecord[] | undefined),
    [mediaInstancesQuery.data],
  );

  const reload = () => void queryClient.invalidateQueries({ queryKey: messageQueryKeys.tasksBase() });
  const activeStatus = searchParams.get("status") || "0";

  const onTableChange: TableProps<TaskRecord>["onChange"] = (pagination) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(pagination.current || 1));
    next.set("size", String(pagination.pageSize || defaultPageSize));
    setSearchParams(next);
  };

  const columns: ProColumns<TaskRecord>[] = [
    { title: "状态", key: "statusText", search: false, render: (_, record) => getStatusTag(Number(record.status)) },
    { title: "创建时间", key: "createdAt", search: false, render: (_, record) => formatUnix(record.createdAt) },
    { title: "发送时间", key: "sentAt", search: false, render: (_, record) => formatUnix(record.sentAt) },
    { title: "媒介", key: "media", search: false, render: (_, record) => record.messageMediaInstance?.name || "-" },
    { title: "接收人", key: "user", search: false, render: (_, record) => renderText(record.user || record.messageRecipient?.user) },
    { title: "主题", key: "subject", search: false, render: (_, record) => renderText(record.subject) },
    {
      title: "结果",
      key: "result",
      search: false,
      render: (_, record) => {
        if (!record.result) {
          return "-";
        }

        if (record.result.isOk) {
          return <Tag color="success">成功</Tag>;
        }

        return renderText(record.result.error || record.result.response);
      },
    },
    {
      title: "操作",
      key: "action",
      search: false,
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon
            tooltip="重发"
            icon={<RedoOutlined />}
            onClick={() =>
              setSendingTask({
                messageMediaInstanceId: stringifyId(record.messageMediaInstance?.id),
                user: record.user,
                subject: record.subject,
                body: record.body,
              })
            }
          />
          <Popconfirm
            title="确定删除这个任务吗？"
            onConfirm={() =>
              deleteMessageTask(record.id)
                .then(reload)
                .catch((error) => message.error(formatErrorMessage("删除任务失败", error)))
            }
          >
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<TaskRecord>
        cardBordered
        columns={columns}
        dataSource={tasksQuery.data?.messageTasks as TaskRecord[] | undefined}
        loading={tasksQuery.isPending || tasksQuery.isFetching}
        rowKey={(record) => stringifyId(record.id)}
        search={false}
        options={{ reload, density: true, setting: true }}
        onChange={onTableChange}
        scroll={{ x: "max-content" }}
        headerTitle="任务队列"
        toolBarRender={() => [
          <Segmented
            key="status"
            options={taskStatusOptions.map((option) => ({ label: option.label, value: option.value }))}
            value={activeStatus}
            onChange={(value) => {
              const next = new URLSearchParams(searchParams);
              next.set("status", String(value));
              next.set("page", "1");
              setSearchParams(next);
            }}
          />,
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setSendingTask({ messageMediaInstanceId: mediaInstanceOptions[0]?.value })}
          >
            直接发送
          </Button>,
        ]}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          current: Number(params.page),
          pageSize: Number(params.size),
          total: Number(tasksQuery.data?.total || 0),
        }}
      />

      {sendingTask ? (
        <DirectSendTaskModal
          mediaInstanceOptions={mediaInstanceOptions}
          initialValues={sendingTask}
          onClose={() => setSendingTask(undefined)}
          onSuccess={() => {
            setSendingTask(undefined);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
