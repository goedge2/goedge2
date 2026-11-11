import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, useSearchParams } from "@umijs/max";
import type { ListEnabledAdminsResponse } from "@/pb/service_admin_pb";
import { Button, Input, Space, Modal, Form, Switch, App, Popconfirm, TableProps, message, Spin } from "antd";
import { PageContainer, ProTable, type ProColumns } from "@ant-design/pro-components";
import type { Admin } from "@/pb/models/model_admin_pb";
import { useState } from "react";
import { DeleteOutlined, FormOutlined } from "@ant-design/icons";
import TableActionIcon from "@/components/TableActionIcon";
import PasswordInput from "@/components/PasswordInput";
import { adminQueryKeys } from "@/queries/keys";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";
import { listAdmins } from "@/services/admins";
import { getErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

export default function Admins() {
  const queryClient = useQueryClient();
  const [createAdminPopup, setCreateAdminPopup] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | undefined>(undefined);

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };

  const query = useQuery<ListEnabledAdminsResponse>({
    queryKey: adminQueryKeys.list(effectiveSearchParams),
    queryFn: () => listAdmins(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.listBase() });
  };

  const onTableChange: TableProps<Admin>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParams);

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

  const columns: ProColumns<Admin>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "搜索系统用户" },
    },
    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      width: 80,
      search: false,
    },
    {
      title: "用户名",
      dataIndex: "username",
      search: false,
    },
    {
      title: "全称",
      dataIndex: "fullname",
      search: false,
    },
    {
      title: "允许登录",
      dataIndex: "canLogin",
      search: false,
      valueType: "select",
      valueEnum: {
        true: { text: "是", status: "Success" },
        false: { text: "否", status: "Error" },
      },
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      valueType: "select",
      valueEnum: {
        true: { text: "启用", status: "Success" },
        false: { text: "禁用", status: "Error" },
      },
    },
    {
      title: "OTP",
      key: "otp",
      search: false,
      render: (_, admin) => <span style={{ color: admin.otpLogin?.isOn ? "#1677ff" : "#888" }}>{admin.otpLogin?.isOn ? "已开启" : "未开启"}</span>,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 130,
      valueType: "option",
      render: (_, admin) => (
        <Space size="small">
          <TableActionIcon
            tooltip="修改"
            icon={<FormOutlined />}
            onClick={() => {
              setCurrentAdmin(admin);
              setCreateAdminPopup(true);
            }}
          />
          <Popconfirm title="确定删除吗？" onConfirm={() => onDelete([String(admin.id)])}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDelete = async (adminIds: string[]) => {
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: adminIds.length });
    let successCount = 0;
    let failCount = 0;
    let firstErrorMessage = "";

    for (let i = 0; i < adminIds.length; i++) {
      try {
        await request(`/api/admin?adminId=${adminIds[i]}`, { method: "DELETE" });
        successCount++;
      } catch (error) {
        console.error(`删除系统用户失败 ${adminIds[i]}:`, error);
        failCount++;
        if (firstErrorMessage === "") {
          firstErrorMessage = getErrorMessage(error, "未知错误");
        }
      }
      setBatchProgress({ current: i + 1, total: adminIds.length });
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
      message.success(`成功删除 ${successCount} 个系统用户`);
    }
    reload();
    setSelectedRowKeys([]);
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "系统用户" }}
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => {
            setCurrentAdmin(undefined);
            setCreateAdminPopup(true);
          }}
        >
          创建系统用户
        </Button>,
      ]}
    >
      <ProTable<Admin>
        columns={columns}
        dataSource={data?.admins}
        loading={loading}
        rowKey={(admin) => String(admin.id)}
        scroll={{ x: "max-content" }}
        onChange={onTableChange}
        options={{
          reload: () => reload(),
          density: true,
          setting: true,
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
        }}
        form={{
          initialValues: {
            keyword: params.keyword,
          },
        }}
        onSubmit={(formParams) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", formParams.keyword || "");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", "");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: Number(params.size),
          current: Number(params.page),
          total: Number(data?.total),
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
                title={`确定删除选中的 ${selectedRowKeys.length} 个系统用户吗？`}
                onConfirm={() => {
                  onDelete(selectedRowKeys as string[]);
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
      />
      {createAdminPopup && (
        <AdminFormPopup
          admin={currentAdmin}
          onCancel={() => setCreateAdminPopup(false)}
          onOk={() => {
            reload();
            setCreateAdminPopup(false);
          }}
        />
      )}
    </PageContainer>
  );
}

export const AdminFormPopup = ({ onCancel, onOk, admin }: { onCancel?: () => void; onOk?: () => void; admin?: Admin }) => {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const isEdit = !!admin;

  interface AdminFormValues {
    fullname: string;
    username: string;
    password?: string;
    canLogin: boolean;
    isSuper: boolean;
    isOn?: boolean;
    otpOn?: boolean;
    resetOTP?: boolean;
  }

  const onFinish = async (values: AdminFormValues) => {
    try {
      setConfirmLoading(true);
      if (isEdit && admin) {
        const payload = {
          adminId: admin.id,
          fullname: values.fullname,
          username: admin.username,
          password: values.password || "",
          canLogin: !!values.canLogin,
          isSuper: !!values.isSuper,
          isOn: !!values.isOn,
          otpOn: !!values.otpOn,
          resetOTP: !!values.resetOTP,
        };
        await request("/api/admin", {
          method: "PUT",
          data: payload,
        });
      } else {
        const payload = {
          fullname: values.fullname,
          username: values.username,
          password: values.password,
          canLogin: !!values.canLogin,
          isSuper: !!values.isSuper,
          otpOn: !!values.otpOn,
        };
        await request("/api/admin", {
          method: "POST",
          data: payload,
        });
      }

      if (onOk) onOk();
    } catch (error) {
      console.error(isEdit ? "修改系统用户失败:" : "创建系统用户失败:", error);
      modal.error({
        title: isEdit ? "修改系统用户失败" : "创建系统用户失败",
        content: getErrorMessage(error, "未知错误"),
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      title={isEdit ? "修改系统用户" : "创建系统用户"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      width={{ xs: "90%", sm: "80%", md: "70%", lg: "60%", xl: "50%", xxl: "40%" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 24 }}
        initialValues={{
          canLogin: admin ? admin.canLogin : true,
          isSuper: admin ? admin.isSuper : false,
          fullname: admin?.fullname,
          username: admin?.username,
          isOn: admin ? admin.isOn : true,
          otpOn: admin?.otpLogin?.isOn ?? false,
        }}
      >
        <Form.Item name="fullname" label="系统用户名称" rules={[{ required: true, message: "请输入系统用户名称" }]}>
          <Input placeholder="请输入系统用户全称" />
        </Form.Item>
        <Form.Item
          name="username"
          label="用户名"
          validateTrigger={["onBlur"]}
          rules={[
            { required: true, message: "请输入用户名" },
            {
              validator: async (_, value) => {
                if (!value || isEdit) return Promise.resolve();
                try {
                  const resp = await request<{ exists?: boolean }>("/api/admin/exists", {
                    params: { username: value },
                    skipErrorHandler: true,
                  });
                  if (resp?.exists) {
                    return Promise.reject(new Error("用户名已存在"));
                  }
                  return Promise.resolve();
                } catch {
                  return Promise.reject(new Error("检查用户名失败"));
                }
              },
            },
          ]}
        >
          <Input placeholder="请输入登录用户名" disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="password"
          label={isEdit ? "密码 (留空则不变)" : "密码"}
          rules={[
            { required: !isEdit, message: "请输入密码" },
            { min: 8, message: "密码长度至少8位" },
            { pattern: /(?=.*[A-Za-z])(?=.*\d)/, message: "密码需包含字母和数字" },
          ]}
          hasFeedback
        >
          <PasswordInput placeholder={isEdit ? "留空则保持原密码" : "请输入密码"} />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={["password"]}
          hasFeedback
          rules={[
            { required: !isEdit, message: "请确认密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value && isEdit && !getFieldValue("password")) {
                  return Promise.resolve();
                }
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <PasswordInput placeholder="请再次输入密码" />
        </Form.Item>

        <Form.Item name="canLogin" label="允许登录" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="isSuper" label="超级系统用户" valuePropName="checked">
          <Switch />
        </Form.Item>

        {isEdit && (
          <Form.Item name="isOn" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        )}

        <Form.Item name="otpOn" label="OTP验证" valuePropName="checked">
          <Switch />
        </Form.Item>

        {isEdit && admin?.otpLogin?.isOn && (
          <Form.Item label=" " colon={false}>
            <Popconfirm
              title="确定要重置OTP吗？"
              description="重置后系统用户需要重新扫码绑定。"
              onConfirm={async () => {
                try {
                  await request("/api/admin", {
                    method: "PUT",
                    data: {
                      adminId: admin.id,
                      username: admin.username,
                      fullname: form.getFieldValue("fullname") || admin.fullname,
                      canLogin: form.getFieldValue("canLogin") ?? admin.canLogin,
                      isSuper: form.getFieldValue("isSuper") ?? admin.isSuper,
                      isOn: form.getFieldValue("isOn") ?? admin.isOn,
                      otpOn: form.getFieldValue("otpOn") ?? admin.otpLogin?.isOn,
                      resetOTP: true,
                    },
                  });
                  message.success("OTP已重置");
                  if (onOk) onOk();
                } catch (error) {
                  console.error("重置OTP失败:", error);
                  modal.error({
                    title: "重置OTP失败",
                    content: getErrorMessage(error, "未知错误"),
                  });
                }
              }}
            >
              <Button danger>重置OTP</Button>
            </Popconfirm>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
