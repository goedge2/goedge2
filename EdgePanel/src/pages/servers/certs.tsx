import { App, Button, Form, Input, Modal, Popconfirm, Space, Switch, Tag, message, Spin, TableProps } from "antd";
import { PageContainer, ProTable, type ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { useFetchData } from "@/utils";
import dayjs from "dayjs";
import { request, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { listCerts } from "@/services/servers";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

import type { FindEnabledSSLCertConfigResponse, ListSSLCertsResponse } from "@/pb/service_ssl_cert_pb";
import type { SSLCert } from "@/pb/models/model_ssl_cert_pb";
import { useState } from "react";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import { DeleteOutlined, SettingOutlined } from "@ant-design/icons";
import { CreateCertPopup } from "./_components/CreateCertPopup";
import { DomainPreviewCell } from "./_components/DomainPreviewCell";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage, getErrorMessage } from "@/utils";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

export default function Certs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const searchParamsWithoutUser = new URLSearchParams(searchParams);
  searchParamsWithoutUser.delete("userId");
  const effectiveSearchParams = withDefaultPageSize(searchParamsWithoutUser, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const query = useQuery<ListSSLCertsResponse>({
    queryKey: serverQueryKeys.certs(effectiveSearchParams),
    queryFn: () => listCerts(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const [popupCertId, setPopupCertId] = useState<number>(0);
  const [popupCreateCert, setPopupCreateCert] = useState<boolean>(false);

  const { modal } = App.useApp();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const columns: ProColumns<SSLCert>[] = [
    {
      title: "是否有效",
      dataIndex: "isAvailable",
      hideInTable: true,
      valueType: "select",
      valueEnum: {
        "1": { text: "有效中", status: "Success" },
        "0": { text: "已过期", status: "Error" },
      },
    },
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "证书说明、域名、发行组织" },
    },
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "证书说明",
      dataIndex: "name",
      search: false,
      render: (_, cert) => (
        <Space size="small" orientation="vertical">
          <span>{cert.name}</span>
          {cert.isACME && <Tag color="blue">ACME</Tag>}
        </Space>
      ),
    },
    {
      title: "证书发行组织",
      dataIndex: "issuerName",
      search: false,
    },
    {
      title: "域名",
      dataIndex: "dnsNames",
      search: false,
      render: (_, cert) => <DomainPreviewCell domains={cert.dnsNames} previewCount={5} />,
    },
    {
      title: "开始日期",
      dataIndex: "timeBeginAt",
      search: false,
      render: (_, cert) => dayjs.unix(Number(cert.timeBeginAt)).format("YYYY-MM-DD"),
    },
    {
      title: "结束日期",
      dataIndex: "timeEndAt",
      search: false,
      render: (_, cert) => dayjs.unix(Number(cert.timeEndAt)).format("YYYY-MM-DD"),
    },
    {
      title: "引用网站",
      dataIndex: "countServers",
      search: false,
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      render: (_, cert) => {
        if (cert.errorMessage) {
          return (
            <Tag
              color="magenta"
              onClick={() => {
                modal.warning({
                  title: dayjs.unix(Number(cert.errorDate)).format("YYYY-MM-DD HH:mm:ss"),
                  content: cert.errorMessage,
                });
              }}
            >
              任务失败
            </Tag>
          );
        }
        if (dayjs.unix(Number(cert.timeEndAt)).isBefore(dayjs())) {
          return <Tag color="red">已过期</Tag>;
        }
        if (cert.issuerName === "SelfSigned") {
          return <Tag color="orange">自签名证书</Tag>;
        }
        return cert.isOn ? <Tag color="green">有效中</Tag> : <Tag color="blue">未启用</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      valueType: "option",
      width: 130,
      render: (_, cert) => {
        const certId = cert.id;
        if (certId == null) return null;
        return (
          <Space size="small">
            <TableActionIcon tooltip="设置" icon={<SettingOutlined />} onClick={() => setPopupCertId(Number(certId))} />
            <Popconfirm title="确定删除吗？" onConfirm={() => onDelete(certId)}>
              <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const onTableChange: TableProps<SSLCert>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParamsWithoutUser);

    if (pagination.current) {
      newParams.set("page", String(pagination.current));
    } else {
      newParams.delete("page");
    }
    if (pagination.pageSize) {
      newParams.set("size", String(pagination.pageSize));
    }

    if (s.order && s.columnKey) {
      newParams.set("sortField", s.columnKey as string);
      newParams.set("sortOrder", s.order);
    } else {
      newParams.delete("sortField");
      newParams.delete("sortOrder");
    }

    setSearchParams(newParams);
  };

  const onDelete = (certId: string | number | bigint) => {
    request(`/api/cert?sslCertId=${certId}`, { method: "DELETE" })
      .then(() => {
        reload();
      })
      .catch((error) => {
        console.error("删除证书失败:", error);
        message.error(formatErrorMessage("删除证书失败", error));
      });
  };

  const onBatchDelete = async (certIds: (string | bigint)[]) => {
    const total = certIds.length;
    setBatchLoading(true);
    setBatchProgress({ current: 0, total });

    let successCount = 0;
    let failCount = 0;
    let firstErrorMessage = "";

    for (let i = 0; i < certIds.length; i++) {
      try {
        await request(`/api/cert?sslCertId=${certIds[i]}`, { method: "DELETE" });
        successCount++;
      } catch (error) {
        console.error(`delete cert error for ${certIds[i]}:`, error);
        failCount++;
        if (firstErrorMessage === "") {
          firstErrorMessage = getErrorMessage(error, "未知错误");
        }
      }
      setBatchProgress({ current: i + 1, total });
    }

    setBatchLoading(false);
    setBatchProgress({ current: 0, total: 0 });

    if (failCount > 0) {
      message.warning(
        firstErrorMessage
          ? `操作完成: ${successCount} 成功, ${failCount} 失败。首个错误: ${firstErrorMessage}`
          : `操作完成: ${successCount} 成功, ${failCount} 失败`,
      );
    } else {
      message.success(`已删除 ${successCount} 个证书`);
    }

    setSelectedRowKeys([]);
    reload();
  };

  const reload = () => {
    setPopupCreateCert(false);
    void query.refetch();
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{
        title: "SSL证书",
        extra: [
          <Button key="create" type="primary" onClick={() => setPopupCreateCert(true)}>
            上传/申请证书
          </Button>,
        ],
      }}
    >
      <ProTable<SSLCert>
        columns={columns}
        dataSource={data?.certs}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        scroll={{ x: "max-content" }}
        options={{
          reload: () => {
            reload();
          },
          density: true,
          setting: true,
        }}
        columnsState={{
          persistenceKey: "certs-table-columns",
          persistenceType: "localStorage",
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
        }}
        form={{
          initialValues: {
            keyword: params.keyword,
            isAvailable: searchParams.get("isAvailable") === "1" ? "1" : searchParams.get("isExpired") === "1" ? "0" : undefined,
          },
        }}
        onSubmit={(formParams) => {
          const newParams = new URLSearchParams(searchParamsWithoutUser);

          newParams.set("keyword", formParams.keyword || "");

          newParams.delete("isAvailable");
          newParams.delete("isExpired");
          if (formParams.isAvailable === "1") {
            newParams.set("isAvailable", "1");
          } else if (formParams.isAvailable === "0") {
            newParams.set("isExpired", "1");
          }

          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParamsWithoutUser);
          newParams.set("keyword", "");
          newParams.delete("isAvailable");
          newParams.delete("isExpired");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        tableAlertRender={false}
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Space key="batch-actions" wrap>
              <span style={{ marginRight: 8 }}>已选择 {selectedRowKeys.length} 项</span>
              {batchLoading && (
                <span style={{ marginRight: 8 }}>
                  <Spin size="small" /> 处理中 {batchProgress.current}/{batchProgress.total}
                </span>
              )}
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 个证书吗？`}
                onConfirm={() => {
                  onBatchDelete(selectedRowKeys as string[]);
                }}
                disabled={batchLoading}
              >
                <Button type="link" danger disabled={batchLoading} style={{ padding: "4px 8px" }}>
                  批量删除
                </Button>
              </Popconfirm>
              <Button type="link" onClick={() => setSelectedRowKeys([])} style={{ padding: "4px 8px" }}>
                取消
              </Button>
            </Space>
          ),
        ]}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: Number(params.size),
          current: Number(params.page),
          total: Number(data?.total),
        }}
      />

      {popupCertId > 0 && <CertDetailPopup certId={popupCertId} onCancel={() => setPopupCertId(0)} />}
      {popupCreateCert && <CreateCertPopup onCancel={() => setPopupCreateCert(false)} onOk={reload} />}
    </PageContainer>
  );
}

type CertDetailProps = {
  certId: string | number;
  onCancel?: () => void;
};

export const CertDetailPopup = ({ certId, onCancel }: CertDetailProps) => {
  const { data, loading } = useFetchData<FindEnabledSSLCertConfigResponse>(`/api/cert/${certId}`);
  const [form] = Form.useForm();

  return (
    <Modal
      open={true}
      title="证书详情"
      onCancel={onCancel}
      footer={null}
      loading={loading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "50%",
      }}
    >
      <Form form={form} layout="vertical" initialValues={data?.cert} labelCol={{ span: 3 }} wrapperCol={{ span: 24 }}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="证书说明" layout="horizontal">
          <Input placeholder="请输入证书说明" />
        </Form.Item>
        <Form.Item label="有效期" layout="horizontal">
          {dayjs.unix(Number(data?.cert?.timeBeginAt)).format("YYYY-MM-DD HH:mm:ss")}
          {} ~ {}
          {dayjs.unix(Number(data?.cert?.timeEndAt)).format("YYYY-MM-DD HH:mm:ss")}
        </Form.Item>
        <Form.Item label="发行组织" layout="horizontal">
          {data?.cert?.issuerName}
        </Form.Item>
        <Form.Item name="dnsNames" label="域名" help="每行一个域名">
          <MultiLineArrayTextArea autoSize={{ minRows: 2, maxRows: 6 }} spellCheck={false} />
        </Form.Item>

        <Form.Item name="certData" label="证书内容">
          <Input.TextArea placeholder="请输入证书内容" autoSize={{ minRows: 2, maxRows: 8 }} spellCheck={false} />
        </Form.Item>
        <Form.Item name="keyData" label="私钥内容">
          <Input.TextArea placeholder="请输入私钥内容" autoSize={{ minRows: 2, maxRows: 6 }} spellCheck={false} />
        </Form.Item>

        <Form.Item name="description" label="详细说明">
          <Input.TextArea placeholder="请输入证书详细说明" autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="isOn" label="启用当前证书" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
