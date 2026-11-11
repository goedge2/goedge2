import { Button, DatePicker, Form, Input, List, Space, Card } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import { useNavigate, useSearchParams } from "@umijs/max";
import { useQuery } from "@tanstack/react-query";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

import { adminQueryKeys } from "@/queries/keys";
import { listLogs } from "@/services/admins";
import type { ListLogsResponse } from "@/pb/service_log_pb";
import type { Log } from "@/pb/models/model_log_pb";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import LazySyntaxHighlighter from "@/components/LazySyntaxHighlighter";

type SearchValues = {
  date: Array<Dayjs>;
  keyword: string;
};

const defaultPageParams = {
  page: 1,
  size: 20,
  dayFrom: "",
  dayTo: "",
  keyword: "",
};

// 审计日志
export default function Logs() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };

  const query = useQuery<ListLogsResponse>({
    queryKey: adminQueryKeys.logs(effectiveSearchParams),
    queryFn: () => listLogs(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;
  const pageContainerLoading = loading && !data;

  const onChange = (page: number, pageSize: number) => {
    const pageParams = { page: page.toString(), size: pageSize.toString() };
    const newSearchParams = new URLSearchParams({ ...params, ...pageParams });
    navigate(`?${newSearchParams.toString()}`);
  };

  const onSearch = (values?: SearchValues) => {
    let dayFrom, dayTo;
    if (values?.date) {
      [dayFrom, dayTo] = values.date;
    }
    const newSearchParams = new URLSearchParams({
      ...params,
      page: "1",
      size: String(params.size),
      dayFrom: dayFrom?.format("YYYY-MM-DD") ?? "",
      dayTo: dayTo?.format("YYYY-MM-DD") ?? "",
      keyword: values?.keyword ?? "",
    });
    navigate(`?${newSearchParams.toString()}`);
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "审计日志" }}
      loading={pageContainerLoading}
    >
      <Card>
        <Form onFinish={onSearch}>
          <Space.Compact>
            <Form.Item name="date" noStyle>
              <DatePicker.RangePicker style={{ width: "100%", minWidth: "300px" }} />
            </Form.Item>
            <Form.Item name="keyword" noStyle>
              <Input placeholder="关键词" allowClear />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Space.Compact>
        </Form>

        <List<Log>
          itemLayout="vertical"
          dataSource={data?.logs}
          loading={loading}
          pagination={{
            position: "bottom",
            align: "end",
            showSizeChanger: true,
            showQuickJumper: true,
            pageSize: Number(params.size),
            defaultCurrent: 1,
            current: Number(params.page),
            total: Number(data?.total ?? 0),
            onChange: onChange,
          }}
          renderItem={(log) => (
            <List.Item key={log.id}>
              <List.Item.Meta title={formatLogIdentity(log)} description={dayjs.unix(Number(log.createdAt)).format("YYYY-MM-DD HH:mm:ss")} />
              <LogDescription description={log.description} />
            </List.Item>
          )}
        />
      </Card>
    </PageContainer>
  );
}

const LogDescription = ({ description }: { description: string }) => {
  const [showMore, setShowMore] = useState(false);
  const [desc, more] = description.split("===DIFF===");

  return (
    <Space size="small" orientation="vertical" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <span>{desc}</span>
      {more && (
        <>
          <a onClick={() => setShowMore(!showMore)}>{showMore ? "收起<<<" : "显示更多>>>"}</a>
          {showMore && (
            <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
              <LazySyntaxHighlighter
                language="diff"
                theme="atomDark"
                showLineNumbers={false}
                wrapLines={true}
                wrapLongLines={false}
                customStyle={{ width: "max-content", minWidth: "100%", maxWidth: "none", margin: 0 }}
              >
                {more}
              </LazySyntaxHighlighter>
            </div>
          )}
        </>
      )}
    </Space>
  );
};

function formatLogIdentity(log: Log) {
  if (!log.ip) {
    return log.userName;
  }

  return [log.userName, log.ip, log.region].filter(Boolean).join(" | ");
}
