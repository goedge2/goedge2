import { useQuery } from "@tanstack/react-query";
import { Card, Collapse, Divider, Form, Select, Switch } from "antd";
import type { ReactNode } from "react";
import type { HTTPCompression, HTTPPageOptimization, WebPImage, HLS } from "@/pb/models/model_http_web_pb";
import type { FindEnabledNodeClusterResponse } from "@/pb/service_node_cluster_pb";
import type { CustomFormItemProps } from "@/utils";
import { MultiTagsInput } from "@/components/MultiListenPortInput";
import { SizeCapacityInput, URLPatternsList } from "@/components/SharedInput";
import { RequestConditionsInput } from "@/components/RequestConditionsInput";
import { clusterQueryKeys } from "@/queries/keys";
import { getClusterSettings } from "@/services/clusters";
import { createCompressionDefaults, createPageOptimizationDefaults, createWebPDefaults, createHLSDefaults } from "../_shared/contentOptimization";
import { CompressionTypesInput } from "./CompressionTypesInput";

const cardStyles = { header: { borderBottom: 0 } };
const lengthHelp = "0表示不限制，内容长度从文件尺寸或Content-Length中获取。";
const exceptURLHelp = "如果填写了例外URL，表示这些URL跳过不做处理。";

function MoreOptions({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return (
    <Form.Item hidden={!enabled} label={null}>
      <Collapse size="small" bordered={false} items={[{ key: "more", label: "更多选项...", forceRender: true, children }]} />
    </Form.Item>
  );
}

function CompressionInput({ value = createCompressionDefaults(), onChange }: CustomFormItemProps<HTTPCompression>) {
  const update = <Key extends keyof HTTPCompression>(key: Key, next: HTTPCompression[Key]) => onChange?.({ ...value, [key]: next });
  return (
    <Card title="内容压缩" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="启用内容压缩">
        <Switch checked={value.isOn} onChange={(checked) => update("isOn", checked)} />
      </Form.Item>
      <div hidden={!value.isOn}>
        <Form.Item label="压缩级别" help="级别越高，压缩比例越大。">
          <Select
            style={{ maxWidth: 100 }}
            value={value.level}
            onChange={(level) => update("level", level)}
            options={Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: `${index + 1}` }))}
          />
        </Form.Item>
        <Form.Item label="支持的扩展名" help="含有这些扩展名的URL将会被压缩，不区分大小写。">
          <MultiTagsInput
            value={value.extensions}
            onChange={(extensions) => update("extensions", extensions ?? [])}
            addTag="添加扩展名"
            splitTags={/[, ]+/}
          />
        </Form.Item>
        <Form.Item label="例外扩展名" help="含有这些扩展名的URL将不会被压缩，不区分大小写。">
          <MultiTagsInput
            value={value.exceptExtensions}
            onChange={(extensions) => update("exceptExtensions", extensions ?? [])}
            addTag="添加扩展名"
            splitTags={/[, ]+/}
          />
        </Form.Item>
        <Form.Item label="支持的MimeType" help="响应的Content-Type里包含这些MimeType的内容将会被压缩。">
          <MultiTagsInput value={value.mimeTypes} onChange={(types) => update("mimeTypes", types ?? [])} addTag="添加MimeType" splitTags={/[, ]+/} />
        </Form.Item>
        <Form.Item label="使用默认压缩算法" help="默认算法顺序：Brotli、Gzip、ZSTD、Deflate">
          <Switch checked={value.useDefaultTypes} onChange={(checked) => update("useDefaultTypes", checked)} />
        </Form.Item>
        {!value.useDefaultTypes && (
          <Form.Item label="压缩算法" help="勾选需要支持的算法，拖动右侧手柄调整优先顺序，越靠前优先级越高。">
            <CompressionTypesInput value={value.types} onChange={(types) => update("types", types ?? [])} />
          </Form.Item>
        )}
        <Form.Item label="是否解压已压缩内容" help="支持对已压缩内容尝试重新使用新的算法压缩；不选中表示保留当前的压缩格式。">
          <Switch checked={value.decompressData} onChange={(checked) => update("decompressData", checked)} />
        </Form.Item>
        <Form.Item label="内容最小长度" help={lengthHelp}>
          <SizeCapacityInput value={value.minLength} onChange={(length) => update("minLength", length)} />
        </Form.Item>
        <Form.Item label="内容最大长度" help={lengthHelp}>
          <SizeCapacityInput value={value.maxLength} onChange={(length) => update("maxLength", length)} />
        </Form.Item>
      </div>
    </Card>
  );
}

const pageOptimizationSections = [
  { key: "html", label: "HTML", help: "可以自动优化HTML中包含的空白、注释、空标签等。只有文件可以缓存时才会被优化。" },
  { key: "javascript", label: "Javascript", help: "可以自动缩短Javascript中变量、函数名称等。只有文件可以缓存时才会被优化。" },
  { key: "css", label: "CSS", help: "可以自动去除CSS中包含的空白。只有文件可以缓存时才会被优化。" },
] as const;

function PageOptimizationInput({ value = createPageOptimizationDefaults(), onChange }: CustomFormItemProps<HTTPPageOptimization>) {
  return (
    <Card title="页面优化" variant="borderless" size="small" styles={cardStyles}>
      {pageOptimizationSections.map(({ key, label, help }) => {
        const section = value[key];
        const update = (next: Partial<NonNullable<typeof section>>) => onChange?.({ ...value, [key]: { ...section, ...next } });
        return (
          <div key={key}>
            <Form.Item label={`${label}优化`} help={help}>
              <Switch checked={section?.isOn ?? false} onChange={(checked) => update({ isOn: checked })} />
            </Form.Item>
            <MoreOptions enabled={section?.isOn ?? false}>
              <Form.Item label={`${label}例外URL`} labelCol={{ span: 3 }} help={exceptURLHelp}>
                <URLPatternsList value={section?.exceptURLPatterns} onChange={(patterns) => update({ exceptURLPatterns: patterns ?? [] })} />
              </Form.Item>
              <Form.Item
                label={`${label}限制URL`}
                labelCol={{ span: 3 }}
                help="如果填写了限制URL，表示只对这些URL进行优化处理；如果不填则表示支持所有的URL。"
              >
                <URLPatternsList value={section?.onlyURLPatterns} onChange={(patterns) => update({ onlyURLPatterns: patterns ?? [] })} />
              </Form.Item>
            </MoreOptions>
          </div>
        );
      })}
    </Card>
  );
}

function WebPInput({ value = createWebPDefaults(), onChange, requireCache }: CustomFormItemProps<WebPImage> & { requireCache?: boolean }) {
  const update = <Key extends keyof WebPImage>(key: Key, next: WebPImage[Key]) => onChange?.({ ...value, [key]: next });
  return (
    <Card title="WebP" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item
        label="启用WebP压缩"
        help={
          <>
            选中后表示开启自动WebP压缩；图片的宽和高均不能超过16383像素{requireCache ? "；只有满足缓存条件的图片内容才会被转换" : ""}。
            {requireCache === undefined ? "是否需要满足缓存条件取决于所属集群的WebP设置。" : ""}
          </>
        }
      >
        <Switch checked={value.isOn} onChange={(checked) => update("isOn", checked)} />
      </Form.Item>
      <div hidden={!value.isOn}>
        <Form.Item label="支持的扩展名" help="含有这些扩展名的URL将会被转成WebP，不区分大小写。">
          <MultiTagsInput
            value={value.extensions}
            onChange={(extensions) =>
              update(
                "extensions",
                (extensions ?? []).map((extension) => (extension && !extension.startsWith(".") ? `.${extension}` : extension)),
              )
            }
            addTag="添加扩展名"
            splitTags={/[, ]+/}
          />
        </Form.Item>
        <Form.Item label="支持的MimeType" help="响应的Content-Type里包含这些MimeType的内容将会被转成WebP。">
          <MultiTagsInput value={value.mimeTypes} onChange={(types) => update("mimeTypes", types ?? [])} addTag="添加MimeType" splitTags={/[, ]+/} />
        </Form.Item>
        <Form.Item label="内容最小长度" help={lengthHelp}>
          <SizeCapacityInput value={value.minLength} onChange={(length) => update("minLength", length)} />
        </Form.Item>
        <Form.Item label="内容最大长度" help={lengthHelp}>
          <SizeCapacityInput value={value.maxLength} onChange={(length) => update("maxLength", length)} />
        </Form.Item>
        <Form.Item label="匹配条件">
          <RequestConditionsInput value={value.conds} onChange={(conds) => update("conds", conds)} />
        </Form.Item>
      </div>
    </Card>
  );
}

function HLSInput({ value = createHLSDefaults(), onChange }: CustomFormItemProps<HLS>) {
  const encrypting = value.encrypting ?? createHLSDefaults().encrypting!;
  const update = (next: Partial<typeof encrypting>) => onChange?.({ ...value, encrypting: { ...encrypting, ...next } });
  return (
    <Card title="HLS加密设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item
        label="启用HLS加密"
        help={
          <>
            启用后，系统会自动在<code>.m3u8</code>文件中加入<code>#EXT-X-KEY:METHOD=AES-128...</code>，并将其中的<code>.ts</code>文件内容进行加密。
          </>
        }
      >
        <Switch checked={encrypting.isOn} onChange={(checked) => update({ isOn: checked })} />
      </Form.Item>
      <MoreOptions enabled={encrypting.isOn}>
        <Form.Item label="例外URL" labelCol={{ span: 3 }} help={exceptURLHelp}>
          <URLPatternsList value={encrypting.exceptURLPatterns} onChange={(patterns) => update({ exceptURLPatterns: patterns ?? [] })} />
        </Form.Item>
        <Form.Item label="限制URL" labelCol={{ span: 3 }} help="如果填写了限制URL，表示只对这些URL进行加密处理；如果不填则表示支持所有的URL。">
          <URLPatternsList value={encrypting.onlyURLPatterns} onChange={(patterns) => update({ onlyURLPatterns: patterns ?? [] })} />
        </Form.Item>
      </MoreOptions>
    </Card>
  );
}

export function ContentOptimizationSettings({ clusterId }: { clusterId?: string }) {
  const cluster = useQuery<FindEnabledNodeClusterResponse>({
    queryKey: clusterQueryKeys.settings(clusterId),
    queryFn: () => getClusterSettings(clusterId),
    enabled: Boolean(clusterId),
  });
  const requireCache = cluster.data?.nodeCluster?.webpPolicy?.requireCache;
  return (
    <>
      <Form.Item name={["web", "compression"]} noStyle>
        <CompressionInput />
      </Form.Item>
      <Divider />
      <Form.Item name={["web", "optimization"]} noStyle>
        <PageOptimizationInput />
      </Form.Item>
      <Divider />
      <Form.Item name={["web", "webp"]} noStyle>
        <WebPInput requireCache={requireCache} />
      </Form.Item>
      <Divider />
      <Form.Item name={["web", "hls"]} noStyle>
        <HLSInput />
      </Form.Item>
    </>
  );
}
