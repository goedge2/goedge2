import { Button, Tooltip } from "antd";
import { forwardRef } from "react";
import type { HTMLAttributes, MouseEventHandler, ReactNode } from "react";

type TableActionIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> & {
  tooltip: string;
  icon: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
};

const TableActionIcon = forwardRef<HTMLSpanElement, TableActionIconProps>(function TableActionIcon(
  { tooltip, icon, danger, disabled, loading, onClick, ...triggerProps },
  ref,
) {
  return (
    <Tooltip title={tooltip}>
      <span ref={ref} {...triggerProps}>
        <Button aria-label={tooltip} type="link" icon={icon} danger={danger} disabled={disabled} loading={loading} onClick={onClick} />
      </span>
    </Tooltip>
  );
});

export default TableActionIcon;

export type { TableActionIconProps };
