import { RobotOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Drawer, FloatButton, Grid } from "antd";
import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";

import { aiAgentQueryKeys, readAIAgentConfig } from "@/services/aiAgent";
import { geometryStorageKey, migrateAIAgentGeometryStorage, restoreAIAgentGeometry, shouldShowAIAgentLauncher, type AIAgentGeometry } from "./model";
import "./styles.css";

const AIAgentPanel = lazy(() => import("./AIAgentPanel"));

export default function AIAgentLauncher() {
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [geometry, setGeometry] = useState<AIAgentGeometry>(() =>
    restoreAIAgentGeometry(
      typeof window === "undefined" ? null : migrateAIAgentGeometryStorage(window.localStorage),
      typeof window === "undefined" ? 1440 : window.innerWidth,
      typeof window === "undefined" ? 900 : window.innerHeight,
    ),
  );
  const screens = Grid.useBreakpoint();
  const configQuery = useQuery({ queryKey: aiAgentQueryKeys.config, queryFn: readAIAgentConfig });
  const compact = !screens.md;

  const openAIAgent = () => {
    setPortalTarget(document.querySelector<HTMLElement>(".ant-layout.ant-layout-has-sider"));
    setOpen(true);
  };

  if (!configQuery.data || !shouldShowAIAgentLauncher(configQuery.data)) {
    return null;
  }

  const saveGeometry = (next: AIAgentGeometry) => {
    setGeometry(next);
    window.localStorage.setItem(geometryStorageKey, JSON.stringify(next));
  };

  return (
    <>
      <FloatButton
        className="edge-ai-launcher"
        type="primary"
        icon={<RobotOutlined />}
        tooltip="AI Agent"
        onClick={openAIAgent}
        style={{ zIndex: 900 }}
      />
      {open && compact ? (
        <Drawer open placement="right" size="100vw" zIndex={900} closable={false} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>
          <Suspense fallback={null}>
            <AIAgentPanel onClose={() => setOpen(false)} />
          </Suspense>
        </Drawer>
      ) : null}
      {open && !compact && portalTarget
        ? createPortal(
            <Rnd
              className="edge-ai-rnd"
              bounds="window"
              dragHandleClassName="edge-ai-drag-handle"
              cancel=".edge-ai-no-drag"
              minWidth={360}
              minHeight={480}
              maxWidth={window.innerWidth - 32}
              size={{ width: geometry.width, height: geometry.height }}
              position={{ x: geometry.x, y: geometry.y }}
              onDragStop={(_, data) => saveGeometry({ ...geometry, x: data.x, y: data.y })}
              onResizeStop={(_, __, element, ___, position) =>
                saveGeometry({ ...geometry, width: element.offsetWidth, height: element.offsetHeight, x: position.x, y: position.y })
              }
            >
              <Suspense fallback={null}>
                <AIAgentPanel onClose={() => setOpen(false)} />
              </Suspense>
            </Rnd>,
            portalTarget,
          )
        : null}
    </>
  );
}
