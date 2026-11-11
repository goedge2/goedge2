import { Button, Collapse, Drawer, Form, Input, Modal, Popconfirm, Space, Switch, Table, TableProps, Tag, theme } from "antd";
import { CheckCircleFilled, PauseCircleFilled } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import type { ListIPItemsWithListIdResponse } from "@/pb/service_ip_item_pb";
import type {
  HTTPFirewallAction,
  HTTPFirewallPolicy,
  HTTPFirewallRef,
  HTTPFirewallRule,
  HTTPFirewallRuleGroup,
  HTTPFirewallRuleSet,
  IPListRef,
} from "../pb/models/model_http_firewall_pb";
import { ActionTypeName, CustomFormItemProps, RuleOperatorName } from "../utils";
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import React, { useState } from "react";
import { FirewallRuleGroupForm, FirewallRuleSetForm } from "./form/FirewallRuleForm";
import { reorderFirewallGroups } from "./form/firewallRuleValues";
import { DragHandle, DragRow } from "./DnDHelper";
import WafRegionFormInput from "./WafRegionFormInput";
import { IPItemTable } from "@/pages/servers/ip-lists/_shared";

const wafDefaultConfig = {
  isOn: true,
  ignoreGlobalRules: false,
  defaultCaptchaType: "default",
} as HTTPFirewallRef;

// WAF引用防火墙表单
export const FirewallRefFormInput = ({ value, onChange }: CustomFormItemProps<HTTPFirewallRef>) => {
  const [form] = Form.useForm();

  const isWafEnabled = Form.useWatch("isOn", form);
  const onFormChange = () => {
    if (value != null) {
      // 仅在初始化完成后通知更新，初始数据由下面的 isOnChanged 负责通知
      if (onChange) {
        const values = form.getFieldsValue();
        onChange(values);
      }
    }
  };

  const isOnChanged = (checked: boolean) => {
    if (checked) {
      if (value == null) {
        form.setFieldsValue(wafDefaultConfig);
        if (onChange) {
          onChange(wafDefaultConfig);
        }
      }
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="firewallRefForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item label="启用Web防火墙" name="isOn" valuePropName="checked" help="选中后，表示启用当前网站的WAF功能。">
          <Switch onChange={isOnChanged} />
        </Form.Item>
        <Form.Item hidden={!isWafEnabled} label={null}>
          <Collapse
            size="small"
            bordered={false}
            items={[
              {
                key: "more",
                label: "更多选项...",
                forceRender: true,
                children: (
                  <>
                    {/* <Form.Item label="人机识别验证方式"
                  name={['defaultCaptchaType']}
                  help="使用系统默认的设置。你需要在入站规则中添加规则集来决定哪些请求需要人机识别验证。"
                  labelCol={{ span: 3 }}
                >
                  <Switch />
                </Form.Item> */}
                    <Form.Item
                      label="启用系统全局规则"
                      name={["ignoreGlobalRules"]}
                      getValueProps={(value) => ({ checked: !value })}
                      getValueFromEvent={(checked) => !checked}
                      help="选中后，表示使用系统全局WAF策略中定义的规则。"
                      labelCol={{ span: 3 }}
                    >
                      <Switch />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form.Item>
      </Form>
    </Form.Provider>
  );
};

// const firewallPolicyDefaultConfig = {
//   isOn: true,
//   name: '用户自定义',
// } as HTTPFirewallPolicy

const IPListRefInput = ({ value, onManage }: { value?: IPListRef; onManage: () => void }) => {
  const listId = value?.listId;
  const hasList = Boolean(listId && listId !== "0");
  const query = useQuery<ListIPItemsWithListIdResponse>({
    queryKey: serverQueryKeys.ipListPreview(listId),
    queryFn: () => request(`/api/ip-list/${listId}/ip-items`, { params: { offset: 0, size: 2 } }),
    enabled: hasList,
  });
  const ips = (query.data?.ipItems ?? []).map((item) => item.value || (item.ipTo ? `${item.ipFrom} - ${item.ipTo}` : item.ipFrom));
  const total = Number(query.data?.total ?? 0);
  const summary = ips.length > 0 ? `${ips.join(", ")}${total > ips.length ? " 等" : "，共"} ${total} 个 IP` : "共 0 个 IP";

  return (
    <Space wrap>
      {hasList ? (
        <>
          <span>{query.isPending ? "加载中…" : query.isError ? "IP列表加载失败" : summary}</span>
          {query.isError && (
            <Button size="small" onClick={() => void query.refetch()}>
              重试
            </Button>
          )}
          <Button size="small" onClick={onManage}>
            管理
          </Button>
        </>
      ) : (
        <span style={{ color: "#999" }}>未配置 (请保存后自动生成或联系管理员)</span>
      )}
    </Space>
  );
};

export const FirewallPolicyFormInput = ({ value, onChange }: CustomFormItemProps<HTTPFirewallPolicy>) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [allowListDrawerOpen, setAllowListDrawerOpen] = useState(false);
  const [denyListDrawerOpen, setDenyListDrawerOpen] = useState(false);

  const allowListRef = Form.useWatch(["inbound", "allowListRef"], form);
  const denyListRef = Form.useWatch(["inbound", "denyListRef"], form);

  const onFormChange = () => {
    if (onChange) {
      const values = form.getFieldsValue();
      onChange(values);
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="firewallPolicyForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>

        <Form.Item label="入站规则" name={["inbound", "groups"]} help="所有规则匹配顺序为从上到下，可以拖动左侧的排序。">
          <FirewallGroupsInput />
        </Form.Item>

        <Form.Item label="出站规则" name={["outbound", "groups"]} help="所有规则匹配顺序为从上到下，可以拖动左侧的排序。">
          <FirewallGroupsInput />
        </Form.Item>

        <Form.Item label="区域封禁" name={["inbound", "region"]}>
          <WafRegionFormInput />
        </Form.Item>

        <Form.Item label="IP白名单" name={["inbound", "allowListRef"]}>
          <IPListRefInput onManage={() => setAllowListDrawerOpen(true)} />
        </Form.Item>

        <Form.Item label="IP黑名单" name={["inbound", "denyListRef"]}>
          <IPListRefInput onManage={() => setDenyListDrawerOpen(true)} />
        </Form.Item>
      </Form>

      <Drawer
        title="管理IP白名单"
        open={allowListDrawerOpen}
        onClose={() => {
          setAllowListDrawerOpen(false);
          void queryClient.invalidateQueries({ queryKey: serverQueryKeys.ipListPreview(allowListRef?.listId) });
        }}
        size={1000}
        destroyOnHidden
      >
        {allowListRef?.listId && <IPItemTable listId={Number(allowListRef.listId)} />}
      </Drawer>

      <Drawer
        title="管理IP黑名单"
        open={denyListDrawerOpen}
        onClose={() => {
          setDenyListDrawerOpen(false);
          void queryClient.invalidateQueries({ queryKey: serverQueryKeys.ipListPreview(denyListRef?.listId) });
        }}
        size={1000}
        destroyOnHidden
      >
        {denyListRef?.listId && <IPItemTable listId={Number(denyListRef.listId)} />}
      </Drawer>
    </Form.Provider>
  );
};

export const FirewallGroupsInput: React.FC<CustomFormItemProps<HTTPFirewallRuleGroup[]>> = ({ value: groups, onChange }) => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const { token } = theme.useToken();

  // 规则分组字段这定义
  const groupColumns: TableProps<HTTPFirewallRuleGroup>["columns"] = [
    { key: "sort", align: "center", width: 80, render: () => <DragHandle /> },
    {
      title: "规则分组",
      dataIndex: "name",
      render: (name: string, group: HTTPFirewallRuleGroup) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontWeight: 500,
              color: group.isOn ? token.colorText : token.colorTextDisabled,
            }}
          >
            {name}
          </span>
          {group.description && (
            <span
              style={{
                fontSize: token.fontSizeSM,
                color: token.colorTextSecondary,
              }}
            >
              {group.description}
            </span>
          )}
          <Space size={4} wrap>
            <Tag color={group.isOn ? "success" : "error"} variant="filled" icon={group.isOn ? <CheckCircleFilled /> : <PauseCircleFilled />}>
              {group.isOn ? "已启用" : "已停用"}
            </Tag>
            {group.isTemplate && (
              <Tag color="blue" variant="filled">
                预置
              </Tag>
            )}
            {group.code && <Tag variant="filled">代号: {group.code}</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: "规则集",
      key: "sets",
      width: 100,
      render: (_, group) => group?.sets?.length,
    },
    {
      title: "操作",
      key: "action",
      width: 320,
      render: (_, group) => (
        <Space size="middle" onClick={(e) => e.stopPropagation()}>
          <a onClick={() => createOrUpdateRuleGroup(group)}>修改</a>
          <Button
            type="link"
            size="small"
            danger={group.isOn}
            style={group.isOn ? undefined : { color: token.colorSuccess }}
            icon={group.isOn ? <PauseCircleFilled /> : <CheckCircleFilled />}
            onClick={() => {
              onChange?.(groups?.map((item) => (item.id === group.id ? { ...item, isOn: !group.isOn } : item)));
            }}
          >
            {group.isOn ? "停用" : "启用"}
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => onChange?.(groups?.filter((g) => g.id !== group.id))}>
            <a>删除</a>
          </Popconfirm>
          <a onClick={() => createOrUpdateRuleSet(group)}>添加规则集</a>
        </Space>
      ),
    },
  ];
  // 规则集字段定义
  const ruleSetColumns = (group: HTTPFirewallRuleGroup): TableProps<HTTPFirewallRuleSet>["columns"] => [
    { key: "sort", align: "center", width: 80, render: () => <DragHandle /> },
    {
      title: "规则集名称",
      dataIndex: "name",
      render: (name: string | undefined, set: HTTPFirewallRuleSet) => (
        <span style={{ color: set.isOn ? token.colorText : token.colorTextDisabled }}>{name?.trim() || "未命名规则集"}</span>
      ),
    },
    {
      title: "规则",
      dataIndex: "rules",
      ellipsis: { showTitle: true },
      render: (rules?: HTTPFirewallRule[] | null) => {
        if (!rules?.length) return "-";
        return (
          <Space size="small" orientation="vertical">
            {rules.map((rule) => (
              <Tag>
                {rule.param} {RuleOperatorName(rule.operator)} {rule.value}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "规则关系",
      dataIndex: "connector",
    },
    {
      title: "动作",
      dataIndex: "actions",
      render: (actions?: HTTPFirewallAction[] | null) => actions?.map((action) => ActionTypeName(action.code)).join(",") || "-",
    },
    {
      title: "操作",
      key: "action",
      render: (_, set) => (
        <Space size="middle">
          <a onClick={() => createOrUpdateRuleSet(group, set)}>修改</a>
          <Button
            type="link"
            size="small"
            danger={set.isOn}
            style={set.isOn ? undefined : { color: token.colorSuccess }}
            icon={set.isOn ? <PauseCircleFilled /> : <CheckCircleFilled />}
            onClick={() => {
              if (!groups) return;

              const groupIndex = groups.findIndex((g) => g.id === group.id);
              const newSets = group.sets.map((item) => (item.id === set.id ? { ...item, isOn: !set.isOn } : item));
              const newGroups = [...groups];
              newGroups[groupIndex] = { ...group, sets: newSets };
              onChange?.(newGroups);
            }}
          >
            {set.isOn ? "停用" : "启用"}
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => {
              if (!groups) return;

              const groupIndex = groups.findIndex((g) => g.id === group.id);
              const newSets = group.sets.filter((s) => s.id !== set.id);

              const newGroups = [...groups];
              newGroups[groupIndex] = { ...group, sets: newSets };
              onChange?.(newGroups);
            }}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 规则集嵌套子表格
  const setsRowRender = (group: HTTPFirewallRuleGroup) => (
    <div
      style={{
        margin: "0 12px 12px 36px",
        padding: "8px 12px 12px",
        backgroundColor: token.colorFillSecondary,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `3px solid ${token.colorPrimary}`,
        borderRadius: token.borderRadius,
      }}
    >
      <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontSize: token.fontSizeSM, fontWeight: 500 }}>规则集</div>
      <SortableContext items={group.sets?.map((set) => `${group.id}-${set.id}`)} strategy={verticalListSortingStrategy}>
        <Table
          columns={ruleSetColumns(group)}
          dataSource={group.sets}
          size="small"
          components={{ body: { row: DragRow } }}
          pagination={false}
          rowKey={(set) => `${group.id}-${set.id}`}
          style={{ backgroundColor: token.colorBgContainer }}
        />
      </SortableContext>
    </div>
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    if (groups?.some((group) => group.id === String(active.id))) {
      // 若不是子表格拖拽，折叠所有已展开元素
      setExpandedRowKeys([]);
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!groups || !over || active.id === over.id) return;
    const reorderedGroups = reorderFirewallGroups(groups, String(active.id), String(over.id));
    if (reorderedGroups !== groups) onChange?.(reorderedGroups);
  };

  const [groupForm] = Form.useForm();
  const [ruleSetForm] = Form.useForm();
  const [showGroupPopup, setShowGroupPopup] = useState(false);
  const [showRuleSetPopup, setShowRuleSetPopup] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const createOrUpdateRuleGroup = (group?: HTTPFirewallRuleGroup) => {
    if (!group) {
      // 初始化参数
      group = {
        isOn: true,
      } as HTTPFirewallRuleGroup;
    }
    groupForm.resetFields();
    groupForm.setFieldsValue(group);
    setShowGroupPopup(true);
  };
  // 提交源站表单
  const handleGroupSave = () => {
    setConfirmLoading(true);
    groupForm.submit();
  };
  const handleSaveError = () => {
    setConfirmLoading(false);
  };
  // 保存分组到表单
  const handleGroupSuccess = (saveResponse?: HTTPFirewallRuleGroup) => {
    let isNew = true;
    const newGroups =
      groups?.map((g) => {
        if (g.id === saveResponse?.id) {
          isNew = false;
          return { ...g, ...saveResponse };
        }
        return g;
      }) ?? [];

    if (isNew && saveResponse) {
      newGroups.push({ ...saveResponse, sets: saveResponse.sets ?? [] });
    }

    if (onChange) onChange(newGroups);
    setConfirmLoading(false);
    setShowGroupPopup(false);
  };

  // 规则集表单
  const createOrUpdateRuleSet = (group?: HTTPFirewallRuleGroup, ruleSet?: HTTPFirewallRuleSet) => {
    ruleSetForm.resetFields();
    if (!ruleSet) {
      ruleSet = {
        isOn: true,
        connector: "and",
        ignoreLocal: true,
        ignoreSearchEngine: true,
      } as HTTPFirewallRuleSet;
    }

    ruleSetForm.setFieldsValue(ruleSet);
    ruleSetForm.setFieldValue("groupId", group?.id);
    setShowRuleSetPopup(true);
  };
  // 提交规则集表单
  const handleRuleSetSave = () => {
    setConfirmLoading(true);
    ruleSetForm.submit();
  };
  // 保存规则集到分组
  const handleRuleSetSuccess = async (ruleSet?: HTTPFirewallRuleSet) => {
    if (!groups || !ruleSet) return; // 无规则分组则不可能有规则集
    const groupId = ruleSetForm.getFieldValue("groupId");
    if (!groupId) return;

    // 保存到 group
    try {
      const groupIndex = groups.findIndex((g) => g.id === groupId);
      const group = groups[groupIndex];

      let isNew = true;
      const newSets =
        group.sets?.map((set) => {
          if (set.id === ruleSet.id) {
            isNew = false;
            return { ...set, ...ruleSet };
          }
          return set;
        }) ?? [];
      if (isNew && ruleSet) {
        newSets.push(ruleSet);
      }

      const newGroups = [...groups];
      newGroups[groupIndex] = { ...group, sets: newSets };
      onChange?.(newGroups);
      setConfirmLoading(false);
      setShowRuleSetPopup(false);
    } catch (error) {
      setConfirmLoading(false);
      console.log(error);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createOrUpdateRuleGroup()}>添加规则分组</Button>
      </Space>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={groups ? groups.map((group) => group.id ?? "") : [""]} strategy={verticalListSortingStrategy}>
          <Table<HTTPFirewallRuleGroup>
            columns={groupColumns}
            dataSource={groups}
            size="small"
            tableLayout="fixed"
            scroll={{ x: 800 }}
            components={{ body: { row: DragRow } }}
            expandable={{
              columnWidth: 48,
              expandedRowKeys,
              onExpand: (expanded, group) => {
                setExpandedRowKeys(expanded ? [...expandedRowKeys, group.id!] : expandedRowKeys.filter((key) => key !== group.id));
              },
              expandedRowRender: setsRowRender,
              rowExpandable: (group) => group.sets?.length > 0,
              expandRowByClick: true,
            }}
            rowKey={(group) => String(group.id)}
            pagination={false}
          />
        </SortableContext>
      </DndContext>

      {/* 规则分组弹出窗口 */}
      {showGroupPopup && (
        <Modal
          title="规则分组"
          open={true}
          onCancel={() => setShowGroupPopup(false)}
          onOk={handleGroupSave}
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
          <FirewallRuleGroupForm form={groupForm} labelCol={{ span: 4 }} onError={handleSaveError} onSuccess={handleGroupSuccess} />
        </Modal>
      )}

      {/* 规则集弹出窗口 */}
      {showRuleSetPopup && (
        <Modal
          title="规则集"
          open={true}
          onCancel={() => setShowRuleSetPopup(false)}
          onOk={handleRuleSetSave}
          confirmLoading={confirmLoading}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "60%",
            xxl: "60%",
          }}
        >
          <FirewallRuleSetForm form={ruleSetForm} onError={handleSaveError} onSuccess={handleRuleSetSuccess} />
        </Modal>
      )}
    </>
  );
};
