import {
  Card,
  Empty,
  Input,
  Button,
  Spin,
  DatePicker,
  Select,
  Descriptions,
  Tag,
  Table,
  theme,
  Form,
  Space,
  message,
  Modal,
  Tabs,
  Typography,
  Listy,
} from "antd";
import {
  ClockCircleOutlined,
  ExportOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { request, useNavigate, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { listAccessLogs } from "@/services/servers";
import dayjs, { Dayjs } from "dayjs";
import type { HTTPAccessLog } from "@/pb/models/model_http_access_log_pb";
import type { ListHTTPAccessLogsResponse } from "@/pb/service_http_access_log_pb";
import { formatBytesSimple, formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import "./accesslogs.css";

export const defaultPageParams = { day: dayjs().format("YYYYMMDD"), size: 50, domain: "", keyword: "", ip: "", hourFrom: "" };
const keywordHelpItems = [
  { label: "单个状态码", value: "status:200" },
  { label: "状态码范围", value: "status:500-504" },
  { label: "查询IP", value: "ip:192.168.1.100" },
  { label: "查询URL", value: "https://cdn1.com/docs" },
  { label: "查询路径部分", value: "requestPath:/hello/world" },
  { label: "查询协议版本", value: "proto:HTTP/1.1" },
  { label: "协议", value: "scheme:http" },
  { label: "请求方法", value: "method:POST" },
  { label: "请求来源", value: "referer:example.com" },
];

interface SearchFormValues {
  domain?: string;
  keyword?: string;
  ip?: string;
  date?: Dayjs;
  hourFrom?: string;
}
const stringifyId = (value: bigint | number | string | undefined): string => (value == null ? "" : String(value));
const displayValue = (value: unknown, fallback = "-"): string => (value == null || String(value).trim() === "" ? fallback : String(value));
const statusColor = (status: number): string => (status < 300 ? "success" : status < 400 ? "processing" : status < 500 ? "warning" : "error");
const formatCost = (seconds: number): string => `${(Number(seconds || 0) * 1000).toFixed(3)} ms`;
const requestUrl = (log: HTTPAccessLog): string => {
  const host = log.host || log.hostname;
  return host ? `${log.scheme || "http"}://${host}${log.requestURI || log.requestPath || "/"}` : "";
};
const wafPolicyPath = (log: HTTPAccessLog): string => (log.firewallPolicyId > 0n ? `/#/servers/waf/policy/${log.firewallPolicyId}` : "");
const sortedHeaders = (
  headers: HTTPAccessLog["header"] | HTTPAccessLog["sentHeader"],
): Array<{ name: string; values: string[]; isGeneral: boolean }> =>
  Object.entries(headers || {})
    .map(([name, value]) => ({ name, values: value?.values || [], isGeneral: !name.toLowerCase().startsWith("x-") }))
    .sort((a, b) => a.name.localeCompare(b.name));
const sortedCookies = (cookies: HTTPAccessLog["cookie"]): Array<{ name: string; value: string }> =>
  Object.entries(cookies || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const aPrivate = a.name.startsWith("_");
      const bPrivate = b.name.startsWith("_");
      if (aPrivate !== bPrivate) return aPrivate ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
const decodeBody = (body: Uint8Array): string => {
  if (!body?.length) return "";
  try {
    return new TextDecoder().decode(body);
  } catch {
    return "[无法按 UTF-8 解码的二进制内容]";
  }
};

const KeywordText = ({ value, keyword }: { value: string; keyword: string }): React.ReactNode => {
  if (!value || !keyword) return value;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return value;
  return value.split(new RegExp(`(${escaped})`, "ig")).map((piece, index) =>
    piece.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${piece}-${index}`} className="access-log-keyword">
        {piece}
      </mark>
    ) : (
      <span key={`${piece}-${index}`}>{piece}</span>
    ),
  );
};

const ExternalLink = ({
  href,
  title,
  children,
  onClick,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
}): React.ReactNode =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer" title={title} onClick={onClick}>
      {children}
    </a>
  ) : (
    children
  );

export const SearchForm = ({ onSearch }: { onSearch: () => void }): React.ReactNode => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<SearchFormValues>();
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const initialValues: SearchFormValues = {
    domain: searchParams.get("domain") || "",
    keyword: searchParams.get("keyword") || "",
    ip: searchParams.get("ip") || "",
    date: searchParams.get("day") ? dayjs(searchParams.get("day"), "YYYYMMDD") : dayjs(),
    hourFrom: searchParams.get("hourFrom") || "",
  };
  const handleSearch = (values: SearchFormValues): void => {
    const params = new URLSearchParams({
      day: values.date?.format("YYYYMMDD") || dayjs().format("YYYYMMDD"),
      domain: values.domain || "",
      keyword: values.keyword || "",
      ip: values.ip || "",
      hourFrom: values.hourFrom || "",
      r: String(Date.now()),
    });
    navigate(`?${params.toString()}`);
    onSearch();
  };
  const handleReset = (): void => {
    form.resetFields();
    navigate("");
    onSearch();
  };
  return (
    <Card style={{ marginBottom: 16 }}>
      <Form form={form} layout="inline" onFinish={handleSearch} initialValues={initialValues}>
        <div className="access-log-search">
          <Form.Item name="keyword" label="关键词" className="access-log-keyword-field">
            <Input
              placeholder="搜索关键词"
              allowClear
              suffix={
                <QuestionCircleOutlined
                  title="系统帮助"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setHelpModalOpen(true)}
                  style={{ color: token.colorTextTertiary, cursor: "pointer" }}
                />
              }
            />
          </Form.Item>
          <div className="access-log-search-row">
            <Form.Item name="domain" label="域名">
              <Input placeholder="搜索域名" allowClear />
            </Form.Item>
            <Form.Item name="ip" label="IP地址">
              <Input placeholder="搜索IP地址" allowClear />
            </Form.Item>
            <Form.Item name="date" label="日期">
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="hourFrom" label="小时">
              <Select
                placeholder="选择小时"
                allowClear
                style={{ width: 120 }}
                options={Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, "0")}:00`, value: String(i).padStart(2, "0") }))}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </div>
        </div>
      </Form>
      <Modal title="系统帮助" open={helpModalOpen} footer={null} onCancel={() => setHelpModalOpen(false)} width={640} destroyOnHidden>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div style={{ color: token.colorTextSecondary }}>一些特殊的关键词：</div>
          {keywordHelpItems.map((item) => (
            <div key={item.label} className="access-log-help-row">
              <span style={{ color: token.colorTextSecondary }}>{item.label}</span>
              <code style={{ background: token.colorFillQuaternary, color: token.colorText }}>{item.value}</code>
            </div>
          ))}
        </Space>
      </Modal>
    </Card>
  );
};

const HeaderTable = ({
  headers,
  emptyText,
}: {
  headers: Array<{ name: string; values: string[]; isGeneral: boolean }>;
  emptyText: string;
}): React.ReactNode =>
  headers.length === 0 ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  ) : (
    <Table
      size="small"
      pagination={false}
      rowKey={(record) => record.key}
      dataSource={headers.flatMap((header) => header.values.map((value, index) => ({ ...header, key: `${header.name}-${index}`, value })))}
      columns={[
        {
          title: "Header",
          dataIndex: "name",
          key: "name",
          width: "34%",
          render: (value: string, record) => <span style={{ fontStyle: record.isGeneral ? "normal" : "italic" }}>{value}</span>,
        },
        {
          title: "值",
          dataIndex: "value",
          key: "value",
          render: (value: string) => <Typography.Text className="access-log-breakable">{value}</Typography.Text>,
        },
      ]}
    />
  );

export const LogDetailModal = ({ log, open, onClose }: { log: HTTPAccessLog | null; open: boolean; onClose: () => void }): React.ReactNode => {
  if (!log) return null;
  const cacheStatus = log.attrs?.["cache.status"] || "";
  const body = decodeBody(log.requestBody);
  const nodeId = stringifyId(log.node?.id) || stringifyId(log.nodeId);
  const clusterId = stringifyId(log.node?.nodeCluster?.id);
  const nodePath = nodeId ? `/#/clusters/nodes/${nodeId}/details` : "";
  const clusterPath = clusterId ? `/#/clusters/${clusterId}/dashboard` : "";
  const wafPath = wafPolicyPath(log);
  const summary = (
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
      <Descriptions.Item label="请求概要" span={2}>
        {displayValue(log.request)}
      </Descriptions.Item>
      <Descriptions.Item label="请求ID">{displayValue(log.requestId)}</Descriptions.Item>
      <Descriptions.Item label="ISO8601时间">{displayValue(log.timeISO8601)}</Descriptions.Item>
      <Descriptions.Item label="本地时间">{displayValue(log.timeLocal)}</Descriptions.Item>
      <Descriptions.Item label="耗时">{formatCost(log.requestTime)}</Descriptions.Item>
      <Descriptions.Item label="请求方法">
        <Tag>{displayValue(log.requestMethod)}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="协议">{displayValue(log.proto || log.serverProtocol)}</Descriptions.Item>
      <Descriptions.Item label="请求URI" span={2}>
        <Typography.Text className="access-log-breakable">{displayValue(log.requestURI || log.requestPath)}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label="Host" span={2}>
        {displayValue(log.host || log.hostname)}
      </Descriptions.Item>
      <Descriptions.Item label="完整请求地址" span={2}>
        <ExternalLink href={requestUrl(log)} title="新窗口打开请求地址">
          <Typography.Text className="access-log-breakable">{displayValue(requestUrl(log))}</Typography.Text>
        </ExternalLink>
      </Descriptions.Item>
      <Descriptions.Item label="终端地址">
        {displayValue(log.remoteAddr)}:{log.remotePort || 0}
      </Descriptions.Item>
      <Descriptions.Item label="原始IP">{displayValue(log.rawRemoteAddr)}</Descriptions.Item>
      <Descriptions.Item label="用户">{displayValue(log.remoteUser)}</Descriptions.Item>
      <Descriptions.Item label="请求来源" span={2}>
        {displayValue(log.referer, "[没有设置]")}
      </Descriptions.Item>
      <Descriptions.Item label="User-Agent" span={2}>
        <Typography.Text className="access-log-breakable">{displayValue(log.userAgent, "[没有设置]")}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label="状态">
        <Tag color={statusColor(log.status)}>
          {log.status} {log.statusMessage}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="源站状态">{log.originStatus > 0 ? log.originStatus : "未访问源站"}</Descriptions.Item>
      <Descriptions.Item label="文件类型">{displayValue(log.contentType)}</Descriptions.Item>
      <Descriptions.Item label="下行流量">
        {formatBytesSimple(log.bytesSent)}（{log.bytesSent.toString()} Bytes）
      </Descriptions.Item>
      <Descriptions.Item label="Body流量">
        {formatBytesSimple(log.bodyBytesSent)}（{log.bodyBytesSent.toString()} Bytes）
      </Descriptions.Item>
      <Descriptions.Item label="源站地址" span={2}>
        {displayValue(log.originAddress, "未访问源站")}
      </Descriptions.Item>
      <Descriptions.Item label="缓存状态">
        {cacheStatus ? <Tag color={cacheStatus === "HIT" ? "success" : cacheStatus === "STALE" ? "warning" : "default"}>{cacheStatus}</Tag> : "-"}
      </Descriptions.Item>
      <Descriptions.Item label="节点">
        {nodePath ? (
          <ExternalLink href={nodePath} title="新窗口查看节点详情">
            {displayValue(log.node?.name || nodeId)}
          </ExternalLink>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label="集群">
        {clusterPath ? (
          <ExternalLink href={clusterPath} title="新窗口查看集群看板">
            {displayValue(log.node?.nodeCluster?.name || clusterId)}
          </ExternalLink>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label="WAF策略">
        {wafPath ? (
          <ExternalLink href={wafPath} title="新窗口查看 WAF 策略">
            {displayValue(log.firewallPolicy?.name || stringifyId(log.firewallPolicyId))}
          </ExternalLink>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label="WAF规则组">
        {wafPath ? (
          <ExternalLink href={wafPath} title="新窗口查看 WAF 规则组">
            {displayValue(log.firewallRuleGroup?.name)}
          </ExternalLink>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label="WAF规则集">
        {wafPath ? (
          <ExternalLink href={wafPath} title="新窗口查看 WAF 规则集">
            {displayValue(log.firewallRuleSet?.name)}
          </ExternalLink>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label="WAF动作" span={2}>
        {log.firewallActions.length > 0
          ? log.firewallActions.map((action) => (
              <Tag key={action} color="error">
                {action}
              </Tag>
            ))
          : "-"}
      </Descriptions.Item>
      <Descriptions.Item label="标签" span={2}>
        {log.tags.length > 0 ? log.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : "-"}
      </Descriptions.Item>
      <Descriptions.Item label="错误信息" span={2}>
        {log.errors.length > 0 ? (
          <div className="access-log-error-list">
            {log.errors.map((error, index) => (
              <Typography.Text type="danger" key={`${error}-${index}`}>
                {error}
              </Typography.Text>
            ))}
          </div>
        ) : (
          "-"
        )}
      </Descriptions.Item>
    </Descriptions>
  );
  const cookies = sortedCookies(log.cookie);
  const tabs = [
    { key: "summary", label: "综合信息", children: summary },
    {
      key: "response",
      label: "响应数据（Response）",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Status">
              {log.status} {log.statusMessage}
            </Descriptions.Item>
          </Descriptions>
          <HeaderTable headers={sortedHeaders(log.sentHeader)} emptyText="暂时没有响应 Header。" />
        </Space>
      ),
    },
    {
      key: "request",
      label: "请求数据（Request）",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <HeaderTable headers={sortedHeaders(log.header)} emptyText="暂时没有请求 Header。" />
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="请求内容长度">{log.requestLength.toString()} Bytes</Descriptions.Item>
          </Descriptions>
          {body ? <pre className="access-log-body">{body}</pre> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时没有请求内容。" />}
        </Space>
      ),
    },
    {
      key: "cookie",
      label: "Cookie",
      children:
        cookies.length > 0 ? (
          <Table
            size="small"
            pagination={false}
            rowKey="name"
            dataSource={cookies}
            columns={[
              { title: "名称", dataIndex: "name", key: "name", width: "34%" },
              {
                title: "值",
                dataIndex: "value",
                key: "value",
                render: (value: string) => <Typography.Text className="access-log-breakable">{value}</Typography.Text>,
              },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时没有 Cookie 数据。" />
        ),
    },
    {
      key: "client",
      label: "终端信息",
      children: (
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="User-Agent" span={2}>
            <Typography.Text className="access-log-breakable">{displayValue(log.userAgent, "[没有设置]")}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="IP">{displayValue(log.remoteAddr)}</Descriptions.Item>
          <Descriptions.Item label="原始IP">{displayValue(log.rawRemoteAddr)}</Descriptions.Item>
          <Descriptions.Item label="端口">{log.remotePort || 0}</Descriptions.Item>
          <Descriptions.Item label="区域">{displayValue(log.region)}</Descriptions.Item>
        </Descriptions>
      ),
    },
  ];
  return (
    <Modal
      title={`访问日志详情 · ${log.requestId}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(1100px, calc(100vw - 32px))"
      destroyOnHidden
      styles={{ body: { maxHeight: "calc(100vh - 170px)", overflowY: "auto" } }}
    >
      <Tabs items={tabs} />
    </Modal>
  );
};

export const LogItem = ({
  log,
  keyword,
  onClick,
  striped = false,
}: {
  log: HTTPAccessLog;
  keyword: string;
  onClick: (log: HTTPAccessLog) => void;
  striped?: boolean;
}): React.ReactNode => {
  const { token } = theme.useToken();
  const nodeId = stringifyId(log.node?.id) || stringifyId(log.nodeId);
  const clusterId = stringifyId(log.node?.nodeCluster?.id);
  const cacheStatus = log.attrs?.["cache.status"] || "";
  const uri = log.requestURI || log.requestPath || "/";
  const href = requestUrl(log);
  const openDetail = (): void => onClick(log);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: row contains independent links and cannot be a button
    <div
      className={`access-log-row${striped ? " access-log-row-striped" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`查看访问日志 ${log.requestId || "详情"}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
      style={{
        borderInlineStartColor:
          log.status < 300 ? token.colorSuccess : log.status < 400 ? token.colorInfo : log.status < 500 ? token.colorWarning : token.colorError,
      }}
    >
      <div className="access-log-meta">
        <Tag color={statusColor(log.status)} className="access-log-status">
          <KeywordText value={String(log.status)} keyword={keyword} />
        </Tag>
        <span className="access-log-time">
          <ClockCircleOutlined /> {displayValue(log.timeLocal || log.timeISO8601)}
        </span>
        <span className="access-log-ip">
          <KeywordText value={log.remoteAddr || log.rawRemoteAddr} keyword={keyword} />
        </span>
        {log.region && <Tag bordered={false}>{log.region}</Tag>}
        {nodeId && (
          <ExternalLink href={`/#/clusters/nodes/${nodeId}/details`} title="新窗口查看节点详情" onClick={(event) => event.stopPropagation()}>
            <Tag icon={<CloudServerOutlined />} bordered={false}>
              {displayValue(log.node?.name, `节点 ${nodeId}`)}
            </Tag>
          </ExternalLink>
        )}
        {clusterId && (
          <ExternalLink href={`/#/clusters/${clusterId}/dashboard`} title="新窗口查看集群看板" onClick={(event) => event.stopPropagation()}>
            <Tag icon={<NodeIndexOutlined />} bordered={false}>
              {displayValue(log.node?.nodeCluster?.name, `集群 ${clusterId}`)}
            </Tag>
          </ExternalLink>
        )}
        {log.serverId > 0n && (
          <ExternalLink href={`/#/servers/${log.serverId}/accesslogs`} title="新窗口查看网站访问日志" onClick={(event) => event.stopPropagation()}>
            <Tag icon={<ThunderboltOutlined />} bordered={false}>
              {displayValue(log.serverName, "网站")}
            </Tag>
          </ExternalLink>
        )}
        {log.originStatus > 0 && log.originStatus !== log.status && <span className="access-log-origin-status">源站 {log.originStatus}</span>}
        {cacheStatus && (
          <Tag color={cacheStatus === "HIT" ? "success" : cacheStatus === "STALE" ? "warning" : "default"} bordered={false}>
            缓存 {cacheStatus.toLowerCase()}
          </Tag>
        )}
        {log.firewallActions.length > 0 && (
          <Tag color="error" bordered={false}>
            waf {log.firewallActions.join(", ")}
          </Tag>
        )}
        {log.firewallPolicyId > 0n && (
          <ExternalLink href={wafPolicyPath(log)} title="新窗口查看 WAF 规则详情" onClick={(event) => event.stopPropagation()}>
            <Tag bordered={false}>WAF{log.firewallRuleSet?.name ? ` · ${log.firewallRuleSet.name}` : ""}</Tag>
          </ExternalLink>
        )}
        {log.tags.length > 0 && (
          <span className="access-log-tags">
            {log.tags.map((tag) => (
              <Tag key={tag} bordered={false}>
                {tag}
              </Tag>
            ))}
          </span>
        )}
        <span className="access-log-cost">耗时 {formatCost(log.requestTime)}</span>
      </div>
      <div className="access-log-request">
        <span className="access-log-request-text">
          <KeywordText
            value={`${log.requestMethod} ${log.scheme || "http"}://${log.host || log.hostname}${uri} ${log.proto || log.serverProtocol}`}
            keyword={keyword}
          />
        </span>
        {href && (
          <a
            className="access-log-external"
            href={href}
            target="_blank"
            rel="noreferrer"
            title="新窗口打开请求地址"
            onClick={(event) => event.stopPropagation()}
          >
            <ExportOutlined />
          </a>
        )}
        {log.statusMessage && <span className="access-log-status-message">{log.statusMessage}</span>}
      </div>
    </div>
  );
};

interface AccessLogListProps {
  logs: HTTPAccessLog[];
  keyword: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<void>;
  onLogClick: (log: HTTPAccessLog) => void;
}
export const AccessLogList = ({ logs, keyword, hasMore, loading, onLoadMore, onLogClick }: AccessLogListProps): React.ReactNode => {
  const loadingRef = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  useLayoutEffect(() => {
    const updateListHeight = (): void => {
      const element = listContainerRef.current;
      if (!element) return;
      setListHeight(Math.max(240, window.innerHeight - element.getBoundingClientRect().top - 64));
    };
    updateListHeight();
    window.addEventListener("resize", updateListHeight, { passive: true });
    return () => window.removeEventListener("resize", updateListHeight);
  }, []);
  const handleScroll: React.UIEventHandler<HTMLElement> = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight > 200 || !hasMore || loading || loadingRef.current) return;
    loadingRef.current = true;
    onLoadMore().finally(() => {
      loadingRef.current = false;
    });
  };
  return (
    <div ref={listContainerRef} className="access-log-list">
      {logs.length === 0 ? (
        <Empty description="暂无数据" />
      ) : (
        <>
          <div className="access-log-list-viewport" style={{ height: listHeight }}>
            <Listy<HTTPAccessLog>
              virtual
              items={logs}
              rowKey="requestId"
              height={listHeight}
              itemRender={(log, index) => <LogItem log={log} keyword={keyword} striped={index % 2 === 1} onClick={onLogClick} />}
              onScroll={handleScroll}
              classNames={{ item: "access-log-listy-item" }}
              styles={{ item: { padding: 0, backgroundColor: "transparent" } }}
            />
            {loading && (
              <div className="access-log-loading">
                <Spin size="small" />
              </div>
            )}
          </div>
          <div className="access-log-list-footer">{!loading && !hasMore ? "没有更多数据" : !loading ? "继续滚动加载更多" : ""}</div>
        </>
      )}
    </div>
  );
};

export const AccessLogs = (): React.ReactNode => {
  const [searchParams] = useSearchParams();
  const params = { ...defaultPageParams, ...Object.fromEntries(searchParams.entries()), hourTo: searchParams.get("hourFrom") || "" };
  const query = useQuery<ListHTTPAccessLogsResponse>({
    queryKey: serverQueryKeys.accessLogs(searchParams),
    queryFn: () => listAccessLogs(searchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;
  const [selectedLog, setSelectedLog] = useState<HTTPAccessLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const baseRequestId = data?.requestId || "";
  const [loadedLogState, setLoadedLogState] = useState<{ baseRequestId: string; logs: HTTPAccessLog[]; requestId: string; hasMore: boolean }>();
  const isCurrent = loadedLogState?.baseRequestId === baseRequestId;
  const logs = isCurrent ? loadedLogState.logs : data?.httpAccessLogs || [];
  const currentRequestId = isCurrent ? loadedLogState.requestId : baseRequestId;
  const hasMore = isCurrent ? loadedLogState.hasMore : data?.hasMore || false;
  const handleLoadMore = async (): Promise<void> => {
    try {
      setLoadingMore(true);
      const response = await request<ListHTTPAccessLogsResponse>("/api/acccesslogs", { params: { ...params, requestId: currentRequestId } });
      if (response.httpAccessLogs)
        setLoadedLogState({
          baseRequestId,
          logs: [...logs, ...response.httpAccessLogs],
          requestId: response.requestId || "",
          hasMore: response.hasMore || false,
        });
    } catch (error) {
      message.error(formatErrorMessage("加载更多失败", error));
    } finally {
      setLoadingMore(false);
    }
  };
  const closeModal = (): void => {
    setModalOpen(false);
    setSelectedLog(null);
  };
  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "访问日志" }}
      loading={loading && !data}
    >
      <SearchForm onSearch={() => setLoadedLogState({ baseRequestId: "", logs: [], requestId: "", hasMore: false })} />
      <Card>
        <Spin spinning={loading && logs.length === 0}>
          <AccessLogList
            logs={logs}
            keyword={searchParams.get("keyword") || ""}
            hasMore={hasMore}
            loading={loadingMore}
            onLoadMore={handleLoadMore}
            onLogClick={(log) => {
              setSelectedLog(log);
              setModalOpen(true);
            }}
          />
        </Spin>
      </Card>
      <LogDetailModal log={selectedLog} open={modalOpen} onClose={closeModal} />
    </PageContainer>
  );
};

export default AccessLogs;
