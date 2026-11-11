import { HolderOutlined } from "@ant-design/icons";
import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Checkbox } from "antd";
import { useState } from "react";
import type { CustomFormItemProps } from "@/utils";
import { type CompressionType, getCompressionTypeOrder } from "../_shared/contentOptimization";

const typeLabels: Record<CompressionType, string> = { brotli: "Brotli", gzip: "Gzip", zstd: "ZSTD", deflate: "Deflate" };

function CompressionTypeOption({ type, checked, onChange }: { type: CompressionType; checked: boolean; onChange: (checked: boolean) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: type });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        border: "1px solid var(--ant-color-border-secondary)",
        borderRadius: "var(--ant-border-radius)",
        background: "var(--ant-color-bg-container)",
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)}>
        {typeLabels[type]}
      </Checkbox>
      <Button
        ref={setActivatorNodeRef}
        type="text"
        size="small"
        icon={<HolderOutlined />}
        style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
        {...attributes}
        {...listeners}
        aria-label={`拖动排序 ${typeLabels[type]}`}
      />
    </div>
  );
}

export function CompressionTypesInput({ value = [], onChange }: CustomFormItemProps<string[]>) {
  const [sortOrder, setSortOrder] = useState<CompressionType[]>();
  const order = getCompressionTypeOrder(value, sortOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id as CompressionType);
    const to = order.indexOf(over.id as CompressionType);
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setSortOrder(next);
    onChange?.(next.filter((type) => value.includes(type)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {order.map((type) => (
            <CompressionTypeOption
              key={type}
              type={type}
              checked={value.includes(type)}
              onChange={(checked) => {
                setSortOrder(order);
                onChange?.(order.filter((code) => (code === type ? checked : value.includes(code))));
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
