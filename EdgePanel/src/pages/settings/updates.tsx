import { CloudDownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Descriptions, Popconfirm, Progress, Space, Switch, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@umijs/max";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ReadSystemUpdateResponse, SystemUpdateCandidate } from "@/pb/service_system_update_pb";
import { settingQueryKeys } from "@/queries/keys";
import { checkSystemUpdate, installSystemUpdate, readSystemUpdate, updateSystemUpdateConfig } from "@/services/settings";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

import { settingTabList } from "./_shared/settingTabList";

const releaseNotePlugins = [remarkGfm];
const pendingUpdateKey = "edgepanel.pending-system-update";
const updateStages: Record<string, string> = {
  preparing: "正在准备更新",
  downloading: "正在下载更新包",
  verifying: "下载完成，正在校验更新包",
  extracting: "正在解压更新包",
  installing: "正在备份并安装更新文件",
  migrating: "正在升级数据库",
  restarting: "更新文件安装及数据库迁移成功，准备重启",
  waiting_for_exit: "下载完成，等待服务退出后安装并重启",
};
const releaseNoteComponents: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

const formatSize = (size: bigint) => {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-";
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function SystemUpdates() {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingVersion, setPendingVersion] = useState(() => sessionStorage.getItem(pendingUpdateKey) ?? "");
  const query = useQuery({
    queryKey: settingQueryKeys.updates(),
    queryFn: readSystemUpdate,
    refetchInterval: (query) => (pendingVersion || query.state.data?.isInstalling ? 1000 : 5000),
    retry: false,
  });
  const hasAutomaticallyChecked = useRef(false);
  const [candidate, setCandidate] = useState<SystemUpdateCandidate>();
  const [hasChecked, setHasChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [completedVersion, setCompletedVersion] = useState("");
  const progress = query.data?.progress;
  const updateInProgress = Boolean(installing || query.data?.isInstalling || pendingVersion);

  useEffect(() => {
    if (!query.isSuccess) {
      return;
    }
    if (query.data.installError) {
      sessionStorage.removeItem(pendingUpdateKey);
      setPendingVersion("");
      return;
    }
    if (pendingVersion && !query.data.isInstalling && query.data.currentVersion === pendingVersion) {
      setCompletedVersion(pendingVersion);
      sessionStorage.removeItem(pendingUpdateKey);
      setPendingVersion("");
      setCandidate(undefined);
      return;
    }
    if (query.data.isInstalling && progress?.version && !pendingVersion) {
      setCompletedVersion("");
      sessionStorage.setItem(pendingUpdateKey, progress.version);
      setPendingVersion(progress.version);
    }
  }, [pendingVersion, progress?.version, query.data, query.isSuccess]);

  const saveAutoCheck = async (autoCheck: boolean) => {
    setSaving(true);
    try {
      await updateSystemUpdateConfig({
        autoCheck,
        ignoredVersion: query.data?.config?.ignoredVersion ?? "",
      });
      await queryClient.invalidateQueries({ queryKey: settingQueryKeys.updates() });
      message.success("更新检查设置已保存");
    } catch (error) {
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setSaving(false);
    }
  };

  const handleCheck = useCallback(
    async (notify = true) => {
      setChecking(true);
      try {
        const result = await checkSystemUpdate();
        setCandidate(result.candidate);
        setHasChecked(true);
        if (notify && result.hasUpdate && result.candidate) {
          message.success(`发现新版本 v${result.candidate.version}`);
        } else if (notify) {
          message.info("当前已经是最新版本");
        }
      } catch (error) {
        message.error(formatErrorMessage("检查更新失败", error));
      } finally {
        setChecking(false);
      }
    },
    [message],
  );

  useEffect(() => {
    if (!query.isSuccess || hasAutomaticallyChecked.current) {
      return;
    }
    hasAutomaticallyChecked.current = true;
    void handleCheck(false);
  }, [handleCheck, query.isSuccess]);

  const handleInstall = async () => {
    if (!candidate) {
      return;
    }
    setInstalling(true);
    try {
      await installSystemUpdate(candidate.version);
      queryClient.setQueryData<ReadSystemUpdateResponse>(settingQueryKeys.updates(), (previous) =>
        previous ? { ...previous, isInstalling: true, installError: "", progress: undefined } : previous,
      );
      sessionStorage.setItem(pendingUpdateKey, candidate.version);
      setPendingVersion(candidate.version);
      setCompletedVersion("");
      await queryClient.invalidateQueries({ queryKey: settingQueryKeys.updates() });
      message.info("更新任务已启动，可在此查看下载及安装进度");
    } catch (error) {
      message.error(formatErrorMessage("启动更新失败", error));
    } finally {
      setInstalling(false);
    }
  };

  const config = query.data?.config;

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: location.pathname, tabList: settingTabList })}
      header={{ title: "系统设置" }}
      loading={query.isPending && !query.data}
      tabList={settingTabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
    >
      {query.data?.installError ? (
        <Alert type="error" showIcon message="上次更新失败" description={query.data.installError} style={{ marginBottom: 16 }} />
      ) : null}
      {completedVersion ? <Alert type="success" showIcon title={`更新成功，服务已运行 v${completedVersion}`} className="mb-4" /> : null}
      {updateInProgress ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title={query.isError ? "暂时无法连接服务，正在尝试重新连接" : (updateStages[progress?.stage ?? ""] ?? "更新任务已启动")}
          description={
            <div aria-live="polite">
              <div>目标版本：v{pendingVersion || progress?.version || candidate?.version || "-"}</div>
              {progress?.stage === "downloading" ? (
                <>
                  {Number(progress.totalBytes) > 0 ? (
                    <Progress
                      percent={Math.min(100, Math.round((Number(progress.downloadedBytes ?? 0) / Number(progress.totalBytes)) * 1000) / 10)}
                      status="active"
                    />
                  ) : null}
                  <div>
                    已下载 {formatSize(progress.downloadedBytes ?? 0n)}
                    {Number(progress.totalBytes) > 0 ? ` / ${formatSize(progress.totalBytes)}` : "（总大小未知）"}
                  </div>
                </>
              ) : null}
              {progress?.stage === "restarting" || progress?.stage === "waiting_for_exit" ? (
                <div>服务重启期间连接可能短暂中断，恢复后将自动确认更新结果。</div>
              ) : null}
            </div>
          }
        />
      ) : null}
      {query.isError && !updateInProgress ? <Alert type="error" showIcon title="读取更新状态失败，正在重试" className="mb-4" /> : null}

      <Card title="当前版本" style={{ marginBottom: 16 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="EdgeAPI 版本">v{query.data?.currentVersion ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="自动检查">
            <Switch checked={config?.autoCheck ?? true} loading={saving} onChange={saveAutoCheck} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="检查更新"
        extra={
          <Button icon={<ReloadOutlined />} loading={checking} onClick={() => void handleCheck()}>
            检查更新
          </Button>
        }
      >
        {!candidate ? (
          <Typography.Text type="secondary">
            {checking ? "正在检查更新..." : hasChecked ? "当前已经是最新版本。" : "正在准备检查更新..."}
          </Typography.Text>
        ) : null}
        {candidate ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="来源">{candidate.source}</Descriptions.Item>
              <Descriptions.Item label="版本">v{candidate.version}</Descriptions.Item>
              <Descriptions.Item label="发布日期">
                {candidate.publishedAt ? dayjs(candidate.publishedAt).format("YYYY-MM-DD HH:mm:ss") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="更新包">
                {candidate.assetName} ({formatSize(candidate.size)})
              </Descriptions.Item>
              <Descriptions.Item label="SHA-256" span={2}>
                <Typography.Text code>{candidate.sha256 || "Release 未提供"}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
            {candidate.releaseURL ? (
              <Typography.Link href={candidate.releaseURL} target="_blank">
                查看 Release 页面
              </Typography.Link>
            ) : null}
            {candidate.downloadURL ? (
              <Typography.Link href={candidate.downloadURL} target="_blank">
                下载更新包
              </Typography.Link>
            ) : null}
            {candidate.description ? (
              <Typography className="min-w-0 wrap-anywhere [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_th]:border [&_th]:border-(--ant-color-border-secondary) [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-(--ant-color-border-secondary) [&_td]:px-3 [&_td]:py-2 [&_img]:max-w-full [&_img]:h-auto">
                <ReactMarkdown remarkPlugins={releaseNotePlugins} components={releaseNoteComponents}>
                  {candidate.description}
                </ReactMarkdown>
              </Typography>
            ) : null}
            {query.data?.isPrimary ? (
              <Popconfirm
                title={`确认更新到 v${candidate.version}？`}
                description="服务会在数据库迁移成功后重启。"
                okText="开始更新"
                cancelText="取消"
                onConfirm={handleInstall}
              >
                <Button type="primary" icon={<CloudDownloadOutlined />} loading={updateInProgress}>
                  一键更新
                </Button>
              </Popconfirm>
            ) : (
              <Alert type="info" showIcon message="当前不是主 API 节点" description={<Typography.Text code>goedge2-api update</Typography.Text>} />
            )}
          </Space>
        ) : null}
      </Card>
    </PageContainer>
  );
}
