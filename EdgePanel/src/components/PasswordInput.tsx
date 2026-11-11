import { Input } from "antd";
import type { ComponentProps } from "react";

const PasswordInput = (props: ComponentProps<typeof Input.Password>) => {
  const { visibilityToggle = true, ...restProps } = props;
  const mergedVisibilityToggle =
    visibilityToggle === false
      ? false
      : {
          ...(typeof visibilityToggle === "object" ? visibilityToggle : {}),
          tabIndex: -1,
        };

  return <Input.Password {...restProps} visibilityToggle={mergedVisibilityToggle} />;
};

export default PasswordInput;
