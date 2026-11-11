import { Button, Cascader, Input, InputNumber, Select, Space, Tag } from "antd";
import type { SizeCapacity, TimeDuration, URLPattern } from "../pb/models/model_config_shared_pb";
import { CustomFormItemProps, HttpKeyName, HttpKeys } from "../utils";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { cloneElement, isValidElement, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";

type CompactFieldProps = {
  addonBefore?: ReactNode;
  addonAfter?: ReactNode;
  block?: boolean;
  children: ReactNode;
  size?: React.ComponentProps<typeof Space.Compact>["size"];
  style?: CSSProperties;
} & Record<string, unknown>;

export const CompactField = ({ addonBefore, addonAfter, block = false, children, size, style, ...controlProps }: CompactFieldProps) => {
  const input = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, controlProps) : children;

  return (
    <Space.Compact block={block} size={size} style={style}>
      {addonBefore !== undefined ? <Space.Addon>{addonBefore}</Space.Addon> : null}
      {input}
      {addonAfter !== undefined ? <Space.Addon>{addonAfter}</Space.Addon> : null}
    </Space.Compact>
  );
};

type TimeDurationMinUnit = {
  minUnit?: string;
  disabled?: boolean;
};

export const TimeDurationInput = ({ minUnit, disabled, value, onChange }: TimeDurationMinUnit & CustomFormItemProps<TimeDuration>) => {
  const onCountChange = (count?: string | null) => {
    if (count === undefined || count === null) count = "0";

    const newLife = { ...value, count: count } as TimeDuration;
    onChange?.(newLife);
  };
  const onUnitChange = (unit?: string) => {
    const newLife = { ...value, unit: unit } as TimeDuration;
    onChange?.(newLife);
  };

  let timeUnitOptions = [
    { label: "毫秒", value: "ms" },
    { label: "秒", value: "second" },
    { label: "分钟", value: "minute" },
    { label: "小时", value: "hour" },
    { label: "天", value: "day" },
  ];

  let minUnitIndex = -1;
  if (minUnit && typeof minUnit == "string" && minUnit.length > 0) {
    for (let i = 0; i < timeUnitOptions.length; i++) {
      if (timeUnitOptions[i].value === minUnit) {
        minUnitIndex = i;
        break;
      }
    }
  }
  if (minUnitIndex > -1) {
    timeUnitOptions = timeUnitOptions.slice(minUnitIndex);
  }

  return (
    <CompactField addonAfter={<Select disabled={disabled} options={timeUnitOptions} value={value?.unit || "minute"} onChange={onUnitChange} />}>
      <InputNumber stringMode disabled={disabled} value={String(value?.count ?? "")} onChange={onCountChange} />
    </CompactField>
  );
};

const sizeUnitOptions = [
  { label: "字节", value: "byte" },
  { label: "KiB", value: "kb" },
  { label: "MiB", value: "mb" },
  { label: "GiB", value: "gb" },
  { label: "TiB", value: "tb" },
  { label: "PiB", value: "pb" },
  { label: "EiB", value: "eb" },
];

export const SizeCapacityInput = ({ value, onChange }: CustomFormItemProps<SizeCapacity>) => {
  const onCountChange = (count?: string | null) => {
    if (count === undefined || count === null) count = "0";

    const newLife = { ...value, count: count } as SizeCapacity;
    onChange?.(newLife);
  };
  const onUnitChange = (unit?: string) => {
    const newLife = { ...value, unit: unit } as SizeCapacity;
    onChange?.(newLife);
  };

  return (
    <CompactField addonAfter={<Select options={sizeUnitOptions} value={value?.unit || "byte"} onChange={onUnitChange} />}>
      <InputNumber stringMode value={String(value?.count ?? "")} onChange={onCountChange} />
    </CompactField>
  );
};

export const URLPatternInput = ({ value, onChange }: CustomFormItemProps<URLPattern>) => {
  const type = value?.type || "wildcard";
  const pattern = value?.pattern || "";

  const onTypeChange = (newType: string) => {
    onChange?.({ ...value, type: newType, pattern: pattern } as URLPattern);
  };

  const onPatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.({ ...value, type: type, pattern: e.target.value } as URLPattern);
  };

  const isMedia = ["images", "audios", "videos"].includes(type);

  return (
    <Space.Compact style={{ width: "100%" }}>
      <Select
        style={{ width: 120 }}
        value={type}
        onChange={onTypeChange}
        options={[
          { label: "通配符", value: "wildcard" },
          { label: "正则表达式", value: "regexp" },
          { label: "常见图片", value: "images" },
          { label: "常见音频", value: "audios" },
          { label: "常见视频", value: "videos" },
        ]}
      />
      {!isMedia && (
        <Input
          value={pattern}
          onChange={onPatternChange}
          placeholder={type === "wildcard" ? "可以使用星号（*）通配符，不区分大小写" : "可以使用正则表达式，不区分大小写"}
        />
      )}
    </Space.Compact>
  );
};

export const URLPatternsList = ({ value, onChange }: CustomFormItemProps<URLPattern[]>) => {
  const patterns = value || [];

  const addPattern = () => {
    onChange?.([...patterns, { type: "wildcard", pattern: "" } as URLPattern]);
  };

  const removePattern = (index: number) => {
    const newPatterns = [...patterns];
    newPatterns.splice(index, 1);
    onChange?.(newPatterns);
  };

  const updatePattern = (index: number, newPattern?: URLPattern) => {
    if (!newPattern) return;
    const newPatterns = [...patterns];
    newPatterns[index] = newPattern;
    onChange?.(newPatterns);
  };

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="middle">
      {patterns.map((pattern, index) => (
        <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <URLPatternInput value={pattern} onChange={(val) => updatePattern(index, val)} />
          </div>
          <Button type="text" icon={<MinusCircleOutlined />} onClick={() => removePattern(index)} danger />
        </div>
      ))}
      <Button type="dashed" onClick={addPattern} block icon={<PlusOutlined />}>
        添加URL规则
      </Button>
    </Space>
  );
};

// 操作符选项
const metricHttpKeysOptions = [
  { label: "选择对象", value: "" },
  ...HttpKeys.map((key) => {
    return {
      label: key.name,
      value: key.code,
    };
  }),
];

const timeZoneOptions = [
  {
    value: "Asia",
    label: "Asia",
    children: [
      { value: "Asia/Shanghai", label: "Asia/Shanghai (+08:00)" },
      { value: "Asia/Chongqing", label: "Asia/Chongqing (+08:00)" },
      { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (+08:00)" },
      { value: "Asia/Taipei", label: "Asia/Taipei (+08:00)" },
      { value: "Asia/Tokyo", label: "Asia/Tokyo (+09:00)" },
      { value: "Asia/Singapore", label: "Asia/Singapore (+08:00)" },
      { value: "Asia/Seoul", label: "Asia/Seoul (+09:00)" },
      { value: "Asia/Bangkok", label: "Asia/Bangkok (+07:00)" },
      { value: "Asia/Dubai", label: "Asia/Dubai (+04:00)" },
    ],
  },
  {
    value: "America",
    label: "America",
    children: [
      { value: "America/New_York", label: "America/New_York (-05:00)" },
      { value: "America/Los_Angeles", label: "America/Los_Angeles (-08:00)" },
      { value: "America/Chicago", label: "America/Chicago (-06:00)" },
      { value: "America/Toronto", label: "America/Toronto (-05:00)" },
      { value: "America/Sao_Paulo", label: "America/Sao_Paulo (-03:00)" },
    ],
  },
  {
    value: "Europe",
    label: "Europe",
    children: [
      { value: "Europe/London", label: "Europe/London (+00:00)" },
      { value: "Europe/Paris", label: "Europe/Paris (+01:00)" },
      { value: "Europe/Berlin", label: "Europe/Berlin (+01:00)" },
      { value: "Europe/Moscow", label: "Europe/Moscow (+03:00)" },
    ],
  },
  {
    value: "Australia",
    label: "Australia",
    children: [
      { value: "Australia/Sydney", label: "Australia/Sydney (+10:00)" },
      { value: "Australia/Melbourne", label: "Australia/Melbourne (+10:00)" },
    ],
  },
  {
    value: "Africa",
    label: "Africa",
    children: [
      { value: "Africa/Cairo", label: "Africa/Cairo (+02:00)" },
      { value: "Africa/Johannesburg", label: "Africa/Johannesburg (+02:00)" },
    ],
  },
  {
    value: "UTC",
    label: "UTC",
    children: [{ value: "UTC", label: "UTC (+00:00)" }],
  },
];

export const TimeZoneSelector = ({ value, onChange }: CustomFormItemProps<string>) => {
  const getPath = (val?: string): string[] => {
    if (!val) return [];
    for (const region of timeZoneOptions) {
      for (const city of region.children) {
        if (city.value === val) {
          return [region.value, city.value];
        }
      }
    }
    return [];
  };

  const handleChange = (val: (string | number)[]) => {
    if (val && val.length > 0) {
      onChange?.(String(val[val.length - 1]));
    } else {
      onChange?.(undefined);
    }
  };

  return (
    <Cascader
      options={timeZoneOptions}
      value={getPath(value)}
      onChange={handleChange as (val: (string | number | null)[]) => void}
      placeholder="请选择时区"
      showSearch
      allowClear
      style={{ width: 300 }}
    />
  );
};

// 统计对象组合
export const MetricHttpKeysInput = ({ value: keys, onChange }: CustomFormItemProps<string[]>) => {
  const [inputVisible, setInputVisible] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [subKey, setSubKey] = useState("");

  const handleInputConfirm = () => {
    let key = newKey ?? "";

    if (key?.includes(".NAME")) {
      if (subKey.trim() === "") {
        return;
      }
      if (subKey?.startsWith("${")) {
        key = subKey.trim();
      } else {
        key = key.replace(".NAME", `.${subKey.trim()}`);
      }
    }

    if (key && !keys?.includes(key)) {
      const newValue = [...(keys ?? []), key];
      onChange?.(newValue);
    }
    setInputVisible(false);
    setNewKey("");
  };

  const handleRemoveKey = (key: string) => onChange?.(keys?.filter((k) => k !== key));

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        {keys?.map((key) => (
          <Tag key={key} closeIcon onClose={() => handleRemoveKey(key)}>
            {HttpKeyName(key)}
          </Tag>
        ))}
      </div>

      {inputVisible ? (
        <Space.Compact>
          <Select value={newKey} options={metricHttpKeysOptions} onChange={(key) => setNewKey(key)} />
          {newKey?.includes(".NAME") && <Input placeholder="参数值" value={subKey} onChange={(e) => setSubKey(e.target.value)} />}
          <Button onClick={handleInputConfirm}>确定</Button>
          <Button onClick={() => setInputVisible(false)}>取消</Button>
        </Space.Compact>
      ) : (
        <Button shape="circle" icon={<PlusOutlined />} onClick={() => setInputVisible(true)} />
      )}
    </>
  );
};
