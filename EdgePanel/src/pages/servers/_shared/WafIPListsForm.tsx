import { useQuery } from "@tanstack/react-query";
import { request } from "@umijs/max";
import { Button, Drawer, Empty, Form, Input, Modal, Space, Table, Tag, Tooltip, Typography, type FormInstance } from "antd";
import { useState } from "react";
import type { IPListRef } from "@/pb/models/model_http_firewall_pb";
import type { IPList } from "@/pb/models/model_ip_list_pb";
import type { ListEnabledIPListsResponse } from "@/pb/service_ip_list_pb";
import { serverQueryKeys } from "@/queries/keys";
import { IPItemTable } from "../ip-lists/_shared";

const { Text, Paragraph } = Typography;

function PublicIPListsInput({
  type,
  value = [],
  onChange,
  lists,
  defaultListId,
}: {
  type: "white" | "black";
  value?: IPListRef[];
  onChange?: (refs: IPListRef[]) => void;
  lists: IPList[];
  defaultListId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [knownLists, setKnownLists] = useState<IPList[]>([]);
  const [preview, setPreview] = useState<{ id: string; name: string }>();
  const params = { type, isPublic: true, keyword, offset: (page - 1) * 10, size: 10 };
  const query = useQuery<ListEnabledIPListsResponse>({
    queryKey: serverQueryKeys.ipLists("waf-bindings", params),
    queryFn: () => request("/api/ip-lists", { params }),
    enabled: open,
  });
  const metadata = new Map([...lists, ...knownLists, ...(query.data?.ipLists ?? [])].map((list) => [String(list.id), list]));
  const name = type === "white" ? "白名单" : "黑名单";

  return (
    <>
      <Space wrap size={[8, 8]}>
        <Tooltip title="绑定或解绑后，点击页面底部“保存”生效。">
          <Button
            size="small"
            aria-label={`绑定公共${name}`}
            onClick={() => {
              setSelectedIds(value.map((ref) => String(ref.listId)));
              setOpen(true);
            }}
          >
            绑定+
          </Button>
        </Tooltip>
        {value.length > 0 ? <Text type="secondary">已绑定：</Text> : null}
        {value.map((ref) => {
          const id = String(ref.listId);
          const list = metadata.get(id);
          const label = list?.name || `名单 #${id}（已删除或不可用）`;
          return (
            <Tag
              key={id}
              variant="outlined"
              closeIcon
              onClose={(event) => {
                event.preventDefault();
                onChange?.(value.filter((item) => item.listId !== ref.listId));
              }}
              style={{ margin: 0 }}
            >
              <Button
                type="text"
                size="small"
                title={`ID: ${id}`}
                style={{ height: "auto", padding: 0, fontSize: "inherit", lineHeight: "inherit" }}
                onClick={() => setPreview({ id, name: label })}
              >
                {label}
                {ref.isOn ? "" : "（已停用）"}
              </Button>
            </Tag>
          );
        })}
        <Text type="secondary" copyable={defaultListId ? { text: String(defaultListId) } : false}>
          ID: {defaultListId || "未获取"}
        </Text>
      </Space>
      <Modal
        title={`绑定公共IP${name}`}
        open={open}
        onCancel={() => setOpen(false)}
        width={760}
        okText="确认绑定"
        onOk={() => {
          onChange?.(selectedIds.map((id) => value.find((ref) => String(ref.listId) === id) ?? ({ listId: id, isOn: true } as IPListRef)));
          setKnownLists([...metadata.values()]);
          setOpen(false);
        }}
      >
        <Paragraph type="secondary">只显示同类型的公共IP名单，支持跨页多选。系统全局名单无需重复绑定。</Paragraph>
        <Input.Search
          allowClear
          placeholder="搜索名单名称、代号或描述"
          onSearch={(text) => {
            setKeyword(text);
            setPage(1);
          }}
          style={{ marginBottom: 16 }}
        />
        <Table<IPList>
          size="small"
          rowKey={(list) => String(list.id)}
          loading={query.isFetching}
          dataSource={query.data?.ipLists ?? []}
          scroll={{ x: 480 }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            preserveSelectedRowKeys: true,
            onChange: (keys, selected) => {
              setSelectedIds(keys.map(String));
              setKnownLists([...new Map([...knownLists, ...selected.filter(Boolean)].map((list) => [String(list.id), list])).values()]);
            },
          }}
          pagination={{ current: page, pageSize: 10, total: Number(query.data?.total || 0), showSizeChanger: false, onChange: setPage }}
          columns={[
            { title: "ID", dataIndex: "id", width: 80 },
            { title: "名称", dataIndex: "name" },
            { title: "IP数量", dataIndex: "countIPItems", width: 90 },
            { title: "描述", dataIndex: "description", ellipsis: true },
          ]}
        />
      </Modal>
      <Drawer title={preview?.name} open={Boolean(preview)} onClose={() => setPreview(undefined)} size="large" destroyOnHidden>
        {preview ? <IPItemTable key={preview.id} listId={Number(preview.id)} /> : null}
      </Drawer>
    </>
  );
}

export default function WafIPListsForm({ type, form, lists }: { type: "white" | "black"; form: FormInstance; lists: IPList[] }) {
  const refName = type === "white" ? "allowListRef" : "denyListRef";
  const listName = type === "white" ? "publicWhiteLists" : "publicBlackLists";
  const name = type === "white" ? "白名单" : "黑名单";
  const listId = Form.useWatch(["inbound", refName, "listId"], { form, preserve: true });

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        可管理本策略的 IP{name}，也可绑定公共 IP{name}。
      </Paragraph>
      <Form.Item name={["inbound", listName, "refs"]} noStyle>
        <PublicIPListsInput type={type} lists={lists} defaultListId={listId} />
      </Form.Item>
      {listId ? <IPItemTable key={String(listId)} listId={Number(listId)} /> : <Empty description={`默认${name}未获取，请重新加载策略`} />}
    </Space>
  );
}
