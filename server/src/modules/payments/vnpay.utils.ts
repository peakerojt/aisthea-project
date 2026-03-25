import crypto from 'crypto';
import querystring from 'qs';

type VnpParamValue = string | number | boolean | null | undefined;

export type VnpParamRecord = Record<string, VnpParamValue>;

const encodeVnpValue = (value: VnpParamValue) =>
  encodeURIComponent(String(value ?? '')).replace(/%20/g, '+');

const createSecureHashFromSortedParams = (sortedParams: Record<string, string>, secretKey: string) => {
  const signData = querystring.stringify(sortedParams, { encode: false });
  return crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
};

export const sortVnpParams = (params: VnpParamRecord): Record<string, string> => {
  const sorted: Record<string, string> = {};

  for (const encodedKey of Object.keys(params).map((key) => encodeURIComponent(key)).sort()) {
    const sourceKey = decodeURIComponent(encodedKey);
    sorted[encodedKey] = encodeVnpValue(params[sourceKey]);
  }

  return sorted;
};

export const createVnpSecureHash = (params: VnpParamRecord, secretKey: string) =>
  createSecureHashFromSortedParams(sortVnpParams(params), secretKey);

export const buildSignedVnpUrl = (baseUrl: string, params: VnpParamRecord, secretKey: string) => {
  const sortedParams = sortVnpParams(params);
  sortedParams.vnp_SecureHash = createSecureHashFromSortedParams(sortedParams, secretKey);
  return `${baseUrl}?${querystring.stringify(sortedParams, { encode: false })}`;
};

const getSingleQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
};

export const extractSignedVnpQuery = (query: Record<string, unknown>) => {
  const params: VnpParamRecord = {};
  let secureHash: string | undefined;

  for (const [key, value] of Object.entries(query)) {
    const normalizedValue = getSingleQueryValue(value);

    if (key === 'vnp_SecureHash') {
      secureHash = normalizedValue;
      continue;
    }

    if (key === 'vnp_SecureHashType' || normalizedValue === undefined) {
      continue;
    }

    params[key] = normalizedValue;
  }

  return { params, secureHash };
};
