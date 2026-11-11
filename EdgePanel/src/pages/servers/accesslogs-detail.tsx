import { Card, Spin, message } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { request, useLocation, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { getServerAccessLogs } from "@/services/servers";
import type { HTTPAccessLog } from "@/pb/models/model_http_access_log_pb";
import type { ListHTTPAccessLogsResponse } from "@/pb/service_http_access_log_pb";
import { AccessLogList, SearchForm, LogDetailModal, defaultPageParams } from "./accesslogs";
import { getServerTabList } from "./_shared/serverTabList";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

export default function ServerAccessLogs() {
  const { serverId } = useParams<{ serverId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const params = {
    ...defaultPageParams,
    ...Object.fromEntries(searchParams.entries()),
    hourTo: searchParams.get("hourFrom") || "",
  };

  const query = useQuery<ListHTTPAccessLogsResponse & { server?: { name?: string } }>({
    queryKey: serverQueryKeys.serverAccessLogs(serverId, searchParams),
    queryFn: () => getServerAccessLogs(serverId, searchParams),
    enabled: Boolean(serverId),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;
  const pageContainerLoading = loading && !data;

  const [selectedLog, setSelectedLog] = useState<HTTPAccessLog | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const baseRequestId = data?.requestId || "";
  const [loadedLogState, setLoadedLogState] = useState<{ baseRequestId: string; logs: HTTPAccessLog[]; requestId: string; hasMore: boolean }>();
  const isLoadedStateCurrent = loadedLogState?.baseRequestId === baseRequestId;
  const accumulatedLogs = isLoadedStateCurrent ? loadedLogState.logs : data?.httpAccessLogs || [];
  const currentRequestId = isLoadedStateCurrent ? loadedLogState.requestId : baseRequestId;
  const currentHasMore = isLoadedStateCurrent ? loadedLogState.hasMore : data?.hasMore || false;

  const handleSearch = (): void => {
    setLoadedLogState({ baseRequestId: "", logs: [], requestId: "", hasMore: false });
  };

  const handleLoadMore = async (): Promise<void> => {
    try {
      setLoadingMore(true);
      const response = await request<ListHTTPAccessLogsResponse>("/api/acccesslogs", {
        params: {
          ...params,
          requestId: currentRequestId,
          serverId,
        },
      });

      if (response.httpAccessLogs) {
        setLoadedLogState({
          baseRequestId,
          logs: [...accumulatedLogs, ...response.httpAccessLogs],
          requestId: response.requestId || "",
          hasMore: response.hasMore || false,
        });
      }
    } catch (error) {
      console.error("加载更多失败:", error);
      message.error(formatErrorMessage("加载更多失败", error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.server?.name,
        fallbackEntityLabel: "网站",
        tabList: getServerTabList(serverId!),
      })}
      header={{ title: data?.server?.name || "访问日志" }}
      tabList={getServerTabList(serverId!)}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
      loading={pageContainerLoading}
    >
      <SearchForm onSearch={handleSearch} />

      <Card>
        <Spin spinning={loading && accumulatedLogs.length === 0}>
          <AccessLogList
            logs={accumulatedLogs}
            keyword={searchParams.get("keyword") || ""}
            hasMore={currentHasMore}
            loading={loadingMore}
            onLoadMore={handleLoadMore}
            onLogClick={(log) => {
              setSelectedLog(log);
              setModalOpen(true);
            }}
          />
        </Spin>
      </Card>

      <LogDetailModal
        log={selectedLog}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </PageContainer>
  );
}
