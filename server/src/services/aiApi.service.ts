import { logger } from '../lib/logger';

interface CloudflareAiResponse {
  result?: {
    response?: string;
  };
}

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRY_ATTEMPTS = 2;

const normalizeAiError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
};

const extractJsonPayload = (value: string) => {
  const trimmed = value.trim();

  if (trimmed.startsWith('```')) {
    const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, '');
    return withoutFenceStart.replace(/\s*```$/, '').trim();
  }

  return trimmed;
};

export const callAiModel = async ({
  accountId,
  apiToken,
  prompt,
  model,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  mockMode = false,
}: {
  accountId?: string;
  apiToken?: string;
  prompt: string;
  model: string;
  timeoutMs?: number;
  mockMode?: boolean;
}): Promise<string> => {
  if (mockMode || !accountId || !apiToken || !model) {
    logger.warn('Cloudflare AI credentials missing or mock mode enabled. Returning mock response.');
    return JSON.stringify({
      summary: 'Trang phục tối giản với áo sơ mi linen thoáng mát và quần chinos sáng màu.',
      items: {
        top: 'Áo sơ mi linen màu trắng, tay ngắn',
        bottom: 'Quần chinos beige dáng slim',
        shoes: 'Giày sneakers trắng hoặc loafers vải',
        accessories: ['Kính râm', 'Túi tote canvas', 'Đồng hồ dây da nâu'],
      },
      tips: ['Chọn chất liệu thoáng khí như linen hoặc cotton', 'Mang theo nước uống vì thời tiết nóng'],
      warnings: ['UV cao vào buổi trưa, nên bôi kem chống nắng'],
    });
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a fashion assistant that outputs only valid JSON based on the provided schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cloudflare AI error: ${response.status} ${text}`);
      }

      const data = (await response.json()) as CloudflareAiResponse;
      return extractJsonPayload(data.result?.response || '');
    } catch (error) {
      lastError = error;
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted'));
      const shouldRetry = attempt < MAX_RETRY_ATTEMPTS && isAbortError;

      logger.error('Failed to call AI model', {
        attempt,
        timeoutMs,
        model,
        retrying: shouldRetry,
        error: normalizeAiError(error),
      });

      if (!shouldRetry) {
        if (isAbortError) {
          throw new Error('AI request timed out');
        }

        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI request failed');
};
