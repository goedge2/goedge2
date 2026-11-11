import { Button, Form, Modal, Popconfirm, Space, Table, TableProps } from "antd";
import type { HTTPHostRedirect } from "../pb/models/model_http_web_pb";
import { CustomFormItemProps } from "../utils";
import { DragHandle, DragRow } from "./DnDHelper";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { HostRedirectForm } from "./form/HostRedirectForm";

type RedirectWithId = HTTPHostRedirect & {
  id: number;
};

// URL跳转
export const HostRedirectInput = ({ value, onChange }: CustomFormItemProps<HTTPHostRedirect[]>) => {
  const [popupForm] = Form.useForm();
  const [showPopup, setShowPopup] = useState(false);
  const redirectsWithId = useMemo(
    () =>
      value?.map((item, index) => ({
        ...item,
        id: index + 1,
      })) ?? [],
    [value],
  );

  const redirectColumns: TableProps<RedirectWithId>["columns"] = [
    { key: "sort", align: "center", width: 50, render: () => <DragHandle /> },
    {
      title: "跳转前",
      key: "before",
      render: (_, redirect) => {
        switch (redirect.type) {
          case "url":
            return <span>{redirect.beforeURL}</span>;
          case "domain":
            if (redirect.domainsAll) {
              return <span>所有域名</span>;
            }
            return <span>{redirect.domainsBefore.join(" ")}</span>;
          case "port":
            if (redirect.portsAll) {
              return <span>所有端口</span>;
            }
            return <span>{redirect.portsBefore.join(" ")}</span>;
          default:
            return <span>不支持的类型</span>;
        }
      },
    },
    {
      title: "跳转后",
      key: "after",
      render: (_, redirect) => {
        switch (redirect.type) {
          case "url":
            return redirect.afterURL;
          case "domain":
            return redirect.domainAfter;
          case "port":
            return redirect.portAfter;
          default:
            return "不支持的类型";
        }
      },
    },
    {
      title: "HTTP状态码",
      dataIndex: "status",
      render: (status) => (status === 0 ? "默认" : status),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (isOn) => (isOn ? "已启用" : "已停用"),
    },
    {
      title: "操作",
      key: "action",
      render: (_, redirect) => (
        <Space size="middle">
          <a onClick={() => createPopup(redirect)}>修改</a>
          <a
            onClick={() => {
              onChange?.(
                redirectsWithId.map((r) => {
                  if (r.id === redirect.id) {
                    return { ...r, isOn: !redirect.isOn };
                  }
                  return r;
                }),
              );
            }}
          >
            {redirect.isOn ? "停用" : "启用"}
          </a>
          <Popconfirm title="确定删除吗？" onConfirm={() => onChange?.(redirectsWithId?.filter((r) => r.id !== redirect.id))}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      if (!redirectsWithId) return;

      const activeIndex = redirectsWithId.findIndex((record) => record.id === active?.id);
      const overIndex = redirectsWithId.findIndex((record) => record.id === over?.id);
      const newItems = arrayMove(redirectsWithId, activeIndex, overIndex);

      if (onChange) setTimeout(() => onChange(newItems), 50); // 延迟通知，防止动画抖动
      return newItems;
    }
  };

  // 提交跳转表单
  const handleRedirectSave = () => {
    popupForm.submit();
  };

  const createPopup = (redirect?: RedirectWithId) => {
    if (!redirect) {
      redirect = {
        isOn: true,
        type: "url",
        status: 0,

        beforeURL: "",
        afterURL: "",
        mode: "equal",
        matchPrefix: false,
        matchRegexp: false,
        keepRequestURI: false,
        keepArgs: true,
        conds: null,

        domainsAll: false,
        domainBefore: [],
        domainBeforeIgnorePorts: true,
        domainAfter: "",
        domainAfterScheme: "",

        portsAll: false,
        portsBefore: [],
        portAfter: 0,
        portAfterScheme: "",
      } as unknown as RedirectWithId;
    }

    popupForm.resetFields();
    popupForm.setFieldsValue(redirect);
    setShowPopup(true);
  };

  // 保存跳转到表格
  const handleSuccess = (redirect?: HTTPHostRedirect) => {
    if (!redirect) return;

    const redirectWithId = redirect as RedirectWithId;
    let isNew = true;
    const newRedirects = redirectsWithId.map((r) => {
      if (r.id === redirectWithId.id) {
        isNew = false;
        return redirect;
      }
      return r;
    });

    if (isNew) {
      newRedirects.push(redirect);
    }

    onChange?.(newRedirects);
    setShowPopup(false);
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createPopup()}>添加</Button>
      </Space>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={redirectsWithId.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <Table<RedirectWithId>
            columns={redirectColumns}
            dataSource={redirectsWithId}
            size="small"
            components={{ body: { row: DragRow } }}
            rowKey="id"
            pagination={false}
          />
        </SortableContext>
      </DndContext>
      {showPopup && (
        <Modal
          title="URL跳转"
          open={true}
          onCancel={() => setShowPopup(false)}
          onOk={handleRedirectSave}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "60%",
            xxl: "50%",
          }}
        >
          <HostRedirectForm form={popupForm} labelCol={{ span: 4 }} onSuccess={handleSuccess} />
        </Modal>
      )}
    </>
  );
};
