export const randomString = (length: number) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

export type CustomFormItemProps<T> = {
  value?: T;
  onChange?: (value?: T) => void;
};

// 时间单位名称
export function TimeUnitName(unit: string) {
  switch (unit) {
    case "ms":
      return "毫秒";
    case "second":
      return "秒";
    case "minute":
      return "分钟";
    case "hour":
      return "小时";
    case "day":
      return "天";
    case "week":
      return "周 ";
  }
  return unit;
}
