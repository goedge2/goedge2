import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tooltip } from "antd";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";

import useThemeStore from "@/stores/themeStore";
import type { ThemeMode } from "@/stores/themeStore";

const themeModeLabels: Record<ThemeMode, string> = {
  light: "明亮模式",
  dark: "暗黑模式",
  auto: "跟随系统",
};

const themeModeIcons: Record<ThemeMode, ReactNode> = {
  light: <SunOutlined />,
  dark: <MoonOutlined />,
  auto: <DesktopOutlined />,
};

export default function ThemeModeSelector() {
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const menuItems: MenuProps["items"] = (["light", "dark", "auto"] as const).map((mode) => ({
    key: mode,
    icon: themeModeIcons[mode],
    label: themeModeLabels[mode],
  }));

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        selectable: true,
        selectedKeys: [themeMode],
        items: menuItems,
        onClick: ({ key }) => setThemeMode(key as ThemeMode),
      }}
    >
      <Tooltip title={`主题模式：${themeModeLabels[themeMode]}`}>
        <Button type="text" icon={themeModeIcons[themeMode]} aria-label={`主题模式：${themeModeLabels[themeMode]}`} />
      </Tooltip>
    </Dropdown>
  );
}
