import { Button, Form, Modal, Popconfirm, Space, Table, TableProps } from "antd";
import type { HTTPCacheRef } from "../pb/models/model_http_cache_policy_pb";
import { CondTypeName, CustomFormItemProps, TimeUnitName } from "../utils";
import { DragHandle, DragRow } from "./DnDHelper";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import CacheRefForm from "./form/CacheRefForm";
import { cacheRefWithoutTemporaryId } from "./form/cacheSettings";
import type { SizeCapacity, TimeDuration } from "../pb/models/model_config_shared_pb";

// 缓存条件名称
function cacheConds(cacheRef: HTTPCacheRef) {
  if (cacheRef.conds != null && cacheRef.conds.groups.length > 0) {
    // TODO 复杂条件
    return "暂不支持复杂缓存条件";
  } else if (cacheRef.simpleCond != null) {
    const cond = cacheRef.simpleCond;
    if (cond.type.length == 0 || cond.type == "params") {
      return `${cond.param} ${cond.operator} ${cond.value}`;
    } else {
      return (
        <>
          {CondTypeName(cond.type)}: {cond.value}
        </>
      );
    }
  }

  return "";
}

type CacheRefWithId = HTTPCacheRef & {
  id: number;
};

export const CacheRefsInput = ({ value: cacheRefs, onChange }: CustomFormItemProps<HTTPCacheRef[]>) => {
  const [popupForm] = Form.useForm();
  const [showPopup, setShowPopup] = useState(false);
  const [cacheRefsWithId, setCacheRefsWithId] = useState<CacheRefWithId[]>([]);
  const updateRefs = (records: CacheRefWithId[]) => onChange?.(records.map(cacheRefWithoutTemporaryId));

  useEffect(() => {
    const tmpRefsWithId =
      cacheRefs?.map((item, index) => ({
        ...item,
        id: index + 1,
      })) ?? [];
    setCacheRefsWithId(tmpRefsWithId ?? []);
  }, [cacheRefs]);

  const cacheRefColumns: TableProps<CacheRefWithId>["columns"] = [
    { key: "sort", align: "center", width: 50, render: () => <DragHandle /> },
    {
      title: "缓存条件",
      key: "conds",
      width: "70%",
      render: (_, cacheRef) => cacheConds(cacheRef),
    },
    {
      title: "缓存时间",
      dataIndex: "life",
      render: (life, cacheRef) => (cacheRef.isReverse ? "不缓存" : `${life.count} ${TimeUnitName(life.unit)}`),
    },
    {
      title: "操作",
      key: "action",
      render: (_, cacheRef) => (
        <Space size="middle">
          <a onClick={() => createPopup(cacheRef)}>修改</a>
          <a
            onClick={() => {
              updateRefs(cacheRefsWithId.map((record) => (record.id === cacheRef.id ? { ...record, isOn: !record.isOn } : record)));
            }}
          >
            {cacheRef.isOn ? "停用" : "启用"}
          </a>
          <Popconfirm title="确定删除吗？" onConfirm={() => updateRefs(cacheRefsWithId.filter((record) => record.id !== cacheRef.id))}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      if (!cacheRefsWithId) return;

      const activeIndex = cacheRefsWithId.findIndex((record) => record.id === active?.id);
      const overIndex = cacheRefsWithId.findIndex((record) => record.id === over?.id);
      const newRefs = arrayMove(cacheRefsWithId, activeIndex, overIndex);

      setCacheRefsWithId(newRefs);
      if (onChange) setTimeout(() => updateRefs(newRefs), 50);
      return newRefs;
    }
  };

  // 提交缓存条件表单
  const handleCacheRefSave = () => {
    popupForm.submit();
  };

  const createPopup = (cacheRef?: CacheRefWithId, isReverse = false) => {
    if (!cacheRef) {
      cacheRef = {
        isOn: true,
        simpleCond: { type: "url-extension", isCaseInsensitive: true },
        key: "${scheme}://${host}${requestPath}${isArgs}${args}",
        life: { count: "1", unit: "hour" } as TimeDuration,
        status: [200],
        maxSize: { count: "128", unit: "mb" } as SizeCapacity,
        minSize: { count: "0", unit: "kb" } as SizeCapacity,
        skipCacheControlValues: ["private", "no-cache", "no-store"],
        skipSetCookie: true,
        enableRequestCachePragma: false,
        allowChunkedEncoding: true,
        allowPartialContent: true,
        forcePartialContent: false,
        enableIfNoneMatch: false,
        enableIfModifiedSince: false,
        enableReadingOriginAsync: false,
        isReverse: isReverse,
        methods: [],
      } as unknown as CacheRefWithId;
    }

    popupForm.resetFields();
    popupForm.setFieldsValue(cacheRef);
    setShowPopup(true);
  };

  // 保存缓存条件到表格
  const handleSuccess = (cacheRef?: HTTPCacheRef) => {
    if (!cacheRef) return;

    const cacheRefWithId = cacheRef as CacheRefWithId;
    let isNew = true;
    const newCacheRefs = cacheRefsWithId.map((record) => {
      if (record.id === cacheRefWithId.id) {
        isNew = false;
        return cacheRef;
      }
      return record;
    });

    if (isNew) {
      newCacheRefs.push(cacheRef);
    }
    updateRefs(newCacheRefs as CacheRefWithId[]);
    setShowPopup(false);
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createPopup()}>添加缓存条件</Button>
        <Button onClick={() => createPopup(undefined, true)} type="text">
          添加不缓存条件
        </Button>
      </Space>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={cacheRefsWithId?.map((cacheRef) => cacheRef.id)} strategy={verticalListSortingStrategy}>
          <Table<CacheRefWithId>
            columns={cacheRefColumns}
            dataSource={cacheRefsWithId}
            size="small"
            components={{ body: { row: DragRow } }}
            rowKey="id"
            pagination={false}
          />
        </SortableContext>
      </DndContext>
      {showPopup ? (
        <Modal
          title="缓存条件"
          open={true}
          onCancel={() => setShowPopup(false)}
          onOk={handleCacheRefSave}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "60%",
            xxl: "50%",
          }}
        >
          <CacheRefForm form={popupForm} labelCol={{ span: 4 }} onSuccess={handleSuccess} />
        </Modal>
      ) : null}
    </>
  );
};
