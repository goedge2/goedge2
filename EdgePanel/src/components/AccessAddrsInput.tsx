import { Input } from "antd";
import { ChangeEvent, useMemo, useState } from "react";
import type { NetworkAddress } from "../pb/models/model_network_address_pb";

export type AccessAddrsInputProps = {
  value?: NetworkAddress[];
  onChange?: (value?: NetworkAddress[]) => void;
};

const formatAddresses = (value?: NetworkAddress[]) =>
  (value || []).map((addr) => `${addr.protocol || "http"}://${addr.host}:${addr.portRange}`).join("\n");

export function AccessAddrsInput({ value, onChange }: AccessAddrsInputProps) {
  const [draftText, setDraftText] = useState<string | null>(null);
  const formattedValue = useMemo(() => formatAddresses(value), [value]);
  const text = draftText ?? formattedValue;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setDraftText(newText);

    const lines = newText.split(/\r?\n/);
    const addresses: NetworkAddress[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let urlStr = trimmed;
      if (!urlStr.includes("://")) {
        urlStr = "http://" + urlStr;
      }

      try {
        const url = new URL(urlStr);
        const protocol = url.protocol.replace(":", "") || "http";
        const host = url.hostname;
        if (!host) continue;

        const portRange = url.port || (protocol === "https" ? "443" : "80");

        addresses.push({
          protocol,
          host,
          portRange,
        } as NetworkAddress);
      } catch {
        // silently ignore invalid lines
      }
    }

    onChange?.(addresses);
  };

  const handleBlur = () => {
    setDraftText(null);
  };

  return (
    <Input.TextArea
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={"每行一个访问地址，例如:\nhttp://192.168.100.100:8080\nhttps://example.com"}
      autoSize={{ minRows: 4 }}
    />
  );
}
