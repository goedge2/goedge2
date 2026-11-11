import { PageContainer, DragSortTable, type ProColumns } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, request } from "@umijs/max";
import type { ServerGroup } from "@/pb/models/model_server_group_pb";
import type { FindAllEnabledServerGroupsResponse, FindEnabledServerGroupResponse } from "@/pb/service_server_group_pb";
import { serverQueryKeys } from "@/queries/keys";
import { listServerGroups } from "@/services/servers";
import { useFetchData } from "@/utils";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage } from "@/utils";
import { Button, Form, Input, message, Modal, Popconfirm } from "antd";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

const CreateGroupPopup = ({ onClose, onCreateSuccess }: { onClose: () => void; onCreateSuccess?: () => void }) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    setConfirmLoading(true);
    form.submit();
  };

  const onSuccess = () => {
    onClose();
    // 刷新列表
    if (onCreateSuccess) {
      onCreateSuccess();
    }
  };

  const onError = (error?: unknown) => {
    setConfirmLoading(false);
    if (error) {
      message.error(formatErrorMessage("创建分组失败", error));
    }
  };

  const onFinish = async (values: { name: string }) => {
    try {
      await request("/api/server/group", { method: "POST", data: values });
      onSuccess();
    } catch (error) {
      console.error("创建分组失败:", error);
      onError(error);
    }
  };

  return (
    <Modal
      title="创建网站分组"
      open={true}
      onCancel={onClose}
      afterClose={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "40%",
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Form.Item name="name" label="分组名称" rules={[{ required: true, message: "请输入分组名称" }]}>
          <Input placeholder="请输入分组名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const EditGroupPopup = ({ groupId, onClose, onUpdateSuccess }: { groupId: bigint; onClose: () => void; onUpdateSuccess?: () => void }) => {
  const { data, loading } = useFetchData<FindEnabledServerGroupResponse>(`/api/server/group/${groupId}`);

  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    setConfirmLoading(true);
    form.submit();
  };

  const onSuccess = () => {
    onClose();
    // 刷新列表
    if (onUpdateSuccess) {
      onUpdateSuccess();
    }
  };

  const onError = (error?: unknown) => {
    setConfirmLoading(false);
    if (error) {
      message.error(formatErrorMessage("更新分组失败", error));
    }
  };

  const onFinish = async (values: { name: string }) => {
    try {
      await request(`/api/server/group/${groupId}`, { method: "PUT", data: values });
      onSuccess();
    } catch (error) {
      console.error("更新分组失败:", error);
      onError(error);
    }
  };

  return (
    <Modal
      title="编辑网站分组"
      open={true}
      onCancel={onClose}
      afterClose={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      loading={loading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "40%",
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={data?.serverGroup} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="name" label="分组名称" rules={[{ required: true, message: "请输入分组名称" }]}>
          <Input placeholder="请输入分组名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

function Groups() {
  const queryClient = useQueryClient();
  const query = useQuery<FindAllEnabledServerGroupsResponse>({
    queryKey: serverQueryKeys.groupsBase(),
    queryFn: () => listServerGroups(new URLSearchParams()),
  });

  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const reload = () =>
    void queryClient.invalidateQueries({
      queryKey: serverQueryKeys.groupsBase(),
    });

  const onDelete = (groupId: bigint) => {
    request(`/api/server/group/${groupId}`, { method: "DELETE" })
      .then(() => {
        reload();
      })
      .catch((error) => {
        console.error("删除分组失败:", error);
        message.error(formatErrorMessage("删除分组失败", error));
      });
  };

  const [createGroupPopup, setCreateGroupPopup] = useState(false);
  const [editGroupId, setEditGroupId] = useState<bigint | null>(null);

  const columns: ProColumns<ServerGroup>[] = [
    {
      title: "排序",
      dataIndex: "sort",
      fixed: "left",
      width: 60,
      className: "drag-visible",
    },

    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      width: 80,
      search: false,
    },
    {
      title: "分组名称",
      dataIndex: "name",
      search: false,
    },
    {
      title: "网站数量",
      dataIndex: "countServers",
      search: false,
      render: (_, group) => <Link to={`/servers?serverGroupId=${group.id}`}>{String(group.countServers ?? 0)}</Link>,
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      render: (_, group) => (group.isOn ? <CheckOutlined style={{ color: "green" }} /> : <CloseOutlined style={{ color: "red" }} />),
    },
    {
      title: "操作",
      valueType: "option",
      key: "option",
      fixed: "right",
      align: "center",
      width: 130,
      render: (_, group) => {
        const groupId = group.id;
        if (groupId == null) return [];
        return [
          <TableActionIcon key="edit" tooltip="编辑" icon={<EditOutlined />} onClick={() => setEditGroupId(groupId)} />,
          <Popconfirm key="delete" title="确定删除吗？" onConfirm={() => onDelete(groupId)}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>,
        ];
      },
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "网站分组" }}
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateGroupPopup(true)}>
          创建分组
        </Button>,
      ]}
    >
      <DragSortTable<ServerGroup>
        columns={columns}
        dataSource={data?.serverGroups}
        loading={loading}
        rowKey="id"
        search={false}
        pagination={false}
        options={{
          reload,
        }}
        dragSortKey="sort"
        onDragSortEnd={async (_beforeIndex, _afterIndex, newDataSource) => {
          try {
            const serverGroupIds = newDataSource.map((group) => group.id);
            await request("/api/server/groups/orders", { method: "PUT", data: { serverGroupIds } });
            reload();
          } catch (error) {
            console.error("更新排序失败:", error);
            message.error(formatErrorMessage("更新排序失败", error));
          }
        }}
        scroll={{ x: "max-content" }}
      />

      {createGroupPopup && <CreateGroupPopup onClose={() => setCreateGroupPopup(false)} onCreateSuccess={reload} />}
      {editGroupId && <EditGroupPopup groupId={editGroupId} onClose={() => setEditGroupId(null)} onUpdateSuccess={reload} />}
    </PageContainer>
  );
}

export default Groups;
