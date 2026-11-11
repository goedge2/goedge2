import { useMemo, useState } from "react";
import { Tag, Modal, Form, Input, Switch, Select, Space, Tooltip, theme } from "antd";
import { PlusOutlined, LockOutlined } from "@ant-design/icons";
import type { NodeIPAddress } from "../pb/models/model_node_ip_address_pb";
import type { CustomFormItemProps } from "../utils";

// 内部状态类型，添加临时 ID 用于 React key
type IPAddressWithTempId = Partial<NodeIPAddress> & {
  _tempId?: number;
  ip: string;
};

// ==================== IP 格式校验与解析工具 ====================

// 校验单个 IPv4
export const isValidIPv4 = (ip: string): boolean => {
  const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = regex.exec(ip);
  if (!match) return false;
  return match.slice(1, 5).every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
};

// 校验单个 IPv6 (简化版)
export const isValidIPv6 = (ip: string): boolean => {
  const regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return regex.test(ip);
};

// 校验 CIDR (位数 >= 24)
export const isValidCIDR = (cidr: string): boolean => {
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/.exec(cidr);
  if (!match) return false;
  const bits = parseInt(match[2], 10);
  return isValidIPv4(match[1]) && bits >= 24 && bits <= 32;
};

// 校验 IP 范围
export const isValidIPRange = (range: string): boolean => {
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(range);
  if (!match) return false;
  return isValidIPv4(match[1]) && isValidIPv4(match[2]);
};

// 检查是否为有效的IP格式（单IP、CIDR或IP范围）
export const isValidIPFormat = (input: string): boolean => {
  const trimmed = input.trim();
  return isValidIPv4(trimmed) || isValidIPv6(trimmed) || isValidCIDR(trimmed) || isValidIPRange(trimmed);
};

// IP 转换为数字 (用于范围计算)
const ipToNumber = (ip: string): number => {
  const parts = ip.split(".").map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// 数字转换为 IP
const numberToIP = (num: number): string => {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join(".");
};

// 解析 CIDR 为 IP 列表
const expandCIDR = (cidr: string): string[] => {
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/.exec(cidr);
  if (!match) return [];

  const baseIP = match[1];
  const bits = parseInt(match[2], 10);
  const hostBits = 32 - bits;
  const numHosts = Math.pow(2, hostBits);

  // 限制最多 256 个
  const maxHosts = Math.min(numHosts, 256);

  const baseNum = ipToNumber(baseIP);
  // 对齐到网段起始地址
  const networkNum = baseNum & (0xffffffff << hostBits);

  const ips: string[] = [];
  for (let i = 0; i < maxHosts; i++) {
    ips.push(numberToIP(networkNum + i));
  }
  return ips;
};

// 解析 IP 范围为 IP 列表 (最多 256 个)
const expandIPRange = (range: string): string[] => {
  const match = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(range);
  if (!match) return [];

  const startNum = ipToNumber(match[1]);
  const endNum = ipToNumber(match[2]);

  if (endNum < startNum) return [];

  const count = Math.min(endNum - startNum + 1, 256);
  const ips: string[] = [];
  for (let i = 0; i < count; i++) {
    ips.push(numberToIP(startNum + i));
  }
  return ips;
};

// 解析 IP 输入 (支持单 IP、CIDR、IP 范围)
export const parseIPInput = (input: string): string[] => {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const ips: string[] = [];

  for (const line of lines) {
    if (isValidCIDR(line)) {
      ips.push(...expandCIDR(line));
    } else if (isValidIPRange(line)) {
      ips.push(...expandIPRange(line));
    } else if (isValidIPv4(line) || isValidIPv6(line)) {
      ips.push(line);
    }
  }

  // 去重
  return [...new Set(ips)];
};

// 表单校验器
const validateIPInput = (_: unknown, value: string): Promise<void> => {
  if (!value || value.trim().length === 0) {
    return Promise.reject(new Error("请输入 IP 地址"));
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (!isValidIPv4(line) && !isValidIPv6(line) && !isValidCIDR(line) && !isValidIPRange(line)) {
      return Promise.reject(new Error(`无效的 IP 格式: ${line}`));
    }

    // CIDR 位数检查
    const cidrMatch = /\/(\d{1,2})$/.exec(line);
    if (cidrMatch) {
      const bits = parseInt(cidrMatch[1], 10);
      if (bits < 24) {
        return Promise.reject(new Error(`CIDR 位数不能小于 24: ${line}`));
      }
    }
  }

  return Promise.resolve();
};

// ==================== 状态选项 ====================

const statusOptions = [
  { value: "none", label: "不选择" },
  { value: "online", label: "在线" },
  { value: "offline", label: "离线" },
];

// ==================== 组件实现 ====================

export const NodeIPAddressesInput = ({ value, onChange }: CustomFormItemProps<NodeIPAddress[]>) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [showModal, setShowModal] = useState(false);
  const [editingTempId, setEditingTempId] = useState<number | null>(null);
  const sourceKey = useMemo(() => JSON.stringify(value ?? []), [value]);
  const externalItems = useMemo(
    () =>
      value?.map((item, index) => ({
        ...item,
        _tempId: index + 1,
      })) ?? [],
    [value],
  );
  const [draftState, setDraftState] = useState<{ sourceKey: string; items: IPAddressWithTempId[]; tempIdCounter: number }>();
  const isDraftCurrent = draftState?.sourceKey === sourceKey;
  const items = isDraftCurrent ? draftState.items : externalItems;
  const tempIdCounter = isDraftCurrent ? draftState.tempIdCounter : externalItems.length + 1;

  const updateDraft = (newItems: IPAddressWithTempId[], nextTempIdCounter = tempIdCounter) => {
    setDraftState({
      sourceKey,
      items: newItems,
      tempIdCounter: nextTempIdCounter,
    });
  };

  // 触发外部 onChange
  const triggerChange = (newItems: IPAddressWithTempId[]) => {
    // 移除 _tempId，转换回 NodeIPAddress[]
    const result = newItems.map((item) => {
      const normalized = { ...item };
      delete normalized._tempId;
      return normalized as NodeIPAddress;
    });
    onChange?.(result);
  };

  // 获取 Tag 颜色
  const getTagColor = (item: IPAddressWithTempId): string => {
    if (item.isOn === false) return "default";
    if (item.isUp === false) return "error";
    if (item.isUp === true) return "success";
    return "processing";
  };

  // 获取状态文本
  const getStatusText = (item: IPAddressWithTempId): string | null => {
    if (item.isOn === false) return "已禁用";
    if (item.isUp === false) return "离线";
    return null;
  };

  // 渲染单个 Tag
  const renderTag = (item: IPAddressWithTempId) => {
    const tempId = item._tempId ?? Number(item.id ?? 0);
    const statusText = getStatusText(item);
    const showLock = item.canAccess === false;

    const tagContent = (
      <Space size={4}>
        {showLock && <LockOutlined />}
        <span>{item.ip}</span>
        {statusText && <span style={{ opacity: 0.7 }}>({statusText})</span>}
      </Space>
    );

    const tag = (
      <Tag
        key={tempId}
        color={getTagColor(item)}
        closeIcon
        onClose={(e) => {
          e.preventDefault();
          handleDelete(tempId);
        }}
        style={{ cursor: "pointer", marginBottom: 4 }}
        onClick={() => handleEdit(item)}
      >
        {tagContent}
      </Tag>
    );

    // 如果有备注，显示 Tooltip
    if (item.name) {
      return (
        <Tooltip key={tempId} title={`备注: ${item.name}`}>
          {tag}
        </Tooltip>
      );
    }

    return tag;
  };

  // 添加 IP
  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      ipInput: "",
      canAccess: true,
      name: "",
      status: "none",
    });
    setEditingTempId(null);
    setShowModal(true);
  };

  // 编辑 IP
  const handleEdit = (item: IPAddressWithTempId) => {
    const tempId = item._tempId ?? Number(item.id ?? 0);
    let status = "none";
    if (item.isUp === true) status = "online";
    else if (item.isUp === false) status = "offline";

    form.setFieldsValue({
      ipInput: item.ip,
      canAccess: item.canAccess !== false,
      name: item.name || "",
      status,
    });
    setEditingTempId(tempId);
    setShowModal(true);
  };

  // 删除 IP
  const handleDelete = (tempId: number) => {
    const newItems = items.filter((item) => item._tempId !== tempId);
    updateDraft(newItems);
    triggerChange(newItems);
  };

  // Modal 确认
  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const { ipInput, canAccess, name, status } = values;

      // 解析状态
      let isUp: boolean | undefined;
      if (status === "online") isUp = true;
      else if (status === "offline") isUp = false;

      if (editingTempId !== null) {
        // 编辑模式：更新单个 IP
        const newItems = items.map((item) => {
          if (item._tempId === editingTempId) {
            return {
              ...item,
              ip: ipInput.trim(),
              canAccess,
              name: name || "",
              isUp,
              isOn: item.isOn !== false, // 保持原有 isOn 状态
            };
          }
          return item;
        });
        updateDraft(newItems);
        triggerChange(newItems);
      } else {
        // 添加模式：解析 IP 输入，可能产生多个 IP
        const ips = parseIPInput(ipInput);

        let nextTempId = tempIdCounter;
        const newIPItems: IPAddressWithTempId[] = ips.map((ip) => {
          const item: IPAddressWithTempId = {
            _tempId: nextTempId++,
            id: "0", // 新增 IP，id 为 0，由后端生成真实 ID
            ip,
            canAccess,
            name: name || "",
            isUp,
            isOn: true,
          };
          return item;
        });

        const newItems = [...items, ...newIPItems];
        updateDraft(newItems, nextTempId);
        triggerChange(newItems);
      }

      setShowModal(false);
    });
  };

  // 添加按钮样式
  const tagPlusStyle: React.CSSProperties = {
    background: token.colorBgContainer,
    borderStyle: "dashed",
    cursor: "pointer",
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map((item) => renderTag(item))}
        <Tag style={tagPlusStyle} icon={<PlusOutlined />} onClick={handleAdd}>
          添加 IP
        </Tag>
      </div>

      <Modal
        title={editingTempId !== null ? "编辑 IP 地址" : "添加 IP 地址"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleModalOk}
        width={{
          xs: "90%",
          sm: "80%",
          md: "60%",
          lg: "50%",
          xl: "40%",
          xxl: "35%",
        }}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            canAccess: true,
            status: "none",
          }}
        >
          <Form.Item
            name="ipInput"
            label="IP 地址"
            rules={[{ validator: validateIPInput }]}
            help={
              editingTempId === null ? "支持单个IP、CIDR格式的一组IP（位数不能小于24）、IP范围（类似于x.x.x.x-x.x.x.x，最多只取256个）" : undefined
            }
          >
            <Input.TextArea
              rows={editingTempId !== null ? 1 : 3}
              placeholder={editingTempId !== null ? "192.168.1.1" : "192.168.1.1\n192.168.1.0/24\n192.168.1.1-192.168.1.100"}
              disabled={editingTempId !== null} // 编辑模式下不允许修改 IP
            />
          </Form.Item>

          <Form.Item
            name="canAccess"
            label="允许公开访问"
            valuePropName="checked"
            help="是否为可以公开访问的IP，如果选中表示当前IP可以被公开访问，并可被加入到DNS解析记录中"
          >
            <Switch />
          </Form.Item>

          <Form.Item name="name" label="备注">
            <Input placeholder="可选，用于标识此 IP 的用途" />
          </Form.Item>

          <Form.Item name="status" label="在线状态">
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NodeIPAddressesInput;
