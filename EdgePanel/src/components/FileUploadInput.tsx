import React, { useMemo, useState } from "react";
import { Upload, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { getAccessToken, getAuthorizationHeaders } from "../runtime/auth";
import type { CustomFormItemProps } from "../utils";

interface FileUploadInputProps extends CustomFormItemProps<number> {
  accept?: string;
  hint?: string;
}

const FileUploadInput: React.FC<FileUploadInputProps> = ({ value, onChange, accept = "image/*", hint }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const externalFileList = useMemo<UploadFile[]>(() => {
    if (!value || value <= 0) {
      return [];
    }

    return [
      {
        uid: String(value),
        name: "已上传文件",
        status: "done",
        url: `/file/${value}`,
      },
    ];
  }, [value]);
  const displayFileList = isUploading ? fileList : externalFileList;

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList, file }) => {
    setFileList(newFileList.slice(-1));

    if (file.status === "uploading") {
      setIsUploading(true);
    } else if (file.status === "done") {
      setIsUploading(false);
      const resp = file.response as { fileId?: number } | undefined;
      if (resp?.fileId) {
        onChange?.(resp.fileId);
      }
    } else if (file.status === "error") {
      setIsUploading(false);
      message.error("上传失败");
    } else if (file.status === "removed") {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setIsUploading(false);
    setFileList([]);
    onChange?.(0);
  };

  return (
    <Upload
      name="file"
      action="/file/upload"
      accept={accept}
      listType="picture-card"
      fileList={displayFileList}
      maxCount={1}
      headers={getAuthorizationHeaders(getAccessToken())}
      onChange={handleChange}
      onRemove={handleRemove}
    >
      {displayFileList.length === 0 && (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>{hint || "上传文件"}</div>
        </div>
      )}
    </Upload>
  );
};

export default FileUploadInput;
