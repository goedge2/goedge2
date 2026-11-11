import React, { useMemo, useState } from "react";
import { Button, Card, Checkbox, Col, Collapse, Divider, Empty, Input, Modal, Row, Segmented, Space, Spin, Switch, Tag, Tabs } from "antd";

import type { HTTPFirewallRegion } from "../pb/models/model_http_firewall_pb";
import { CustomFormItemProps, useFetchData } from "../utils";
import type { RegionCountry } from "../pb/models/model_region_country_pb";
import type { RegionProvince } from "../pb/models/model_region_province_pb";
import { URLPatternsList } from "./SharedInput";
import type { URLPattern } from "../pb/models/model_config_shared_pb";

// ─── Country Modal ────────────────────────────────────────────────────────────

interface CountryGroup {
  name: string;
  countries: RegionCountry[];
}

export interface CountrySelectModalProps {
  open: boolean;
  value: string[];
  onOk: (ids: string[]) => void;
  onCancel: () => void;
}

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({ open, value, onOk, onCancel }) => {
  const [tempIds, setTempIds] = useState<string[]>(value);
  const [searchKeyword, setSearchKeyword] = useState("");

  const { data: countriesResponse, loading: loadingCountries } = useFetchData<{ regionCountries: RegionCountry[] }>("/api/region-countries");
  const countries = useMemo(() => countriesResponse?.regionCountries || [], [countriesResponse]);

  const countryGroups = useMemo<CountryGroup[]>(() => {
    const common: RegionCountry[] = [];
    const groups: Record<string, RegionCountry[]> = {
      "A-E": [],
      "F-J": [],
      "K-O": [],
      "P-T": [],
      "U-Z": [],
      "0-9": [],
    };

    countries.forEach((country) => {
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const matchName = country.name.toLowerCase().includes(kw);
        const matchPinyin = country.pinyin.some((p) => p.toLowerCase().includes(kw));
        const matchCodes = country.codes.some((c) => c.toLowerCase().includes(kw));
        if (!matchName && !matchPinyin && !matchCodes) return;
      }

      if (country.isCommon && !searchKeyword) {
        common.push(country);
      }

      let firstChar = "";
      if (country.pinyin && country.pinyin.length > 0) {
        firstChar = country.pinyin[0].charAt(0).toUpperCase();
      } else if (country.codes && country.codes.length > 0) {
        firstChar = country.codes[0].charAt(0).toUpperCase();
      }

      if (firstChar >= "A" && firstChar <= "E") groups["A-E"].push(country);
      else if (firstChar >= "F" && firstChar <= "J") groups["F-J"].push(country);
      else if (firstChar >= "K" && firstChar <= "O") groups["K-O"].push(country);
      else if (firstChar >= "P" && firstChar <= "T") groups["P-T"].push(country);
      else if (firstChar >= "U" && firstChar <= "Z") groups["U-Z"].push(country);
      else groups["0-9"].push(country);
    });

    const result: CountryGroup[] = [];
    if (common.length > 0) result.push({ name: "常用", countries: common });
    ["A-E", "F-J", "K-O", "P-T", "U-Z"].forEach((key) => {
      if (groups[key].length > 0 || !searchKeyword) {
        result.push({ name: key, countries: groups[key] });
      }
    });
    return result;
  }, [countries, searchKeyword]);

  return (
    <Modal
      title="选择国家/地区"
      open={open}
      onOk={() => onOk(tempIds)}
      onCancel={onCancel}
      width={800}
      destroyOnHidden
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          setTempIds(value);
          setSearchKeyword("");
        }
      }}
    >
      {loadingCountries ? (
        <>
          <Spin />
        </>
      ) : (
        <>
          <Input.Search
            placeholder="搜索国家/地区名称或拼音"
            style={{ marginBottom: 16 }}
            onSearch={(val) => setSearchKeyword(val)}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
          />
          <Tabs defaultActiveKey="0">
            {countryGroups.map((group, index) => (
              <Tabs.TabPane tab={group.name} key={index}>
                {group.countries.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Checkbox.Group style={{ width: "100%" }} value={tempIds} onChange={(vals) => setTempIds(vals as string[])}>
                    <Row gutter={[16, 16]}>
                      {group.countries.map((country) => (
                        <Col span={6} key={country.id.toString()}>
                          <Checkbox value={String(country.id)}>{country.name}</Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                )}
              </Tabs.TabPane>
            ))}
          </Tabs>
        </>
      )}
    </Modal>
  );
};

// ─── Province Modal ───────────────────────────────────────────────────────────

export interface ProvinceSelectModalProps {
  open: boolean;
  value: string[];
  onOk: (ids: string[]) => void;
  onCancel: () => void;
}

export const ProvinceSelectModal: React.FC<ProvinceSelectModalProps> = ({ open, value, onOk, onCancel }) => {
  const [tempIds, setTempIds] = useState<string[]>(value);

  const { data: provincesResponse, loading: loadingProvinces } = useFetchData<{ regionProvinces: RegionProvince[] }>(
    "/api/region-countries/1/provinces",
  );
  const provinces = useMemo(() => provincesResponse?.regionProvinces || [], [provincesResponse]);

  return (
    <Modal
      title="选择省份（中国大陆）"
      open={open}
      onOk={() => onOk(tempIds)}
      onCancel={onCancel}
      width={600}
      destroyOnHidden
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          setTempIds(value);
        }
      }}
    >
      {loadingProvinces ? (
        <>
          <Spin />
        </>
      ) : (
        <Checkbox.Group style={{ width: "100%" }} value={tempIds} onChange={(vals) => setTempIds(vals as string[])}>
          <Row gutter={[16, 16]}>
            {provinces.map((province) => (
              <Col span={6} key={province.id.toString()}>
                <Checkbox value={String(province.id)}>{province.name}</Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      )}
    </Modal>
  );
};

// ─── CountryIdsInput ──────────────────────────────────────────────────────────

export const CountryIdsInput: React.FC<CustomFormItemProps<number[]>> = ({ value, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const ids = value || [];

  const { data: countriesResponse } = useFetchData<{ regionCountries: RegionCountry[] }>("/api/region-countries");
  const countryMap = useMemo(() => {
    const map = new Map<number, string>();
    (countriesResponse?.regionCountries || []).forEach((c) => map.set(Number(c.id), c.name));
    return map;
  }, [countriesResponse]);

  const handleRemove = (id: number) => onChange?.(ids.filter((i) => i !== id));

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {ids.map((id) => (
          <Tag key={id} closable onClose={() => handleRemove(id)}>
            {countryMap.get(id) || `ID:${id}`}
          </Tag>
        ))}
      </div>
      <Button type="dashed" size="small" onClick={() => setModalOpen(true)}>
        + 选择国家/地区
      </Button>
      <CountrySelectModal
        open={modalOpen}
        value={ids.map(String)}
        onOk={(newIds) => {
          onChange?.(newIds.map(Number));
          setModalOpen(false);
        }}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
};

// ─── ProvinceIdsInput ─────────────────────────────────────────────────────────

export const ProvinceIdsInput: React.FC<CustomFormItemProps<number[]>> = ({ value, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const ids = value || [];

  const { data: provincesResponse } = useFetchData<{ regionProvinces: RegionProvince[] }>("/api/region-countries/1/provinces");
  const provinceMap = useMemo(() => {
    const map = new Map<number, string>();
    (provincesResponse?.regionProvinces || []).forEach((p) => map.set(Number(p.id), p.name));
    return map;
  }, [provincesResponse]);

  const handleRemove = (id: number) => onChange?.(ids.filter((i) => i !== id));

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {ids.map((id) => (
          <Tag key={id} closable onClose={() => handleRemove(id)}>
            {provinceMap.get(id) || `ID:${id}`}
          </Tag>
        ))}
      </div>
      <Button type="dashed" size="small" onClick={() => setModalOpen(true)}>
        + 选择省份
      </Button>
      <ProvinceSelectModal
        open={modalOpen}
        value={ids.map(String)}
        onOk={(newIds) => {
          onChange?.(newIds.map(Number));
          setModalOpen(false);
        }}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
};

// ─── WafRegionFormInput ───────────────────────────────────────────────────────

type WafRegionFormInputProps = CustomFormItemProps<HTTPFirewallRegion>;

const WafRegionFormInput: React.FC<WafRegionFormInputProps> = ({ value, onChange }) => {
  const regionValue = value || ({} as HTTPFirewallRegion);
  const hasAllowCountryIds = (regionValue.allowCountryIds?.length || 0) > 0;
  const hasDenyCountryIds = (regionValue.denyCountryIds?.length || 0) > 0;
  const hasAllowProvinceIds = (regionValue.allowProvinceIds?.length || 0) > 0;
  const hasDenyProvinceIds = (regionValue.denyProvinceIds?.length || 0) > 0;
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);

  // Internal state for cached lists (to persist when switching modes)
  const [cachedAllowCountryIds, setCachedAllowCountryIds] = useState<string[]>(() => regionValue.allowCountryIds || []);
  const [cachedDenyCountryIds, setCachedDenyCountryIds] = useState<string[]>(() => regionValue.denyCountryIds || []);
  const [cachedAllowProvinceIds, setCachedAllowProvinceIds] = useState<string[]>(() => regionValue.allowProvinceIds || []);
  const [cachedDenyProvinceIds, setCachedDenyProvinceIds] = useState<string[]>(() => regionValue.denyProvinceIds || []);

  // Internal state for modes
  const [internalCountryMode, setInternalCountryMode] = useState<"deny" | "allow">(() =>
    hasDenyCountryIds ? "deny" : hasAllowCountryIds ? "allow" : "deny",
  );
  const [internalProvinceMode, setInternalProvinceMode] = useState<"deny" | "allow">(() =>
    hasDenyProvinceIds ? "deny" : hasAllowProvinceIds ? "allow" : "deny",
  );

  // Fetch data for display names
  const { data: countriesResponse } = useFetchData<{ regionCountries: RegionCountry[] }>("/api/region-countries");
  const { data: provincesResponse } = useFetchData<{ regionProvinces: RegionProvince[] }>("/api/region-countries/1/provinces");

  const countries = useMemo(() => countriesResponse?.regionCountries || [], [countriesResponse]);
  const provinces = useMemo(() => provincesResponse?.regionProvinces || [], [provincesResponse]);

  const countryMap = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach((c) => map.set(String(c.id), c.name));
    return map;
  }, [countries]);

  const provinceMap = useMemo(() => {
    const map = new Map<string, string>();
    provinces.forEach((p) => map.set(String(p.id), p.name));
    return map;
  }, [provinces]);

  const triggerChange = (updates: Partial<HTTPFirewallRegion>) => {
    const newValue = { ...regionValue, ...updates, isOn: true };
    onChange?.(newValue);
  };

  const [countryEnabledUI, setCountryEnabledUI] = useState(() => hasAllowCountryIds || hasDenyCountryIds);
  const [provinceEnabledUI, setProvinceEnabledUI] = useState(() => hasAllowProvinceIds || hasDenyProvinceIds);
  const allowCountryIds = regionValue.allowCountryIds || [];
  const denyCountryIds = regionValue.denyCountryIds || [];
  const allowProvinceIds = regionValue.allowProvinceIds || [];
  const denyProvinceIds = regionValue.denyProvinceIds || [];
  const displayAllowCountryIds = allowCountryIds.length > 0 ? allowCountryIds : cachedAllowCountryIds;
  const displayDenyCountryIds = denyCountryIds.length > 0 ? denyCountryIds : cachedDenyCountryIds;
  const displayAllowProvinceIds = allowProvinceIds.length > 0 ? allowProvinceIds : cachedAllowProvinceIds;
  const displayDenyProvinceIds = denyProvinceIds.length > 0 ? denyProvinceIds : cachedDenyProvinceIds;

  const onSwitchCountry = (checked: boolean) => {
    setCountryEnabledUI(checked);
    if (!checked) {
      triggerChange({ allowCountryIds: [], denyCountryIds: [] });
    } else {
      if (internalCountryMode === "allow") {
        triggerChange({ allowCountryIds: cachedAllowCountryIds, denyCountryIds: [] });
      } else {
        triggerChange({ denyCountryIds: cachedDenyCountryIds, allowCountryIds: [] });
      }
    }
  };

  const onSwitchProvince = (checked: boolean) => {
    setProvinceEnabledUI(checked);
    if (!checked) {
      triggerChange({ allowProvinceIds: [], denyProvinceIds: [] });
    } else {
      if (internalProvinceMode === "allow") {
        triggerChange({ allowProvinceIds: cachedAllowProvinceIds, denyProvinceIds: [] });
      } else {
        triggerChange({ denyProvinceIds: cachedDenyProvinceIds, allowProvinceIds: [] });
      }
    }
  };

  const handleCountryModeChange = (mode: "allow" | "deny") => {
    setInternalCountryMode(mode);
    if (mode === "allow") {
      triggerChange({ allowCountryIds: cachedAllowCountryIds, denyCountryIds: [] });
    } else {
      triggerChange({ denyCountryIds: cachedDenyCountryIds, allowCountryIds: [] });
    }
  };

  const handleProvinceModeChange = (mode: "allow" | "deny") => {
    setInternalProvinceMode(mode);
    if (mode === "allow") {
      triggerChange({ allowProvinceIds: cachedAllowProvinceIds, denyProvinceIds: [] });
    } else {
      triggerChange({ denyProvinceIds: cachedDenyProvinceIds, allowProvinceIds: [] });
    }
  };

  const removeCountry = (id: string, isAllow: boolean) => {
    if (isAllow) {
      const newIds = displayAllowCountryIds.filter((cid) => cid !== id);
      setCachedAllowCountryIds(newIds);
      triggerChange({ allowCountryIds: newIds });
    } else {
      const newIds = displayDenyCountryIds.filter((cid) => cid !== id);
      setCachedDenyCountryIds(newIds);
      triggerChange({ denyCountryIds: newIds });
    }
  };

  const removeProvince = (id: string, isAllow: boolean) => {
    if (isAllow) {
      const newIds = displayAllowProvinceIds.filter((pid) => pid !== id);
      setCachedAllowProvinceIds(newIds);
      triggerChange({ allowProvinceIds: newIds });
    } else {
      const newIds = displayDenyProvinceIds.filter((pid) => pid !== id);
      setCachedDenyProvinceIds(newIds);
      triggerChange({ denyProvinceIds: newIds });
    }
  };

  const currentCountryIds = internalCountryMode === "allow" ? displayAllowCountryIds : displayDenyCountryIds;
  const currentProvinceIds = internalProvinceMode === "allow" ? displayAllowProvinceIds : displayDenyProvinceIds;

  const saveCountrySelection = (ids: string[]) => {
    if (internalCountryMode === "allow") {
      setCachedAllowCountryIds(ids);
      triggerChange({ allowCountryIds: ids, denyCountryIds: [] });
    } else {
      setCachedDenyCountryIds(ids);
      triggerChange({ denyCountryIds: ids, allowCountryIds: [] });
    }
    setCountryModalVisible(false);
  };

  const saveProvinceSelection = (ids: string[]) => {
    if (internalProvinceMode === "allow") {
      setCachedAllowProvinceIds(ids);
      triggerChange({ allowProvinceIds: ids, denyProvinceIds: [] });
    } else {
      setCachedDenyProvinceIds(ids);
      triggerChange({ denyProvinceIds: ids, allowProvinceIds: [] });
    }
    setProvinceModalVisible(false);
  };

  const handleCountryHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    triggerChange({ countryHTML: e.target.value });
  };

  const handleProvinceHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    triggerChange({ provinceHTML: e.target.value });
  };

  const handleAllowSearchEngineChange = (e: { target: { checked: boolean } }) => {
    triggerChange({ allowSearchEngine: e.target.checked });
  };

  const handleCountryOnlyURLPatternsChange = (patterns?: URLPattern[]) => {
    triggerChange({ countryOnlyURLPatterns: patterns || [] });
  };

  const handleCountryExceptURLPatternsChange = (patterns?: URLPattern[]) => {
    triggerChange({ countryExceptURLPatterns: patterns || [] });
  };

  const handleProvinceOnlyURLPatternsChange = (patterns?: URLPattern[]) => {
    triggerChange({ provinceOnlyURLPatterns: patterns || [] });
  };

  const handleProvinceExceptURLPatternsChange = (patterns?: URLPattern[]) => {
    triggerChange({ provinceExceptURLPatterns: patterns || [] });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Country/Region Blocking */}
      <Card title="国家/地区封禁" size="small" variant="borderless" extra={<Switch checked={countryEnabledUI} onChange={onSwitchCountry} />}>
        {countryEnabledUI ? (
          <Space orientation="vertical" style={{ width: "100%" }} size="middle">
            <Segmented
              block
              options={[
                { label: `黑名单 (禁止) ${cachedDenyCountryIds.length ? `(${cachedDenyCountryIds.length})` : ""}`, value: "deny" },
                { label: `白名单 (仅允许) ${cachedAllowCountryIds.length ? `(${cachedAllowCountryIds.length})` : ""}`, value: "allow" },
              ]}
              value={internalCountryMode}
              onChange={(val) => handleCountryModeChange(val as "deny" | "allow")}
            />

            <div className="p-4 bg-gray-50 rounded min-h-[100px] border border-gray-100">
              <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {currentCountryIds.map((id) => (
                  <Tag key={id} closable onClose={() => removeCountry(id, internalCountryMode === "allow")}>
                    {countryMap.get(id) || `ID:${id}`}
                  </Tag>
                ))}
                <Button type="dashed" size="small" onClick={() => setCountryModalVisible(true)}>
                  + 添加国家/地区
                </Button>
              </div>
              {currentCountryIds.length === 0 && (
                <div className="text-gray-400 text-center py-4 text-xs">
                  暂无选择，请添加{internalCountryMode === "allow" ? "允许" : "禁止"}的国家/地区
                </div>
              )}
            </div>

            <Collapse
              ghost
              items={[
                {
                  key: "advanced",
                  label: "高级设置",
                  children: (
                    <div className="flex flex-col gap-4">
                      <div>
                        <Checkbox checked={regionValue.allowSearchEngine} onChange={handleAllowSearchEngineChange}>
                          允许搜索引擎
                        </Checkbox>
                        <div className="text-gray-400 text-xs mt-1">选中后，表示如果请求来自常见搜索引擎的IP，则不受区域限制。</div>
                      </div>
                      <div>
                        <div className="mb-1">仅限URL</div>
                        <URLPatternsList value={regionValue.countryOnlyURLPatterns} onChange={handleCountryOnlyURLPatternsChange} />
                      </div>
                      <div>
                        <div className="mb-1">排除URL</div>
                        <URLPatternsList value={regionValue.countryExceptURLPatterns} onChange={handleCountryExceptURLPatternsChange} />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>拦截提示HTML (支持HTML代码)</div>
                        <Input.TextArea
                          rows={3}
                          value={regionValue.countryHTML}
                          onChange={handleCountryHtmlChange}
                          placeholder="默认显示系统自带的拦截提示，在此可以输入自定义的HTML内容"
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未启用" />
        )}
      </Card>

      <Divider />

      {/* Province Blocking */}
      <Card title="省份封禁（中国大陆）" size="small" variant="borderless" extra={<Switch checked={provinceEnabledUI} onChange={onSwitchProvince} />}>
        {provinceEnabledUI ? (
          <Space orientation="vertical" style={{ width: "100%" }} size="middle">
            <Segmented
              block
              options={[
                { label: `黑名单 (禁止) ${cachedDenyProvinceIds.length ? `(${cachedDenyProvinceIds.length})` : ""}`, value: "deny" },
                { label: `白名单 (仅允许) ${cachedAllowProvinceIds.length ? `(${cachedAllowProvinceIds.length})` : ""}`, value: "allow" },
              ]}
              value={internalProvinceMode}
              onChange={(val) => handleProvinceModeChange(val as "deny" | "allow")}
            />

            <div className="p-4 bg-gray-50 rounded min-h-[100px] border border-gray-100">
              <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {currentProvinceIds.map((id) => (
                  <Tag key={id} closable onClose={() => removeProvince(id, internalProvinceMode === "allow")}>
                    {provinceMap.get(id) || `ID:${id}`}
                  </Tag>
                ))}
                <Button type="dashed" size="small" onClick={() => setProvinceModalVisible(true)}>
                  + 添加省份
                </Button>
              </div>
              {currentProvinceIds.length === 0 && (
                <div className="text-gray-400 text-center py-4 text-xs">
                  暂无选择，请添加{internalProvinceMode === "allow" ? "允许" : "禁止"}的省份
                </div>
              )}
            </div>

            <Collapse
              ghost
              items={[
                {
                  key: "advanced",
                  label: "高级设置",
                  children: (
                    <div className="flex flex-col gap-4">
                      <div>
                        <Checkbox checked={regionValue.allowSearchEngine} onChange={handleAllowSearchEngineChange}>
                          允许搜索引擎
                        </Checkbox>
                        <div className="text-gray-400 text-xs mt-1">选中后，表示如果请求来自常见搜索引擎的IP，则不受区域限制。</div>
                      </div>
                      <div>
                        <div className="mb-1">仅限URL</div>
                        <URLPatternsList value={regionValue.provinceOnlyURLPatterns} onChange={handleProvinceOnlyURLPatternsChange} />
                      </div>
                      <div>
                        <div className="mb-1">排除URL</div>
                        <URLPatternsList value={regionValue.provinceExceptURLPatterns} onChange={handleProvinceExceptURLPatternsChange} />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>拦截提示HTML (支持HTML代码)</div>
                        <Input.TextArea
                          rows={3}
                          value={regionValue.provinceHTML}
                          onChange={handleProvinceHtmlChange}
                          placeholder="默认显示系统自带的拦截提示，在此可以输入自定义的HTML内容"
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未启用" />
        )}
      </Card>

      {/* Modals */}
      <CountrySelectModal
        open={countryModalVisible}
        value={currentCountryIds}
        onOk={saveCountrySelection}
        onCancel={() => setCountryModalVisible(false)}
      />
      <ProvinceSelectModal
        open={provinceModalVisible}
        value={currentProvinceIds}
        onOk={saveProvinceSelection}
        onCancel={() => setProvinceModalVisible(false)}
      />
    </div>
  );
};

export default WafRegionFormInput;
