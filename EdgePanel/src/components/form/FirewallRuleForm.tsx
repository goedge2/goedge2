import { Button, Card, Collapse, Form, FormInstance, FormItemProps, FormProps, Input, InputNumber, Select, Space, Switch } from "antd";
import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HTTPFirewallAction, HTTPFirewallRule, HTTPFirewallRuleGroup, HTTPFirewallRuleSet } from "../../pb/models/model_http_firewall_pb";
import {
  ActionTypeDescription,
  ActionTypeName,
  ActionTypes,
  CustomFormItemProps,
  GetRuleParam,
  redirectStatusOptions,
  RuleOperatorDescription,
  RuleOperatorName,
  RuleOperators,
  RuleParams,
} from "../../utils";
import { ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { CloseOutlined, EditOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { JsonObject } from "@bufbuild/protobuf";
import { MultiLineArrayTextArea } from "../MultiLineArrayTextArea";
import { MultiTagsInput } from "../MultiListenPortInput";
import { CompactField, MetricHttpKeysInput } from "../SharedInput";
import { buildFirewallRuleGroupDraft, getFirewallActionDefaultOptions, getFirewallActionSummary, parseFirewallRuleParam } from "./firewallRuleValues";
import "./FirewallRuleForm.css";

type RuleFormProps<T> = {
  form?: FormInstance;
  onSuccess?: (response?: T | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

let tmpId = -1; // 新建数据临时ID

const JsonEditor = ({ value, onChange, name }: CustomFormItemProps<HTTPFirewallRuleSet> & FormItemProps) => {
  const outForm = Form.useFormInstance();
  const [text, setText] = useState<string>();
  const [isValid, setIsValid] = useState<HTTPFirewallRuleSet | undefined>(value);

  // 初始化：将外部传入的 JSON 对象转为格式化字符串
  useEffect(() => {
    setText(JSON.stringify(value || {}, null, 2));
  }, [value]);

  // 处理文本变化
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    try {
      const validValue = JSON.parse(newText);
      setIsValid(validValue);
      outForm.setFields([{ name, errors: [], validated: true }]);
      // onChange?.(newText); // 有效时传对象
    } catch {
      setIsValid(undefined);
      outForm.setFields([{ name, errors: ["Invalid JSON"], validated: false }]);
    }
  };

  // 输入完成后再调用 onChange
  const handleBulr = () => {
    if (isValid) {
      onChange?.(isValid);
    }
  };

  return (
    <Input.TextArea
      value={text}
      placeholder="{...规则集代码...}"
      onChange={handleChange}
      onBlur={handleBulr}
      autoSize={{ minRows: 10, maxRows: 20 }}
    />
  );
};

export function FirewallRuleGroupForm({ form, onSuccess, onError, ...props }: RuleFormProps<HTTPFirewallRuleGroup> & FormProps) {
  const onFinish = (values: HTTPFirewallRuleGroup) => {
    onSuccess?.(buildFirewallRuleGroupDraft(values));
  };

  return (
    <Form form={form} name="firewallRuleGroupForm" onFinish={onFinish} onFinishFailed={onError} {...props}>
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>
      <Form.Item label="分组名称" name="name" required help="给分组起一个容易识别的名称">
        <Input />
      </Form.Item>

      {/* 高级选项 */}
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
                <Form.Item label="描述" name="description">
                  <Input.TextArea />
                </Form.Item>
                <Form.Item label="启用" name="isOn" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </Form>
  );
}

// 规则集代码输入
export function FirewallRuleSetCodeForm({ form, onSuccess, onError, ...props }: RuleFormProps<HTTPFirewallRuleSet> & FormProps) {
  const handleFinish = async (values?: { code?: HTTPFirewallRuleSet; group?: HTTPFirewallRuleGroup }) => {
    onSuccess?.(values?.code);
  };

  return (
    <Form form={form} name="firewallRuleSetCodeForm" onFinish={handleFinish} onFinishFailed={onError} {...props}>
      <Form.Item name="groupId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="ruleSet" rules={[{ required: true }]}>
        <JsonEditor name="code" />
      </Form.Item>
    </Form>
  );
}

// 规则之间的关系
const ruleConnectorOptions = [
  { label: "和(AND)", value: "and" },
  { label: "或(OR)", value: "or" },
];

export const FirewallRuleSetForm = ({ form, onSuccess, onError, ...props }: RuleFormProps<HTTPFirewallRuleSet> & FormProps) => {
  const handleFinish = (values: HTTPFirewallRuleSet) => {
    if (!values.id) {
      values.id = String(tmpId--);
    }
    onSuccess?.(values);
  };

  return (
    <Form form={form} name="firewallRuleSetForm" onFinish={handleFinish} onFinishFailed={onError} layout="vertical" {...props}>
      <Form.Item name="id" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="groupId" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="isOn" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        label="规则集名称"
        name="name"
        rules={[{ required: true, whitespace: true, message: "请输入规则集名称" }]}
        extra="可以用来描述当前规则集用途。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={<span className="firewall-rule-section-label">规则</span>}
        name="rules"
        rules={[{ type: "array", required: true, min: 1, message: "请至少添加一条规则" }]}
        layout="horizontal"
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
        extra="可修改已有规则，拖动左侧手柄调整顺序。"
      >
        <FirewallRulesInput />
      </Form.Item>
      <Form.Item
        required
        label="规则之间的关系"
        name="connector"
        help="和(AND) 所有规则都满足才视为匹配，或(OR) 任一规则满足了就视为匹配"
        layout="horizontal"
      >
        <Select options={ruleConnectorOptions} style={{ width: 100 }} />
      </Form.Item>

      <Form.Item
        label={<span className="firewall-rule-section-label">执行动作</span>}
        name="actions"
        rules={[{ type: "array", required: true, min: 1, message: "请至少添加一个执行动作" }]}
        layout="horizontal"
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
        extra="可修改、拖拽排序。系统会先执行记录日志、标签等不修改请求的动作，再执行阻止、验证码等可能改变请求的动作。"
      >
        <FirewallActionsInput />
      </Form.Item>

      <Form.Item
        label="允许局域网IP"
        name="ignoreLocal"
        valuePropName="checked"
        help="选中后，表示如果请求来自局域网IP，则直接跳过当前规则集。"
        layout="horizontal"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="允许搜索引擎"
        name="ignoreSearchEngine"
        valuePropName="checked"
        help="选中后，表示如果请求来自常见搜索引擎的IP，则直接跳过当前规则集。"
        layout="horizontal"
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

type SortableFirewallTagProps = {
  id: string;
  label: string;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  children: ReactNode;
};

function SortableFirewallTag({ id, label, editing, onEdit, onRemove, children }: SortableFirewallTagProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`firewall-item-tag${editing ? " is-editing" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 1 : undefined }}
    >
      <Button
        ref={setActivatorNodeRef}
        type="text"
        size="small"
        icon={<HolderOutlined />}
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none", flexShrink: 0 }}
        {...attributes}
        {...listeners}
        aria-label={`拖动排序${label}`}
        title="拖动排序；也可按空格键后使用方向键调整"
      />
      <div className="firewall-item-content">{children}</div>
      <div className="firewall-item-controls">
        <Button size="small" type="link" icon={<EditOutlined />} onClick={onEdit} aria-label={`修改${label}`} title="修改" />
        <Button size="small" type="text" danger icon={<CloseOutlined />} onClick={onRemove} aria-label={`删除${label}`} title="删除" />
      </div>
    </div>
  );
}

type FirewallItemsInputProps<T> = CustomFormItemProps<T[]> & {
  label: string;
  renderLabel: (item: T) => ReactNode;
  renderEditor: (value: T | undefined, onConfirm: (item?: T | null) => void, onCancel: () => void) => ReactNode;
};

function FirewallItemsInput<T extends object>({ value, onChange, label, renderLabel, renderEditor }: FirewallItemsInputProps<T>) {
  const [editingIndex, setEditingIndex] = useState<number>();
  const [getItemId] = useState(() => {
    const ids = new WeakMap<T, string>();
    let nextId = 0;
    return (item: T) => {
      let id = ids.get(item);
      if (id === undefined) {
        id = String(nextId++);
        ids.set(item, id);
      }
      return id;
    };
  });
  const items = (value ?? []).map((item) => ({ id: getItemId(item), item }));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const closeEditor = () => setEditingIndex(undefined);
  const handleConfirm = (item?: T | null) => {
    if (item) {
      onChange?.(editingIndex === -1 ? [...(value ?? []), item] : (value ?? []).map((original, index) => (index === editingIndex ? item : original)));
    }
    closeEditor();
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onChange?.(arrayMove(value ?? [], from, to));
  };

  return (
    <div className="firewall-items-input">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={closeEditor} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
          {items.length > 0 && (
            <div className="firewall-items-list">
              {items.map(({ id, item }, index) => (
                <SortableFirewallTag
                  key={id}
                  id={id}
                  label={`${label} ${index + 1}`}
                  editing={editingIndex === index}
                  onEdit={() => setEditingIndex(index)}
                  onRemove={() => {
                    closeEditor();
                    onChange?.((value ?? []).filter((_, itemIndex) => itemIndex !== index));
                  }}
                >
                  {renderLabel(item)}
                </SortableFirewallTag>
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
      {editingIndex !== undefined ? (
        <Card className="firewall-item-editor" size="small" title={`${editingIndex === -1 ? "添加" : "修改"}${label}`} key={editingIndex}>
          {renderEditor(editingIndex < 0 ? undefined : structuredClone(value?.[editingIndex]), handleConfirm, closeEditor)}
        </Card>
      ) : (
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => setEditingIndex(-1)}>
          添加{label}
        </Button>
      )}
    </div>
  );
}

// 规则列表输入控件
export const FirewallRulesInput = (props: CustomFormItemProps<HTTPFirewallRule[]>) => {
  return (
    <FirewallItemsInput
      {...props}
      label="规则"
      renderLabel={(rule) => {
        const { paramPrefix } = parseFirewallRuleParam(rule.param);
        const param = GetRuleParam(paramPrefix);
        return (
          <>
            <span className="firewall-item-title" title={param?.description}>
              {param?.name ?? rule.param}
            </span>{" "}
            {param && <span className="firewall-item-detail">{rule.param} </span>}
            {rule.paramFilters?.map((filter, index) => (
              <span key={`${filter.code}-${index}`}> | {filter.code} </span>
            ))}
            {paramPrefix === "cc2" && <span>{String(rule.checkpointOptions?.period ?? 60)} 秒内请求数 </span>}
            {paramPrefix === "refererBlock" ? (
              <span className="firewall-item-detail">
                {Array.isArray(rule.checkpointOptions?.allowDomains) && rule.checkpointOptions.allowDomains.length > 0
                  ? `允许 ${rule.checkpointOptions.allowDomains.join(", ")} `
                  : ""}
                {Array.isArray(rule.checkpointOptions?.denyDomains) && rule.checkpointOptions.denyDomains.length > 0
                  ? `禁止 ${rule.checkpointOptions.denyDomains.join(", ")}`
                  : ""}
              </span>
            ) : paramPrefix === "requestGeneralHeaderLength" ? (
              <span>超出 {String(rule.checkpointOptions?.length ?? 128)} 字节</span>
            ) : (
              <span title={`${RuleOperatorDescription(rule.operator) ?? ""}${rule.isCaseInsensitive ? "（忽略大小写）" : ""}`}>
                {RuleOperatorName(rule.operator)} {rule.value || "[空]"}
              </span>
            )}
            {rule.description && <span className="firewall-item-detail">（{rule.description}）</span>}
          </>
        );
      }}
      renderEditor={(value, onConfirm, onCancel) => <FirewallRuleInput value={value} onChange={onConfirm} onCancel={onCancel} />}
    />
  );
};

// 规则参数选项
const wafRuleParamOptions = [
  { label: "[选择参数]", value: "" },

  {
    label: "特殊参数",
    options: RuleParams.filter((rp) => rp.isComposed).map((param) => {
      return {
        label: `${param.name} - [${param.prefix}]`,
        value: param.prefix,
      };
    }),
  },
  {
    label: "通用参数",
    options: RuleParams.filter((rp) => !rp.isComposed).map((param) => {
      return {
        label: `${param.name} - [${param.prefix}]`,
        value: param.prefix,
      };
    }),
  },
];

// 操作符选项
const wafRuleOperatorOptions = RuleOperators.map((operator) => {
  return {
    label: operator.name,
    value: operator.code,
  };
});

type FirewallHasCancelInputProps = {
  onCancel?: () => void;
};

// 单规则输入控件
export const FirewallRuleInput = ({ value: rule, onChange, onCancel }: CustomFormItemProps<HTTPFirewallRule> & FirewallHasCancelInputProps) => {
  const [form] = Form.useForm<HTTPFirewallRule & { paramPrefix: string; paramSuffix: string }>();
  const initialParam = parseFirewallRuleParam(rule?.param);
  const ruleParamPrefix = Form.useWatch("paramPrefix", form) ?? initialParam.paramPrefix;
  const ruleOperator = Form.useWatch("operator", form);

  const ruleParam = useMemo(() => GetRuleParam(ruleParamPrefix), [ruleParamPrefix]);

  const handleConfirm = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const { paramPrefix, paramSuffix, ...values } = form.getFieldsValue(true);
    const newValues = { ...rule, ...values, param: `\${${paramPrefix}${paramSuffix ? `.${paramSuffix}` : ""}}` };
    if (!newValues.id) {
      newValues.id = String(tmpId--);
    }
    newValues.isOn = rule?.isOn ?? true;
    if (paramPrefix === "cc2") {
      newValues.operator = "gt";
      newValues.value = String(newValues.checkpointOptions?.threshold ?? 1000);
    }

    onChange?.(newValues);
  };

  return (
    <Form
      name="firewallRuleForm"
      form={form}
      layout="horizontal"
      component={false}
      initialValues={{ ...rule, ...initialParam }}
      labelCol={{ sm: { flex: "100px" } }}
      labelWrap
    >
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>

      <Form.Item
        label="选择参数"
        name="paramPrefix"
        rules={[{ required: true, message: "请选择规则参数" }]}
        layout="horizontal"
        help={ruleParam?.description}
      >
        <Select
          options={wafRuleParamOptions}
          onChange={() => {
            form.setFieldValue("paramSuffix", "");
            form.setFieldValue("checkpointOptions", undefined);
          }}
        />
      </Form.Item>

      {/* 防盗链 */}
      {ruleParamPrefix === "requestGeneralHeaderLength" && (
        <>
          <Form.Item hidden name="operator">
            <Input />
          </Form.Item>
          <Form.Item hidden name="value">
            <Input />
          </Form.Item>

          <Form.Item noStyle name="checkpointOptions">
            <FirewallRequestGeneralHeaderLengthFormInput />
          </Form.Item>
        </>
      )}

      {/* CC2 统计 */}
      {ruleParamPrefix === "cc2" && (
        <>
          <Form.Item hidden name="operator">
            <Input />
          </Form.Item>
          <Form.Item hidden name="value">
            <Input />
          </Form.Item>

          <Form.Item noStyle name="checkpointOptions">
            <FirewallCC2FormInput />
          </Form.Item>
        </>
      )}

      {/* 防盗链 */}
      {ruleParamPrefix === "refererBlock" && (
        <>
          <Form.Item hidden name="operator">
            <Input />
          </Form.Item>
          <Form.Item hidden name="value">
            <Input />
          </Form.Item>

          <Form.Item noStyle name="checkpointOptions">
            <FirewallRefererBlockFormInput />
          </Form.Item>
        </>
      )}

      {!ruleParam?.isComposed && (
        <>
          {(ruleParam?.hasParams && ruleParam.params == null) || (!ruleParam && initialParam.paramSuffix) ? (
            <Form.Item label="参数名" name="paramSuffix" rules={[{ required: true, whitespace: true, message: "请输入参数名" }]} layout="horizontal">
              <Input />
            </Form.Item>
          ) : null}

          <Form.Item
            label="操作符"
            name="operator"
            rules={[{ required: true, message: "请选择操作符" }]}
            layout="horizontal"
            help={RuleOperatorDescription(ruleOperator)}
          >
            <Select options={wafRuleOperatorOptions} />
          </Form.Item>
          <Form.Item label="对比值" name="value" layout="horizontal">
            <Input.TextArea />
          </Form.Item>
        </>
      )}

      <Form.Item label="备注" name="description" layout="horizontal">
        <Input />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleConfirm}>
            确定
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

// CC2 统计表单
export const FirewallCC2FormInput = ({ value, onChange }: CustomFormItemProps<JsonObject>) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (value?.keys === undefined) {
      const newValue = {
        keys: ["${remoteAddr}", "${requestPath}"],
        period: 60,
        threshold: 1000,
        ignoreCommonFiles: true,
        enableFingerprint: true,
        ...value,
      };
      form.setFieldsValue(newValue);
      onChange?.(newValue);
    }
  }, [value, onChange, form]);

  const onFormChange = () => {
    const values = form.getFieldsValue(true);
    onChange?.(values);
  };

  return (
    <Form form={form} initialValues={value} component={false} layout="horizontal" labelCol={{ span: 3 }} onFieldsChange={onFormChange} labelWrap>
      <Form.Item required label="统计对象组合" name="keys" layout="horizontal">
        <MetricHttpKeysInput />
      </Form.Item>
      <Form.Item required label="统计周期" name="period" layout="horizontal">
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
      <Form.Item required label="阈值" name="threshold" layout="horizontal">
        <InputNumber />
      </Form.Item>
      <Form.Item
        required
        label="检查指纹"
        name="enableFingerprint"
        valuePropName="checked"
        help="在接收到HTTPS请求时尝试检查请求来源的指纹，用来检测代理服务和爬虫攻击；如果你在网站前面放置了别的反向代理服务，请取消此选项。"
        layout="horizontal"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        required
        label="忽略常用文件"
        name="ignoreCommonFiles"
        valuePropName="checked"
        help="忽略js、css、jpg等常在网页里被引用的文件名，即对这些文件的访问不加入计数，可以减少误判几率。"
        layout="horizontal"
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

// refererBlock 防盗链
export const FirewallRefererBlockFormInput = ({ value, onChange }: CustomFormItemProps<JsonObject>) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (value?.allowEmpty === undefined) {
      const newValue = {
        allowEmpty: true,
        allowSameDomain: true,
        allowDomains: [],
        denyDomains: [],
        checkOrigin: true,
        ...value,
      };
      form.setFieldsValue(newValue);
      onChange?.(newValue);
    }
  }, [value, onChange, form]);

  const onFormChange = () => {
    const values = form.getFieldsValue(true);
    onChange?.(values);
  };

  return (
    <Form form={form} initialValues={value} component={false} layout="horizontal" onFieldsChange={onFormChange} labelCol={{ span: 3 }} labelWrap>
      <Form.Item label="来源域名允许为空" name="allowEmpty" valuePropName="checked" layout="horizontal" help="允许不带来源的访问。">
        <Switch />
      </Form.Item>
      <Form.Item
        label="来源域名允许一致"
        name="allowSameDomain"
        valuePropName="checked"
        layout="horizontal"
        help="允许来源域名和当前访问的域名一致，相当于在站内访问。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="允许的来源域名"
        name="allowDomains"
        layout="horizontal"
        help="允许的来源域名列表，比如example.com（顶级域名)、*.example.com（example.com的所有二级域名）。单个星号*表示允许所有域名。"
      >
        <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
      </Form.Item>
      <Form.Item
        label="禁止的来源域名"
        name="denyDomains"
        layout="horizontal"
        help="禁止的来源域名列表，比如example.org（顶级域名）、*.example.org（example.org的所有二级域名）；除了这些禁止的来源域名外，其他域名都会被允许，除非限定了允许的来源域名。"
      >
        <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
      </Form.Item>
      <Form.Item
        label="同时检查Origin"
        name="checkOrigin"
        valuePropName="checked"
        layout="horizontal"
        help="如果请求没有指定Referer Header，则尝试检查Origin Header，多用于跨站调用。"
      >
        <Switch />
      </Form.Item>
    </Form>
  );
};

// requestGeneralHeaderLength 通用报头长度
export const FirewallRequestGeneralHeaderLengthFormInput = ({ value, onChange }: CustomFormItemProps<JsonObject>) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (value?.headers === undefined) {
      const newValue = {
        headers: ["Cache-Control", "Connection", "Date", "Pragma", "Trailer", "Transfer-Encoding", "Upgrade", "Via", "Warning"],
        length: 128,
        ...value,
      };
      form.setFieldsValue(newValue);
      onChange?.(newValue);
    }
  }, [value, onChange, form]);

  const onFormChange = () => {
    const values = form.getFieldsValue(true);
    onChange?.(values);
  };

  return (
    <Form form={form} initialValues={value} component={false} layout="horizontal" onFieldsChange={onFormChange} labelCol={{ span: 3 }} labelWrap>
      <Form.Item label="通用Header列表" name="headers" layout="horizontal" help="需要检查的Header列表。">
        <MultiTagsInput addTag="添加Header" splitTags={/[, ]+/} />
      </Form.Item>

      <Form.Item label="Header值超出长度" name="length" layout="horizontal" help="超出此长度认为匹配成功，0表示不限制。">
        <CompactField addonAfter="字节">
          <InputNumber />
        </CompactField>
      </Form.Item>
    </Form>
  );
};

// 执行动作输入控件
export const FirewallActionsInput = ({ value: actions, onChange }: CustomFormItemProps<HTTPFirewallAction[]>) => {
  return (
    <FirewallItemsInput
      value={actions}
      onChange={onChange}
      label="动作"
      renderLabel={(action) => {
        const summary = getFirewallActionSummary(action);
        return (
          <>
            <span className="firewall-item-title" title={ActionTypeDescription(action.code) ?? undefined}>
              {ActionTypeName(action.code)}
            </span>
            {summary && <span className="firewall-item-detail"> · {summary}</span>}
          </>
        );
      }}
      renderEditor={(value, onConfirm, onCancel) => <FirewallActionInput value={value} onChange={onConfirm} onCancel={onCancel} />}
    />
  );
};

const wafActionOptions = ActionTypes.map((action) => {
  return {
    label: action.name,
    value: action.code,
  };
});

// 单个动作
export const FirewallActionInput = ({ value: action, onChange, onCancel }: CustomFormItemProps<HTTPFirewallAction> & FirewallHasCancelInputProps) => {
  const [form] = Form.useForm<HTTPFirewallAction>();

  const actionCode = Form.useWatch("code", form);
  const actionDescription = useMemo(() => ActionTypeDescription(actionCode), [actionCode]);

  const handleConfirm = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const newValues = form.getFieldsValue(true);

    onChange?.(newValues);
  };

  return (
    <Form<HTTPFirewallAction>
      form={form}
      name="firewallActionForm"
      component={false}
      initialValues={action ?? { code: "page", options: getFirewallActionDefaultOptions("page") }}
      layout="horizontal"
      labelCol={{ sm: { flex: "100px" } }}
      labelWrap
    >
      <Form.Item label="动作类型" name="code" rules={[{ required: true, message: "请选择动作类型" }]} layout="horizontal" help={actionDescription}>
        <Select options={wafActionOptions} onChange={(code) => form.setFieldValue("options", getFirewallActionDefaultOptions(code))} />
      </Form.Item>

      {/* 显示网页(PAGE) */}
      {actionCode === "page" && <FirewallActionPage />}
      {/* 阻止(BLOCK) */}
      {actionCode === "block" && <FirewallActionBlock />}
      {/* 人机识别(BLOCK) */}
      {(actionCode === "captcha" || actionCode == "js_cookie") && <FirewallActionCaptchaAndJsCookie />}
      {/* 跳转(REDIRECT) */}
      {actionCode === "redirect" && <FirewallActionRedirect />}
      {/* 标签(TAG) */}
      {actionCode === "tag" && <FirewallActionTag />}
      {/* POST_307 和 GET_302 */}
      {(actionCode === "post_307" || actionCode == "get_302") && <FirewallAction307And302 />}

      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleConfirm}>
            确定
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

// 显示网页(PAGE)
export const FirewallActionPage = () => {
  return (
    <>
      <Form.Item label="状态码" name={["options", "status"]} layout="horizontal">
        <InputNumber />
      </Form.Item>
      <Form.Item label="网页内容" name={["options", "body"]} layout="horizontal">
        <Input.TextArea placeholder="留空使用默认提示页面" />
      </Form.Item>
    </>
  );
};

// 阻止(BLOCK)
export const FirewallActionBlock = () => {
  return (
    <>
      <Form.Item label="封禁范围" name={["options", "blockScope"]} layout="horizontal">
        <Select
          options={[
            { label: "所有网站", value: "global" },
            { label: "当前网站", value: "service" },
          ]}
        />
      </Form.Item>
      <Form.Item label="封禁时长" name={["options", "timeout"]} layout="horizontal">
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
      <Form.Item
        label="最大封禁时长"
        name={["options", "timeoutMax"]}
        layout="horizontal"
        help="选填项。如果同时填写了封禁时长和最大封禁时长，则会在两者之间随机选择一个数字作为最终的封禁时长。"
      >
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
    </>
  );
};

// Captcha人机识别(CAPTCHA) 和 JS Cookie验证(JS_COOKIE) 共享
export const FirewallActionCaptchaAndJsCookie = () => {
  return (
    <>
      <Form.Item label="有效时间" name={["options", "life"]} layout="horizontal" help="验证通过后在这个时间内不再验证；如果为空或者为0表示默认。">
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
      <Form.Item
        label="有效时间"
        name={["options", "maxFails"]}
        layout="horizontal"
        help="允许用户失败尝试的最多次数，超过这个次数将被自动加入黑名单；如果为空或者为0表示默认。"
      >
        <CompactField addonAfter="次">
          <InputNumber />
        </CompactField>
      </Form.Item>
      <Form.Item
        label="失败拦截时间"
        name={["options", "failBlockTimeout"]}
        layout="horizontal"
        help="在达到最多失败次数（大于0）时，自动拦截的时间；如果为空或者为0表示默认。"
      >
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
    </>
  );
};

// 跳转(REDIRECT)
export const FirewallActionRedirect = () => {
  return (
    <>
      <Form.Item label="状态码" name={["options", "status"]} layout="horizontal">
        <Select options={redirectStatusOptions} />
      </Form.Item>
      <Form.Item label="跳转到URL" name={["options", "url"]} layout="horizontal">
        <Input />
      </Form.Item>
    </>
  );
};

// 标签(TAG)
export const FirewallActionTag = () => {
  return (
    <>
      <Form.Item label="标签" name={["options", "tags"]} layout="horizontal">
        <MultiTagsInput addTag="添加标签" />
      </Form.Item>
    </>
  );
};

// POST 307 和 GET 302
export const FirewallAction307And302 = () => {
  return (
    <>
      <Form.Item label="有效时间" name={["options", "life"]} layout="horizontal">
        <CompactField addonAfter="秒">
          <InputNumber />
        </CompactField>
      </Form.Item>
    </>
  );
};
