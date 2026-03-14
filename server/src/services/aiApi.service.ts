import { logger } from '../lib/logger';

interface CloudflareAiResponse {
  result?: {
    response?: string;
  };
}

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
  timeoutMs = 12000,
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
    logger.error('Failed to call AI model', { error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
