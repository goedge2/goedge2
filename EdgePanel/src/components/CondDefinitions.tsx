import { Form, Input } from "antd";
import { useEffect, useMemo, useState } from "react";
import { CustomFormItemProps } from "../utils";
import type { HTTPRequestCond } from "../pb/models/model_config_shared_pb";
import { MultiTagsInput } from "./MultiListenPortInput";
import { isEqual } from "lodash-es";

// 条件定义

// URL 扩展名条件
export const CondUrlExtension = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  const exts = useMemo(() => {
    if (value && value.value) {
      try {
        const parsed = JSON.parse(value.value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        // 忽略 JSON 解析错误，默认值为空数组
      }
    }
    return [];
  }, [value]);

  const handleChange = (exts?: string[] | null) => {
    try {
      const extsJSON = JSON.stringify(exts);
      const cond = {
        ...value,
        isRequest: true,
        param: "${requestPathLowerExtension}",
        operator: "in",
        value: extsJSON,
      } as HTTPRequestCond;
      onChange?.(cond);
    } catch {
      // 忽略JSON序列化错误
    }
  };

  return (
    <Form.Item required label="扩展名列表" help="扩展名需要包含点（.）符号，例如.jpg、.png之类；多个扩展名用逗号分割。">
      <MultiTagsInput value={exts} addTag="添加扩展名" splitTags={/[, ]+/} onChange={handleChange} />
    </Form.Item>
  );
};

// 首页
export const CondUrlEqIndex = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  useEffect(() => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "eq",
      value: "/",
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  }, [onChange, value]);

  return (
    <Form.Item required label="URL完整路径" help="检查URL路径是为/，不需要带域名。">
      <Input value="/" disabled />
    </Form.Item>
  );
};

// 全站
export const CondUrlAll = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  useEffect(() => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "prefix",
      value: "/",
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  }, [onChange, value]);

  return (
    <Form.Item required label="URL完整路径" help="支持全站所有URL。">
      <Input value="/" disabled />
    </Form.Item>
  );
};

// URL目录前缀
export const CondUrlPrefix = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  const [prefix, setPrefix] = useState(value?.value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handleInputConfirm = () => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "prefix",
      value: prefix,
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  };

  return (
    <Form.Item required label="URL目录前缀" help="URL前缀，有此前缀的URL都将会被匹配，通常以/开头，比如/static、/images，不需要带域名。">
      <Input value={prefix} onChange={handleInputChange} onBlur={handleInputConfirm} onPressEnter={handleInputConfirm} />
    </Form.Item>
  );
};

// URL完整路径
export const CondUrlEq = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  const [prefix, setPrefix] = useState(value?.value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handleInputConfirm = () => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "eq",
      value: prefix,
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  };

  return (
    <Form.Item required label="URL完整路径" help="完整的URL路径，通常以/开头，比如/static/ui.js，不需要带域名。">
      <Input value={prefix} onChange={handleInputChange} onBlur={handleInputConfirm} onPressEnter={handleInputConfirm} />
    </Form.Item>
  );
};

// URL通配符
export const CondUrlWildcardMatch = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  const [prefix, setPrefix] = useState(value?.value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handleInputConfirm = () => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "wildcard match",
      value: prefix,
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  };

  return (
    <Form.Item required label="通配符" help="匹配URL的通配符，用星号（*）表示任意字符，比如(/images/*.png、/static/*)，不需要带域名。">
      <Input value={prefix} onChange={handleInputChange} onBlur={handleInputConfirm} onPressEnter={handleInputConfirm} />
    </Form.Item>
  );
};

// URL正则表达式
export const CondUrlRegexp = ({ value, onChange }: CustomFormItemProps<HTTPRequestCond>) => {
  const [prefix, setPrefix] = useState(value?.value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefix(e.target.value);
  };

  const handleInputConfirm = () => {
    const cond = {
      ...value,
      isRequest: true,
      param: "${requestPath}",
      operator: "regexp",
      value: prefix,
    } as HTTPRequestCond;
    if (!isEqual(value, cond)) {
      onChange?.(cond);
    }
  };

  return (
    <Form.Item required label="正则表达式 " help="匹配URL的正则表达式，比如^/static/(.*).js$，不需要带域名。">
      <Input value={prefix} onChange={handleInputChange} onBlur={handleInputConfirm} onPressEnter={handleInputConfirm} />
    </Form.Item>
  );
};
