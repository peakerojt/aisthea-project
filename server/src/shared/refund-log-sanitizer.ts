const MASK = '***';
const URL_PLACEHOLDER = '[URL]';

const normalizeString = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const maskMiddle = (value: string, prefix = 4, suffix = 3) => {
  if (value.length <= 4) {
    return MASK;
  }

  if (value.length <= prefix + suffix) {
    const dynamicPrefix = Math.max(1, Math.ceil(value.length / 3));
    const dynamicSuffix = Math.max(1, Math.floor(value.length / 4));
    return `${value.slice(0, dynamicPrefix)}${MASK}${value.slice(-dynamicSuffix)}`;
  }

  return `${value.slice(0, prefix)}${MASK}${value.slice(-suffix)}`;
};

const sanitizeFreeText = (value: string | null | undefined) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const maskedUrls = normalized.replace(/https?:\/\/\S+/gi, URL_PLACEHOLDER);
  const maskedEmails = maskedUrls.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    (token) => maskEmailForRefundLogs(token) ?? MASK,
  );
  const maskedTokens = maskedEmails.replace(/\b[A-Z0-9_-]{7,}\b/gi, (token) =>
    /[\d_-]/.test(token) ? maskMiddle(token) : token,
  );
  const maskedNumbers = maskedTokens.replace(/\b\d{6,}\b/g, (token) => maskMiddle(token, 0, 4));

  if (maskedNumbers.length <= 160) {
    return maskedNumbers;
  }

  return `${maskedNumbers.slice(0, 157)}...`;
};

const serializeStackPreview = (stack: string | null | undefined) => {
  const normalized = normalizeString(stack);
  if (!normalized) {
    return undefined;
  }

  return sanitizeFreeText(normalized.split('\n').slice(0, 3).join(' | ')) ?? undefined;
};

export const maskEmailForRefundLogs = (value: string | null | undefined) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) {
    return MASK;
  }

  if (localPart.length <= 1) {
    return `${MASK}@${domain}`;
  }

  return `${localPart.slice(0, 1)}${MASK}@${domain}`;
};

export const maskIdentifierForRefundLogs = (value: string | null | undefined) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return maskMiddle(normalized);
};

export const serializeRefundErrorForLogs = (error: unknown) => {
  if (error instanceof Error) {
    const errorRecord = error as Error & { code?: unknown; status?: unknown };
    return {
      name: error.name,
      code: errorRecord.code,
      status: errorRecord.status,
      message: sanitizeFreeText(error.message),
      stackPreview: serializeStackPreview(error.stack),
    };
  }

  if (typeof error === 'string') {
    return {
      message: sanitizeFreeText(error),
    };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return sanitizeRefundLogContext({
      name: typeof record.name === 'string' ? record.name : undefined,
      code: record.code,
      status: record.status,
      message: typeof record.message === 'string' ? record.message : undefined,
    });
  }

  return {
    message: sanitizeFreeText(String(error)),
  };
};

const summarizeSensitiveCollection = (value: unknown[]) => ({
  count: value.length,
});

const sanitizeRefundLogValue = (key: string, value: unknown): unknown => {
  if (value == null) {
    return value;
  }

  const normalizedKey = key.toLowerCase();

  if (Array.isArray(value)) {
    if (
      normalizedKey.includes('proofimage') ||
      normalizedKey.includes('proofurl') ||
      normalizedKey.includes('proofs')
    ) {
      return summarizeSensitiveCollection(value);
    }

    return value.map((entry) => sanitizeRefundLogValue('', entry));
  }

  if (value instanceof Error) {
    return serializeRefundErrorForLogs(value);
  }

  if (typeof value === 'string') {
    if (normalizedKey === 'email') {
      return maskEmailForRefundLogs(value);
    }

    if (
      normalizedKey.includes('securehash') ||
      normalizedKey === 'signed' ||
      normalizedKey.includes('signature')
    ) {
      return maskIdentifierForRefundLogs(value);
    }

    if (
      normalizedKey.includes('idempotencykey') ||
      normalizedKey.includes('transactionref') ||
      normalizedKey.includes('transactioncode') ||
      normalizedKey.includes('externalrefundreference') ||
      normalizedKey.includes('gatewaytransactionid') ||
      normalizedKey.includes('providerordercode')
    ) {
      return maskIdentifierForRefundLogs(value);
    }

    if (
      normalizedKey.includes('accountnumber') ||
      normalizedKey.includes('accountholder') ||
      normalizedKey.includes('qrimageurl') ||
      normalizedKey.includes('fileurl') ||
      normalizedKey.includes('imageurl')
    ) {
      return sanitizeFreeText(value);
    }

    if (normalizedKey === 'imagedata') {
      return `[redacted-image-data:${value.length}]`;
    }

    if (
      normalizedKey.includes('note') ||
      normalizedKey.includes('financenote') ||
      normalizedKey.includes('gatewayerror') ||
      normalizedKey.includes('errormessage') ||
      normalizedKey === 'message'
    ) {
      return sanitizeFreeText(value);
    }

    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    result[childKey] = sanitizeRefundLogValue(childKey, childValue);
  }

  return result;
};

export const sanitizeRefundLogContext = (context: Record<string, unknown>) => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = sanitizeRefundLogValue(key, value);
  }

  return sanitized;
};
