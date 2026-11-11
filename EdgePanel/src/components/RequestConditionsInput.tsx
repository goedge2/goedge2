import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Tag } from "antd";
import { useState } from "react";
import type { HTTPRequestCond, HTTPRequestCondGroup, HTTPRequestCondsConfig } from "@/pb/models/model_config_shared_pb";
import type { CustomFormItemProps } from "@/utils";
import { CondTypeName, CondTypes, RuleParams } from "@/utils/waf";
import { CondUrlAll, CondUrlEq, CondUrlEqIndex, CondUrlExtension, CondUrlPrefix, CondUrlRegexp, CondUrlWildcardMatch } from "./CondDefinitions";
import { createRequestCondition, createRequestConditionGroup, requestConditionOperators } from "./requestConditions";

const connectors = [
  { label: "和", value: "and" },
  { label: "或", value: "or" },
];
const conditionTypes = CondTypes.map((type) => ({ label: type.name, value: type.type }));
const parameterOptions = RuleParams.filter((param) => !param.isComposed).map((param) => ({
  label: param.name,
  value: `\${${param.prefix}${param.hasParams ? ".参数名" : ""}}`,
}));

function ConditionInput({ value, onChange }: { value: HTTPRequestCond; onChange: (value: HTTPRequestCond) => void }) {
  const update = (next: Partial<HTTPRequestCond>) => onChange({ ...value, ...next });
  const presetProps = { value, onChange: (next?: HTTPRequestCond) => next && onChange(next) };
  const preset = (() => {
    switch (value.type) {
      case "url-extension":
        return <CondUrlExtension {...presetProps} />;
      case "url-eq-index":
        return <CondUrlEqIndex {...presetProps} />;
      case "url-all":
        return <CondUrlAll {...presetProps} />;
      case "url-prefix":
        return <CondUrlPrefix {...presetProps} />;
      case "url-eq":
        return <CondUrlEq {...presetProps} />;
      case "url-regexp":
        return <CondUrlRegexp {...presetProps} />;
      case "url-wildcard-match":
        return <CondUrlWildcardMatch {...presetProps} />;
      default:
        return null;
    }
  })();
  return (
    <>
      <Form.Item label="选择条件类型" help={CondTypes.find((type) => type.type === value.type)?.description}>
        <Select
          value={value.type}
          options={
            conditionTypes.some((type) => type.value === value.type)
              ? conditionTypes
              : [...conditionTypes, { label: value.type || "参数匹配", value: value.type }]
          }
          onChange={(type) => onChange(createRequestCondition(type))}
        />
      </Form.Item>
      {preset ?? (
        <>
          <Form.Item label="选择参数">
            <Select
              placeholder="选择常用参数"
              value={undefined}
              options={parameterOptions}
              onChange={(param) => update({ param })}
              showSearch={{ optionFilterProp: "label" }}
            />
          </Form.Item>
          <Form.Item label="条件参数" required help="可以使用跟请求相关的参数，比如 ${arg.name}、${requestPath}。">
            <Input value={value.param} onChange={(event) => update({ param: event.target.value })} />
          </Form.Item>
          <Form.Item label="操作符" required help={requestConditionOperators.find((operator) => operator.value === value.operator)?.description}>
            <Select value={value.operator} options={requestConditionOperators} onChange={(operator) => update({ operator })} />
          </Form.Item>
          <Form.Item label="对比值">
            <Input.TextArea value={value.value} onChange={(event) => update({ value: event.target.value })} />
          </Form.Item>
        </>
      )}
      <Form.Item label="请求条件" help="选中后在请求阶段检查；不选中表示在响应阶段检查。">
        <Switch checked={value.isRequest} onChange={(checked) => update({ isRequest: checked })} />
      </Form.Item>
      <Form.Item label="反向匹配">
        <Switch checked={value.isReverse} onChange={(checked) => update({ isReverse: checked })} />
      </Form.Item>
      <Form.Item label="不区分大小写" help="选中后表示对比时忽略参数值的大小写。">
        <Switch checked={value.isCaseInsensitive} onChange={(checked) => update({ isCaseInsensitive: checked })} />
      </Form.Item>
    </>
  );
}

export function RequestConditionsInput({ value, onChange }: CustomFormItemProps<HTTPRequestCondsConfig>) {
  const { message } = App.useApp();
  const config = value ?? ({ isOn: true, connector: "or", groups: [] } as unknown as HTTPRequestCondsConfig);
  const groups = config.groups ?? [];
  const [editing, setEditing] = useState<{ group: number; condition?: number }>();
  const [draft, setDraft] = useState<HTTPRequestCond>(createRequestCondition);
  const [editKey, setEditKey] = useState(0);
  const update = (next: Partial<HTTPRequestCondsConfig>) => onChange?.({ ...config, ...next });
  const updateGroup = (index: number, next: Partial<HTTPRequestCondGroup>) =>
    update({ groups: groups.map((group, groupIndex) => (groupIndex === index ? { ...group, ...next } : group)) });
  const openCondition = (group: number, condition?: number) => {
    setDraft(condition === undefined ? createRequestCondition() : structuredClone(groups[group].conds[condition]));
    setEditing({ group, condition });
    setEditKey((key) => key + 1);
  };
  const saveCondition = () => {
    if (!editing) return;
    if (!draft.param.trim() || !draft.operator) {
      message.error("请填写条件参数和操作符");
      return;
    }
    const conditions = [...groups[editing.group].conds];
    if (editing.condition === undefined) conditions.push(draft);
    else conditions[editing.condition] = draft;
    updateGroup(editing.group, { conds: conditions });
    setEditing(undefined);
  };
  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="middle">
      {groups.length > 0 ? (
        <>
          <Space>
            <span>启用匹配条件</span>
            <Switch checked={config.isOn} onChange={(checked) => update({ isOn: checked })} />
          </Space>
          {groups.map((group, index) => (
            <Card
              key={index}
              size="small"
              title={`分组${index + 1}`}
              extra={
                <Popconfirm
                  title="确定要删除这一组条件吗？"
                  onConfirm={() => update({ groups: groups.filter((_, groupIndex) => groupIndex !== index) })}
                >
                  <Button type="link" danger>
                    删除分组
                  </Button>
                </Popconfirm>
              }
            >
              <Form.Item label="子条件列表">
                <Space orientation="vertical" style={{ width: "100%" }}>
                  {(group.conds ?? []).map((condition, conditionIndex) => (
                    <Space key={conditionIndex} wrap>
                      <Tag>
                        {CondTypeName(condition.type)}：{condition.param}{" "}
                        {requestConditionOperators.find((operator) => operator.value === condition.operator)?.label ?? condition.operator}{" "}
                        {condition.value}
                      </Tag>
                      <Button type="link" onClick={() => openCondition(index, conditionIndex)}>
                        修改
                      </Button>
                      <Button
                        type="link"
                        danger
                        onClick={() => updateGroup(index, { conds: group.conds.filter((_, current) => current !== conditionIndex) })}
                      >
                        删除
                      </Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => openCondition(index)}>
                    添加子条件
                  </Button>
                </Space>
              </Form.Item>
              <Form.Item label="子条件之间关系" help={group.connector === "and" ? "必须满足所有条件才能成立。" : "只要满足其中一个条件即可成立。"}>
                <Select value={group.connector} options={connectors} onChange={(connector) => updateGroup(index, { connector })} />
              </Form.Item>
              <Form.Item label="补充说明">
                <Input.TextArea
                  maxLength={100}
                  value={group.description}
                  onChange={(event) => updateGroup(index, { description: event.target.value })}
                />
              </Form.Item>
              <Form.Item label="启用当前分组">
                <Switch checked={group.isOn} onChange={(checked) => updateGroup(index, { isOn: checked })} />
              </Form.Item>
              <Form.Item label="反向匹配">
                <Switch checked={group.isReverse} onChange={(checked) => updateGroup(index, { isReverse: checked })} />
              </Form.Item>
            </Card>
          ))}
          {groups.length > 1 ? (
            <Form.Item label="分组之间关系" help={config.connector === "or" ? "只要满足其中一个条件分组即可。" : "需要满足所有条件分组。"}>
              <Select value={config.connector} options={connectors} onChange={(connector) => update({ connector })} />
            </Form.Item>
          ) : null}
        </>
      ) : null}
      <Button type="dashed" onClick={() => update({ groups: [...groups, createRequestConditionGroup()] })}>
        添加分组
      </Button>
      <Modal
        title={editing?.condition === undefined ? "添加子条件" : "修改子条件"}
        open={Boolean(editing)}
        onCancel={() => setEditing(undefined)}
        onOk={saveCondition}
        destroyOnHidden
        width={760}
      >
        <ConditionInput key={editKey} value={draft} onChange={setDraft} />
      </Modal>
    </Space>
  );
}
