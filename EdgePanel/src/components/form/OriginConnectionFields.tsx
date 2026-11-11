import { Form, InputNumber, Select } from "antd";
import type { TimeDuration } from "@/pb/models/model_config_shared_pb";
import type { CustomFormItemProps } from "@/utils";
import { CompactField } from "../SharedInput";

const timeUnits = [
  { value: "ms", label: "毫秒" },
  { value: "second", label: "秒" },
  { value: "minute", label: "分钟" },
  { value: "hour", label: "小时" },
  { value: "day", label: "天" },
  { value: "week", label: "周" },
];

const TimeoutInput = ({ id, value, onChange }: CustomFormItemProps<TimeDuration> & { id?: string }) => (
  <CompactField
    addonAfter={
      <Select
        value={value?.unit || "second"}
        options={timeUnits}
        style={{ width: 90 }}
        onChange={(unit) => onChange?.({ count: "0", ...value, unit } as TimeDuration)}
      />
    }
  >
    <InputNumber
      id={id}
      stringMode
      min="0"
      precision={0}
      value={value?.count ?? "0"}
      style={{ width: 160 }}
      onChange={(count) => onChange?.({ unit: "second", ...value, count: count ?? "0" } as TimeDuration)}
    />
  </CompactField>
);

export function OriginConnectionFields({ prefix = [] }: { prefix?: string[] }) {
  return (
    <>
      <Form.Item label="连接失败超时时间" name={[...prefix, "connTimeout"]} help="连接源站失败的最大超时时间，0 表示不限制。">
        <TimeoutInput />
      </Form.Item>
      <Form.Item label="读取超时时间" name={[...prefix, "readTimeout"]} help="读取源站内容时的最大超时时间，0 表示不限制。">
        <TimeoutInput />
      </Form.Item>
      <Form.Item label="最大并发连接数" name={[...prefix, "maxConns"]} help="源站可以接受的最大并发连接数，0 表示使用系统默认。">
        <InputNumber min={0} max={2147483647} precision={0} placeholder="0" style={{ width: 160 }} />
      </Form.Item>
      <Form.Item label="最大空闲连接数" name={[...prefix, "maxIdleConns"]} help="没有请求时，源站保持等待的最大空闲连接数量，0 表示使用系统默认。">
        <InputNumber min={0} max={2147483647} precision={0} placeholder="0" style={{ width: 160 }} />
      </Form.Item>
      <Form.Item label="最大空闲超时时间" name={[...prefix, "idleTimeout"]} help="源站保持等待的空闲超时时间，0 表示使用默认时间。">
        <TimeoutInput />
      </Form.Item>
    </>
  );
}
