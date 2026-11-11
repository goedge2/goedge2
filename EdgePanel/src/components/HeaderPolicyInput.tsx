import { Button, Form, InputNumber, Modal, Popconfirm, Space, Switch, Table, TableProps } from "antd";
import type { HTTPHeader, HTTPHeaderPolicy } from "../pb/models/model_http_web_pb";
import { CustomFormItemProps } from "../utils";
import { useState } from "react";
import { HttpHeaderForm } from "./form/HttpHeaderForm";
import { MultiTagsInput } from "./MultiListenPortInput";
import { CompactField } from "./SharedInput";

let tmpId = -1; // 临时ID，供新建 header 使用

type HeaderPolicyInputProps = {
  isResponse?: boolean;
};

// HTTP 报头，Request Header 与 ResponseHeader
export const HeaderPolicyInput = ({ value: headerPolicy, onChange, isResponse }: HeaderPolicyInputProps & CustomFormItemProps<HTTPHeaderPolicy>) => {
  const [popupForm] = Form.useForm();
  const [showPopup, setShowPopup] = useState(false);

  const headerColumns: TableProps<HTTPHeader>["columns"] = [
    {
      title: "名称",
      dataIndex: "name",
    },
    {
      title: "值",
      dataIndex: "value",
    },
    {
      title: "操作",
      key: "action",
      render: (_, header) => (
        <Space size="middle">
          <a onClick={() => createPopup(header)}>修改</a>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => {
              const newHeaders = headerPolicy?.setHeaders.filter((r) => r.id !== header.id) ?? [];
              onChange?.({ ...headerPolicy, setHeaders: newHeaders } as HTTPHeaderPolicy);
            }}
          >
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 提交表单
  const handleHeaderSave = () => {
    popupForm.submit();
  };

  const createPopup = (header?: HTTPHeader) => {
    if (!header) {
      header = {
        id: String(tmpId--),
        isOn: true,
      } as HTTPHeader;
    }

    popupForm.resetFields();
    popupForm.setFieldsValue(header);
    setShowPopup(true);
  };

  // 保存到表格
  const handleSuccess = (header?: HTTPHeader) => {
    if (!header) return;

    let isNew = true;
    const oldHeaders = headerPolicy?.setHeaders ?? [];
    const newHeaders = oldHeaders.map((r) => {
      if (r.id === header.id) {
        isNew = false;
        return header;
      }
      return r;
    });

    if (isNew) {
      newHeaders?.push(header);
    }
    const newHeaderPolicy = { ...headerPolicy, setHeaders: newHeaders } as HTTPHeaderPolicy;

    onChange?.(newHeaderPolicy);
    setShowPopup(false);
  };

  // 删除报头
  const handleDeleteHeader = (headers?: string[] | null) => {
    const newHeaderPolicy = { ...headerPolicy, deleteHeaders: headers } as HTTPHeaderPolicy;
    onChange?.(newHeaderPolicy);
  };

  // 非标报头
  const handleNonStanderHeader = (headers?: string[] | null) => {
    const newHeaderPolicy = { ...headerPolicy, nonStandardHeaders: headers } as HTTPHeaderPolicy;
    onChange?.(newHeaderPolicy);
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createPopup()}>添加</Button>
      </Space>

      <Table<HTTPHeader> columns={headerColumns} dataSource={headerPolicy?.setHeaders} size="small" rowKey="id" pagination={false} />
      <Form.Item label="删除报头" help="可以通过此功能删除报文中不需要的报头">
        <MultiTagsInput value={headerPolicy?.deleteHeaders} onChange={handleDeleteHeader} addTag="添加" splitTags={/[, ]+/} />
      </Form.Item>
      <Form.Item label="非标报头" help="可以通过此功能设置响应报文中非标准的报头，比如hello_world ">
        <MultiTagsInput value={headerPolicy?.nonStandardHeaders} onChange={handleNonStanderHeader} addTag="添加" splitTags={/[, ]+/} />
      </Form.Item>

      {isResponse && (
        <>
          <Form.Item label="CORS跨域" help="启用后，自动在响应报头中增加对应的Access-Control-*相关内容。">
            <Switch
              value={headerPolicy?.cors?.isOn}
              onChange={(checked) => {
                const cors = { ...headerPolicy?.cors, isOn: checked };
                const newPolicy = { ...headerPolicy, cors: cors } as HTTPHeaderPolicy;
                onChange?.(newPolicy);
              }}
            />
          </Form.Item>
          <Form.Item
            label="允许的请求方法"
            help="Access-Control-Allow-Methods值设置。所访问资源允许使用的方法列表，不设置则表示默认为PUT、GET、POST、DELETE、HEAD、OPTIONS、PATCH。"
            hidden={!headerPolicy?.cors?.isOn}
          >
            <MultiTagsInput
              addTag="添加"
              splitTags={/[, ]+/}
              value={headerPolicy?.cors?.allowMethods}
              onChange={(value) => {
                const cors = { ...headerPolicy?.cors, allowMethods: value };
                const newPolicy = { ...headerPolicy, cors: cors } as HTTPHeaderPolicy;
                onChange?.(newPolicy);
              }}
            />
          </Form.Item>
          <Form.Item
            label="预检结果缓存时间"
            help="Access-Control-Max-Age值设置。预检结果缓存时间，0或者不填表示使用浏览器默认设置。注意每个浏览器有不同的缓存时间上限。"
            hidden={!headerPolicy?.cors?.isOn}
          >
            <CompactField addonAfter="秒">
              <InputNumber
                value={headerPolicy?.cors?.maxAge}
                onChange={(value) => {
                  const cors = { ...headerPolicy?.cors, maxAge: value };
                  const newPolicy = { ...headerPolicy, cors: cors } as HTTPHeaderPolicy;
                  onChange?.(newPolicy);
                }}
              />
            </CompactField>
          </Form.Item>
          <Form.Item
            label="允许服务器暴露的报头"
            help="Access-Control-Expose-Headers值设置。允许服务器暴露的报头，请注意报头的大小写。"
            hidden={!headerPolicy?.cors?.isOn}
          >
            <MultiTagsInput
              addTag="添加"
              splitTags={/[, ]+/}
              value={headerPolicy?.cors?.exposeHeaders}
              onChange={(value) => {
                const cors = { ...headerPolicy?.cors, exposeHeaders: value };
                const newPolicy = { ...headerPolicy, cors: cors } as HTTPHeaderPolicy;
                onChange?.(newPolicy);
              }}
            />
          </Form.Item>
        </>
      )}

      {showPopup && (
        <Modal
          title="设置 Header"
          open={true}
          onCancel={() => setShowPopup(false)}
          onOk={handleHeaderSave}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "60%",
            xxl: "50%",
          }}
        >
          <HttpHeaderForm form={popupForm} labelCol={{ span: 4 }} onSuccess={handleSuccess} />
        </Modal>
      )}
    </>
  );
};
