import { PlusOutlined } from "@ant-design/icons";
import { Input, type InputProps, InputRef, Tag } from "antd";
import type { ChangeEvent, ClipboardEvent, FocusEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { NetworkAddress } from "../pb/models/model_network_address_pb";
import { type CustomFormItemProps } from "../utils";
import {
  appendListenPortTokens,
  findFirstInvalidListenPortRange,
  getListenPortDedupeKey,
  getSuggestedListenPortRanges,
  normalizeListenPortToken,
} from "./multiListenPortInputState";

type MultiPortInputProps = {
  protocol?: string;
  value?: Array<NetworkAddress>;
  onChange?: (value?: Array<NetworkAddress>) => void;
  showSuggestedPortRanges?: boolean;
  suggestedPortRanges?: string[];
};

type MultiListenPortInputProps = MultiPortInputProps & Omit<InputProps, "value" | "onChange">;

const { CheckableTag } = Tag;

const joinClassNames = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(" ");

const buildDefaultPlaceholder = (protocol?: string) => {
  switch (protocol?.toLowerCase()) {
    case "http":
      return "输入端口后按回车添加，如 80、8080、8000";
    case "https":
      return "输入端口后按回车添加，如 443、8443、9443";
    default:
      return "输入端口后按回车添加，如 80、443、8080";
  }
};

const buildListenAddresses = (protocol: string | undefined, portRanges: string[], currentValue?: NetworkAddress[]) => {
  const existingByPortRange = new Map<string, NetworkAddress>();
  currentValue?.forEach((listen) => {
    if (typeof listen?.portRange === "string" && !existingByPortRange.has(listen.portRange)) {
      existingByPortRange.set(listen.portRange, listen);
    }
  });

  return portRanges.map((portRange) => {
    const existing = existingByPortRange.get(portRange);
    return {
      ...(existing ?? {}),
      protocol: protocol ?? existing?.protocol,
      portRange,
    } as NetworkAddress;
  });
};

const hasTrailingListenPortSeparator = (value: string) => /[\s,，;；]+$/.test(value);

// 多监听端口输入
export const MultiListenPortInput = ({
  protocol,
  value,
  onChange,
  showSuggestedPortRanges = false,
  suggestedPortRanges,
  className,
  style,
  status,
  placeholder,
  disabled,
  onBlur,
  onFocus,
  onPressEnter,
  onPaste,
  ...props
}: MultiListenPortInputProps) => {
  const inputRef = useRef<InputRef>(null);

  const [draftValue, setDraftValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [localError, setLocalError] = useState<string>();

  const currentValue = Array.isArray(value)
    ? value.filter(
        (listen): listen is NetworkAddress & { portRange: string } => typeof listen?.portRange === "string" && listen.portRange.trim().length > 0,
      )
    : [];
  const currentPortRanges = currentValue.map((listen) => listen.portRange.trim());
  const invalidExistingPortRange = findFirstInvalidListenPortRange(currentPortRanges);
  const errorMessage =
    localError ??
    (invalidExistingPortRange ? `存在无效端口配置“${invalidExistingPortRange.portRange}”：${invalidExistingPortRange.error}` : undefined);
  const mergedStatus = errorMessage ? "error" : status;
  const resolvedSuggestedPortRanges = showSuggestedPortRanges ? getSuggestedListenPortRanges(protocol, suggestedPortRanges) : [];

  const updatePortRanges = (nextPortRanges: string[]) => {
    onChange?.(buildListenAddresses(protocol, nextPortRanges, currentValue));
  };

  const commitDraft = (rawInput: string) => {
    const nextRawInput = rawInput.trim();
    if (nextRawInput.length === 0) {
      setDraftValue("");
      setLocalError(undefined);
      return true;
    }

    const result = appendListenPortTokens(currentPortRanges, rawInput);
    if (!result.ok) {
      setDraftValue(nextRawInput);
      setLocalError(result.error);
      return false;
    }

    updatePortRanges(result.nextPortRanges);
    setDraftValue("");
    setLocalError(undefined);
    return true;
  };

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setLocalError(undefined);

    if (hasTrailingListenPortSeparator(nextValue)) {
      commitDraft(nextValue);
      return;
    }

    setDraftValue(nextValue);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "Backspace" && draftValue.length === 0 && currentPortRanges.length > 0) {
      event.preventDefault();
      updatePortRanges(currentPortRanges.slice(0, -1));
      setLocalError(undefined);
      return;
    }

    if ([",", ";", " "].includes(event.key)) {
      event.preventDefault();
      commitDraft(draftValue);
    }
  };

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    commitDraft(draftValue);
    onBlur?.(event);
  };

  const handleInputFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleInputPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData("text");
    if (pastedText.length > 0 && /[\s,，;；]/.test(pastedText)) {
      event.preventDefault();
      commitDraft(pastedText);
    }

    onPaste?.(event);
  };

  const removePortAt = (index: number) => {
    const nextPortRanges = currentPortRanges.filter((_, currentIndex) => currentIndex !== index);
    updatePortRanges(nextPortRanges);
    setLocalError(undefined);
  };

  const toggleSuggestedPortRange = (suggestedPortRange: string) => {
    const suggestedKey = getListenPortDedupeKey(suggestedPortRange);
    if (!suggestedKey) {
      return;
    }

    const hasSuggested = currentPortRanges.some((portRange) => getListenPortDedupeKey(portRange) === suggestedKey);
    if (hasSuggested) {
      updatePortRanges(currentPortRanges.filter((portRange) => getListenPortDedupeKey(portRange) !== suggestedKey));
    } else {
      updatePortRanges([...currentPortRanges, suggestedPortRange]);
    }

    setLocalError(undefined);
    setDraftValue("");
    inputRef.current?.focus();
  };

  return (
    <div className={joinClassNames("w-full", className)} style={style}>
      <div
        onClick={() => inputRef.current?.focus()}
        className={joinClassNames(
          "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-[var(--ant-border-radius-lg)] border px-[11px] py-[7px] transition-colors",
          disabled
            ? "cursor-not-allowed bg-[var(--ant-color-bg-container-disabled)]"
            : "cursor-text bg-[var(--ant-color-bg-container)] hover:border-[var(--ant-color-primary-hover)]",
          mergedStatus === "error"
            ? "border-[var(--ant-color-error)]"
            : mergedStatus === "warning"
              ? "border-[var(--ant-color-warning)]"
              : focused
                ? "border-[var(--ant-color-primary)] ring-2 ring-[var(--ant-color-primary-bg)]"
                : "border-[var(--ant-color-border)]",
        )}
      >
        {currentPortRanges.map((portRange, index) => {
          const normalized = normalizeListenPortToken(portRange);
          const isInvalid = !normalized.ok;

          return (
            <Tag
              key={`${portRange}-${index}`}
              closable={!disabled}
              color={isInvalid ? "error" : undefined}
              className="!mr-0"
              onClose={(event) => {
                event.preventDefault();
                removePortAt(index);
              }}
            >
              {portRange}
            </Tag>
          );
        })}

        <Input
          {...props}
          ref={inputRef}
          value={draftValue}
          placeholder={placeholder ?? buildDefaultPlaceholder(protocol)}
          disabled={disabled}
          variant="borderless"
          className="min-w-[180px] flex-1 !bg-transparent"
          classNames={{
            input: "!min-w-[180px] !bg-transparent !p-0",
          }}
          onChange={handleDraftChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          onPaste={handleInputPaste}
          onPressEnter={(event) => {
            event.preventDefault();
            commitDraft(draftValue);
            onPressEnter?.(event);
          }}
        />
      </div>

      {resolvedSuggestedPortRanges.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--ant-color-text-description)]">常用端口</span>
          {resolvedSuggestedPortRanges.map((portRange) => {
            const suggestedKey = getListenPortDedupeKey(portRange);
            const active =
              suggestedKey !== null && currentPortRanges.some((currentPortRange) => getListenPortDedupeKey(currentPortRange) === suggestedKey);

            return (
              <CheckableTag
                key={portRange}
                checked={active}
                className={joinClassNames("!mr-0 select-none border border-dashed", disabled ? "cursor-not-allowed" : "cursor-pointer")}
                onChange={(checked) => {
                  if (disabled || checked === active) {
                    return;
                  }

                  toggleSuggestedPortRange(portRange);
                }}
              >
                {portRange}
              </CheckableTag>
            );
          })}
        </div>
      ) : null}

      {errorMessage ? <div className="mt-1.5 text-sm leading-5 text-[var(--ant-color-error)]">{errorMessage}</div> : null}
    </div>
  );
};

type MultiTagsInputProps = {
  addTag?: string;
  splitTags?: string | RegExp;
};

// tags 数组输入
export const MultiTagsInput = ({ addTag, splitTags, value, onChange }: MultiTagsInputProps & CustomFormItemProps<string[]>) => {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleInputConfirm = () => {
    let inputValues = [inputValue];
    if (splitTags) {
      inputValues = inputValue.split(splitTags);
    }

    let newValue = value ?? [];
    inputValues.forEach((nextValue) => {
      if (nextValue && !newValue.includes(nextValue)) {
        newValue = [...newValue, nextValue];
      }
    });

    onChange?.(newValue);
    setInputVisible(false);
    setInputValue("");
  };

  return (
    <>
      {value?.map((item) => (
        <Tag key={item} closeIcon className="!mr-0" onClose={() => onChange?.(value.filter((currentItem) => currentItem !== item))}>
          {item}
        </Tag>
      ))}

      {addTag ? (
        inputVisible ? (
          <Input
            ref={inputRef}
            type="text"
            size="small"
            className="mr-2 w-16 align-top"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputConfirm}
            onPressEnter={handleInputConfirm}
          />
        ) : (
          <Tag
            className="!mr-0 cursor-pointer select-none border-dashed bg-[var(--ant-color-bg-container)]"
            icon={<PlusOutlined />}
            onClick={showInput}
          >
            {addTag}
          </Tag>
        )
      ) : null}
    </>
  );
};

export { appendListenPortTokens, getSuggestedListenPortRanges, normalizeListenPortToken } from "./multiListenPortInputState";
