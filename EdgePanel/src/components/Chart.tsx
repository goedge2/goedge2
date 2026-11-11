import { useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { theme } from "antd";
import type { EChartsOption } from "echarts";
import useThemeStore from "../stores/themeStore";
import { registerAntdThemes } from "../charts/theme";

interface ChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
}

export const Chart: React.FC<ChartProps> = ({ option, style, className, loading }) => {
  const { token } = theme.useToken();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);

  useEffect(() => {
    registerAntdThemes(token);
  }, [token]);

  const themeName = isDarkMode ? "antd-dark" : "antd-light";

  return (
    <ReactECharts option={option} theme={themeName} style={{ height: 300, ...style }} className={className} showLoading={loading} notMerge={true} />
  );
};
