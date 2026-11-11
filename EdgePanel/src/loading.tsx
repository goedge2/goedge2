import { Flex, Spin, Typography } from "antd";

export default function Loading() {
  return (
    <Flex vertical align="center" justify="center" gap={12} style={{ minHeight: 240 }}>
      <Spin size="large" />
      <Typography.Text type="secondary">页面加载中...</Typography.Text>
    </Flex>
  );
}
