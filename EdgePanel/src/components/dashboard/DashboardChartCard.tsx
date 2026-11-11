import { ProCard } from "@ant-design/pro-components";
import type { ProCardProps, ProCardTabsProps } from "@ant-design/pro-components";
import type { ReactNode } from "react";

export const dashboardChartHeight = 350;

export interface DashboardChartCardProps extends Omit<ProCardProps, "tabs"> {
  children?: ReactNode;
  tabs?: ProCardTabsProps;
}

export const DashboardChartCard = ({ children, tabs, ...props }: DashboardChartCardProps) => {
  return (
    <ProCard headerBordered {...props} tabs={tabs}>
      {children}
    </ProCard>
  );
};
