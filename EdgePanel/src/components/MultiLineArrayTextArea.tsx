import { Input } from "antd";
import React, { ChangeEvent, useMemo, useState } from "react";

type TextAreaProps = React.ComponentProps<typeof Input.TextArea>;

type MultiLineArrayTextAreaProps = {
  value?: Array<string>;
  onChange?: (value?: Array<string>) => void;
};

// 多行数组文本输入，一般用于域名输入
export const MultiLineArrayTextArea = ({ value, onChange, ...props }: MultiLineArrayTextAreaProps & TextAreaProps) => {
  const [textValue, setTextValue] = useState<string | null>(null);
  const externalValue = useMemo(() => (Array.isArray(value) ? value.join("\n") : value) ?? "", [value]);
  const displayValue = textValue ?? externalValue;

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextValue(value);
  };

  const handleInputConfirm = () => {
    const sourceValue = textValue ?? externalValue;
    const arrayValues = sourceValue.split(/[\s\n,;]+/).filter((line) => line.trim() !== "");
    onChange?.(arrayValues);
    setTextValue(null);
  };

  return <Input.TextArea value={displayValue} onChange={handleInputChange} onBlur={handleInputConfirm} {...props} />;
};
