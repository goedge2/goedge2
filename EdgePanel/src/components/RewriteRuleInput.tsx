import { Button, Form, Modal, Popconfirm, Space, Table, TableProps } from "antd";
import type { HTTPRewriteRule } from "../pb/models/model_http_web_pb";
import { CustomFormItemProps } from "../utils";
import { DragHandle, DragRow } from "./DnDHelper";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { RewriteRuleForm } from "./form/RewriteRuleForm";

// Rewrite 重写规则
export const RewriteRuleInput = ({ value: rewriteRules, onChange }: CustomFormItemProps<HTTPRewriteRule[]>) => {
  const [popupForm] = Form.useForm();
  const [showPopup, setShowPopup] = useState(false);

  const rewriteColumns: TableProps<HTTPRewriteRule>["columns"] = [
    { key: "sort", align: "center", width: 50, render: () => <DragHandle /> },
    {
      title: "匹配规则",
      dataIndex: "pattern",
    },
    {
      title: "转发目标",
      dataIndex: "replace",
    },
    {
      title: "转发方式",
      dataIndex: "mode",
      render: (mode) => (mode === "proxy" ? "隐式" : "显式"),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (isOn) => (isOn ? "已启用" : "已停用"),
    },
    {
      title: "操作",
      key: "action",
      render: (_, rewrite) => (
        <Space size="middle">
          <a onClick={() => createPopup(rewrite)}>修改</a>
          <a
            onClick={() => {
              onChange?.(
                rewriteRules?.map((r) => {
                  if (r.id === rewrite.id) {
                    r.isOn = !rewrite.isOn;
                  }
                  return r;
                }),
              );
            }}
          >
            {rewrite.isOn ? "停用" : "启用"}
          </a>
          <Popconfirm title="确定删除吗？" onConfirm={() => onChange?.(rewriteRules?.filter((r) => r.id !== rewrite.id))}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      if (!rewriteRules) return;

      const activeIndex = rewriteRules.findIndex((record) => record.id === active?.id);
      const overIndex = rewriteRules.findIndex((record) => record.id === over?.id);
      const newItems = arrayMove(rewriteRules, activeIndex, overIndex);

      if (onChange) setTimeout(() => onChange(newItems), 50); // 延迟通知，防止动画抖动
      return newItems;
    }
  };

  // 提交重写表单
  const handleRewriteSave = () => {
    popupForm.submit();
  };

  const createPopup = (rewrite?: HTTPRewriteRule) => {
    if (!rewrite) {
      rewrite = {
        isOn: true,
        mode: "proxy",
        redirectStatus: 307,
        withQuery: true,
        isBreak: true,
      } as HTTPRewriteRule;
    }

    popupForm.resetFields();
    popupForm.setFieldsValue(rewrite);
    setShowPopup(true);
  };

  // 保存跳转到表格
  const handleSuccess = (rewrite?: HTTPRewriteRule) => {
    if (!rewrite) return;

    let isNew = true;
    const newRewrites = rewriteRules?.map((r) => {
      if (r.id === rewrite.id) {
        isNew = false;
        return rewrite;
      }
      return r;
    });

    if (isNew) {
      newRewrites?.push(rewrite);
    }

    onChange?.(newRewrites);
    setShowPopup(false);
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createPopup()}>添加</Button>
      </Space>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={rewriteRules?.map((item) => item.id) ?? []} strategy={verticalListSortingStrategy}>
          <Table<HTTPRewriteRule>
            columns={rewriteColumns}
            dataSource={rewriteRules}
            size="small"
            components={{ body: { row: DragRow } }}
            rowKey="id"
            pagination={false}
          />
        </SortableContext>
      </DndContext>
      {showPopup && (
        <Modal
          title="重写规则"
          open={true}
          onCancel={() => setShowPopup(false)}
          onOk={handleRewriteSave}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "60%",
            xxl: "50%",
          }}
        >
          <RewriteRuleForm form={popupForm} labelCol={{ span: 4 }} onSuccess={handleSuccess} />
        </Modal>
      )}
    </>
  );
};
