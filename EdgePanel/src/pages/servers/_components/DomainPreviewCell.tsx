import { FullscreenOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Space, Tooltip, Typography } from "antd";
import { useMemo, useState } from "react";

import { getDomainPreviewState } from "./domainPreview";

const { Text } = Typography;

type DomainPreviewCellProps = {
  domains?: string[];
  previewCount: number;
  modalTitle?: string;
};

const modalWidth = {
  xs: "90%",
  sm: "80%",
  md: "70%",
  lg: "60%",
  xl: "50%",
  xxl: "50%",
} as const;

export const DomainPreviewCell = ({ domains, previewCount, modalTitle = "全部域名" }: DomainPreviewCellProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previewState = useMemo(() => getDomainPreviewState(domains, previewCount), [domains, previewCount]);

  if (previewState.totalDomains === 0) {
    return <span>-</span>;
  }

  return (
    <>
      <Space direction="vertical" size={0}>
        <Space direction="vertical" size={0}>
          {previewState.previewDomains.map((domain) => (
            <span key={domain}>{domain}</span>
          ))}
        </Space>
        {previewState.hasOverflow && (
          <Space size={4} align="center" wrap>
            <Text type="secondary">等{previewState.totalDomains}个域名</Text>
            <Tooltip title={`查看全部域名（等${previewState.totalDomains}个域名）`}>
              <Button
                type="link"
                size="small"
                icon={<FullscreenOutlined />}
                onClick={() => setIsModalOpen(true)}
                style={{ height: 22, paddingInline: 4 }}
              />
            </Tooltip>
          </Space>
        )}
      </Space>

      <Modal
        open={isModalOpen}
        title={`${modalTitle}（共${previewState.totalDomains}个域名）`}
        footer={null}
        onCancel={() => setIsModalOpen(false)}
        destroyOnHidden
        width={modalWidth}
      >
        <Input.TextArea value={previewState.modalText} readOnly autoSize={{ minRows: 6, maxRows: 16 }} spellCheck={false} />
      </Modal>
    </>
  );
};
