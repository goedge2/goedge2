import { Collapse, Form, FormInstance, FormProps, Input, Select, Switch } from "antd";
import type { HTTPCacheRef } from "../../pb/models/model_http_cache_policy_pb";
import { SizeCapacityInput, TimeDurationInput } from "../SharedInput";
import { CondUrlAll, CondUrlEq, CondUrlEqIndex, CondUrlExtension, CondUrlPrefix, CondUrlRegexp, CondUrlWildcardMatch } from "../CondDefinitions";
import { MultiTagsInput } from "../MultiListenPortInput";

type CacheRefFormProps<T> = {
  form?: FormInstance;
  onSuccess?: (response?: T | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

const simpleCondTypeOptions = [
  { label: "文件扩展名", value: "url-extension" },
  { label: "首页", value: "url-eq-index" },
  { label: "全站", value: "url-all" },
  { label: "URL目录前缀", value: "url-prefix" },
  { label: "URL完整路径", value: "url-eq" },
  { label: "URL通配符", value: "url-wildcard-match" },
  { label: "URL正则匹配", value: "url-regexp" },
  // {label: '参数匹配', value: 'params'},
];

// 缓存条件
function CacheRefForm({ form, onSuccess, onError, ...props }: CacheRefFormProps<HTTPCacheRef> & FormProps) {
  const simpleCondType = Form.useWatch(["simpleCond", "type"], form);
  const isReverse = Form.useWatch("isReverse", form);

  const renderSimpleCondComponent = () => {
    switch (simpleCondType) {
      case "url-extension":
        return <CondUrlExtension />;
      case "url-eq-index":
        return <CondUrlEqIndex />;
      case "url-all":
        return <CondUrlAll />;
      case "url-prefix":
        return <CondUrlPrefix />;
      case "url-eq":
        return <CondUrlEq />;
      case "url-wildcard-match":
        return <CondUrlWildcardMatch />;
      case "url-regexp":
        return <CondUrlRegexp />;
      // TODO 参数匹配
      default:
        return "unsupport cond type";
    }
  };

  const onFinish = (values: HTTPCacheRef) => {
    onSuccess?.(form?.getFieldsValue(true) ?? values);
  };

  return (
    <Form form={form} name="cacheRefForm" onFinish={onFinish} onFinishFailed={onError} labelWrap {...props}>
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>{" "}
      {/* 临时ID */}
      <Form.Item hidden name="isReverse">
        <Input />
      </Form.Item>{" "}
      {/* 反向条件，即不缓存 */}
      <Form.Item required label="缓存对象" name={["simpleCond", "type"]} help="暂时不支持复杂缓存条件">
        <Select options={simpleCondTypeOptions} />
      </Form.Item>
      <Form.Item required name={["simpleCond"]} noStyle>
        {renderSimpleCondComponent()}
      </Form.Item>
      {isReverse ? null : (
        <>
          <Form.Item
            label="不区分大小写"
            name={["simpleCond", "isCaseInsensitive"]}
            valuePropName="checked"
            help="选中后表示对比时忽略参数值的大小写。"
          >
            <Switch />
          </Form.Item>

          <Form.Item required label="缓存有效期" name="life" help="命中本规则后使用此有效期，源站 max-age 不会覆盖规则时间。">
            <TimeDurationInput minUnit="minute" />
          </Form.Item>

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
                    <Form.Item label="缓存Key" name="key">
                      <Input />
                    </Form.Item>
                    {/* TODO 请求方法限制 */}
                    {/* TODO 客户端过期时间 */}
                    <Form.Item label="最大尺寸" name="maxSize" help="缓存内容尺寸如果高于此值则不缓存。">
                      <SizeCapacityInput />
                    </Form.Item>
                    <Form.Item label="最小尺寸" name="minSize" help="缓存内容尺寸如果低于此值则不缓存。">
                      <SizeCapacityInput />
                    </Form.Item>
                    <Form.Item
                      label="支持缓存分片"
                      name="allowPartialContent"
                      valuePropName="checked"
                      help="选中后，支持缓存源站返回的某个分片的内容，该内容通过206 Partial Content状态码返回。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="强制返回分片内容"
                      name="forcePartialContent"
                      valuePropName="checked"
                      help="选中后，表示无论客户端是否发送Range报头，都会优先尝试返回已缓存的分片内容；如果你的应用有不支持分片内容的客户端（比如有些下载软件不支持206 Partial Content），请务必关闭此功能。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="强制Range回源"
                      name="alwaysForwardRangeRequest"
                      valuePropName="checked"
                      help="选中后，表示把所有包含Range报头的请求都转发到源站，而不是尝试从缓存中读取。"
                    >
                      <Switch />
                    </Form.Item>
                    {/* TODO 状态码 */}
                    <Form.Item label="状态码" name="status" help="允许缓存的HTTP状态码列表。">
                      <MultiTagsInput addTag="添加状态码" splitTags={/[, ]+/} />
                    </Form.Item>
                    <Form.Item
                      label="拒绝缓存指令"
                      name="skipCacheControlValues"
                      help="源站 Cache-Control 包含这些指令时不缓存。清空后忽略这些指令，按本规则缓存。"
                    >
                      <MultiTagsInput addTag="添加指令" splitTags={/[, ]+/} />
                    </Form.Item>
                    <Form.Item
                      label="跳过Set-Cookie"
                      name="skipSetCookie"
                      valuePropName="checked"
                      help="选中后，当响应的报头中有Set-Cookie时不缓存响应内容，防止动态内容被缓存。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="支持请求no-cache刷新"
                      name="enableRequestCachePragma"
                      valuePropName="checked"
                      help="选中后，当请求的报头中含有Pragma: no-cache或Cache-Control: no-cache时，会跳过缓存直接读取源内容，一般仅用于调试。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="允许If-None-Match回源"
                      name="enableIfNoneMatch"
                      valuePropName="checked"
                      help="特殊情况下才需要开启，可能会降低缓存命中率。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="允许If-Modified-Since回源"
                      name="enableIfModifiedSince"
                      valuePropName="checked"
                      help="特殊情况下才需要开启，可能会降低缓存命中率。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="允许异步读取源站"
                      name="enableReadingOriginAsync"
                      valuePropName="checked"
                      help="试验功能。允许客户端中断连接后，仍然继续尝试从源站读取内容并缓存。"
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="支持分段内容"
                      name="allowChunkedEncoding"
                      valuePropName="checked"
                      help="选中后，Gzip等压缩后的Chunked内容可以直接缓存，无需检查内容长度。"
                    >
                      <Switch />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </>
      )}
    </Form>
  );
}

export default CacheRefForm;
