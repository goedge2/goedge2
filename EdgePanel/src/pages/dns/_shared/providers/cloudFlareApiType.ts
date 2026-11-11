export const cloudFlareAPITypeAPIToken = "apiToken";
export const cloudFlareAPITypeGlobalKey = "globalKey";
export const cloudFlareDefaultAPIType = cloudFlareAPITypeAPIToken;

export function getCloudFlareAPIType(apiType: unknown): string {
  return apiType === cloudFlareAPITypeAPIToken ? cloudFlareAPITypeAPIToken : cloudFlareAPITypeGlobalKey;
}
