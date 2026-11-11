import React, { useEffect, useState } from "react";
import { request } from "@umijs/max";
import { Button, Form, Input, Modal, Space, Table, Tag, message } from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import type { SSLCert } from "@/pb/models/model_ssl_cert_pb";
import type { FindEnabledSSLCertConfigResponse } from "@/pb/service_ssl_cert_pb";
import { CustomFormItemProps, formatErrorMessage } from "@/utils";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { CreateCertPopup } from "@/pages/servers/_components/CreateCertPopup";

// 证书选择控件
export const CertsSelector: React.FC<CustomFormItemProps<SSLCert[]> & { single?: boolean }> = ({ value: certs, onChange, single = false }) => {
  const form = Form.useFormInstance();
  const defaultPageSize = useDefaultPageSize();
  const [showPopup, setShowPopup] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [data, setData] = useState<{ certs: SSLCert[]; total: number }>({ certs: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchDomains, setSearchDomains] = useState<string[] | undefined>(undefined);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<SSLCert[]>([]);

  useEffect(() => {
    if (!showPopup) {
      return;
    }

    let cancelled = false;

    const loadCerts = async () => {
      setLoading(true);

      const params: { offset: number; size: number; keyword: string; domains?: string[] } = {
        offset: (page - 1) * pageSize,
        size: pageSize,
        keyword: searchKeyword,
      };
      if (searchDomains && searchDomains.length > 0) {
        params.domains = searchDomains;
      }

      try {
        const res = await request<{ certs: SSLCert[]; total: number }>("/api/certs", { params });
        if (!cancelled) {
          setData(res);
        }
      } catch (error) {
        if (!cancelled) {
          setData({ certs: [], total: 0 });
          message.error(formatErrorMessage("加载证书列表失败", error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCerts();

    return () => {
      cancelled = true;
    };
  }, [showPopup, page, pageSize, searchKeyword, searchDomains]);

  const openModal = () => {
    const serverNames = form.getFieldValue("serverNames") || [];
    setSearchDomains(serverNames.length > 0 ? serverNames : undefined);
    setPage(1);
    setPageSize(defaultPageSize);
    setSearchKeyword("");

    if (certs) {
      setSelectedRowKeys(certs.flatMap((cert) => (cert.id == null ? [] : [cert.id])));
      setSelectedRows([...certs]);
    } else {
      setSelectedRowKeys([]);
      setSelectedRows([]);
    }

    setShowPopup(true);
  };

  const handleOk = () => {
    const merged = [...(certs || []), ...selectedRows];
    const uniqueCerts = Array.from(new Map(merged.map((c) => [c.id, c])).values());
    const finalCerts = uniqueCerts.filter((cert) => cert.id != null && selectedRowKeys.includes(cert.id));

    onChange?.(single ? finalCerts.slice(-1) : finalCerts);
    setShowPopup(false);
  };

  const handleCancel = () => {
    setShowPopup(false);
    setSearchKeyword("");
    setSearchDomains(undefined);
    setPage(1);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleCreateOk = async (sslCertId?: bigint) => {
    setShowCreatePopup(false);
    if (!sslCertId) return;

    try {
      const res = await request<FindEnabledSSLCertConfigResponse>(`/api/cert/${sslCertId}`);
      if (res?.cert) {
        const newCert = res.cert;
        const merged = [...(certs || []), newCert];
        const uniqueCerts = Array.from(new Map(merged.map((c) => [c.id, c])).values());
        onChange?.(single ? [newCert] : uniqueCerts);
      } else {
        message.warning("证书创建成功，但获取证书信息失败");
      }
    } catch {
      message.warning("证书创建成功，但获取证书信息失败");
    }
  };

  const columns: TableProps<SSLCert>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
    },
    {
      title: "证书说明",
      dataIndex: "name",
      render: (_, cert) => (
        <Space size="small" orientation="vertical">
          <span>{cert.name}</span>
          {cert.isACME && <Tag color="blue">ACME</Tag>}
        </Space>
      ),
    },
    {
      title: "域名",
      dataIndex: "dnsNames",
      render: (_, cert) => (
        <Space size="small" orientation="vertical" wrap>
          {cert.dnsNames.map((domain) => (
            <Tag key={domain}>{domain}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "开始日期",
      dataIndex: "timeBeginAt",
      render: (_, cert) => dayjs.unix(Number(cert.timeBeginAt)).format("YYYY-MM-DD"),
    },
    {
      title: "结束日期",
      dataIndex: "timeEndAt",
      render: (_, cert) => dayjs.unix(Number(cert.timeEndAt)).format("YYYY-MM-DD"),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (_, cert) => {
        if (cert?.errorMessage && cert.errorMessage.length > 0) {
          return <Tag color="magenta">任务失败</Tag>;
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
  ];

  return (
    <div>
      <div style={{ marginBottom: certs && certs.length > 0 ? 10 : 0 }}>
        {certs?.map((cert: SSLCert) => {
          const isExpired = dayjs.unix(Number(cert.timeEndAt)).isBefore(dayjs());
          return (
            <Tag key={cert.id} closeIcon onClose={() => onChange?.(certs.filter((c) => c.id !== cert.id))} style={{ marginBottom: 4 }}>
              [
              {cert.dnsNames.length > 3
                ? `${cert.dnsNames.slice(0, 3).join(" ")} 等${cert.dnsNames.length}个域名`
                : cert.dnsNames.join(" ") || cert.name}
              ]
              {cert.timeEndAt ? (
                <span style={isExpired ? { color: "red" } : {}}> / 有效至 {dayjs.unix(Number(cert.timeEndAt)).format("YYYY-MM-DD")}</span>
              ) : null}
            </Tag>
          );
        })}
      </div>
      <Space>
        <Button onClick={openModal}>选择证书</Button>
        <Button onClick={() => setShowCreatePopup(true)}>上传/申请证书</Button>
      </Space>
      {showPopup && (
        <Modal
          title="选择证书"
          open={true}
          onCancel={handleCancel}
          onOk={handleOk}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "50%",
            xxl: "40%",
          }}
        >
          <Space orientation="vertical" style={{ width: "100%", marginBottom: 16 }}>
            <Space>
              <Input.Search
                placeholder="证书说明、域名、发行组织"
                allowClear
                onSearch={(value) => {
                  setSearchKeyword(value);
                  setPage(1);
                }}
                style={{ width: 300 }}
              />
            </Space>
            {searchDomains && searchDomains.length > 0 && (
              <Space wrap style={{ marginTop: 8 }}>
                <span style={{ color: "#888" }}>按域名过滤：</span>
                {searchDomains.map((d) => (
                  <Tag key={d}>{d}</Tag>
                ))}
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSearchDomains(undefined);
                    setPage(1);
                  }}
                >
                  清除过滤
                </Button>
              </Space>
            )}
          </Space>
          <Table<SSLCert>
            rowKey="id"
            columns={columns}
            dataSource={data?.certs}
            loading={loading}
            size="small"
            scroll={{ x: "max-content" }}
            rowSelection={{
              type: single ? "radio" : "checkbox",
              selectedRowKeys,
              preserveSelectedRowKeys: !single,
              onChange: (newSelectedRowKeys, newSelectedRows) => {
                setSelectedRowKeys(newSelectedRowKeys);
                const rowMap = new Map(selectedRows.map((r) => [r.id, r]));
                newSelectedRows.forEach((r) => r && rowMap.set(r.id, r));
                setSelectedRows(Array.from(rowMap.values()));
              },
            }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: Number(data?.total) || 0,
              showSizeChanger: true,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        </Modal>
      )}
      {showCreatePopup && (
        <CreateCertPopup initialDnsNames={form.getFieldValue("serverNames") || []} onCancel={() => setShowCreatePopup(false)} onOk={handleCreateOk} />
      )}
    </div>
  );
};
