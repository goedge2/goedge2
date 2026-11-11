import { Button, Form, Input } from "antd";
import { CompactField } from "@/components/SharedInput";

export const generateClusterDNSName = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `g${random}.cdn`;
};

export const ClusterDNSNameField = ({ domainName, isEditing = false }: { domainName?: string; isEditing?: boolean }) => {
  const form = Form.useFormInstance();

  return (
    <Form.Item
      label="DNS子域名"
      name="dnsName"
      help={
        <>
          当前集群的子域名，和主域名一起组成集群节点的子域名{isEditing ? "，修改后将自动删除旧域名中的相关记录。" : "。"}{" "}
          <Button
            type="link"
            size="small"
            htmlType="button"
            style={{ padding: 0, height: "auto", fontSize: "inherit", verticalAlign: "baseline" }}
            onClick={() => form.setFieldValue("dnsName", generateClusterDNSName())}
          >
            随机生成
          </Button>
        </>
      }
    >
      <CompactField addonAfter={`.${domainName || "主域名"}`} style={{ width: 360, maxWidth: "100%" }}>
        <Input placeholder="如 gfa7469.cdn" maxLength={64} style={{ minWidth: 0 }} />
      </CompactField>
    </Form.Item>
  );
};
