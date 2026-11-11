import type { DescriptionsProps } from "antd";
import { AliDNSForm, getAliDNSDescriptionItems } from "./AliDNS";
import { DNSPodForm, getDNSPodDescriptionItems } from "./DNSPod";
import { HuaweiDNSForm, getHuaweiDNSDescriptionItems } from "./HuaweiDNS";
import { CloudFlareForm, getCloudFlareDescriptionItems } from "./CloudFlare";
import { GoDaddyForm, getGoDaddyDescriptionItems } from "./GoDaddy";
import { ClouDNSForm, getClouDNSDescriptionItems } from "./ClouDNS";
import { DNSComForm, getDNSComDescriptionItems } from "./DNSCom";
import { DNSLaForm, getDNSLaDescriptionItems } from "./DNSLa";
import { VolcEngineForm, getVolcEngineDescriptionItems } from "./VolcEngine";
import { AmazonRoute53Form, getAmazonRoute53DescriptionItems } from "./AmazonRoute53";
import { AzureDNSForm, getAzureDNSDescriptionItems } from "./AzureDNS";
import { BunnyNetForm, getBunnyNetDescriptionItems } from "./BunnyNet";
import { LocalEdgeDNSForm, getLocalEdgeDNSDescriptionItems } from "./LocalEdgeDNS";
import { EdgeDNSAPIForm, getEdgeDNSAPIDescriptionItems } from "./EdgeDNSAPI";
import { CustomHTTPForm, getCustomHTTPDescriptionItems } from "./CustomHTTP";
import type { ProviderApiParams } from "./types";

export const ProviderForms: Record<string, React.FC> = {
  alidns: AliDNSForm,
  dnspod: DNSPodForm,
  huaweiDNS: HuaweiDNSForm,
  cloudFlare: CloudFlareForm,
  godaddy: GoDaddyForm,
  cloudns: ClouDNSForm,
  dnscom: DNSComForm,
  dnsla: DNSLaForm,
  volcEngine: VolcEngineForm,
  amazonRoute53: AmazonRoute53Form,
  azureDNS: AzureDNSForm,
  bunnyNet: BunnyNetForm,
  localEdgeDNS: LocalEdgeDNSForm,
  edgeDNSAPI: EdgeDNSAPIForm,
  customHTTP: CustomHTTPForm,
};

export const ProviderDescriptions: Record<string, (apiParams: ProviderApiParams) => DescriptionsProps["items"]> = {
  alidns: getAliDNSDescriptionItems,
  dnspod: getDNSPodDescriptionItems,
  huaweiDNS: getHuaweiDNSDescriptionItems,
  cloudFlare: getCloudFlareDescriptionItems,
  godaddy: getGoDaddyDescriptionItems,
  cloudns: getClouDNSDescriptionItems,
  dnscom: getDNSComDescriptionItems,
  dnsla: getDNSLaDescriptionItems,
  volcEngine: getVolcEngineDescriptionItems,
  amazonRoute53: getAmazonRoute53DescriptionItems,
  azureDNS: getAzureDNSDescriptionItems,
  bunnyNet: getBunnyNetDescriptionItems,
  localEdgeDNS: getLocalEdgeDNSDescriptionItems,
  edgeDNSAPI: getEdgeDNSAPIDescriptionItems,
  customHTTP: getCustomHTTPDescriptionItems,
};
