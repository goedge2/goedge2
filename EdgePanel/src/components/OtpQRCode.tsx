import { QRCode } from "antd";

type OtpQRCodeProps = {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
};

export default function OtpQRCode({ value, size = 200, level = "M" }: OtpQRCodeProps) {
  return <QRCode value={value} size={size} type="svg" errorLevel={level} bordered={false} />;
}
