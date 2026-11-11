import { Button, Form, Input, Modal, Popconfirm, Switch, message } from "antd";
import { PageContainer, DragSortTable, type ProColumns } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@umijs/max";
import type { FormInstance } from "antd/es/form";
import type { NodeRegion } from "@/pb/models/model_node_region_pb";
import type { FindAllEnabledNodeRegionsResponse } from "@/pb/service_node_region_pb";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import TableActionIcon from "@/components/TableActionIcon";
import { clusterQueryKeys } from "@/queries/keys";
import { listNodeRegions } from "@/services/clusters";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

// 提取可复用的表单组件
type RegionFormValues = {
  nodeRegionId?: bigint;
  name?: string;
  description?: string;
  isOn?: boolean;
};

const RegionForm = ({ form, isEdit }: { form: FormInstance<RegionFormValues>; isEdit?: boolean }) => {
  return (
    <Form form={form} layout="vertical" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
      {isEdit && (
        <Form.Item name="nodeRegionId" hidden>
          <Input />
        </Form.Item>
      )}
      <Form.Item name="name" label="区域名称" rules={[{ required: true, message: "请输入区域名称" }]}>
        <Input placeholder="请输入区域名称" />
      </Form.Item>
      <Form.Item name="description" label="区域描述">
        <Input.TextArea placeholder="请输入区域描述" rows={3} />
      </Form.Item>
      {isEdit && (
        <Form.Item name="isOn" label="状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      )}
    </Form>
  );
};

const CreateRegionPopup = ({ onClose, onCreateSuccess }: { onClose: () => void; onCreateSuccess?: () => void }) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    form.validateFields().then((values) => {
      setConfirmLoading(true);
      request("/api/node-regions", { method: "POST", data: values })
        .then(() => {
          onClose();
          if (onCreateSuccess) {
            onCreateSuccess();
          }
        })
        .catch((error) => {
          console.error("创建区域失败:", error);
          message.error(formatErrorMessage("创建区域失败", error));
          setConfirmLoading(false);
        });
    });
  };

  return (
    <Modal
      title="创建节点区域"
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
      <RegionForm form={form} />
    </Modal>
  );
};

const EditRegionPopup = ({ region, onClose, onUpdateSuccess }: { region: NodeRegion; onClose: () => void; onUpdateSuccess?: () => void }) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      nodeRegionId: region.id,
      name: region.name,
      description: region.description,
      isOn: region.isOn,
    });
  }, [region, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      setConfirmLoading(true);
      request(`/api/node-regions/${region.id}`, { method: "PUT", data: values })
        .then(() => {
          onClose();
          if (onUpdateSuccess) {
            onUpdateSuccess();
          }
        })
        .catch((error) => {
          console.error("更新区域失败:", error);
          message.error(formatErrorMessage("更新区域失败", error));
          setConfirmLoading(false);
        });
    });
  };

  return (
    <Modal
      title="编辑节点区域"
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
      <RegionForm form={form} isEdit={true} />
    </Modal>
  );
};

function Regions() {
  const queryClient = useQueryClient();
  const query = useQuery<FindAllEnabledNodeRegionsResponse>({
    queryKey: clusterQueryKeys.nodeRegions(),
    queryFn: listNodeRegions,
  });

  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const reload = () =>
    void queryClient.invalidateQueries({
      queryKey: clusterQueryKeys.nodeRegions(),
    });

  const [createPopup, setCreatePopup] = useState(false);
  const [editRegion, setEditRegion] = useState<NodeRegion | null>(null);

  const onDelete = (regionId: bigint) => {
    request(`/api/node-regions/${regionId}`, { method: "DELETE" })
      .then(() => {
        reload();
      })
      .catch((error) => {
        console.error("删除区域失败:", error);
        message.error(formatErrorMessage("删除区域失败", error));
      });
  };

  const columns: ProColumns<NodeRegion>[] = [
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
    },
    {
      title: "区域名称",
      dataIndex: "name",
    },
    {
      title: "区域描述",
      dataIndex: "description",
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (_, region) => (region.isOn ? <CheckOutlined style={{ color: "green" }} /> : <CloseOutlined style={{ color: "red" }} />),
    },
    {
      title: "操作",
      valueType: "option",
      key: "option",
      fixed: "right",
      align: "center",
      width: 130,
      render: (_, region) => [
        <TableActionIcon key="edit" tooltip="编辑" icon={<EditOutlined />} onClick={() => setEditRegion(region)} />,
        <Popconfirm key="delete" title="确定删除吗？" onConfirm={() => onDelete(region.id)}>
          <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "节点区域" }}
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreatePopup(true)}>
          创建区域
        </Button>,
      ]}
    >
      <DragSortTable<NodeRegion>
        columns={columns}
        dataSource={data?.nodeRegions || []}
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
            const nodeRegionIds = newDataSource.map((region) => region.id);
            await request("/api/node-regions/orders", { method: "PUT", data: { nodeRegionIds } });
            reload();
          } catch (error) {
            console.error("更新排序失败:", error);
            message.error(formatErrorMessage("更新排序失败", error));
          }
        }}
        scroll={{ x: "max-content" }}
      />

      {createPopup && <CreateRegionPopup onClose={() => setCreatePopup(false)} onCreateSuccess={reload} />}
      {editRegion && <EditRegionPopup region={editRegion} onClose={() => setEditRegion(null)} onUpdateSuccess={reload} />}
    </PageContainer>
  );
}

export default Regions;
