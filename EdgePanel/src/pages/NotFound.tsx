import { Button, Result } from "antd";
import { history } from "@umijs/max";

export default function NotFoundPage() {
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="您访问的页面不存在或已经被移动。"
      extra={
        <Button type="primary" onClick={() => history.push("/")}>
          返回首页
        </Button>
      }
    />
  );
}
